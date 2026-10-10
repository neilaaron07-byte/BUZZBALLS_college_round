"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronRight, Circle } from "lucide-react";
import { cx } from "./utils";

export function Tabs({ items, value, onValueChange, children }: Readonly<{ items: ReadonlyArray<{ value: string; label: string }>; value?: string; onValueChange?: (value: string) => void; children?: React.ReactNode }>) {
  return <TabsPrimitive.Root className="pw-tabs" value={value} onValueChange={onValueChange}><TabsPrimitive.List className="pw-tabs-list" aria-label="Sections">{items.map((item) => <TabsPrimitive.Trigger className="pw-tab" key={item.value} value={item.value}>{item.label}</TabsPrimitive.Trigger>)}</TabsPrimitive.List>{children}</TabsPrimitive.Root>;
}

export function SegmentedControl({ options, value, onValueChange }: Readonly<{ options: ReadonlyArray<{ value: string; label: string }>; value: string; onValueChange: (value: string) => void }>) {
  return <div className="pw-segmented" role="group" aria-label="View options">{options.map((option) => <button type="button" className={cx(value === option.value && "is-active")} key={option.value} aria-pressed={value === option.value} onClick={() => onValueChange(option.value)}>{option.label}</button>)}</div>;
}

export function Badge({ children, tone = "neutral" }: Readonly<{ children: React.ReactNode; tone?: "green" | "amber" | "red" | "violet" | "neutral" }>) {
  return <span className={`pw-badge pw-badge-${tone}`}>{children}</span>;
}

export function StatusDot({ tone = "neutral", label }: Readonly<{ tone?: "green" | "amber" | "red" | "violet" | "neutral"; label: string }>) {
  return <span className="pw-status-dot"><span className={`pw-status-dot-indicator pw-status-dot-${tone}`} aria-hidden="true" /><span>{label}</span></span>;
}

export function Breadcrumbs({ items }: Readonly<{ items: ReadonlyArray<{ label: string; href?: string }> }>) {
  return <nav aria-label="Breadcrumb" className="pw-breadcrumbs">{items.map((item, index) => <span key={`${item.label}-${index}`}>{item.href && index !== items.length - 1 ? <a href={item.href}>{item.label}</a> : <strong aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</strong>}{index < items.length - 1 ? <ChevronRight size={13} aria-hidden="true" /> : null}</span>)}</nav>;
}

export function Stepper({ steps, current }: Readonly<{ steps: ReadonlyArray<{ label: string; detail: string }>; current: number }>) {
  return <ol className="pw-stepper">{steps.map((step, index) => <li className={cx(index < current && "is-complete", index === current && "is-current")} key={step.label}><span className="pw-stepper-icon">{index < current ? <Circle size={7} fill="currentColor" aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</span><span><strong>{step.label}</strong><small>{step.detail}</small></span></li>)}</ol>;
}

export function Kbd({ children }: Readonly<{ children: React.ReactNode }>) {
  return <kbd className="pw-kbd">{children}</kbd>;
}

export function Avatar({ name, src }: Readonly<{ name: string; src?: string }>) {
  return src ? <span className="pw-avatar" role="img" aria-label={name} style={{ backgroundImage: `url(${src})`, backgroundSize: "cover" }} /> : <span className="pw-avatar" aria-label={name}>{name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>;
}

export function AvatarStack({ people }: Readonly<{ people: ReadonlyArray<{ name: string; src?: string }> }>) {
  return <span className="pw-avatar-stack" aria-label={`${people.length} collaborators`}>{people.map((person) => <Avatar key={person.name} {...person} />)}</span>;
}
