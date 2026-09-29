/**
 * Permission keys. The catalogue lives in the `permissions` table (seeded by migration);
 * these constants keep controller decorators typo-safe.
 */
export const PERMISSIONS = {
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  CONTENT_MANAGE: 'content.manage',
  SCREENS_CONTROL: 'screens.control',
  HISTORY_VIEW: 'history.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Shape of `req.user` once the JWT strategy resolved the user with its role. */
export interface AuthUser {
  id: number;
  name: string;
  user: string;
  email: string;
  status: string;
  roleId: number | null;
  role: { id: number; name: string; isSystem: boolean } | null;
  permissions: PermissionKey[];
}

export const hasPermission = (user: AuthUser | undefined, key: PermissionKey) =>
  !!user && user.permissions.includes(key);
