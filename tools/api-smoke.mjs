import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const required = ["apps/api/src/app.ts", "apps/api/src/store.ts", "apps/api/src/seed.ts", "apps/api/src/services.ts", "apps/api/src/routes/releases.ts", "apps/api/src/routes/audit.ts"];
const checks = [];
for (const relativePath of required) {
  try { await access(join(root, relativePath)); checks.push({ label: `required:${relativePath}`, pass: true }); }
  catch { checks.push({ label: `required:${relativePath}`, pass: false }); }
}
const app = await readFile(join(root, "apps/api/src/app.ts"), "utf8");
checks.push({ label: "server:payload-limit", pass: app.includes('limit: "128kb"') });
checks.push({ label: "server:health-routes", pass: app.includes("systemRoutes") });
const store = await readFile(join(root, "apps/api/src/store.ts"), "utf8");
checks.push({ label: "store:atomic-rename", pass: store.includes("rename(temporaryPath") && store.includes(".bak") });
const failures = checks.filter((check) => !check.pass);
console.log(JSON.stringify({ name: "patchwork-api-smoke", checks, pass: failures.length === 0 }, null, 2));
if (failures.length > 0) process.exitCode = 1;
