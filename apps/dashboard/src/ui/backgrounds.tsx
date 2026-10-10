"use client";

import type { ReactNode } from "react";

export function GridBackdrop({ children, className = "" }: Readonly<{ children?: ReactNode; className?: string }>) {
  return <div className={`pw-grid-backdrop ${className}`}><div className="pw-radial-fade" /><div className="pw-aurora" /><div className="pw-noise" />{children}</div>;
}

export function CursorSpotlight({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="pw-cursor-spotlight">{children}</div>;
}
