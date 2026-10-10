export type StoreEventName = "page_view" | "search" | "product_view" | "add_to_cart" | "checkout_started" | "checkout_failed" | "order_completed" | "release_selected";

export type StoreEvent = {
  name: StoreEventName;
  at: string;
  path: string;
  release: "v1" | "v2" | "v3";
  metadata: Record<string, string | number | boolean>;
};

export type FunnelSnapshot = {
  viewed: number;
  carted: number;
  checkoutStarted: number;
  completed: number;
  completionRate: number;
  friction: "low" | "medium" | "high";
};

export function createStoreEvent(name: StoreEventName, path: string, release: StoreEvent["release"], metadata: StoreEvent["metadata"] = {}, at = "2026-10-10T09:00:00.000Z"): StoreEvent {
  return { name, at, path, release, metadata };
}

export function eventCount(events: StoreEvent[], name: StoreEventName): number {
  return events.filter((event) => event.name === name).length;
}

export function funnelSnapshot(events: StoreEvent[]): FunnelSnapshot {
  const viewed = eventCount(events, "product_view");
  const carted = eventCount(events, "add_to_cart");
  const checkoutStarted = eventCount(events, "checkout_started");
  const completed = eventCount(events, "order_completed");
  const completionRate = viewed ? Math.round((completed / viewed) * 100) : 0;
  const friction = completed >= checkoutStarted && completed > 0 ? "low" : carted > completed ? "medium" : "high";
  return { viewed, carted, checkoutStarted, completed, completionRate, friction };
}

export function eventsForRelease(events: StoreEvent[], release: StoreEvent["release"]): StoreEvent[] {
  return events.filter((event) => event.release === release);
}

export function eventMetadataValue(events: StoreEvent[], name: StoreEventName, key: string): Array<string | number | boolean> {
  return events.filter((event) => event.name === name).flatMap((event) => event.metadata[key] === undefined ? [] : [event.metadata[key]!]);
}

export function releaseSelectionEvents(events: StoreEvent[]): Record<StoreEvent["release"], number> {
  return { v1: eventCount(eventsForRelease(events, "v1"), "release_selected"), v2: eventCount(eventsForRelease(events, "v2"), "release_selected"), v3: eventCount(eventsForRelease(events, "v3"), "release_selected") };
}

export function serializeEvents(events: StoreEvent[]): string {
  return JSON.stringify(events);
}

export function parseEvents(serialized: string): StoreEvent[] {
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter((event): event is StoreEvent => Boolean(event && typeof event === "object" && "name" in event && "at" in event && "path" in event && "release" in event));
  } catch {
    return [];
  }
}
