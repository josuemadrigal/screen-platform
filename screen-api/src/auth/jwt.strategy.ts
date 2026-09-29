import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, PermissionKey } from './permissions';

/** Do not write lastSeenAt on every request; once a minute per user is enough. */
const SEEN_THROTTLE_MS = 60 * 1000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'secret',
    });
  }

  async validate(payload: { sub: number }): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user || user.status !== '1') throw new UnauthorizedException();

    const now = Date.now();
    if (!user.lastSeenAt || now - user.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
      // Fire and forget; presence tracking must never slow a request down.
      this.prisma.user
        .update({ where: { id: user.id }, data: { lastSeenAt: new Date(now) } })
        .catch(() => {});
    }

    return {
      id: user.id,
      name: user.name,
      user: user.user,
      email: user.email,
      status: user.status,
      roleId: user.roleId,
      role: user.role ? { id: user.role.id, name: user.role.name, isSystem: user.role.isSystem } : null,
      permissions: (user.role?.permissions ?? []).map((rp) => rp.permission.key as PermissionKey),
    };
  }
}
