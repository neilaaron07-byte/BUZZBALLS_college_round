import type { Request } from "express";
import type { Collaborator } from "./types";
import { ApiError } from "./errors";

export type Permission = "site:read" | "site:edit" | "patch:create" | "patch:review" | "release:publish" | "release:rollback" | "audit:export" | "workspace:import";

const rolePermissions: Readonly<Record<Collaborator["role"], readonly Permission[]>> = {
  owner: ["site:read", "site:edit", "patch:create", "patch:review", "release:publish", "release:rollback", "audit:export", "workspace:import"],
  editor: ["site:read", "site:edit", "patch:create", "patch:review", "audit:export"],
  reviewer: ["site:read", "patch:review", "audit:export"],
  viewer: ["site:read"],
};

export function permissionsFor(role: Collaborator["role"]): readonly Permission[] {
  return rolePermissions[role];
}

export function can(role: Collaborator["role"], permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function requirePermission(collaborator: Collaborator | undefined, permission: Permission): void {
  if (!collaborator || !can(collaborator.role, permission)) throw new ApiError(403, "PERMISSION_DENIED", `Your PATCHWORK role cannot ${permission.replace(":", " ")}.`);
}

export function collaboratorFromRequest(request: Request, collaborators: readonly Collaborator[], siteId: string): Collaborator | undefined {
  const actorId = request.header("x-patchwork-actor") ?? collaborators.find((collaborator) => collaborator.siteId === siteId)?.author.id;
  return collaborators.find((collaborator) => collaborator.siteId === siteId && collaborator.author.id === actorId);
}

export function permissionMatrix(): readonly { role: Collaborator["role"]; permissions: readonly Permission[] }[] {
  return (Object.keys(rolePermissions) as Collaborator["role"][]).map((role) => ({ role, permissions: rolePermissions[role] }));
}
