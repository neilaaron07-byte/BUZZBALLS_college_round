import type { CartLine, CheckoutAddress, CheckoutState, Product } from "./types";

export type OrderTotals = {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  itemCount: number;
};

export type FieldError = {
  field: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: FieldError[];
};

export type DemoOrder = {
  id: string;
  status: "confirmed";
  itemCount: number;
  totalCents: number;
  customer: string;
  destination: string;
};

export const demoCardNumber = "4242424242424242";

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + Math.max(0, line.quantity), 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + Math.max(0, line.quantity) * line.product.priceCents, 0);
}

export function shippingForSubtotal(subtotalCents: number): number {
  return subtotalCents === 0 || subtotalCents >= 10000 ? 0 : 1200;
}

export function taxForSubtotal(subtotalCents: number): number {
  return Math.round(Math.max(0, subtotalCents) * .08);
}

export function orderTotals(lines: CartLine[], selectedShippingCents?: number): OrderTotals {
  const subtotalCents = cartSubtotal(lines);
  const shippingCents = selectedShippingCents ?? shippingForSubtotal(subtotalCents);
  const taxCents = taxForSubtotal(subtotalCents);
  return { subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents, itemCount: cartItemCount(lines) };
}

function requiredField(value: string, field: string, label: string): FieldError | null {
  return value.trim() ? null : { field, message: `${label} is required.` };
}

export function validateAddress(address: CheckoutAddress): ValidationResult {
  const required = [
    requiredField(address.name, "name", "Full name"),
    requiredField(address.email, "email", "Email"),
    requiredField(address.line1, "line1", "Address"),
    requiredField(address.city, "city", "City"),
    requiredField(address.region, "region", "State"),
    requiredField(address.postalCode, "postalCode", "Postal code"),
  ].filter((error): error is FieldError => Boolean(error));
  if (address.email.trim() && !/^\S+@\S+\.\S+$/.test(address.email.trim())) required.push({ field: "email", message: "Use a complete email address." });
  if (address.postalCode.trim() && !/^[0-9]{5}(?:-[0-9]{4})?$/.test(address.postalCode.trim())) required.push({ field: "postalCode", message: "Use a five digit postal code." });
  return { valid: required.length === 0, errors: required };
}

export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 16);
}

export function formatCardNumber(value: string): string {
  return normalizeCardNumber(value).replace(/(.{4})/g, "$1 ").trim();
}

export function validatePayment(value: string): ValidationResult {
  const number = normalizeCardNumber(value);
  if (!number) return { valid: false, errors: [{ field: "card", message: "Card number is required." }] };
  if (number !== demoCardNumber) return { valid: false, errors: [{ field: "card", message: "Use the PATCHWORK demo card ending in 4242." }] };
  return { valid: true, errors: [] };
}

export function firstError(result: ValidationResult): string {
  return result.errors[0]?.message ?? "";
}

export function checkoutNextStep(step: CheckoutState, address: CheckoutAddress, card: string, hasCart: boolean): { state: CheckoutState; error: string } {
  if (!hasCart) return { state: "retry", error: "Your cart is empty. Add an object before checkout." };
  if (step === "address") {
    const result = validateAddress(address);
    return result.valid ? { state: "payment", error: "" } : { state: "retry", error: firstError(result) };
  }
  if (step === "payment") {
    const result = validatePayment(card);
    return result.valid ? { state: "review", error: "" } : { state: "failed", error: firstError(result) };
  }
  if (step === "review") return { state: "success", error: "" };
  return { state: step, error: "" };
}

export function canRetryCheckout(state: CheckoutState): boolean {
  return state === "retry" || state === "failed";
}

export function orderDestination(address: CheckoutAddress): string {
  return [address.city.trim(), address.region.trim(), address.postalCode.trim()].filter(Boolean).join(", ");
}

export function orderId(seed: string, lines: CartLine[]): string {
  const value = `${seed}:${lines.map((line) => `${line.product.slug}:${line.quantity}`).join("|")}`;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return `SN–${String(hash).padStart(8, "0").slice(-8)}`;
}

export function createDemoOrder(seed: string, address: CheckoutAddress, lines: CartLine[], selectedShippingCents?: number): DemoOrder {
  const totals = orderTotals(lines, selectedShippingCents);
  return { id: orderId(seed, lines), status: "confirmed", itemCount: totals.itemCount, totalCents: totals.totalCents, customer: address.name.trim(), destination: orderDestination(address) };
}

export function quantityOptions(product: Product): number[] {
  const max = /only\s+(\d+)/i.exec(product.stockLabel)?.[1];
  const limit = Math.min(9, max ? Number(max) : 9);
  return Array.from({ length: Math.max(1, limit) }, (_, index) => index + 1);
}

export function isCartLineValid(line: CartLine): boolean {
  return Boolean(line.product.slug && line.quantity > 0 && line.finish.trim());
}

export function cleanCart(lines: CartLine[]): CartLine[] {
  return lines.filter(isCartLineValid).map((line) => ({ ...line, quantity: Math.min(9, Math.max(1, Math.round(line.quantity))) }));
}

export function mergeCartLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const line of cleanCart(lines)) {
    const key = `${line.product.slug}:${line.finish}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: Math.min(9, existing.quantity + line.quantity) } : line);
  }
  return [...merged.values()];
}

export function lineLabel(line: CartLine): string {
  return `${line.quantity} × ${line.product.name} · ${line.finish}`;
}
