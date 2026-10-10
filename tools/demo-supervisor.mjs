import { spawn } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";

const services = [];
const apiUrl = process.env.PATCHWORK_API_URL ?? "http://127.0.0.1:8787";
const webUrl = process.env.PATCHWORK_WEB_URL ?? "http://localhost:3000";

async function responds(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(800) });
    return response.status < 500;
  } catch {
    return false;
  }
}

function start(name, command, args, environment) {
  const child = spawn(command, args, { cwd: process.cwd(), env: { ...process.env, ...environment }, stdio: "inherit" });
  services.push({ name, child });
  child.once("exit", (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[demo] ${name} exited with ${signal ?? code}.`);
      process.exitCode = code ?? 1;
      void shutdown();
    }
  });
}

async function clearStaleWebLock() {
  const lockPath = join(process.cwd(), ".vinext", "dev", "lock.json");
  try {
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    if (lock.port === 3000 && !(await responds(webUrl))) await unlink(lockPath);
  } catch {
    // A missing or already-clean lock does not block the demo.
  }
}

let shuttingDown = false;
let keepAliveTimer;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  for (const { child } of services) if (!child.killed) child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 250));
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

if (!(await responds(`${apiUrl}/healthz`))) start("api", "npm", ["run", "api:start"], { PATCHWORK_API_PORT: "8787", NEXT_PUBLIC_API_URL: apiUrl });
await clearStaleWebLock();
if (!(await responds(webUrl))) start("web", "npm", ["run", "dev"], { NEXT_PUBLIC_API_URL: apiUrl });

console.log(`[demo] PATCHWORK is ready at ${webUrl}/dashboard`);
console.log(`[demo] Guided repair: ${webUrl}/fix`);
console.log(`[demo] API health: ${apiUrl}/healthz`);
keepAliveTimer = setInterval(() => undefined, 60_000);
await new Promise(() => {});
