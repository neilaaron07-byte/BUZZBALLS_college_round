import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const publicRoot = join(root, "public", "assets");
const generated = [];
const palette = ["#8b5cf6", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#f97316"];
const productNames = [
  "Orbit headphones", "Arc speaker", "Fold camera", "Halo lamp", "Field recorder", "Relay keyboard",
  "Trace notebook", "Signal mug", "North tote", "Loop charger", "Glass timer", "Drift bottle",
  "Soft desk mat", "Beam monitor stand", "Peak headphones", "Tide speaker", "Frame camera", "Nova lamp",
  "Echo recorder", "Grid keyboard", "Line notebook", "Pulse mug", "Cove tote", "Flux charger",
];
const avatars = ["Maya Chen", "Jon Bell", "Asha Rao", "Leo Park", "Nia Cole", "Owen Shah", "Rhea Singh", "Cal Moss"];

async function ensure(directory) { await mkdir(directory, { recursive: true }); }

async function writeAsset(relativePath, contents) {
  const filePath = join(publicRoot, relativePath);
  await ensure(join(filePath, ".."));
  await writeFile(filePath, contents);
  generated.push({ path: `/${relativePath.replaceAll("\\", "/")}`, bytes: (await stat(filePath)).size });
  return filePath;
}

function svgShell(content, width = 400, height = 400) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient><filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000" flood-opacity=".18"/></filter></defs>${content}</svg>`;
}

function productIllustration(index, name) {
  const color = palette[index % palette.length];
  const secondary = palette[(index + 2) % palette.length];
  const kind = index % 6;
  const base = `<rect x="38" y="38" width="324" height="324" rx="48" fill="#101318"/><path d="M38 278h324v84H38z" fill="#151a21"/><circle cx="304" cy="92" r="34" fill="${color}" opacity=".18"/><text x="62" y="326" fill="#89929f" font-family="monospace" font-size="12" letter-spacing="2">${name.toUpperCase()}</text>`;
  const art = kind === 0 ? `<path d="M120 190c0-62 38-104 80-104s80 42 80 104" stroke="url(#g)" stroke-width="24" stroke-linecap="round"/><rect x="94" y="172" width="62" height="102" rx="26" fill="${color}" filter="url(#s)"/><rect x="244" y="172" width="62" height="102" rx="26" fill="${secondary}" filter="url(#s)"/><circle cx="125" cy="218" r="13" fill="#08090b"/><circle cx="275" cy="218" r="13" fill="#08090b"/>` : kind === 1 ? `<path d="M122 136 278 162v128l-156-26z" fill="${color}" filter="url(#s)"/><path d="m122 136 76-54 156 26-76 54z" fill="${secondary}" opacity=".9"/><circle cx="214" cy="207" r="34" fill="#101318" stroke="#eef2f5" stroke-opacity=".35" stroke-width="5"/><path d="M214 176v62M183 207h62" stroke="#eef2f5" stroke-opacity=".28" stroke-width="4"/>` : kind === 2 ? `<rect x="112" y="112" width="176" height="158" rx="25" fill="${color}" filter="url(#s)"/><circle cx="200" cy="190" r="54" fill="#0b0d11"/><circle cx="200" cy="190" r="32" fill="${secondary}"/><path d="M142 112v-26h48v26M210 112v-26h48v26" stroke="#eef2f5" stroke-opacity=".45" stroke-width="10"/>` : kind === 3 ? `<path d="M200 78c18 46 92 75 92 134 0 52-40 84-92 84s-92-32-92-84c0-59 74-88 92-134Z" fill="${color}" filter="url(#s)"/><path d="M200 128v116M158 188h84" stroke="#f5f7fa" stroke-opacity=".6" stroke-width="8" stroke-linecap="round"/>` : kind === 4 ? `<rect x="120" y="106" width="160" height="188" rx="22" fill="${color}" filter="url(#s)"/><rect x="146" y="134" width="108" height="52" rx="10" fill="#0b0d11"/><circle cx="200" cy="240" r="25" fill="${secondary}"/><path d="M146 212h108" stroke="#f5f7fa" stroke-opacity=".28" stroke-width="5"/>` : `<rect x="96" y="130" width="208" height="132" rx="16" fill="${color}" filter="url(#s)"/><path d="M116 168h168M116 197h168M116 226h168" stroke="#0b0d11" stroke-opacity=".8" stroke-width="9" stroke-linecap="round"/><path d="M128 294h144" stroke="${secondary}" stroke-width="16" stroke-linecap="round"/>`;
  return svgShell(`${base}${art}`);
}

function heroSvg() {
  return svgShell(`<rect width="1600" height="900" fill="#08090b"/><path d="M0 140h1600M0 280h1600M0 420h1600M0 560h1600M0 700h1600M140 0v900M300 0v900M460 0v900M620 0v900M780 0v900M940 0v900M1100 0v900M1260 0v900M1420 0v900" stroke="#fff" stroke-opacity=".08"/><ellipse cx="800" cy="260" rx="420" ry="250" fill="#8b5cf6" opacity=".16"/><ellipse cx="970" cy="280" rx="360" ry="210" fill="#22d3ee" opacity=".12"/><rect x="250" y="176" width="1100" height="570" rx="28" fill="#15191f" stroke="#fff" stroke-opacity=".18" transform="rotate(-4 800 450)"/><rect x="296" y="260" width="1000" height="410" rx="18" fill="#0d0f12" stroke="#fff" stroke-opacity=".1" transform="rotate(-4 800 450)"/><path d="M344 350h360M344 390h520M344 430h430" stroke="#a7afb9" stroke-opacity=".35" stroke-width="15" stroke-linecap="round"/><rect x="960" y="334" width="230" height="190" rx="16" fill="#181c22" stroke="#8b5cf6" stroke-opacity=".8"/><path d="M1000 400h110M1000 434h150M1000 468h90" stroke="#22d3ee" stroke-opacity=".7" stroke-width="9" stroke-linecap="round"/><path d="M770 180C650 310 880 420 690 570s20 220 200 170" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="8 10"/><circle cx="770" cy="180" r="8" fill="#22d3ee"/><circle cx="890" cy="740" r="8" fill="#34d399"/><text x="344" y="600" fill="#f5f7fa" font-family="Arial, sans-serif" font-size="42" font-weight="600">SCAN · FIX · SHIP</text>`, 1600, 900);
}

