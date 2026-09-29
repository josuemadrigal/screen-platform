import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS } from '../auth/permissions';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

const roleSelect = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { permission: { select: { key: true } } } },
  _count: { select: { users: true } },
} as const;

const toPublicRole = (r: any) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  isSystem: r.isSystem,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  permissions: r.permissions.map((rp: any) => rp.permission.key as string),
  usersCount: r._count.users as number,
});

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { id: 'asc' } });
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({ select: roleSelect, orderBy: { id: 'asc' } });
    return roles.map(toPublicRole);
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id }, select: roleSelect });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return toPublicRole(role);
  }

  private async permissionIds(keys: string[]) {
    const found = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    const missing = keys.filter((k) => !found.some((p) => p.key === k));
    if (missing.length) throw new BadRequestException(`Permisos desconocidos: ${missing.join(', ')}`);
    return found.map((p) => p.id);
  }

  async create(dto: CreateRoleDto) {
    if (await this.prisma.role.findUnique({ where: { name: dto.name } })) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }
    const ids = await this.permissionIds(dto.permissions);
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: { create: ids.map((permissionId) => ({ permissionId })) },
      },
      select: roleSelect,
    });
    return toPublicRole(role);
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    if (dto.name && dto.name !== role.name) {
      if (await this.prisma.role.findUnique({ where: { name: dto.name } })) {
        throw new ConflictException('Ya existe un rol con ese nombre');
      }
    }
    // The system admin role always keeps user management, so nobody can orphan the install.
    if (role.isSystem && dto.permissions && !dto.permissions.includes(PERMISSIONS.USERS_MANAGE)) {
      throw new ForbiddenException('El rol admin debe conservar la gestión de usuarios');
    }

    const ids = dto.permissions ? await this.permissionIds(dto.permissions) : undefined;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (ids) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({ data: ids.map((permissionId) => ({ roleId: id, permissionId })) });
      }
      return tx.role.update({
        where: { id },
        data: { name: dto.name, description: dto.description },
        select: roleSelect,
      });
    });
    return toPublicRole(updated);
  }

  async remove(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    if (role.isSystem) throw new ForbiddenException('Los roles del sistema no se pueden eliminar');
    if (role._count.users > 0) throw new ConflictException(`Hay ${role._count.users} usuario(s) con este rol; reasígnalos primero`);
    await this.prisma.role.delete({ where: { id } });
    return { ok: true, name: role.name };
  }
}
