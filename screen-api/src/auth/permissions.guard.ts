import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser, PermissionKey, hasPermission } from './permissions';

export const PERMISSION_KEY = 'requiredPermission';

/** Route needs the given permission (checked after the JWT guard resolved req.user). */
export const RequirePermission = (permission: PermissionKey) => SetMetadata(PERMISSION_KEY, permission);

/**
 * Global guard, registered after JwtAuthGuard. Public/bootstrap routes reach it without
 * req.user; they only pass when they carry no permission requirement, or when the JWT guard
 * let an unauthenticated bootstrap request through (first user on an empty install).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;
    if (!user) {
      // Only possible on @Public/@BootstrapPublic routes; those decide their own access.
      return true;
    }
    if (!hasPermission(user, required)) {
      throw new ForbiddenException(`Requiere el permiso ${required}`);
    }
    return true;
  }
}
