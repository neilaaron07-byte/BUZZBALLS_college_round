"use client";

import { AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Badge, StatusDot } from "./navigation";

export function ProgressRing({ value, label, tone = "violet" }: Readonly<{ value: number; label: string; tone?: "violet" | "green" | "amber" | "red" }>) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className={`pw-progress-ring pw-progress-ring-${tone}`} style={{ "--pw-progress": `${bounded * 3.6}deg` } as React.CSSProperties} role="img" aria-label={`${label}: ${Math.round(bounded)} percent`}><div><strong>{Math.round(bounded)}%</strong><span>{label}</span></div></div>;
}

export function ProgressBar({ value, label }: Readonly<{ value: number; label?: string }>) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className="pw-progress-bar-wrap">{label ? <div className="pw-progress-label"><span>{label}</span><strong>{Math.round(bounded)}%</strong></div> : null}<div className="pw-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded} aria-label={label}><span style={{ width: `${bounded}%` }} /></div></div>;
}

export function Skeleton({ width = "100%", height = 12, className = "" }: Readonly<{ width?: string | number; height?: string | number; className?: string }>) {
  return <span className={`pw-skeleton ${className}`} style={{ width, height }} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: Readonly<{ title: string; description: string; action?: { label: string; onClick: () => void } }>) {
  return <section className="pw-state pw-empty-state"><span className="pw-state-art" aria-hidden="true"><span /><span /><span /></span><h3>{title}</h3><p>{description}</p>{action ? <Button size="sm" variant="secondary" onClick={action.onClick}>{action.label}</Button> : null}</section>;
}

export function ErrorState({ title, description, onRetry }: Readonly<{ title: string; description: string; onRetry?: () => void }>) {
  return <section className="pw-state pw-error-state" role="alert"><span className="pw-state-icon"><AlertTriangle size={18} aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div>{onRetry ? <Button size="sm" variant="secondary" leadingIcon={<RefreshCw size={14} aria-hidden="true" />} onClick={onRetry}>Try again</Button> : null}</section>;
}

export function Banner({ tone, title, description }: Readonly<{ tone: "green" | "amber" | "red" | "neutral"; title: string; description: string }>) {
  const Icon = tone === "green" ? CheckCircle2 : tone === "red" ? AlertTriangle : tone === "amber" ? AlertTriangle : Info;
  return <div className={`pw-banner pw-banner-${tone}`}><Icon size={16} aria-hidden="true" /><div><strong>{title}</strong><span>{description}</span></div><Badge tone={tone === "neutral" ? "neutral" : tone}>{tone === "green" ? "Healthy" : tone === "red" ? "Blocked" : tone === "amber" ? "Review" : "Info"}</Badge></div>;
}

export function StatusExplanation({ tone, title, description }: Readonly<{ tone: "green" | "amber" | "red" | "neutral" | "violet"; title: string; description: string }>) {
  const dotTone = tone === "neutral" ? "neutral" : tone;
  return <div className="pw-status-explanation"><StatusDot tone={dotTone} label={title} /><p>{description}</p></div>;
}
