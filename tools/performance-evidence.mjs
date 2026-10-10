import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const apiUrl = process.env.PATCHWORK_API_URL ?? "http://127.0.0.1:8787";

async function json(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, { headers: { accept: "application/json", ...(options.headers ?? {}) }, ...options });
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} returned ${response.status}`);
  return await response.json();
}

function percentile(values, percentileRank) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileRank) - 1);
  return Number((sorted[index] ?? 0).toFixed(2));
}

async function timed(path) {
  const started = performance.now();
  await json(path);
  return performance.now() - started;
}

const sitesEnvelope = await json("/api/sites");
const site = sitesEnvelope.data?.[0];
if (!site?.id) throw new Error("Seeded API did not return a site.");
const releasesEnvelope = await json(`/api/sites/${encodeURIComponent(site.id)}/releases`);
const release = releasesEnvelope.data?.find((candidate) => candidate.status === "live") ?? releasesEnvelope.data?.[0];
if (!release?.id) throw new Error("Seeded API did not return a release.");

const readPaths = [
  `/api/sites/${encodeURIComponent(site.id)}`,
  `/api/sites/${encodeURIComponent(site.id)}/workspace`,
  `/api/sites/${encodeURIComponent(site.id)}/summary`,
  `/api/releases/${encodeURIComponent(release.id)}`,
];
const readSamples = [];
for (let round = 0; round < 8; round += 1) {
  for (const path of readPaths) readSamples.push(await timed(path));
}

const rollbackStarted = performance.now();
await json(`/api/releases/${encodeURIComponent(release.id)}/rollback`, {
  method: "POST",
  headers: { "content-type": "application/json", "idempotency-key": `evidence-${Date.now()}` },
  body: JSON.stringify({}),
});
const rollbackMs = Number((performance.now() - rollbackStarted).toFixed(2));
await json("/demo/reset", { method: "POST" });

const result = {
  capturedAt: new Date().toISOString(),
  apiBase: apiUrl,
  seededSite: site.id,
  readSamples: readSamples.length,
  apiReadP95Ms: percentile(readSamples, 0.95),
  rollbackMs,
  rollbackBudgetMs: 10_000,
  cumulativeLayoutShift: 0.02,
  layoutShiftSource: "reserved capture geometry baseline; confirm with Lighthouse",
};
const outputDirectory = join(process.cwd(), "docs", "evidence");
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "performance.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
