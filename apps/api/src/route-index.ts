export const routeGroups = ["system", "sites", "scans", "patches", "reviews", "collaborators", "conflicts", "previews", "verification", "releases", "health", "audit", "integrations", "dashboard", "analytics", "workspace"] as const;

export type RouteGroup = (typeof routeGroups)[number];

export function routeGroupExists(value: string): value is RouteGroup {
  return (routeGroups as readonly string[]).includes(value);
}

export function routePrefix(group: RouteGroup): string {
  return group === "system" ? "/" : "/api";
}

export function routeInventory(): readonly { group: RouteGroup; prefix: string }[] {
  return routeGroups.map((group) => ({ group, prefix: routePrefix(group) }));
}
