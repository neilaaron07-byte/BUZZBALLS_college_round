import { mkdir, writeFile } from "node:fs/promises";

const directory = new URL("../.patchwork-demo/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("state.json", directory), `${JSON.stringify({
  mode: "seeded-checkout-incident",
  release: "rel_2026_10_10_142",
  health: "attention",
  finding: "finding_checkout_buy_button_hidden",
  resetAt: "2026-10-10T12:00:00.000Z",
}, null, 2)}\n`);
console.log("PATCHWORK demo state reset to the seeded checkout incident.");
