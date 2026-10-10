"use client";

import { Command } from "cmdk";
import { Command as CommandIcon, CornerDownLeft, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Kbd } from "./navigation";

export interface CommandItem {
  id: string;
  label: string;
  detail: string;
  onSelect: () => void;
}

export function CommandPalette({ items }: Readonly<{ items: ReadonlyArray<CommandItem> }>) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen((value) => !value); } };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return <>
    <button type="button" className="pw-command-trigger" onClick={() => setOpen(true)}><CommandIcon size={15} aria-hidden="true" /><span>Search anything</span><Kbd>⌘ K</Kbd></button>
    {open ? <div className="pw-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><Command className="pw-command" label="Command palette" loop>
      <div className="pw-command-input"><Search size={15} aria-hidden="true" /><Command.Input ref={inputRef} placeholder="Find a site, patch, release…" /></div>
      <Command.List>{items.length > 0 ? items.map((item) => <Command.Item className="pw-command-item" key={item.id} value={`${item.label} ${item.detail}`} onSelect={() => { item.onSelect(); setOpen(false); }}><span><strong>{item.label}</strong><small>{item.detail}</small></span><CornerDownLeft size={14} aria-hidden="true" /></Command.Item>) : <Command.Empty className="pw-command-empty">No matching workspaces</Command.Empty>}</Command.List>
      <div className="pw-command-footer"><span>Navigate with arrows</span><span><Kbd>Esc</Kbd> close</span></div>
    </Command></div> : null}
  </>;
}
