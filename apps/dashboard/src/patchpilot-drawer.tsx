"use client";

import { ArrowRight, Bot, Check, Copy, MessageSquare, PencilLine, Send, ShieldCheck, Sparkles, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fingerprintFromSnapshot, resolveTarget, type ElementSnapshot, type ScanFinding, type ScanSnapshot } from "../../../packages/core/src/index";
import { actionCardFromProposal, OfflinePatchPilot, streamAnswer, type PatchPilotActionCard } from "../../../packages/ai/src/index";
import { Button, IconButton } from "./ui/button";
import { Badge, StatusDot } from "./ui/navigation";
import { toast } from "./ui/overlays";
import type { DashboardData, DashboardFinding, DashboardTone, DashboardView } from "./dashboard-types";

interface PilotMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  tone: DashboardTone;
  card?: PatchPilotActionCard;
}

function toFinding(finding: DashboardFinding): ScanFinding {
  const descriptor = `${finding.id} ${finding.summary}`;
  const detector: ScanFinding["detector"] = /contrast/i.test(descriptor) ? "contrast" : /duplicate/i.test(descriptor) ? "duplicate_action" : "stale_copy";
  return { id: finding.id, detector, severity: finding.severity, confidence: finding.confidence, targetIds: ["price"], summary: finding.summary, explanation: finding.explanation, evidence: [finding.explanation, finding.blastRadius.explanation], blastRadius: finding.blastRadius };
}

function buildPilotContext(data: DashboardData) {
  const first = data.workspace.findings[0];
  const snapshot: ScanSnapshot = { pageUrl: "https://shopnest.example/products/aurora", viewport: { width: 390, height: 844 }, elements: [{ id: "price", tag: "p", text: "$248", visible: true, region: "middle-center", rect: { left: 20, top: 100, right: 120, bottom: 130 }, styles: { foreground: "#777777", background: "#ffffff", fontSizePx: 16, fontWeight: 400 } }] };
  const targetSnapshot: ElementSnapshot = { tag: "p", attributes: { id: "price" }, text: "$248", path: ["html", "body", "main", "p"], siblings: ["p", "button"], landmarks: ["main"], rect: { top: 100, left: 20, width: 100, height: 30, viewportWidth: 390, viewportHeight: 844 } };
  const target = fingerprintFromSnapshot(targetSnapshot);
  return { pageUrl: snapshot.pageUrl, findings: first ? [toFinding(first)] : [], snapshot, target, candidates: [{ id: "price", label: "Product price", fingerprint: target }], resolution: resolveTarget(target, [{ id: "price", label: "Product price", fingerprint: target }]), health: { score: data.workspace.risk.score, errorRatePercent: 0.4, latencyMs: 280, sdkFailures: data.workspace.risk.tone === "red" ? 2 : 0, observedHoursAgo: 2 }, releaseAgeHours: 4 };
}

