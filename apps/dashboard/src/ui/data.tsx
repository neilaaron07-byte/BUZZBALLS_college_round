"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "./navigation";
import { StitchedCard } from "./seams";

export function Card({ title, eyebrow, action, children, className = "" }: Readonly<{ title?: string; eyebrow?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }>) {
  return <StitchedCard className={`pw-card ${className}`}><div className="pw-card-body">{eyebrow ? <span className="pw-card-eyebrow">{eyebrow}</span> : null}{title || action ? <div className="pw-card-header">{title ? <h3>{title}</h3> : <span />}{action}</div> : null}{children}</div></StitchedCard>;
}

export function DataList({ items }: Readonly<{ items: ReadonlyArray<{ label: string; value: React.ReactNode; detail?: string }> }>) {
  return <dl className="pw-data-list">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}{item.detail ? <small>{item.detail}</small> : null}</dd></div>)}</dl>;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export function Table({ columns, rows, caption }: Readonly<{ columns: ReadonlyArray<TableColumn>; rows: ReadonlyArray<Readonly<Record<string, React.ReactNode>>>; caption: string }>) {
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const sortedRows = sort ? [...rows].sort((a, b) => String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? "")) * (sort.direction === "asc" ? 1 : -1)) : rows;
  return <div className="pw-table-wrap"><table className="pw-table"><caption>{caption}</caption><thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.sortable ? <button type="button" onClick={() => setSort((current) => current?.key === column.key && current.direction === "asc" ? { key: column.key, direction: "desc" } : { key: column.key, direction: "asc" })}>{column.label}{sort?.key === column.key ? sort.direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" /> : <ChevronsUpDown size={13} aria-hidden="true" />}</button> : column.label}</th>)}</tr></thead><tbody>{sortedRows.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export function ReleaseCell({ version, status }: Readonly<{ version: string; status: "green" | "amber" | "red" }>) {
  return <span className="pw-release-cell"><strong>{version}</strong><Badge tone={status}>{status === "green" ? "Healthy" : status === "amber" ? "Canary" : "Blocked"}</Badge></span>;
}
