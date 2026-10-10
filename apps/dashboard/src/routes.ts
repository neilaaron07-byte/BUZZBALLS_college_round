import type { DashboardRoute, DashboardView } from "./dashboard-types";

export const dashboardRoutes: readonly DashboardRoute[] = [
  { id: "overview", label: "Overview", shortLabel: "Home", description: "What needs your attention now", icon: "grid" },
  { id: "scan", label: "Scan findings", shortLabel: "Scan", description: "Evidence, confidence, and blast radius", icon: "scan" },
  { id: "patches", label: "Patches", shortLabel: "Fix", description: "Drafts, reviews, and safe previews", icon: "patch" },
  { id: "releases", label: "Releases", shortLabel: "Ship", description: "Policy, canary, and promotion", icon: "rocket" },
  { id: "incidents", label: "Incidents", shortLabel: "Health", description: "Signals, rollback, and recovery", icon: "pulse" },
  { id: "reviews", label: "Review inbox", shortLabel: "Reviews", description: "Owners, approvals, and checks", icon: "users" },
  { id: "audit", label: "Audit trail", shortLabel: "Audit", description: "Immutable history and evidence", icon: "link" },
];

export function routeForView(view: string | null): DashboardView {
  return dashboardRoutes.some((route) => route.id === view) ? view as DashboardView : "overview";
}

export function dashboardHref(view: DashboardView): string {
  return `/dashboard?view=${view}`;
}

export function routeLabel(view: DashboardView): string {
  return dashboardRoutes.find((route) => route.id === view)?.label ?? "Overview";
}
