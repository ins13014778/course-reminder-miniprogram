import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'admin:roles';

export type AdminRole = 'super_admin' | 'operator' | 'moderator' | 'support';

export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
