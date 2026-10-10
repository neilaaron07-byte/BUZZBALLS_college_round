export const patchworkTokens = {
  color: {
    ink: "#08090b",
    surface: "#0d0f12",
    raised: "#12151a",
    elevated: "#181c22",
    text: "#f5f7fa",
    muted: "#a7afb9",
    faint: "#6f7782",
    violet: "#8b5cf6",
    cyan: "#22d3ee",
    green: "#34d399",
    amber: "#fbbf24",
    red: "#fb7185",
  },
  space: { 1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px", 8: "32px", 10: "40px", 12: "48px", 16: "64px" },
  radius: { sm: "6px", md: "8px", lg: "12px", pill: "999px" },
  motion: { fast: "120ms", base: "200ms", emphasis: "320ms", slow: "600ms" },
  seam: { dash: "5px 5px", border: "1px", corner: "14px" },
} as const;

export type PatchworkTheme = "light" | "dark" | "system";

export type StatusTone = "green" | "amber" | "red" | "neutral" | "violet";

export const statusToneLabels: Record<StatusTone, string> = {
  green: "Healthy",
  amber: "Needs attention",
  red: "Blocked",
  neutral: "Not checked",
  violet: "In progress",
};
