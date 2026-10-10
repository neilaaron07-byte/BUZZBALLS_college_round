"use client";

import { CheckCircle2, Copy, Download, Link2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/data";
import { SegmentedControl, StatusDot } from "./ui/navigation";
import { AuditChain } from "./ui/signature-motion";
import { Timeline } from "./ui/visuals";
import { SeamDivider } from "./ui/seams";
import { toast } from "./ui/overlays";
import type { DashboardActivity, DashboardData, DashboardView } from "./dashboard-types";

type AuditFilter = "all" | DashboardActivity["type"];

export function AuditScreen({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const [filter, setFilter] = useState<AuditFilter>("all");
  const [tampered, setTampered] = useState(false);
  const items = useMemo(() => data.workspace.recentActivity.filter((item) => filter === "all" || item.type === filter), [data.workspace.recentActivity, filter]);
  const exportAudit = () => { const csv = ["timestamp,type,title,detail", ...data.workspace.recentActivity.map((item) => [item.timestamp, item.type, item.title, item.detail].map((value) => `"${value.replaceAll('"', '""')}"`).join(","))].join("\n"); void navigator.clipboard?.writeText(csv); toast.success("Audit export copied", { description: "The visible evidence is ready to paste into a handoff or incident report." }); };
  return <div className="pw-route-screen pw-audit-screen"><div className="pw-dashboard-heading"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" /> SHIP / proof</span><h1 id="dashboard-page-title">Audit trail</h1><p>Every scan, review, release, health signal, and rollback is chained into one readable history.</p></div><div className="pw-dashboard-heading-actions"><Button size="sm" variant="secondary" leadingIcon={<Copy size={14} aria-hidden="true" />} onClick={exportAudit}>Copy CSV</Button><Button size="sm" leadingIcon={<ShieldCheck size={14} aria-hidden="true" />} onClick={() => onNavigate("releases")}>Release proof</Button></div></div><section className={`pw-audit-integrity${tampered ? " is-tampered" : ""}`}><div className="pw-audit-integrity-mark">{tampered ? <TriangleAlert size={20} aria-hidden="true" /> : <CheckCircle2 size={20} aria-hidden="true" />}</div><div><StatusDot tone={tampered ? "red" : "green"} label={tampered ? "Chain broken" : "Chain intact"} /><h2>{tampered ? "A tamper test found a broken link." : "The evidence chain is intact."}</h2><p>{tampered ? "This is a local demonstration of the failure state. PATCHWORK would block release handoff until the chain is repaired." : "Every entry points to the prior hash. The current release has one signed snapshot and five attached events."}</p></div><Button size="sm" variant={tampered ? "danger" : "secondary"} onClick={() => setTampered((value) => !value)}>{tampered ? "Repair demo chain" : "Run tamper test"}</Button></section><div className="pw-audit-grid"><Card eyebrow="Chain" title="Immutable by default"><AuditChain entries={["scan_20261010_01", "patch_price_contrast", "verify_rel_20261010_03", "release_20261010_03"]} /><div className="pw-audit-hash"><Link2 size={14} aria-hidden="true" /><span><strong>Current hash</strong><code>sha256:8f2c84…e19a</code></span></div></Card><Card eyebrow="Export" title="Handoff evidence"><div className="pw-audit-export"><Download size={18} aria-hidden="true" /><strong>{data.workspace.recentActivity.length} events ready</strong><p>Copy a stable CSV view for incident review without exposing private tokens or credentials.</p><Button size="sm" variant="secondary" onClick={exportAudit}>Copy visible events</Button></div></Card></div><Card eyebrow="History" title="What happened" action={<SegmentedControl options={[{ value: "all", label: "All" }, { value: "finding", label: "Findings" }, { value: "review", label: "Reviews" }, { value: "health", label: "Health" }]} value={filter} onValueChange={(value) => setFilter(value as AuditFilter)} />}><Timeline items={items.map((item) => ({ title: item.title, detail: item.detail, time: formatTime(item.timestamp), tone: item.severity === "critical" ? "amber" : item.type === "health" ? "green" : "violet" }))} /></Card><SeamDivider label="AUDIT → TRUST · EACH ENTRY EXPLAINS THE NEXT MOVE" /></div>;
}

function formatTime(value: string): string { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(value)); }
