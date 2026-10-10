"use client";

import { ArrowRight, Command, ExternalLink, GitBranch, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CommandItem = { label: string; detail: string; href: string; key: string };

const commandItems: CommandItem[] = [
  { key: "scan", label: "Open SCAN story", detail: "See the blocked target", href: "#story" },
  { key: "playground", label: "Try the patch playground", detail: "Build a constrained proposal", href: "#playground" },
  { key: "proof", label: "Read measured proof", detail: "Evidence from the workspace", href: "#proof" },
  { key: "security", label: "Read security boundaries", detail: "Signed and reversible releases", href: "/web/security" },
  { key: "workspace", label: "Open operator workspace", detail: "Run the seeded incident", href: "/dashboard" },
];

export function MarketingLogo({ compact = false }: Readonly<{ compact?: boolean }>) {
  return <a className={`pw-marketing-logo${compact ? " pw-marketing-logo-compact" : ""}`} href="/web" aria-label="PATCHWORK home"><span className="pw-marketing-logo-mark" aria-hidden="true"><span /></span><span>PATCH<span>WORK</span></span></a>;
}

export function MarketingNav() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return <>
    <header className="pw-marketing-nav">
      <MarketingLogo />
      <nav aria-label="Marketing navigation"><a href="#workflow">Workflow</a><a href="#proof">Proof</a><a href="#features">Features</a><a href="#stories">Teams</a></nav>
      <div className="pw-marketing-nav-actions"><button type="button" className="pw-marketing-command-trigger" onClick={() => setPaletteOpen(true)} aria-label="Search PATCHWORK" aria-haspopup="dialog" aria-expanded={paletteOpen}><Search size={13} aria-hidden="true" /><span>Search</span><kbd><Command size={10} aria-hidden="true" /> K</kbd></button><a className="pw-marketing-text-link" href="/dashboard">Open dashboard <ArrowRight size={14} aria-hidden="true" /></a><a className="pw-marketing-button pw-marketing-button-small" href="#playground">Try the demo</a></div>
    </header>
    {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} /> : null}
  </>;
}

function CommandPalette({ onClose }: Readonly<{ onClose: () => void }>) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const options = commandItems.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { inputRef.current?.focus(); }, []);
  return <div className="pw-marketing-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="pw-marketing-command" role="dialog" aria-modal="true" aria-label="Search PATCHWORK">
      <div className="pw-marketing-command-search"><Search size={15} aria-hidden="true" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search the PATCHWORK story" /><kbd>ESC</kbd><button type="button" onClick={onClose} aria-label="Close search"><X size={15} aria-hidden="true" /></button></div>
      <div className="pw-marketing-command-list" role="listbox" aria-label="Search results">{options.length ? options.map((item) => <a key={item.key} href={item.href} onClick={onClose} role="option" aria-selected="false"><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowRight size={14} aria-hidden="true" /></a>) : <div className="pw-marketing-command-empty"><Search size={16} aria-hidden="true" /><strong>No matching surface</strong><span>Try scan, proof, security, or workspace.</span></div>}</div>
      <div className="pw-marketing-command-footer"><span><kbd>↵</kbd> Open surface</span><span><kbd>ESC</kbd> Close</span></div>
    </div>
  </div>;
}

export function MarketingFooter() {
  return <footer className="pw-marketing-footer"><div><MarketingLogo compact /><p>Fix any website in 60 seconds. Ship with confidence. Undo in one click.</p></div><div className="pw-marketing-footer-links"><span>SCAN · FIX · SHIP · UNDO</span><a href="/web/docs">Docs <ArrowRight size={13} aria-hidden="true" /></a><a href="/dashboard">Workspace <ArrowRight size={13} aria-hidden="true" /></a><a href="/web/security" aria-label="Read PATCHWORK integration docs"><GitBranch size={14} aria-hidden="true" /></a></div><div className="pw-marketing-footer-meta"><span>PATCHWORK / 2026</span><span>Evidence-led hotfixes for inherited systems</span><a href="/web/security">Security <ExternalLink size={11} aria-hidden="true" /></a></div></footer>;
}

export function SectionHeading({ eyebrow, title, emphasis, detail, align = "left" }: Readonly<{ eyebrow: string; title: string; emphasis?: string; detail: string; align?: "left" | "center" }>) {
  return <div className={`pw-marketing-section-heading pw-marketing-section-heading-${align}`}><span className="pw-marketing-kicker"><span className="pw-marketing-pulse" /> {eyebrow}</span><h2>{title}{emphasis ? <><br /><em>{emphasis}</em></> : null}</h2><p>{detail}</p></div>;
}
