import type { Environment, Site } from "../../../packages/core/src/index";
import type { ApiState } from "./types";

export interface SiteRule {
  id: string;
  label: string;
  status: "passed" | "warning" | "failed";
  explanation: string;
}

export interface SiteRulesResult {
  siteId: string;
  status: "green" | "amber" | "red";
  rules: readonly SiteRule[];
}

export function evaluateSiteRules(state: ApiState, site: Site, environments: readonly Environment[]): SiteRulesResult {
  const rules: SiteRule[] = [];
  rules.push({ id: "canonical-origin", label: "Canonical origin", status: site.canonicalOrigin.endsWith("/") ? "passed" : "failed", explanation: site.canonicalOrigin.endsWith("/") ? "Site origin is normalized." : "Site origin must end at the origin root." });
  rules.push({ id: "protected-production", label: "Protected production", status: environments.some((environment) => environment.name === "production" && environment.protected) ? "passed" : "failed", explanation: environments.some((environment) => environment.name === "production" && environment.protected) ? "Production requires explicit release controls." : "Production is not protected." });
  rules.push({ id: "staging-present", label: "Staging environment", status: environments.some((environment) => environment.name === "staging") ? "passed" : "warning", explanation: environments.some((environment) => environment.name === "staging") ? "A staging environment is configured." : "No staging environment is configured." });
  rules.push({ id: "preview-present", label: "Private preview", status: environments.some((environment) => environment.name === "preview") ? "passed" : "warning", explanation: environments.some((environment) => environment.name === "preview") ? "Preview environment is available for isolated review." : "Preview environment is missing." });
  rules.push({ id: "release-attached", label: "Environment releases", status: environments.every((environment) => environment.name === "preview" || environment.releaseId !== null) ? "passed" : "warning", explanation: environments.every((environment) => environment.name === "preview" || environment.releaseId !== null) ? "Protected environments have an attached release." : "A protected environment has no attached release." });
  const failed = rules.some((rule) => rule.status === "failed");
  const warning = rules.some((rule) => rule.status === "warning");
  return { siteId: site.id, status: failed ? "red" : warning ? "amber" : "green", rules };
}

export function siteOrigin(site: Site): URL {
  return new URL(site.canonicalOrigin);
}

export function environmentFor(state: ApiState, siteId: string, name: Environment["name"]): Environment | null {
  return state.environments.find((environment) => environment.siteId === siteId && environment.name === name) ?? null;
}
