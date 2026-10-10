"use client";

import { Check, CheckCircle2, Clock3, MessageSquare, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/data";
import { Avatar, AvatarStack, Badge } from "./ui/navigation";
import { ProgressBar, StatusExplanation } from "./ui/feedback";
import { toast } from "./ui/overlays";
import { SeamDivider } from "./ui/seams";
import type { DashboardData, DashboardView } from "./dashboard-types";

export function ReviewsScreen({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const [decision, setDecision] = useState<"pending" | "approved" | "changes">("pending");
  const [note, setNote] = useState("");
  const patch = data.workspace.patches[0];
  const submit = (next: "approved" | "changes") => {
    setDecision(next);
    setNote(next === "approved" ? "Target and inverse operation are explicit. Ready for verification." : "Please attach the updated target screenshot before release.");
    toast.message(next === "approved" ? "Review approved" : "Changes requested", { description: "The decision is visible beside the patch and release evidence." });
  };

  return <div className="pw-route-screen pw-reviews-screen">
    <div className="pw-dashboard-heading"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" /> FIX / people</span><h1 id="dashboard-page-title">Review inbox</h1><p>A good review is one small decision with the evidence beside it. Approve, request changes, or leave the patch out of production.</p></div><Button size="sm" variant="secondary" leadingIcon={<ShieldCheck size={14} aria-hidden="true" />} onClick={() => onNavigate("patches")}>Back to patch</Button></div>
    <div className="pw-review-inbox-layout">
      <Card eyebrow="Needs your decision" title={patch?.title ?? "No patch waiting"} action={<Badge tone={decision === "approved" ? "green" : decision === "changes" ? "red" : "amber"}>{decision === "approved" ? "Approved" : decision === "changes" ? "Changes requested" : "Awaiting review"}</Badge>}>
        <div className="pw-review-summary"><div><span className="pw-review-summary-label">PATCH</span><strong>{patch?.id ?? "—"}</strong><p>{patch?.description ?? "There are no patches in this workspace."}</p></div><div className="pw-review-meta"><span><strong>{patch?.operationCount ?? 0}</strong> operation</span><span><strong>{patch?.revision ?? 0}</strong> revision</span><span><strong>99%</strong> target confidence</span></div></div>
        <div className="pw-review-checks"><ReviewCheck label="Semantic target resolved" ok /><ReviewCheck label="Inverse rollback operation" ok /><ReviewCheck label="Conflicting change acknowledged" ok={decision === "approved"} /></div>
        <div className="pw-review-note"><MessageSquare size={14} aria-hidden="true" /><div><strong>Review note</strong><p>{note || "Add a short decision note so the next person understands what you saw."}</p></div></div>
        <div className="pw-review-actions"><Button size="md" variant="secondary" leadingIcon={<X size={15} aria-hidden="true" />} onClick={() => submit("changes")}>Request changes</Button><Button size="md" leadingIcon={<Check size={15} aria-hidden="true" />} onClick={() => submit("approved")}>Approve patch</Button></div>
      </Card>
      <aside className="pw-review-side">
        <Card eyebrow="People in the loop" title="Owners"><div className="pw-review-people"><Person name="Maya Singh" roleLabel="Patch author" status="Owner" /><Person name="Lena Ortiz" roleLabel="Required reviewer" status={decision === "approved" ? "Approved" : "You"} /><Person name="Owen Brooks" roleLabel="Release operator" status="Watching" /></div><AvatarStack people={[{ name: "Maya Singh" }, { name: "Lena Ortiz" }, { name: "Owen Brooks" }]} /></Card>
        <Card eyebrow="Review health" title="Confidence to ship"><div className="pw-review-health"><ProgressBar value={decision === "approved" ? 100 : decision === "changes" ? 46 : 82} label="Review completion" /><StatusExplanation tone={decision === "approved" ? "green" : decision === "changes" ? "red" : "amber"} title={decision === "approved" ? "Ready for verification" : decision === "changes" ? "Blocked on evidence" : "One reviewer decision remains"} description={decision === "approved" ? "The patch can move into the signed release workflow." : "PATCHWORK keeps the release control locked until the review is clear."} /></div></Card>
      </aside>
    </div>
    <SeamDivider label="REVIEW → VERIFY · HUMAN DECISIONS STAY AUDITABLE" />
  </div>;
}

function ReviewCheck({ label, ok }: Readonly<{ label: string; ok: boolean }>) { return <div className={`pw-review-check${ok ? " is-ok" : ""}`}><span>{ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <Clock3 size={14} aria-hidden="true" />}</span><strong>{label}</strong><Badge tone={ok ? "green" : "amber"}>{ok ? "Ready" : "Review"}</Badge></div>; }
function Person({ name, roleLabel, status }: Readonly<{ name: string; roleLabel: string; status: string }>) { return <div className="pw-review-person"><Avatar name={name} /><span><strong>{name}</strong><small>{roleLabel}</small></span><Badge tone={status === "Approved" || status === "Owner" ? "green" : status === "You" ? "violet" : "neutral"}>{status}</Badge></div>; }
