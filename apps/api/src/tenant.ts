import type { Request } from "express";
import type { Site } from "../../../packages/core/src/index";
import type { ApiState, Collaborator } from "./types";
import { ApiError } from "./errors";

export interface TenantContext {
  site: Site;
  collaborator: Collaborator;
  isOwner: boolean;
}

export function resolveTenant(state: ApiState, request: Request, siteId: string): TenantContext {
  const site = state.sites.find((candidate) => candidate.id === siteId);
  if (!site) throw new ApiError(404, "SITE_NOT_FOUND", `Site ${siteId} was not found.`);
  const actorId = request.header("x-patchwork-actor") ?? site.owner.id;
  const collaborator = state.collaborators.find((candidate) => candidate.siteId === siteId && candidate.author.id === actorId);
  if (!collaborator) throw new ApiError(403, "TENANT_ACCESS_DENIED", "The caller is not a collaborator on this site.");
  return { site, collaborator, isOwner: collaborator.role === "owner" };
}

export function tenantSiteIds(state: ApiState, collaboratorId: string): readonly string[] {
  return state.collaborators.filter((collaborator) => collaborator.author.id === collaboratorId).map((collaborator) => collaborator.siteId);
}

export function tenantSummary(state: ApiState, siteId: string): { siteId: string; collaborators: number; environments: number; protectedEnvironments: number } {
  const environments = state.environments.filter((environment) => environment.siteId === siteId);
  return { siteId, collaborators: state.collaborators.filter((collaborator) => collaborator.siteId === siteId).length, environments: environments.length, protectedEnvironments: environments.filter((environment) => environment.protected).length };
}
