export interface FocusTarget {
  id: string;
  tabIndex: number;
  disabled?: boolean;
}

export interface Announcement {
  message: string;
  politeness: "polite" | "assertive";
}

export function interactiveTargets(targets: readonly FocusTarget[]): FocusTarget[] {
  return targets.filter((target) => !target.disabled && target.tabIndex >= 0);
}

export function assertUniqueIds(ids: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate accessible id: ${id}`);
    }
    seen.add(id);
  }
}

export function announcementFor(status: "loading" | "success" | "error", subject: string): Announcement {
  if (status === "loading") {
    return { message: `${subject} is in progress.`, politeness: "polite" };
  }
  if (status === "success") {
    return { message: `${subject} completed successfully.`, politeness: "polite" };
  }
  return { message: `${subject} needs attention.`, politeness: "assertive" };
}
