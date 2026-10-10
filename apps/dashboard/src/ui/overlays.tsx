"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Check, MoreHorizontal, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Button } from "./button";

export { toast };

export function Tooltip({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <TooltipPrimitive.Provider delayDuration={200}><TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content className="pw-tooltip" sideOffset={6}>{label}<TooltipPrimitive.Arrow className="pw-tooltip-arrow" /></TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root></TooltipPrimitive.Provider>;
}

export function Popover({ label, children, content }: Readonly<{ label: string; children: React.ReactNode; content: React.ReactNode }>) {
  return <DialogPrimitive.Root><DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger><DialogPrimitive.Portal><DialogPrimitive.Overlay className="pw-popover-overlay" /><DialogPrimitive.Content className="pw-popover" aria-label={label}>{content}<DialogPrimitive.Close className="pw-overlay-close" aria-label="Close"><X size={14} aria-hidden="true" /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}

export function Dialog({ title, description, trigger, children }: Readonly<{ title: string; description: string; trigger: React.ReactNode; children: React.ReactNode }>) {
  return <DialogPrimitive.Root><DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger><DialogPrimitive.Portal><DialogPrimitive.Overlay className="pw-dialog-overlay" /><DialogPrimitive.Content className="pw-dialog"><div className="pw-dialog-header"><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Close className="pw-overlay-close" aria-label="Close"><X size={15} aria-hidden="true" /></DialogPrimitive.Close></div><DialogPrimitive.Description>{description}</DialogPrimitive.Description><div className="pw-dialog-body">{children}</div></DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}

export function Drawer({ title, trigger, children }: Readonly<{ title: string; trigger: React.ReactNode; children: React.ReactNode }>) {
  return <DialogPrimitive.Root><DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger><DialogPrimitive.Portal><DialogPrimitive.Overlay className="pw-dialog-overlay" /><DialogPrimitive.Content className="pw-drawer"><div className="pw-dialog-header"><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Close className="pw-overlay-close" aria-label="Close"><X size={15} aria-hidden="true" /></DialogPrimitive.Close></div>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;
}

export function DropdownMenu({ label, items }: Readonly<{ label: string; items: ReadonlyArray<{ label: string; onSelect?: () => void; danger?: boolean }> }>) {
  return <DropdownMenuPrimitive.Root><DropdownMenuPrimitive.Trigger asChild><Button aria-label={label} variant="secondary" size="sm" trailingIcon={<MoreHorizontal size={15} aria-hidden="true" />}>{label}</Button></DropdownMenuPrimitive.Trigger><DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className="pw-menu" align="end">{items.map((item) => <DropdownMenuPrimitive.Item className={`pw-menu-item${item.danger ? " is-danger" : ""}`} onSelect={item.onSelect} key={item.label}>{item.label}</DropdownMenuPrimitive.Item>)}</DropdownMenuPrimitive.Content></DropdownMenuPrimitive.Portal></DropdownMenuPrimitive.Root>;
}

export function ContextMenu({ children, items }: Readonly<{ children: React.ReactNode; items: ReadonlyArray<{ label: string; onSelect?: () => void }> }>) {
  return <ContextMenuPrimitive.Root><ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger><ContextMenuPrimitive.Portal><ContextMenuPrimitive.Content className="pw-menu">{items.map((item) => <ContextMenuPrimitive.Item className="pw-menu-item" key={item.label} onSelect={item.onSelect}>{item.label}</ContextMenuPrimitive.Item>)}</ContextMenuPrimitive.Content></ContextMenuPrimitive.Portal></ContextMenuPrimitive.Root>;
}

export function ToastRegion() {
  return <><Toaster position="bottom-right" toastOptions={{ className: "pw-toast" }} /><div className="pw-live-region" aria-live="polite" aria-atomic="true"><Check size={0} aria-hidden="true" /></div></>;
}
