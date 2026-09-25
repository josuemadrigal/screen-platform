import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const IS_BOOTSTRAP_KEY = 'isBootstrap';

/** Route reachable without a JWT (login, TV client lookups, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Route reachable without a JWT only while the users table is empty,
 * so the very first admin can be created on a fresh install.
 * Once a user exists, a valid JWT is required as usual.
 */
export const BootstrapPublic = () => SetMetadata(IS_BOOTSTRAP_KEY, true);
