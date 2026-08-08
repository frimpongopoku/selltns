import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Marks a route as requiring the caller's active-tenant role to be one of
// `roles`. Must be paired with @UseGuards(JwtAuthGuard, RolesGuard) — this
// decorator only attaches metadata, RolesGuard is what enforces it.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
