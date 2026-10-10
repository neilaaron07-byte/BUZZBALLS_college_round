import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "packages", "extension", "dist");
const manifest = JSON.parse(await readFile(join(dist, "manifest.json"), "utf8"));
const requiredFiles = ["content-script.js", "service-worker.js", "side-panel.js", "side-panel.html", "manifest.json", "assets/icons/extension-16.svg", "assets/icons/extension-32.svg", "assets/icons/extension-48.svg", "assets/icons/extension-128.svg"];
const files = [];
for (const relativePath of requiredFiles) {
  const path = join(dist, relativePath);
  await access(path);
  files.push({ path: relativePath, bytes: (await stat(path)).size });
}
const result = {
  manifestVersion: manifest.manifest_version,
  serviceWorker: manifest.background?.service_worker,
  contentScript: manifest.content_scripts?.[0]?.js?.[0],
  sidePanel: manifest.side_panel?.default_path,
  files,
  pass: manifest.manifest_version === 3 && manifest.background?.service_worker === "service-worker.js" && files.every((file) => file.bytes > 0),
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
