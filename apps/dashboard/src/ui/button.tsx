"use client";

import { LoaderCircle } from "lucide-react";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Button = forwardRef(function Button({ className, variant = "primary", size = "md", loading = false, leadingIcon, trailingIcon, disabled, children, ...props }: ButtonProps, ref: Ref<HTMLButtonElement>) {
  return <button ref={ref} type="button" className={cx("pw-button", `pw-button-${variant}`, `pw-button-${size}`, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading ? <LoaderCircle className="pw-button-spinner" aria-hidden="true" size={15} /> : leadingIcon}
    <span>{children}</span>
    {!loading ? trailingIcon : null}
  </button>;
});

export function IconButton({ label, className, size = "md", variant = "ghost", children, ...props }: Omit<ButtonProps, "children"> & { label: string; children: React.ReactNode }) {
  return <Button aria-label={label} className={cx("pw-icon-button", className)} size={size} variant={variant} {...props}>{children}</Button>;
}
