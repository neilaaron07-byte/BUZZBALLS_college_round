"use client";

import { Check, Download, ExternalLink, ScanSearch, ShieldCheck, Terminal } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, DataList } from "./ui/data";
import { Badge, StatusDot } from "./ui/navigation";
import { Banner, ProgressBar } from "./ui/feedback";
import { CodeBlock } from "./ui/visuals";
import { toast } from "./ui/overlays";
import { SeamDivider } from "./ui/seams";
import type { DashboardData, DashboardView } from "./dashboard-types";

const installSteps = [
  { id: "sdk", title: "Add the safe runtime", detail: "Load the signed manifest from your own origin and keep the inverse operation enabled." },
  { id: "extension", title: "Install the inspector", detail: "Use the MV3 side panel to select a live element and capture its semantic evidence." },
  { id: "origin", title: "Confirm the origin", detail: "Only same-origin pages are eligible for a patch preview or release handoff." },
];

export function InstallScreen({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const [complete, setComplete] = useState<ReadonlySet<string>>(new Set(["origin"]));
  const mark = (id: string) => setComplete((current) => new Set([...current, id]));
  const done = complete.size;
  return <div className="pw-route-screen pw-install-screen">
    <div className="pw-dashboard-heading"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" /> WORKSPACE / setup</span><h1 id="dashboard-page-title">Install PATCHWORK</h1><p>Connect one existing website, capture its real structure, and keep every future fix signed, reviewable, and reversible.</p></div><Button size="sm" leadingIcon={<ScanSearch size={14} aria-hidden="true" />} onClick={() => onNavigate("scan")}>Start a scan</Button></div>
    <Banner tone="green" title={`${done} of ${installSteps.length} setup checks complete`} description={`${data.site.name} is already scoped to a same-origin production environment. Finish the runtime and inspector steps before the first live capture.`} />
    <div className="pw-install-grid"><Card eyebrow="1 / Runtime" title="Add the SDK"><CodeBlock language="bash" code={`npm install @patchwork/sdk\n\nimport { startPatchwork } from "@patchwork/sdk";\nstartPatchwork({ manifestUrl: "/.well-known/patchwork.json" });`} /><div className="pw-install-card-footer"><StatusDot tone={complete.has("sdk") ? "green" : "amber"} label={complete.has("sdk") ? "Runtime marked ready" : "Review before marking ready"} /><Button size="sm" variant="secondary" leadingIcon={<Check size={13} aria-hidden="true" />} onClick={() => { mark("sdk"); toast.success("SDK step marked ready", { description: "The install checklist now includes the signed runtime boundary." }); }}>{complete.has("sdk") ? "Ready" : "Mark ready"}</Button></div></Card><Card eyebrow="2 / Inspector" title="Install the extension"><div className="pw-install-step-icon"><Download size={20} aria-hidden="true" /></div><p className="pw-install-copy">The inspector adds DOM breadcrumbs, resolver confidence, safe attribute controls, and local undo without publishing a change.</p><ol className="pw-install-list"><li><span>01</span>Load the unpacked extension build.</li><li><span>02</span>Open the PATCHWORK side panel.</li><li><span>03</span>Select the element that needs a fix.</li></ol><div className="pw-install-card-footer"><StatusDot tone={complete.has("extension") ? "green" : "amber"} label={complete.has("extension") ? "Inspector marked ready" : "Not marked yet"} /><Button size="sm" variant="secondary" leadingIcon={<Check size={13} aria-hidden="true" />} onClick={() => { mark("extension"); toast.success("Inspector step marked ready", { description: "The side-panel handoff is recorded locally." }); }}>{complete.has("extension") ? "Ready" : "Mark ready"}</Button></div></Card></div>
    <div className="pw-install-bottom"><Card eyebrow="Environment" title="Safe boundary checklist"><ProgressBar value={(done / installSteps.length) * 100} label="Setup progress" /><div className="pw-install-checks">{installSteps.map((step) => <button type="button" className={`pw-install-check${complete.has(step.id) ? " is-complete" : ""}`} key={step.id} onClick={() => mark(step.id)}><span>{complete.has(step.id) ? <Check size={14} aria-hidden="true" /> : <Terminal size={14} aria-hidden="true" />}</span><span><strong>{step.title}</strong><small>{step.detail}</small></span><Badge tone={complete.has(step.id) ? "green" : "amber"}>{complete.has(step.id) ? "Ready" : "Review"}</Badge></button>)}</div></Card><Card eyebrow="Next safe move" title="Capture the first finding"><div className="pw-install-next"><ShieldCheck size={18} aria-hidden="true" /><div><strong>Nothing publishes from install.</strong><p>The first scan only creates evidence. A patch still needs a target, reviewer, verification, and release policy.</p></div></div><Button size="sm" variant="secondary" leadingIcon={<ExternalLink size={13} aria-hidden="true" />} onClick={() => onNavigate("scan")}>Open scan workspace</Button><DataList items={[{ label: "Site", value: data.site.name }, { label: "Origin", value: data.site.environment }, { label: "Release", value: data.site.releaseVersion }]} /></Card></div>
    <SeamDivider label="INSTALL → SCAN · THE FIRST ACTION IS EVIDENCE" />
  </div>;
}
