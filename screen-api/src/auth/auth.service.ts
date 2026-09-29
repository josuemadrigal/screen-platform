import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PermissionKey } from './permissions';

/** Fields of a user that are safe to return to clients (never the password hash). */
export const userSelect = {
  id: true,
  name: true,
  user: true,
  email: true,
  status: true,
  roleId: true,
  lastLoginAt: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  },
} as const;

/** Flatten role.permissions into a plain list of keys for the client. */
export function toPublicUser<T extends { role?: { permissions: { permission: { key: string } }[] } | null }>(
  user: T,
) {
  const { role, ...rest } = user;
  return {
    ...rest,
    role: role ? { id: (role as any).id, name: (role as any).name, description: (role as any).description, isSystem: (role as any).isSystem } : null,
    permissions: (role?.permissions ?? []).map((rp) => rp.permission.key as PermissionKey),
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Creates a user. `roleId` defaults to the "viewer" role; the very first user of an
   * installation (bootstrap) becomes admin so someone can manage the rest.
   */
  async register(registerDto: RegisterDto) {
    const { email, password, name, user: username } = registerDto;

    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { user: username }] },
    });
    if (exists) throw new ConflictException('El correo o el nombre de usuario ya existen');

    const isFirstUser = (await this.prisma.user.count()) === 0;
    let roleId = registerDto.roleId ?? null;
    if (isFirstUser) {
      roleId = (await this.prisma.role.findUnique({ where: { name: 'admin' } }))?.id ?? null;
    } else if (roleId == null) {
      roleId = (await this.prisma.role.findUnique({ where: { name: 'viewer' } }))?.id ?? null;
    } else if (!(await this.prisma.role.findUnique({ where: { id: roleId } }))) {
      throw new ConflictException('El rol indicado no existe');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await this.prisma.user.create({
      data: { email, name, user: username, password: hashedPassword, roleId },
      select: userSelect,
    });
    return { user: toPublicUser(created) };
  }

  async login(loginDto: LoginDto) {
    const { email: emailOrUser, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: emailOrUser }, { user: emailOrUser }] },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (user.status !== '1') throw new UnauthorizedException('Usuario desactivado');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales inválidas');

    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now, lastSeenAt: now },
      select: userSelect,
    });

    const payload = { sub: user.id, email: user.email };
    return {
      user: toPublicUser(updated),
      token: await this.jwtService.signAsync(payload),
    };
  }

  async validateUser(payload: { sub: number }) {
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }
}
