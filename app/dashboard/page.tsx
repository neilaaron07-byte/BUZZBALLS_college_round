"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "../../apps/dashboard/src/dashboard-shell";
import { loadDashboardData } from "../../apps/dashboard/src/api-client";
import { OverviewScreen } from "../../apps/dashboard/src/overview-screen";
import { RoutePlaceholder } from "../../apps/dashboard/src/route-placeholder";
import { ErrorState, Skeleton } from "../../apps/dashboard/src/ui/feedback";
import { cloneFixture } from "../../apps/dashboard/src/fixture";
import type { DashboardData, DashboardView } from "../../apps/dashboard/src/dashboard-types";
import { routeForView } from "../../apps/dashboard/src/routes";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("overview");

  useEffect(() => {
    const queryView = new URLSearchParams(window.location.search).get("view");
    const pathView = window.location.pathname.split("/").filter(Boolean).at(-1);
    const nextView = routeForView(queryView ?? (pathView === "dashboard" ? null : pathView ?? null));
    const frame = window.requestAnimationFrame(() => setView(nextView));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboardData(controller.signal).then(setData).catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError("The workspace could not be loaded."); });
    return () => controller.abort();
  }, []);

  const navigate = (nextView: DashboardView) => { setView(nextView); window.history.pushState({}, "", `/dashboard?view=${nextView}`); };
  if (!data && !error) return <DashboardLoading />;
  if (error) return <div className="pw-dashboard-error-page"><ErrorState title="Workspace unavailable" description="PATCHWORK could not load the operator workspace. The local demo can still be opened from the retry action." onRetry={() => { setData(cloneFixture()); setError(null); }} /></div>;
  if (!data) return null;
  return <DashboardShell data={data} view={view} onNavigate={navigate}>{view === "overview" ? <OverviewScreen data={data} onNavigate={navigate} /> : <RoutePlaceholder data={data} view={view} onNavigate={navigate} />}</DashboardShell>;
}

function DashboardLoading() {
  return <div className="pw-dashboard-loading"><div className="pw-dashboard-loading-sidebar"><Skeleton width={124} height={25} /><Skeleton height={38} /><Skeleton height={12} /><Skeleton height={12} /><Skeleton height={12} /></div><main><div className="pw-dashboard-loading-topbar"><Skeleton width={180} height={14} /><Skeleton width={96} height={30} /></div><div className="pw-dashboard-loading-content"><Skeleton width={180} height={12} /><Skeleton width="54%" height={48} /><Skeleton width="42%" height={18} /><div className="pw-dashboard-loading-card"><Skeleton width={110} height={12} /><Skeleton width="72%" height={24} /><Skeleton width="90%" height={12} /><Skeleton width="86%" height={12} /></div></div></main></div>;
}
