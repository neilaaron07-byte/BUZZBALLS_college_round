"use client";

import { Activity, CircleHelp, FileClock, Grid2X2, Layers3, Menu, Moon, Rocket, ScanSearch, ShieldAlert, Sun, Users, X } from "lucide-react";
import { useState } from "react";
import { CommandPalette } from "./ui/command";
import { GridBackdrop } from "./ui/backgrounds";
import { Button, IconButton } from "./ui/button";
import { Badge, StatusDot } from "./ui/navigation";
import { PatchworkLogo, SeamDivider } from "./ui/seams";
import { ToastRegion, toast, Tooltip } from "./ui/overlays";
import { useTheme } from "./ui/theme-provider";
import type { DashboardData, DashboardView } from "./dashboard-types";
import { dashboardRoutes, routeLabel } from "./routes";

const iconMap = { grid: Grid2X2, scan: ScanSearch, patch: Layers3, rocket: Rocket, pulse: Activity, users: Users, link: FileClock } as const;

export function DashboardShell({ data, view, onNavigate, children }: Readonly<{ data: DashboardData; view: DashboardView; onNavigate: (view: DashboardView) => void; children: React.ReactNode }>) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isSeed = data.source === "seed";
  const navigate = (nextView: DashboardView) => { onNavigate(nextView); setMobileNavOpen(false); };
  const commandItems = dashboardRoutes.map((route) => ({ id: route.id, label: route.label, detail: route.description, onSelect: () => navigate(route.id) }));

  return <GridBackdrop className="pw-dashboard"><div className="pw-dashboard-frame">
    <aside className={`pw-dashboard-sidebar${mobileNavOpen ? " is-open" : ""}`} aria-label="Workspace navigation">
      <div className="pw-dashboard-sidebar-top"><PatchworkLogo /><IconButton className="pw-dashboard-mobile-close" label="Close navigation" size="sm" onClick={() => setMobileNavOpen(false)}><X size={15} aria-hidden="true" /></IconButton></div>
      <div className="pw-dashboard-project"><span className="pw-dashboard-project-mark">S</span><span><strong>{data.site.name}</strong><small>{data.site.repository}</small></span><span className="pw-dashboard-project-chevron" aria-hidden="true">⌄</span></div>
      <SeamDivider label="workspace" />
      <nav className="pw-dashboard-nav">{dashboardRoutes.map((route) => { const Icon = iconMap[route.icon as keyof typeof iconMap] ?? Grid2X2; return <button type="button" className={`pw-dashboard-nav-item${route.id === view ? " is-active" : ""}`} aria-current={route.id === view ? "page" : undefined} onClick={() => navigate(route.id)} key={route.id}><Icon size={15} strokeWidth={1.8} aria-hidden="true" /><span>{route.label}</span>{route.id === "scan" && data.workspace.findings.length > 0 ? <Badge tone="amber">{data.workspace.findings.length}</Badge> : null}</button>; })}</nav>
      <div className="pw-dashboard-sidebar-bottom"><div className="pw-dashboard-health"><StatusDot tone={data.workspace.risk.tone} label={data.workspace.risk.label} /><small>Last updated {formatRelativeTime(data.updatedAt)}</small></div><button type="button" className="pw-dashboard-help" onClick={() => toast.message("Help center is anchored to the current workflow", { description: "Start with the next action in this workspace." })}><CircleHelp size={15} aria-hidden="true" /><span>How PATCHWORK works</span></button><div className="pw-dashboard-user"><span className="pw-dashboard-avatar">{initials(data.site.owner)}</span><span><strong>{data.site.owner}</strong><small>Site owner</small></span><span className="pw-dashboard-user-status" aria-label="Online" /></div></div>
    </aside>
    {mobileNavOpen ? <button type="button" className="pw-dashboard-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
    <section className="pw-dashboard-main">
      <header className="pw-dashboard-topbar"><IconButton className="pw-dashboard-mobile-menu" label="Open navigation" size="sm" onClick={() => setMobileNavOpen(true)}><Menu size={17} aria-hidden="true" /></IconButton><div className="pw-dashboard-breadcrumb"><span>ShopNest</span><span aria-hidden="true">/</span><strong>{routeLabel(view)}</strong></div><div className="pw-dashboard-topbar-actions"><CommandPalette items={commandItems} /><Tooltip label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}><IconButton label="Toggle theme" size="sm" onClick={toggleTheme}>{resolvedTheme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}</IconButton></Tooltip><Button size="sm" variant="secondary" leadingIcon={<Rocket size={14} aria-hidden="true" />} onClick={() => navigate("releases")}>Ship</Button></div></header>
      {isSeed ? <div className="pw-dashboard-source-banner"><ShieldAlert size={14} aria-hidden="true" /><span><strong>Demo workspace</strong> showing deterministic ShopNest evidence while the API connection is offline.</span><button type="button" onClick={() => toast.message("API connection is checked when this workspace refreshes")}>Why?</button></div> : null}
      <main className="pw-dashboard-content" aria-labelledby="dashboard-page-title">{children}</main>
    </section>
    <ToastRegion />
  </div></GridBackdrop>;
}

function initials(name: string): string { return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase(); }

function formatRelativeTime(value: string): string {
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes === 1) return "1 min ago";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  return `${Math.round(elapsedMinutes / 60)} hr ago`;
}
