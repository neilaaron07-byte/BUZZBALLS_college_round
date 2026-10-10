import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = join(root, "packages", "core", "src");
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
}

await collect(sourceRoot);
const sources = await Promise.all(files.map(async (path) => ({ path, text: await readFile(path, "utf8") })));
const anyMatches = sources.flatMap(({ path, text }) => [...text.matchAll(/\bany\b/g)].map((match) => `${path}:${match.index ?? 0}`));
const requiredExports = ["parseSafeOperation", "patchContentHash", "auditEntrySchema", "patchOperationSchema"];
const index = await readFile(join(sourceRoot, "index.ts"), "utf8");
const allSource = sources.map(({ text }) => text).join("\n");
const missingExports = requiredExports.filter((name) => !allSource.includes(name));
const result = {
  files: files.length,
  noAnyTypes: anyMatches.length === 0,
  missingExports,
  pass: anyMatches.length === 0 && missingExports.length === 0,
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
