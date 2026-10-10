import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  entryPoints: [join(root, "packages/sdk/src/index.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  minify: true,
  write: false,
  sourcemap: false,
  target: "es2022",
});
const output = result.outputFiles[0]?.contents;
if (!output) throw new Error("SDK bundle did not produce an output file.");
const gzippedBytes = gzipSync(output, { level: 9 }).byteLength;
const budgetBytes = 15 * 1024;
const report = {
  rawBytes: output.byteLength,
  gzippedBytes,
  budgetBytes,
  pass: gzippedBytes <= budgetBytes,
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
