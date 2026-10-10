"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode, SVGProps } from "react";

export function SeamDivider({ label }: Readonly<{ label?: string }>) {
  return <div className="pw-seam-divider" aria-hidden={label ? undefined : true}>
    {label ? <span>{label}</span> : null}
  </div>;
}

export function StitchedCard({ children, className = "", interactive = false }: Readonly<{ children: ReactNode; className?: string; interactive?: boolean }>) {
  const content = <div className={`pw-stitched-card${interactive ? " pw-stitched-card-interactive" : ""} ${className}`}>{children}</div>;
  return interactive ? <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}>{content}</motion.div> : content;
}

export function PatchworkLogo({ compact = false, animated = true, className = "" }: Readonly<{ compact?: boolean; animated?: boolean; className?: string }>) {
  return <span className={`pw-logo ${compact ? "pw-logo-compact" : ""} ${className}`}>
    <svg className={`pw-logo-mark ${animated ? "pw-logo-mark-animated" : ""}`} viewBox="0 0 32 32" role="img" aria-label="PATCHWORK logo">
      <path d="M6 11V6h5M21 6h5v5M26 21v5h-5M11 26H6v-5" />
      <path d="M11 11h10v10H11z" />
      <path d="M16 3v5M29 16h-5M16 29v-5M3 16h5" />
    </svg>
    {!compact ? <span className="pw-logo-wordmark">PATCH<span>WORK</span></span> : null}
  </span>;
}

export function SeamArrow({ label }: Readonly<{ label: string }>) {
  return <span className="pw-seam-arrow">{label}<ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.6} /></span>;
}

export function ConnectorPath(props: SVGProps<SVGSVGElement>) {
  return <svg className="pw-connector" viewBox="0 0 240 80" fill="none" aria-hidden="true" {...props}>
    <motion.path d="M4 40C48 4 80 76 124 40s76-36 112 0" pathLength="1" />
  </svg>;
}
