import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const routes = [
  { id: "web", url: "http://localhost:3000/web" },
  { id: "dashboard", url: "http://localhost:3000/dashboard?view=overview" },
];

for (const route of routes) {
  const outputPath = `docs/evidence/lighthouse-${route.id}.json`;
  const result = spawnSync("npm", ["exec", "--yes", "--package=lighthouse", "--", "lighthouse", route.url, "--output=json", `--output-path=${outputPath}`, "--chrome-flags=--headless=new --no-sandbox"], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  const report = JSON.parse(readFileSync(outputPath, "utf8"));
  const score = (key) => Math.round((report.categories[key]?.score ?? 0) * 100);
  console.log(JSON.stringify({ route: route.id, performance: score("performance"), accessibility: score("accessibility"), bestPractices: score("best-practices"), cls: report.audits["cumulative-layout-shift"]?.numericValue ?? null, consoleErrors: report.audits["errors-in-console"]?.score === 1 ? 0 : 1 }));
}
