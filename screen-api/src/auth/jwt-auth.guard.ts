import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { IS_BOOTSTRAP_KEY, IS_PUBLIC_KEY } from './public.decorator';

/**
 * Global guard: every HTTP route requires a Bearer JWT unless it is marked
 * with @Public(), or with @BootstrapPublic() while no user exists yet.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    if (this.reflector.getAllAndOverride<boolean>(IS_BOOTSTRAP_KEY, targets)) {
      const users = await this.prisma.user.count();
      if (users === 0) return true;
    }

    return (await super.canActivate(context)) as boolean;
  }
}
