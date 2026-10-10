import { mkdir, writeFile } from "node:fs/promises";

const apiUrl = process.env.PATCHWORK_API_URL ?? "http://127.0.0.1:8787";
try {
  const response = await fetch(`${apiUrl}/demo/reset`, { method: "POST", headers: { accept: "application/json" }, signal: AbortSignal.timeout(1_500) });
  if (response.ok) {
    const envelope = await response.json();
    console.log(envelope.data?.reset ? `PATCHWORK API reset: ${envelope.data.sites} site, ${envelope.data.patches} patches, ${envelope.data.releases} releases.` : "PATCHWORK API reset completed.");
    process.exit(0);
  }
} catch {
  // The local API may not be running; the marker reset below still restores the browser fixture.
}

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
