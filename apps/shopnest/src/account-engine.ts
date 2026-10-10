import type { CartLine } from "./types";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  joined: string;
  tier: "studio" | "standard";
};

export type DemoOrderRecord = {
  id: string;
  date: string;
  status: "delivered" | "in-transit" | "processing";
  totalCents: number;
  items: string[];
  destination: string;
  tracking?: string;
};

export type AccountNotice = {
  id: string;
  title: string;
  detail: string;
  tone: "green" | "amber" | "neutral";
  read: boolean;
};

export const demoUser: DemoUser = { id: "usr_maya_chen", name: "Maya Chen", email: "maya@example.com", initials: "MC", joined: "March 2024", tier: "studio" };

export const demoOrders: DemoOrderRecord[] = [
  { id: "SN–24782", date: "Oct 6, 2026", status: "in-transit", totalCents: 24800, items: ["Aurora headphones"], destination: "Brooklyn, NY", tracking: "SNST–2048–NY" },
  { id: "SN–24126", date: "Aug 18, 2026", status: "delivered", totalCents: 19200, items: ["Atlas carry"], destination: "Brooklyn, NY", tracking: "SNST–1901–NY" },
  { id: "SN–23290", date: "Jun 30, 2026", status: "delivered", totalCents: 16600, items: ["Still bottle", "Morrow mat"], destination: "Brooklyn, NY" },
];

export const accountNotices: AccountNotice[] = [
  { id: "notice_release", title: "Your Aurora order is moving", detail: "The latest scan passed the shipping handoff.", tone: "green", read: false },
  { id: "notice_saved", title: "Two objects are saved", detail: "We will keep them here until you are ready.", tone: "neutral", read: true },
  { id: "notice_patch", title: "Storefront release is under review", detail: "PATCHWORK is observing a safe checkout preview.", tone: "amber", read: false },
];

export function orderStatusLabel(status: DemoOrderRecord["status"]): string {
  return status === "delivered" ? "Delivered" : status === "in-transit" ? "In transit" : "Processing";
}

export function orderStatusTone(status: DemoOrderRecord["status"]): "green" | "amber" | "neutral" {
  return status === "delivered" ? "green" : status === "in-transit" ? "amber" : "neutral";
}

export function accountGreeting(user: DemoUser, hour = 10): string {
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${user.name.split(" ")[0]}.`;
}

export function orderTotalForLines(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.product.priceCents * line.quantity, 0);
}

export function unreadNoticeCount(notices: AccountNotice[]): number {
  return notices.filter((notice) => !notice.read).length;
}

export function markNoticeRead(notices: AccountNotice[], id: string): AccountNotice[] {
  return notices.map((notice) => notice.id === id ? { ...notice, read: true } : notice);
}

export function accountTierLabel(tier: DemoUser["tier"]): string {
  return tier === "studio" ? "Studio member" : "Standard member";
}

export function accountSupportMessage(user: DemoUser): string {
  return `Support is ready for ${user.name}. Replies from the ShopNest studio team arrive within one business day.`;
}
