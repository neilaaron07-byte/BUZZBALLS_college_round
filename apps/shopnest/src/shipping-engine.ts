import type { CartLine, CheckoutAddress, Product } from "./types";

export type ShippingRegion = "domestic" | "canada" | "europe" | "rest-of-world";

export type ShippingOption = {
  id: "standard" | "express" | "pickup";
  label: string;
  detail: string;
  cents: number;
  days: number;
  tone: "green" | "amber" | "neutral";
};

export type ShippingEstimate = {
  region: ShippingRegion;
  options: ShippingOption[];
  defaultOption: ShippingOption;
  freeShipping: boolean;
};

export type PackageProfile = {
  weightGrams: number;
  volume: "small" | "medium" | "large";
  fragile: boolean;
};

const regionNames: Record<ShippingRegion, string> = { domestic: "United States", canada: "Canada", europe: "Europe", "rest-of-world": "Rest of world" };

export function regionFromAddress(address: CheckoutAddress): ShippingRegion {
  const region = `${address.region} ${address.postalCode}`.toLowerCase();
  if (/canada|ontario|quebec|vancouver/.test(region)) return "canada";
  if (/uk|london|berlin|paris|eu|france|germany/.test(region)) return "europe";
  if (/australia|japan|singapore|india/.test(region)) return "rest-of-world";
  return "domestic";
}

export function shippingRegionLabel(region: ShippingRegion): string {
  return regionNames[region];
}

export function packageProfile(lines: CartLine[]): PackageProfile {
  const weightGrams = lines.reduce((total, line) => total + line.quantity * (line.product.category === "audio" ? 430 : line.product.category === "desk" ? 780 : line.product.category === "travel" ? 610 : 320), 0);
  const volume = weightGrams > 1800 ? "large" : weightGrams > 700 ? "medium" : "small";
  const fragile = lines.some((line) => line.product.category === "audio" || line.product.category === "desk");
  return { weightGrams, volume, fragile };
}

export function shippingOptions(region: ShippingRegion, subtotalCents: number, lines: CartLine[] = []): ShippingOption[] {
  const profile = packageProfile(lines);
  const domesticFree = region === "domestic" && subtotalCents >= 10000;
  const standardCents = domesticFree ? 0 : region === "domestic" ? 1200 : region === "canada" ? 2400 : region === "europe" ? 3200 : 4600;
  const expressCents = region === "domestic" ? 2600 : region === "canada" ? 4200 : region === "europe" ? 5200 : 7600;
  const pickup: ShippingOption = { id: "pickup", label: "Studio pickup", detail: "Ready tomorrow from 18 Mercer Street", cents: 0, days: 1, tone: "green" };
  const standard: ShippingOption = { id: "standard", label: domesticFree ? "Free standard" : "Standard shipping", detail: `${profile.fragile ? "Careful handling · " : ""}${regionNames[region]}`, cents: standardCents, days: region === "domestic" ? 4 : region === "canada" ? 6 : 9, tone: domesticFree ? "green" : "neutral" };
  const express: ShippingOption = { id: "express", label: "Express shipping", detail: `Priority handling · ${regionNames[region]}`, cents: expressCents, days: region === "domestic" ? 2 : region === "canada" ? 4 : 6, tone: "amber" };
  return region === "domestic" ? [standard, express, pickup] : [standard, express];
}

export function estimateShipping(address: CheckoutAddress, subtotalCents: number, lines: CartLine[] = []): ShippingEstimate {
  const region = regionFromAddress(address);
  const options = shippingOptions(region, subtotalCents, lines);
  return { region, options, defaultOption: options[0]!, freeShipping: options[0]!.cents === 0 };
}

export function shippingPromise(product: Product): string {
  if (product.delivery.includes("today")) return "Leaves the studio today";
  if (product.delivery.includes("tomorrow")) return "Leaves the studio tomorrow";
  return "Leaves the studio within 48 hours";
}

export function deliveryDate(days: number, start = new Date("2026-10-10T09:00:00Z")): string {
  const date = new Date(start);
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function deliveryLabel(option: ShippingOption): string {
  return `${option.label} · arrives ${deliveryDate(option.days)}`;
}
