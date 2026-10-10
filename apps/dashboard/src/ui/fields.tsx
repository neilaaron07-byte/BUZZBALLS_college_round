"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./utils";

export function Field({ label, hint, error, children }: Readonly<{ label: string; hint?: string; error?: string; children: React.ReactNode }>) {
  const id = useId();
  return <label className="pw-field" htmlFor={id}>
    <span className="pw-field-label">{label}</span>
    {children}
    {error ? <span className="pw-field-error" role="alert">{error}</span> : hint ? <span className="pw-field-hint">{hint}</span> : null}
  </label>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("pw-input", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("pw-input pw-textarea", className)} {...props} />;
}

export function Select({ value, onValueChange, placeholder, options, disabled = false }: Readonly<{ value?: string; onValueChange?: (value: string) => void; placeholder: string; options: ReadonlyArray<{ value: string; label: string }>; disabled?: boolean }>) {
  return <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
    <SelectPrimitive.Trigger className="pw-input pw-select-trigger" aria-label={placeholder}>
      <SelectPrimitive.Value placeholder={placeholder} />
      <SelectPrimitive.Icon><ChevronDown size={15} aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal><SelectPrimitive.Content className="pw-select-content" position="popper">
      <SelectPrimitive.Viewport>{options.map((option) => <SelectPrimitive.Item className="pw-select-item" key={option.value} value={option.value}><SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator><Check size={14} aria-hidden="true" /></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>)}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content></SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}

export function Combobox({ label, options, value, onValueChange }: Readonly<{ label: string; options: ReadonlyArray<{ value: string; label: string }>; value?: string; onValueChange?: (value: string) => void }>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())), [options, query]);
  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);
  return <div className="pw-combobox" data-open={open}>
    <span className="pw-field-label">{label}</span>
    <button type="button" className="pw-input pw-combobox-trigger" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{selected?.label ?? `Select ${label.toLowerCase()}`}<ChevronDown size={15} aria-hidden="true" /></button>
    {open ? <div className="pw-combobox-popover">
      <div className="pw-combobox-search"><Search size={14} aria-hidden="true" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Filter ${label.toLowerCase()}`} aria-label={`Filter ${label.toLowerCase()}`} /></div>
      <div role="listbox" aria-label={label}>{filtered.length > 0 ? filtered.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={option.value} className="pw-combobox-option" onClick={() => { onValueChange?.(option.value); setOpen(false); setQuery(""); }}>{option.label}{option.value === value ? <Check size={14} aria-hidden="true" /> : null}</button>) : <span className="pw-combobox-empty">No matches</span>}</div>
    </div> : null}
  </div>;
}

export function Switch({ label, checked, onCheckedChange }: Readonly<{ label: string; checked?: boolean; onCheckedChange?: (checked: boolean) => void }>) {
  return <label className="pw-switch-row"><span>{label}</span><SwitchPrimitive.Root className="pw-switch" checked={checked} onCheckedChange={onCheckedChange} aria-label={label}><SwitchPrimitive.Thumb className="pw-switch-thumb" /></SwitchPrimitive.Root></label>;
}

export function Checkbox({ label, checked, onCheckedChange }: Readonly<{ label: string; checked?: boolean; onCheckedChange?: (checked: boolean) => void }>) {
  return <label className="pw-check-row"><CheckboxPrimitive.Root className="pw-checkbox" checked={checked} onCheckedChange={(next) => onCheckedChange?.(next === true)}><CheckboxPrimitive.Indicator><Check size={13} strokeWidth={2.5} aria-hidden="true" /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root><span>{label}</span></label>;
}

export function RadioGroup({ label, options, value, onValueChange }: Readonly<{ label: string; options: ReadonlyArray<{ value: string; label: string }>; value?: string; onValueChange?: (value: string) => void }>) {
  return <fieldset className="pw-radio-group"><legend className="pw-field-label">{label}</legend><RadioGroupPrimitive.Root value={value} onValueChange={onValueChange}>{options.map((option) => <label className="pw-check-row" key={option.value}><RadioGroupPrimitive.Item className="pw-radio" value={option.value}><RadioGroupPrimitive.Indicator className="pw-radio-indicator" /></RadioGroupPrimitive.Item><span>{option.label}</span></label>)}</RadioGroupPrimitive.Root></fieldset>;
}

export function Slider({ label, value, onValueChange, min = 0, max = 100 }: Readonly<{ label: string; value: number[]; onValueChange?: (value: number[]) => void; min?: number; max?: number }>) {
  return <div className="pw-slider-row"><span><span className="pw-field-label">{label}</span><strong>{value[0]}%</strong></span><SliderPrimitive.Root className="pw-slider" value={value} onValueChange={onValueChange} min={min} max={max} step={1}><SliderPrimitive.Track className="pw-slider-track"><SliderPrimitive.Range className="pw-slider-range" /></SliderPrimitive.Track><SliderPrimitive.Thumb className="pw-slider-thumb" aria-label={label} /></SliderPrimitive.Root></div>;
}
