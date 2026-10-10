import AxeBuilder from "@axe-core/playwright";
import type { Page } from "playwright";
import type { VerificationCheck } from "./contracts";

export async function checkAccessibility(page: Page, id: string): Promise<VerificationCheck> {
  const startedAt = Date.now();
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations;
  return {
    id,
    kind: "accessibility",
    label: "Accessibility baseline",
    status: violations.length === 0 ? "passed" : violations.some((violation) => violation.impact === "critical" || violation.impact === "serious") ? "failed" : "warning",
    blocking: true,
    explanation: violations.length === 0 ? "Axe found no accessibility violations." : `${violations.length} accessibility rule${violations.length === 1 ? "" : "s"} need review.`,
    durationMs: Date.now() - startedAt,
    evidence: violations.slice(0, 10).map((violation) => `${violation.id}: ${violation.help}`),
  };
}
