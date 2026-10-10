"use client";

import { Check, Copy, GitPullRequest, RefreshCw, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, Table } from "./ui/data";
import { Badge, Avatar, AvatarStack, StatusDot } from "./ui/navigation";
import { ProgressBar, StatusExplanation } from "./ui/feedback";
import { toast } from "./ui/overlays";
import { SeamDivider } from "./ui/seams";
import type { DashboardData, DashboardView } from "./dashboard-types";

const pullRequest = { number: 482, title: "Fix product price contrast on checkout", branch: "patch/price-contrast", base: "main", opened: "18 minutes ago" };
const collaborators = [
  { name: "Maya Singh", role: "Patch author", access: "Write", state: "Working", tone: "violet" as const },
  { name: "Lena Ortiz", role: "Accessibility lead", access: "Review", state: "Required", tone: "amber" as const },
  { name: "Owen Brooks", role: "Release operator", access: "Deploy", state: "Watching", tone: "green" as const },
];

export function CollaboratorsScreen({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const [synced, setSynced] = useState(false);
  const patch = data.workspace.patches[0];
  const copyBranch = () => { void navigator.clipboard?.writeText(pullRequest.branch); toast.success("Branch name copied", { description: "The review handoff is ready to paste into your Git client." }); };
  const refreshChecks = () => { setSynced(true); toast.message("Checks refreshed", { description: "The local review snapshot is current and the required reviewer is still visible." }); };
  return <div className="pw-route-screen pw-collaborators-screen">
    <div className="pw-dashboard-heading"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" /> FIX / people</span><h1 id="dashboard-page-title">Collaborators</h1><p>Keep the pull request, people, and release checks in the same seam as the patch. Ownership should never be hidden in a chat thread.</p></div><div className="pw-dashboard-heading-actions"><Button size="sm" variant="secondary" leadingIcon={<RefreshCw size={14} aria-hidden="true" />} onClick={refreshChecks}>{synced ? "Checks current" : "Refresh checks"}</Button><Button size="sm" leadingIcon={<GitPullRequest size={14} aria-hidden="true" />} onClick={() => onNavigate("reviews")}>Open review</Button></div></div>
    <section className="pw-pr-banner"><div className="pw-pr-icon"><GitPullRequest size={20} aria-hidden="true" /></div><div><Badge tone="violet">PR #{pullRequest.number}</Badge><h2>{pullRequest.title}</h2><p><code>{pullRequest.branch}</code> into <code>{pullRequest.base}</code> · opened {pullRequest.opened}</p></div><StatusDot tone="amber" label="Review required" /></section>
    <div className="pw-collaborator-grid"><Card eyebrow="Pull request context" title="One patch, one decision" action={<Button size="sm" variant="quiet" leadingIcon={<Copy size={13} aria-hidden="true" />} onClick={copyBranch}>Copy branch</Button>}><div className="pw-pr-context"><div><span>PATCH</span><strong>{patch?.id ?? "patch_price_contrast"}</strong><p>{patch?.description ?? "A safe content and color adjustment for the checkout price."}</p></div><div className="pw-pr-context-stats"><span><strong>{patch?.operationCount ?? 1}</strong> operation</span><span><strong>{patch?.revision ?? 2}</strong> revision</span><span><strong>99%</strong> target confidence</span></div></div><div className="pw-pr-checks"><CheckRow label="Target fingerprint resolves" detail="Exact semantic match in the captured snapshot" tone="green" /><CheckRow label="Visual diff is bounded" detail="One price label, one route, no layout shift" tone="green" /><CheckRow label="Accessibility review" detail="Lena Ortiz still needs to approve" tone="amber" /></div></Card><aside className="pw-collaborator-side"><Card eyebrow="Release owner" title="Owen Brooks"><div className="pw-owner-card"><Avatar name="Owen Brooks" /><div><strong>Owen owns the ship decision.</strong><p>He receives the signed manifest only after review and verification are green.</p></div></div><StatusExplanation tone="amber" title="Waiting on human review" description="The technical checks pass. The next safe action is a reviewer decision." /></Card><Card eyebrow="Review progress" title="Ready with one handoff"><ProgressBar value={synced ? 88 : 76} label="Review evidence" /><Button size="sm" variant="secondary" onClick={() => onNavigate("verification")}>Open verification</Button></Card></aside></div>
    <Card eyebrow="People in the loop" title="Named ownership" action={<AvatarStack people={collaborators.map((person) => ({ name: person.name }))} />}><Table caption="PATCHWORK collaborators and access" columns={[{ key: "person", label: "Person", sortable: true }, { key: "role", label: "Role" }, { key: "access", label: "Access" }, { key: "state", label: "State" }]} rows={collaborators.map((person) => ({ person: <span className="pw-table-person"><Avatar name={person.name} /><strong>{person.name}</strong></span>, role: person.role, access: <Badge tone="neutral">{person.access}</Badge>, state: <Badge tone={person.tone}>{person.state}</Badge> }))} /></Card>
    <SeamDivider label="PEOPLE → PROOF · OWNERSHIP STAYS BESIDE THE CHANGE" />
  </div>;
}

function CheckRow({ label, detail, tone }: Readonly<{ label: string; detail: string; tone: "green" | "amber" }>) { return <div className="pw-pr-check-row"><span className={`pw-check-mark pw-check-${tone}`}>{tone === "green" ? <Check size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}</span><span><strong>{label}</strong><small>{detail}</small></span><Badge tone={tone}>{tone === "green" ? "Passed" : "Review"}</Badge></div>; }
