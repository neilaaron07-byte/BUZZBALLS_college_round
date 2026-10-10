import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "packages", "extension", "dist");
await mkdir(output, { recursive: true });
await build({ entryPoints: [join(root, "packages/extension/src/content-script.ts")], bundle: true, format: "iife", platform: "browser", target: "es2022", outfile: join(output, "content-script.js"), minify: true });
await build({ entryPoints: [join(root, "packages/extension/src/service-worker.ts")], bundle: true, format: "esm", platform: "browser", target: "es2022", outfile: join(output, "service-worker.js"), minify: true });
const manifest = await readFile(join(root, "manifest.json"), "utf8");
await writeFile(join(output, "manifest.json"), manifest);
await writeFile(join(output, "side-panel.html"), "<!doctype html><html><head><meta charset=\"utf-8\"><title>PATCHWORK inspector</title></head><body><main id=\"patchwork-panel\" data-patchwork-ui=\"panel\"></main><script type=\"module\" src=\"side-panel.js\"></script></body></html>\n");
await build({ entryPoints: [join(root, "packages/extension/src/side-panel.ts")], bundle: true, format: "esm", platform: "browser", target: "es2022", outfile: join(output, "side-panel.js"), minify: true });
const assetRoot = join(root, "public/assets/icons");
await mkdir(join(output, "assets/icons"), { recursive: true });
for (const size of [16, 32, 48, 128]) await copyFile(join(assetRoot, `extension-${size}.svg`), join(output, `assets/icons/extension-${size}.svg`));
console.log(`Built PATCHWORK MV3 extension in ${dirname(output)}/dist`);