function stateSvg(label, tone) {
  const color = tone === "red" ? "#fb7185" : tone === "green" ? "#34d399" : "#8b5cf6";
  return svgShell(`<rect x="72" y="74" width="256" height="250" rx="24" fill="#15191f" stroke="#fff" stroke-opacity=".13"/><path d="M116 146h168M116 184h122M116 222h148" stroke="#a7afb9" stroke-opacity=".3" stroke-width="13" stroke-linecap="round"/><path d="M200 286v28" stroke="${color}" stroke-width="7" stroke-linecap="round"/><circle cx="200" cy="104" r="14" fill="${color}"/><text x="112" y="362" fill="#a7afb9" font-family="monospace" font-size="12" letter-spacing="2">${label.toUpperCase()}</text>`);
}

function faviconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#08090b"/><path d="M7 11V7h4M21 7h4v4M25 21v4h-4M11 25H7v-4M11 11h10v10H11z" fill="none" stroke="#f5f7fa" stroke-width="1.6"/><path d="M16 3v6M29 16h-6M16 29v-6M3 16h6" stroke="#22d3ee" stroke-width="1.6"/></svg><!-- ${size}px -->`;
}

function avatarSvg(name, index) {
  const initials = name.split(" ").map((part) => part[0]).join("");
  return svgShell(`<circle cx="200" cy="200" r="184" fill="${palette[index % palette.length]}"/><circle cx="200" cy="176" r="65" fill="#f5f7fa" fill-opacity=".9"/><path d="M82 370c12-90 72-130 118-130s106 40 118 130" fill="#f5f7fa" fill-opacity=".9"/><text x="200" y="214" text-anchor="middle" fill="#08090b" font-family="Arial, sans-serif" font-size="34" font-weight="700">${initials}</text>`);
}

const manifest = { seed: "patchwork-assets-v1", generatedAt: "2026-10-10T12:00:00.000Z", assets: generated };

await ensure(publicRoot);
for (let index = 0; index < productNames.length; index += 1) await writeAsset(`shopnest/products/product-${String(index + 1).padStart(2, "0")}.svg`, productIllustration(index, productNames[index]));
const hero = await writeAsset("hero/patchwork-hero.svg", heroSvg());
await sharp(hero).resize(1600, 900).png().toFile(join(publicRoot, "hero", "patchwork-hero@2x.png"));
generated.push({ path: "/hero/patchwork-hero@2x.png", bytes: (await stat(join(publicRoot, "hero", "patchwork-hero@2x.png"))).size });
await writeAsset("states/empty-sites.svg", stateSvg("No sites yet", "violet"));
await writeAsset("states/empty-patches.svg", stateSvg("No patches yet", "green"));
await writeAsset("states/empty-audit.svg", stateSvg("Audit is quiet", "violet"));
await writeAsset("states/404.svg", stateSvg("Route not found", "red"));
await writeAsset("states/error.svg", stateSvg("Something failed", "red"));
await writeAsset("ai/patchpilot-orb.svg", svgShell(`<circle cx="200" cy="200" r="126" fill="#8b5cf6" opacity=".18"/><circle cx="200" cy="200" r="90" fill="url(#g)"/><circle cx="170" cy="166" r="28" fill="#fff" fill-opacity=".65"/><circle cx="200" cy="200" r="16" fill="#fff"/>`));
for (const size of [16, 32, 48, 128]) await writeAsset(`icons/extension-${size}.svg`, faviconSvg(size));
await writeAsset("favicon.svg", faviconSvg(32));
await writeAsset("og.svg", heroSvg());
await sharp(Buffer.from(heroSvg())).resize(1200, 630, { fit: "cover" }).png().toFile(join(publicRoot, "og.png"));
generated.push({ path: "/og.png", bytes: (await stat(join(publicRoot, "og.png"))).size });
await sharp(Buffer.from(heroSvg())).resize(1200, 630, { fit: "cover" }).png().toFile(join(publicRoot, "og-1200x630.png"));
generated.push({ path: "/og-1200x630.png", bytes: (await stat(join(publicRoot, "og-1200x630.png"))).size });
for (let index = 0; index < avatars.length; index += 1) await writeAsset(`avatars/avatar-${String(index + 1).padStart(2, "0")}.svg`, avatarSvg(avatars[index], index));
await writeFile(join(root, "public", "favicon.svg"), faviconSvg(32));
await sharp(Buffer.from(heroSvg())).resize(1200, 630, { fit: "cover" }).png().toFile(join(root, "public", "og.png"));
await writeFile(join(publicRoot, "manifest.json"), `${JSON.stringify({ ...manifest, assets: generated }, null, 2)}\n`);
console.log(`Generated ${generated.length} deterministic PATCHWORK assets.`);
