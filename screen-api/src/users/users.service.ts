import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { userSelect, toPublicUser } from '../auth/auth.service';
import { AuthUser, PERMISSIONS, hasPermission } from '../auth/permissions';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

/** A user counts as online if the panel has a live socket, or it called the API very recently. */
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  private withPresence<T extends { id: number; lastSeenAt: Date | null }>(user: T) {
    const recentlySeen = !!user.lastSeenAt && Date.now() - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
    return { ...user, online: this.events.isUserOnline(user.id) || recentlySeen };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({ select: userSelect, orderBy: { id: 'asc' } });
    return users.map((u) => this.withPresence(toPublicUser(u)));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.withPresence(toPublicUser(user));
  }

  async update(id: number, dto: UpdateUserDto, actor: AuthUser) {
    const target = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    if (dto.email && dto.email !== target.email) {
      const taken = await this.prisma.user.findFirst({ where: { email: dto.email, NOT: { id } } });
      if (taken) throw new ConflictException('El correo ya está en uso');
    }
    if (dto.roleId !== undefined && dto.roleId !== null) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new BadRequestException('El rol indicado no existe');
    }
    // Nobody can lock themselves out: no self-deactivation, no removing own user management.
    if (actor.id === id) {
      if (dto.status !== undefined && dto.status !== '1') throw new ForbiddenException('No puedes desactivar tu propio usuario');
      if (dto.roleId !== undefined) {
        const role = dto.roleId === null ? null : await this.prisma.role.findUnique({
          where: { id: dto.roleId },
          include: { permissions: { include: { permission: true } } },
        });
        const keeps = role?.permissions.some((rp) => rp.permission.key === PERMISSIONS.USERS_MANAGE);
        if (!keeps) throw new ForbiddenException('No puedes quitarte a ti mismo la gestión de usuarios');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        status: dto.status,
        roleId: dto.roleId,
      },
      select: userSelect,
    });
    return this.withPresence(toPublicUser(updated));
  }

  /**
   * Own password: the current one is required. Someone else's: users.manage is required and
   * the current password is not (that is how an admin resets a forgotten password).
   */
  async changePassword(id: number, dto: ChangePasswordDto, actor: AuthUser) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    const isSelf = actor.id === id;
    if (!isSelf && !hasPermission(actor, PERMISSIONS.USERS_MANAGE)) {
      throw new ForbiddenException('Solo puedes cambiar tu propia contraseña');
    }
    if (isSelf) {
      if (!dto.currentPassword) throw new BadRequestException('Indica tu contraseña actual');
      const ok = await bcrypt.compare(dto.currentPassword, target.password);
      if (!ok) throw new ForbiddenException('La contraseña actual no es correcta');
    }

    await this.prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(dto.newPassword, 10) },
    });
    return { ok: true };
  }

  async remove(id: number, actor: AuthUser) {
    if (actor.id === id) throw new ForbiddenException('No puedes eliminar tu propio usuario');
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuario no encontrado');
    await this.prisma.user.delete({ where: { id } });
    return { ok: true, name: target.name };
  }
}
