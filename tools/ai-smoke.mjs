import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const required = ["packages/ai/src/contracts.ts", "packages/ai/src/offline.ts", "packages/ai/src/tools.ts", "packages/ai/src/prompts.ts", "packages/ai/src/providers.ts", "docs/evidence/ai/offline-fixture.json"];
const checks = [];
for (const relativePath of required) {
  try {
    await access(join(root, relativePath));
    checks.push({ label: `required:${relativePath}`, pass: true });
  } catch {
    checks.push({ label: `required:${relativePath}`, pass: false });
  }
}
try {
  const fixture = JSON.parse(await readFile(join(root, "docs/evidence/ai/offline-fixture.json"), "utf8"));
  checks.push({ label: "fixture:offline-provider", pass: fixture.provider === "offline" });
  checks.push({ label: "fixture:evidence-backed-answer", pass: Array.isArray(fixture.scan?.evidence) && fixture.scan.evidence.length > 0 });
  checks.push({ label: "fixture:proposal-stays-reviewable", pass: fixture.suggest?.proposal?.autoApproved === false });
} catch {
  checks.push({ label: "fixture:parseable", pass: false });
}
const failures = checks.filter((check) => !check.pass);
console.log(JSON.stringify({ name: "patchwork-ai-smoke", checks, pass: failures.length === 0 }, null, 2));
if (failures.length > 0) process.exitCode = 1;
