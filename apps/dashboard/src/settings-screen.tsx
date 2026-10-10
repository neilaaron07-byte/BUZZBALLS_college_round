"use client";

import { Bell, Globe2, Save, ShieldAlert, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Banner, StatusExplanation } from "./ui/feedback";
import { Card } from "./ui/data";
import { Badge, StatusDot } from "./ui/navigation";
import { toast } from "./ui/overlays";
import { SeamDivider } from "./ui/seams";
import type { DashboardData, DashboardView } from "./dashboard-types";

export function SettingsScreen({ data, onNavigate }: Readonly<{ data: DashboardData; onNavigate: (view: DashboardView) => void }>) {
  const [allowlist, setAllowlist] = useState("shopnest.example");
  const [requireReview, setRequireReview] = useState(true);
  const [requireVerification, setRequireVerification] = useState(true);
  const [notifyIncidents, setNotifyIncidents] = useState(true);
  const [notifyReviews, setNotifyReviews] = useState(true);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const save = () => { setSaved(true); toast.success("Site policy saved", { description: "The next release will use the updated allowlist and review gates." }); };
  const reset = () => { setAllowlist("shopnest.example"); setRequireReview(true); setRequireVerification(true); setNotifyIncidents(true); setNotifyReviews(true); setConfirmReset(false); setSaved(false); toast.message("Local settings reset", { description: "The demo returned to its safe starting policy." }); };
  return <div className="pw-route-screen pw-settings-screen">
    <div className="pw-dashboard-heading"><div><span className="pw-dashboard-kicker"><span className="pw-kicker-dot" /> WORKSPACE / policy</span><h1 id="dashboard-page-title">Settings</h1><p>Make the safe path the default. Policy controls stay visible, scoped to {data.site.name}, and easy to reset in the local demo.</p></div><Button size="sm" leadingIcon={<Save size={14} aria-hidden="true" />} onClick={save}>Save policy</Button></div>
    {saved ? <Banner tone="green" title="Policy saved for this workspace" description="New patch releases must stay inside the allowlist and pass the selected review gates." /> : null}
    <div className="pw-settings-grid"><Card eyebrow="Site policy" title="Release boundaries" action={<StatusDot tone="green" label="Protected" />}><div className="pw-settings-section"><div className="pw-settings-icon"><Globe2 size={17} aria-hidden="true" /></div><div><label htmlFor="site-allowlist"><strong>Allowed site origin</strong><small>PATCHWORK will refuse a preview or release outside this origin.</small></label><input id="site-allowlist" className="pw-settings-input" value={allowlist} onChange={(event) => { setAllowlist(event.target.value); setSaved(false); }} /></div></div><ToggleRow id="require-review" label="Require a human reviewer" detail="A patch cannot enter a signed release without an explicit approval." checked={requireReview} onChange={() => { setRequireReview((value) => !value); setSaved(false); }} /><ToggleRow id="require-verification" label="Require browser verification" detail="Interaction, visual, accessibility, and console checks must be attached." checked={requireVerification} onChange={() => { setRequireVerification((value) => !value); setSaved(false); }} /></Card><Card eyebrow="Notifications" title="Keep the right people close" action={<Bell size={17} aria-hidden="true" />}><ToggleRow id="notify-incidents" label="Critical health events" detail="Notify the release owner when the circuit breaker crosses a boundary." checked={notifyIncidents} onChange={() => setNotifyIncidents((value) => !value)} /><ToggleRow id="notify-reviews" label="Review decisions" detail="Notify the patch author when approval or changes are requested." checked={notifyReviews} onChange={() => setNotifyReviews((value) => !value)} /><StatusExplanation tone="violet" title="Device-local demo preferences" description="These controls stay in this local workspace until the durable API settings contract is connected." /></Card></div>
    <Card eyebrow="Danger zone" title="Keep recovery close" className="pw-danger-card"><div className="pw-danger-row"><div><strong>Reset local demo policy</strong><p>Restore the seeded allowlist, review gates, and notification preferences. No release or audit evidence is deleted.</p></div>{confirmReset ? <div className="pw-danger-confirm"><Button size="sm" variant="quiet" onClick={() => setConfirmReset(false)}>Cancel</Button><Button size="sm" variant="danger" leadingIcon={<ShieldAlert size={13} aria-hidden="true" />} onClick={reset}>Reset settings</Button></div> : <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>Review reset</Button>}</div></Card>
    <div className="pw-settings-footer"><Badge tone="green"><ShieldCheck size={12} aria-hidden="true" /> Safe defaults active</Badge><Button size="sm" variant="secondary" leadingIcon={<SlidersHorizontal size={13} aria-hidden="true" />} onClick={() => onNavigate("evidence")}>View policy evidence</Button></div>
    <SeamDivider label="SETTINGS → TRUST · BOUNDARIES ARE PART OF THE PRODUCT" />
  </div>;
}

function ToggleRow({ id, label, detail, checked, onChange }: Readonly<{ id: string; label: string; detail: string; checked: boolean; onChange: () => void }>) { return <div className="pw-toggle-row"><span id={`${id}-label`}><strong>{label}</strong><small>{detail}</small></span><button type="button" className="pw-toggle-button" aria-labelledby={`${id}-label`} aria-pressed={checked} onClick={onChange}><span className="pw-toggle-track" aria-hidden="true"><span /></span></button></div>; }
