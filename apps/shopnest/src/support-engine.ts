export type SupportTopic = "orders" | "shipping" | "returns" | "product" | "release";

export type SupportArticle = {
  id: string;
  topic: SupportTopic;
  question: string;
  answer: string;
  updated: string;
};

export type SupportRequest = {
  subject: string;
  email: string;
  message: string;
  topic: SupportTopic;
};

export const supportArticles: SupportArticle[] = [
  { id: "faq_delivery", topic: "shipping", question: "When will my order arrive?", answer: "Standard domestic orders leave the studio within 48 hours. A shipping promise is shown on every product and in checkout.", updated: "Oct 4, 2026" },
  { id: "faq_returns", topic: "returns", question: "How do quiet returns work?", answer: "Start a return within 30 days. We provide a label and ask only that the object comes back in its original condition.", updated: "Sep 28, 2026" },
  { id: "faq_orders", topic: "orders", question: "Where can I find a past order?", answer: "Open Account from the store header. The local demo includes a realistic order history without asking for a real account.", updated: "Oct 1, 2026" },
  { id: "faq_product", topic: "product", question: "Can I change the finish?", answer: "Yes. Select a finish on the product page before adding the object to your cart. Your choice stays with the cart line.", updated: "Aug 19, 2026" },
  { id: "faq_release", topic: "release", question: "Why do I see a PATCHWORK banner?", answer: "This storefront is a safe release fixture. PATCHWORK shows how a team can inspect an incident without touching the public baseline.", updated: "Oct 10, 2026" },
];

export function articlesForTopic(topic: SupportTopic | "all"): SupportArticle[] {
  return topic === "all" ? supportArticles : supportArticles.filter((article) => article.topic === topic);
}

export function searchSupport(query: string): SupportArticle[] {
  const value = query.trim().toLowerCase();
  if (!value) return supportArticles;
  return supportArticles.filter((article) => `${article.question} ${article.answer} ${article.topic}`.toLowerCase().includes(value));
}

export function validateSupportRequest(request: SupportRequest): string[] {
  const errors: string[] = [];
  if (!request.subject.trim()) errors.push("Add a short subject.");
  if (!/^\S+@\S+\.\S+$/.test(request.email.trim())) errors.push("Use a complete email address.");
  if (request.message.trim().length < 12) errors.push("Tell the studio team a little more so they can help.");
  return errors;
}

export function supportRequestLabel(request: SupportRequest): string {
  return `${request.topic} · ${request.subject.trim() || "New request"}`;
}

export function responseTime(topic: SupportTopic): string {
  return topic === "release" ? "PATCHWORK release questions receive a reply within one business day." : "The ShopNest studio team replies within one business day.";
}
