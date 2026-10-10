import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const excludedDirectories = new Set([".git", ".next", ".wrangler", "dist", "node_modules", "public"]);
const sourceExtensions = new Set([".cjs", ".js", ".mjs", ".ts", ".tsx", ".mts", ".cts"]);
const excludedNames = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "tsconfig.tsbuildinfo"]);
const generatedMarkers = ["generated", ".min.", ".map"];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(filePath));
    else files.push(filePath);
  }
  return files;
}

function isCountable(filePath) {
  const name = filePath.split(sep).pop() ?? "";
  const extension = name.slice(name.lastIndexOf("."));
  return sourceExtensions.has(extension) && !excludedNames.has(name) && !generatedMarkers.some((marker) => name.includes(marker));
}

async function lineCount(filePath) {
  const contents = await readFile(filePath, "utf8");
  return contents.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

const files = (await filesUnder(root)).filter(isCountable);
const buckets = new Map([
  ["packages/core", 0],
  ["packages/sdk", 0],
  ["packages/extension", 0],
  ["packages/verifier", 0],
  ["packages/ai", 0],
  ["apps/api", 0],
  ["apps/dashboard", 0],
  ["apps/web", 0],
  ["apps/shopnest", 0],
  ["tests", 0],
]);
let total = 0;
for (const filePath of files) {
  const count = await lineCount(filePath);
  const projectPath = relative(root, filePath).replaceAll(sep, "/");
  const bucket = [...buckets.keys()].find((prefix) => projectPath === prefix || projectPath.startsWith(`${prefix}/`));
  if (bucket) buckets.set(bucket, buckets.get(bucket) + count);
  if (projectPath.startsWith("packages/") || projectPath.startsWith("apps/") || projectPath.startsWith("tests/")) total += count;
}

console.log("PATCHWORK handwritten LOC");
for (const [bucket, count] of buckets) console.log(`${bucket.padEnd(22)} ${String(count).padStart(6)}`);
console.log(`${"TOTAL".padEnd(22)} ${String(total).padStart(6)}`);
