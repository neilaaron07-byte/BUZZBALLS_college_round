"use client";

import { useEffect, useState } from "react";
import { FixPage } from "../../apps/dashboard/src/fix-page";
import { loadDashboardData } from "../../apps/dashboard/src/api-client";
import { cloneFixture } from "../../apps/dashboard/src/fixture";
import type { DashboardData } from "../../apps/dashboard/src/dashboard-types";

export default function FixRoute() {
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => { const controller = new AbortController(); void loadDashboardData(controller.signal).then(setData).catch(() => setData(cloneFixture())); return () => controller.abort(); }, []);
  return data ? <FixPage data={data} /> : <main className="pw-fix-loading" aria-live="polite">Preparing the guided fix workspace…</main>;
}
