import type { DashboardRoute, DashboardView } from "./dashboard-types";

export const dashboardRoutes: readonly DashboardRoute[] = [
  { id: "overview", label: "Overview", shortLabel: "Home", description: "What needs your attention now", icon: "grid" },
  { id: "scan", label: "Scan findings", shortLabel: "Scan", description: "Evidence, confidence, and blast radius", icon: "scan" },
  { id: "patches", label: "Patches", shortLabel: "Fix", description: "Drafts, reviews, and safe previews", icon: "patch" },
  { id: "conflicts", label: "Conflicts", shortLabel: "Merge", description: "Explicit decisions for colliding changes", icon: "merge" },
  { id: "verification", label: "Verification", shortLabel: "Verify", description: "Browser proof before public traffic", icon: "verify" },
  { id: "releases", label: "Releases", shortLabel: "Ship", description: "Policy, canary, and promotion", icon: "rocket" },
  { id: "incidents", label: "Incidents", shortLabel: "Health", description: "Signals, rollback, and recovery", icon: "pulse" },
  { id: "reviews", label: "Review inbox", shortLabel: "Reviews", description: "Owners, approvals, and checks", icon: "users" },
  { id: "collaborators", label: "Collaborators", shortLabel: "People", description: "PR context, owners, and checks", icon: "people" },
  { id: "evidence", label: "Evidence", shortLabel: "Proof", description: "Benchmarks, budgets, and quality gates", icon: "chart" },
  { id: "install", label: "Install", shortLabel: "Install", description: "SDK and extension setup", icon: "download" },
  { id: "audit", label: "Audit trail", shortLabel: "Audit", description: "Immutable history and evidence", icon: "link" },
  { id: "settings", label: "Settings", shortLabel: "Settings", description: "Site policy and notifications", icon: "settings" },
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
