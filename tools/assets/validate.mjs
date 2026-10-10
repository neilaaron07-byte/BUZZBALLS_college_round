import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const publicRoot = join(root, "public", "assets");
const manifest = JSON.parse(await readFile(join(publicRoot, "manifest.json"), "utf8"));
const failures = [];
for (const asset of manifest.assets) {
  try {
    await access(join(publicRoot, asset.path.replace(/^\//, "")));
    if (!asset.path.startsWith("/") || asset.path.includes("http") || asset.bytes <= 0) failures.push(`${asset.path}: invalid manifest metadata`);
  } catch {
    failures.push(`${asset.path}: file missing`);
  }
}
if (manifest.assets.length < 40) failures.push("asset manifest contains fewer than 40 generated assets");
console.log(JSON.stringify({ assets: manifest.assets.length, failures, pass: failures.length === 0 }, null, 2));
if (failures.length > 0) process.exitCode = 1;
