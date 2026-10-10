"use client";

import { GripVertical } from "lucide-react";
import { useState } from "react";

export function ScrollArea({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={`pw-scroll-area ${className}`}>{children}</div>;
}

export function ResizablePanels({ left, right }: Readonly<{ left: React.ReactNode; right: React.ReactNode }>) {
  const [width, setWidth] = useState(50);
  return <div className="pw-resizable-panels"><div className="pw-resizable-panel" style={{ width: `${width}%` }}>{left}</div><button type="button" className="pw-resize-handle" aria-label="Resize panels" onKeyDown={(event) => { if (event.key === "ArrowLeft") setWidth((value) => Math.max(30, value - 5)); if (event.key === "ArrowRight") setWidth((value) => Math.min(70, value + 5)); }}><GripVertical size={14} aria-hidden="true" /></button><div className="pw-resizable-panel" style={{ width: `${100 - width}%` }}>{right}</div></div>;
}

export function DateRange({ onChange }: Readonly<{ onChange?: (range: { from: string; to: string }) => void }>) {
  const [from, setFrom] = useState("2026-10-01");
  const [to, setTo] = useState("2026-10-10");
  const update = (nextFrom: string, nextTo: string) => { onChange?.({ from: nextFrom, to: nextTo }); };
  return <div className="pw-date-range"><label><span>From</span><input type="date" value={from} onChange={(event) => { setFrom(event.target.value); update(event.target.value, to); }} /></label><span aria-hidden="true">→</span><label><span>To</span><input type="date" value={to} onChange={(event) => { setTo(event.target.value); update(from, event.target.value); }} /></label></div>;
}

export interface KanbanCard { id: string; title: string; meta: string; }

export function Kanban({ columns, onMove }: Readonly<{ columns: ReadonlyArray<{ id: string; title: string; cards: ReadonlyArray<KanbanCard> }>; onMove?: (cardId: string, columnId: string) => void }>) {
  const [dragging, setDragging] = useState<string | null>(null);
  return <div className="pw-kanban">{columns.map((column) => <section className="pw-kanban-column" key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragging) onMove?.(dragging, column.id); setDragging(null); }}><header><strong>{column.title}</strong><span>{column.cards.length}</span></header>{column.cards.map((card) => <article className="pw-kanban-card" draggable onDragStart={() => setDragging(card.id)} key={card.id}><strong>{card.title}</strong><span>{card.meta}</span></article>)}</section>)}</div>;
}
