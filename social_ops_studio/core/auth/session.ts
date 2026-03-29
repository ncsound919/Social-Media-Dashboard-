/**
 * Session helper for reading user roles from JWT claims and mapping to RBAC.
 * Integrates with Authelia OIDC claims and TeamCollaborationService roles.
 */

import type { TeamRole, TeamPermission } from '../../data/models';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  groups: string[];
  permissions: TeamPermission[];
}

// Role-based permission mapping mirrors TeamCollaborationService
const rolePermissions: Record<TeamRole, TeamPermission[]> = {
  admin: [
    'create_posts',
    'edit_posts',
    'delete_posts',
    'publish_posts',
    'view_analytics',
    'manage_team',
    'manage_settings',
    'approve_posts',
  ],
  editor: ['create_posts', 'edit_posts', 'view_analytics', 'approve_posts'],
  viewer: ['view_analytics'],
};

/**
 * Map Authelia group names to an application TeamRole.
 * Priority order: admin > editor > viewer (default).
 */
const ADMIN_GROUPS = ['admin', 'admins'];
const EDITOR_GROUPS = ['editor', 'editors'];

export function mapGroupsToRole(groups: string[]): TeamRole {
  const normalised = groups.map(g => g.toLowerCase());

  if (normalised.some(g => ADMIN_GROUPS.includes(g))) {
    return 'admin';
  }

  if (normalised.some(g => EDITOR_GROUPS.includes(g))) {
    return 'editor';
  }
  return 'viewer';
}

/**
 * Build a SessionUser from raw JWT claims returned by Authelia.
 */
export function buildSessionUser(claims: Record<string, unknown>): SessionUser {
  const sub = typeof claims.sub === 'string' ? claims.sub : '';
  const email = typeof claims.email === 'string' ? claims.email : '';
  const name =
    typeof claims.name === 'string'
      ? claims.name
      : typeof claims.preferred_username === 'string'
      ? claims.preferred_username
      : email;

  // Authelia returns group memberships in the `groups` claim as a string array
  const rawGroups = claims.groups;
  const groups: string[] = Array.isArray(rawGroups)
    ? rawGroups.filter((g): g is string => typeof g === 'string')
    : [];

  const role = mapGroupsToRole(groups);
  const permissions = rolePermissions[role];

  return { id: sub, email, name, role, groups, permissions };
}

/**
 * Check whether a session user holds a given permission.
 */
export function hasPermission(user: SessionUser, permission: TeamPermission): boolean {
  return user.permissions.includes(permission);
}
