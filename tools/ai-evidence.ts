import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fingerprintFromSnapshot, resolveTarget, scanPage, type ElementSnapshot, type ScanSnapshot } from "../packages/core/src/index";
import { OfflinePatchPilot } from "../packages/ai/src/index";

const snapshot: ScanSnapshot = {
  pageUrl: "https://shopnest.example/products/aurora",
  viewport: { width: 390, height: 844 },
  elements: [
    { id: "price", tag: "p", text: "$248", visible: true, region: "middle-center", rect: { left: 20, top: 100, right: 120, bottom: 130 }, styles: { foreground: "#777777", background: "#ffffff", fontSizePx: 16, fontWeight: 400 } },
    { id: "buy", tag: "button", text: "Add to cart", accessibleName: "Add to cart", visible: true, region: "bottom-center", rect: { left: 20, top: 700, right: 180, bottom: 748 } },
  ],
};
const targetSnapshot: ElementSnapshot = { tag: "p", attributes: { id: "price" }, text: "$248", path: ["html", "body", "main", "p"], siblings: ["p", "button"], landmarks: ["main"], rect: { top: 100, left: 20, width: 100, height: 30, viewportWidth: 390, viewportHeight: 844 } };
const target = fingerprintFromSnapshot(targetSnapshot);
const resolution = resolveTarget(target, [{ id: "price", label: "price", fingerprint: target }]);
const findings = scanPage(snapshot);
const pilot = new OfflinePatchPilot({ now: () => new Date("2026-10-10T08:00:00.000Z") });
const scan = await pilot.complete({ intent: "scan", context: { pageUrl: snapshot.pageUrl, snapshot } });
const suggest = await pilot.complete({ intent: "suggest", context: { pageUrl: snapshot.pageUrl, findings, target, resolution } });
const outputDirectory = join(process.cwd(), "docs", "evidence", "ai");
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "offline-fixture.json"), `${JSON.stringify({ provider: pilot.name, generatedAt: "2026-10-10T08:00:00.000Z", scan, suggest }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ provider: pilot.name, scanStatus: scan.status, proposalStatus: suggest.proposal?.status ?? "none", evidence: join(outputDirectory, "offline-fixture.json") }, null, 2));