export function PatchPilotDrawer({ data, view, onNavigate }: Readonly<{ data: DashboardData; view: DashboardView; onNavigate: (view: DashboardView) => void }>) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<PilotMessage[]>(() => [{ id: "pilot-welcome", role: "assistant", tone: "green", text: "I’m PatchPilot. I can explain the current finding, draft a review-only fix, or summarize release risk. I never publish, rollback, or delete.", }]);
  const context = useMemo(() => buildPilotContext(data), [data]);
  const pilot = useMemo(() => new OfflinePatchPilot(), []);

  useEffect(() => {
    const openDrawer = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") { event.preventDefault(); setOpen(true); } if (event.key === "Escape") setOpen(false); };
    window.addEventListener("patchwork:open-patchpilot", openDrawer);
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("patchwork:open-patchpilot", openDrawer); window.removeEventListener("keydown", onKeyDown); };
  }, []);

  async function ask(nextQuestion: string): Promise<void> {
    const trimmed = nextQuestion.trim();
    if (!trimmed || busy) return;
    setQuestion("");
    setBusy(true);
    const userMessage: PilotMessage = { id: `user-${Date.now()}`, role: "user", tone: "green", text: trimmed };
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", tone: "amber", text: "", }]);
    const intent = /fix|patch|contrast|change/i.test(trimmed) ? "suggest" : /rollback|health|release risk|ship/i.test(trimmed) ? "summarize" : "explain";
    const response = await pilot.complete({ intent, context, question: trimmed });
    let answer = "";
    for await (const chunk of streamAnswer(response, { chunkSize: 26, delayMs: 8 })) {
      answer += chunk;
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: answer, tone: response.status } : message));
    }
    const card = response.proposal ? actionCardFromProposal(response.proposal) : undefined;
    setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: answer || response.answer, tone: response.status, card } : message));
    setBusy(false);
  }

  function action(label: "approve" | "edit" | "dismiss", cardId: string): void {
    if (label === "dismiss") { setMessages((current) => current.map((message) => message.card?.id === cardId ? { ...message, card: undefined } : message)); toast.message("Proposal dismissed", { description: "No patch or release state changed." }); return; }
    onNavigate("patches");
    setOpen(false);
    toast.message(label === "approve" ? "Review opened in Patches" : "Patch editor opened", { description: label === "approve" ? "Human review is still required before any release action." : "Edit the allowlisted operation before review." });
  }

  return <>
    <button type="button" className="pw-pilot-floating-trigger" onClick={() => setOpen(true)} aria-label="Ask PatchPilot"><Sparkles size={14} aria-hidden="true" /><span>Ask PatchPilot</span><kbd>⌘ J</kbd></button>
    {open ? <div className="pw-pilot-layer"><button type="button" className="pw-pilot-backdrop" aria-label="Close PatchPilot" onClick={() => setOpen(false)} /><aside className="pw-pilot-drawer" aria-label="PatchPilot assistant" role="dialog" aria-modal="true">
      <header className="pw-pilot-header"><div className="pw-pilot-title"><span className="pw-pilot-orb"><Bot size={17} aria-hidden="true" /></span><span><strong>PatchPilot</strong><small>Offline evidence assistant · {view}</small></span></div><IconButton label="Close PatchPilot" size="sm" onClick={() => setOpen(false)}><X size={16} aria-hidden="true" /></IconButton></header>
      <div className="pw-pilot-safety"><ShieldCheck size={14} aria-hidden="true" /><span>Reads evidence and proposes reviewable drafts. Publishing, rollback, and deletion stay human-only.</span></div>
      <div className="pw-pilot-messages" aria-live="polite">{messages.map((message) => <article className={`pw-pilot-message pw-pilot-message-${message.role}`} key={message.id}><span className="pw-pilot-message-icon">{message.role === "assistant" ? <Bot size={13} aria-hidden="true" /> : <MessageSquare size={13} aria-hidden="true" />}</span><div><div className="pw-pilot-message-meta">{message.role === "assistant" ? "PatchPilot" : "You"}{message.role === "assistant" && message.text ? <StatusDot tone={message.tone} label={message.tone === "green" ? "Grounded" : message.tone === "amber" ? "Review" : "Blocked"} /> : null}</div><p>{message.text || "Reading the supplied evidence…"}</p>{message.card ? <ActionCard card={message.card} onAction={action} /> : null}</div></article>)}</div>
      <div className="pw-pilot-chips"><button type="button" onClick={() => void ask("Explain the highest-risk finding")}>Explain finding</button><button type="button" onClick={() => void ask("Draft a safe fix for the contrast issue")}>Draft a fix</button><button type="button" onClick={() => void ask("Is this release safe to ship?")}>Check ship risk</button></div>
      <form className="pw-pilot-composer" onSubmit={(event) => { event.preventDefault(); void ask(question); }}><label className="sr-only" htmlFor="patchpilot-question">Ask PatchPilot</label><input id="patchpilot-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this finding…" disabled={busy} /><Button type="submit" size="sm" aria-label="Send question" disabled={busy || !question.trim()} leadingIcon={<Send size={14} aria-hidden="true" />} /></form>
      <small className="pw-pilot-footnote">Evidence source: {data.source === "api" ? "connected API" : "deterministic local workspace"}. No external model required.</small>
    </aside></div> : null}
  </>;
}

function ActionCard({ card, onAction }: Readonly<{ card: PatchPilotActionCard; onAction: (label: "approve" | "edit" | "dismiss", id: string) => void }>) {
  return <div className={`pw-pilot-action-card pw-pilot-action-${card.status}`}><div className="pw-pilot-action-heading"><span><strong>{card.title}</strong><small>{card.summary}</small></span><Badge tone={card.status === "review" ? "amber" : "red"}>{card.status === "review" ? "Human review" : "Blocked"}</Badge></div>{card.diff.map((line) => <div className="pw-pilot-diff" key={line.label}><code>{line.label}</code><span className="pw-pilot-before">{line.before}</span><ArrowRight size={12} aria-hidden="true" /><span className="pw-pilot-after">{line.after}</span></div>)}<div className="pw-pilot-action-buttons"><button type="button" onClick={() => onAction("approve", card.id)} disabled={card.status === "blocked"}><Check size={12} aria-hidden="true" />Review</button><button type="button" onClick={() => onAction("edit", card.id)}><PencilLine size={12} aria-hidden="true" />Edit</button><button type="button" onClick={() => onAction("dismiss", card.id)}><XCircle size={12} aria-hidden="true" />Dismiss</button><button type="button" onClick={() => toast.message("Evidence copied", { description: "The action card remains review-only." })}><Copy size={12} aria-hidden="true" /></button></div></div>;
}
