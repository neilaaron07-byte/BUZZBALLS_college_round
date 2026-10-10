import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const required = [
  "packages/verifier/src/browser.ts",
  "packages/verifier/src/contracts.ts",
  "packages/verifier/src/interactions.ts",
  "packages/verifier/src/resolution.ts",
  "packages/verifier/src/visual.ts",
  "packages/verifier/src/replay.ts",
];
const checks = [];
for (const relativePath of required) {
  try {
    await access(join(root, relativePath));
    checks.push({ label: `source:${relativePath}`, pass: true });
  } catch {
    checks.push({ label: `source:${relativePath}`, pass: false });
  }
}
const resolution = await readFile(join(root, "packages/verifier/src/resolution.ts"), "utf8");
checks.push({ label: "resolution:uses-core-fingerprint", pass: resolution.includes("fingerprintFromSnapshot") && resolution.includes("resolveTarget") });
const browser = await readFile(join(root, "packages/verifier/src/browser.ts"), "utf8");
checks.push({ label: "browser:captures-visual-evidence", pass: browser.includes("captureVisualEvidence") && browser.includes("checkAccessibility") });
try {
  const report = JSON.parse(await readFile(join(root, "docs/evidence/verifier/hidden-buy-button/report.json"), "utf8"));
  checks.push({ label: "evidence:stored-report-blocks-hidden-button", pass: report.status === "blocked" && report.checks.some((check) => check.status === "failed" && check.label === "Add to cart") });
} catch {
  checks.push({ label: "evidence:stored-report-blocks-hidden-button", pass: false });
}
const failures = checks.filter((check) => !check.pass);
console.log(JSON.stringify({ name: "patchwork-verifier-smoke", checks, pass: failures.length === 0 }, null, 2));
if (failures.length > 0) process.exitCode = 1;
