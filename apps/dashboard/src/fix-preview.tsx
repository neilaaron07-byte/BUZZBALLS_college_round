import { Check, Eye, LockKeyhole } from "lucide-react";
import { Button } from "./ui/button";
import type { DashboardFinding } from "./dashboard-types";

export function IsolatedPreview({ target, pageTitle, previewHtml, finding, canConfirm, onConfirm }: Readonly<{ target: string; pageTitle?: string | null; previewHtml?: string; finding?: DashboardFinding; canConfirm: boolean; onConfirm: () => void }>) {
  const targetLabel = pageTitle ? `${pageTitle} · ${safeHostname(target)}` : target.includes("shopnest.example") ? "ShopNest · Aurora product" : "Safe snapshot · external target";
  const publishedHtml = previewHtml ?? previewDocument(false);
  const patchedHtml = previewHtml && finding ? applyPreviewPatch(previewHtml, finding) : previewDocument(true);
  return <section className="pw-fix-preview pw-fix-panel" aria-labelledby="isolated-preview-title">
    <div className="pw-fix-preview-heading">
      <div><span className="pw-fix-panel-label"><Eye size={12} aria-hidden="true" /> ISOLATED PREVIEW</span><h2 id="isolated-preview-title">See the change before it ships.</h2><p>{targetLabel} · {previewHtml ? "sanitized live snapshot" : "demo snapshot"} · production is unchanged</p></div>
      <span className="pw-fix-preview-lock"><LockKeyhole size={13} aria-hidden="true" /> Private</span>
    </div>
    <div className="pw-fix-preview-grid">
      <PreviewFrame label="Published state" detail="Current public HTML" html={publishedHtml} />
      <PreviewFrame label="Patch preview" detail={finding ? previewOperationLabel(finding) : "Allowlisted operation"} html={patchedHtml} />
    </div>
    <div className="pw-fix-preview-footer">
      <span><Check size={13} aria-hidden="true" /> No scripts or network requests run inside the preview.</span>
      {canConfirm ? <Button size="sm" onClick={onConfirm} leadingIcon={<Check size={13} aria-hidden="true" />}>Confirm preview</Button> : <strong><Check size={13} aria-hidden="true" /> Preview verified</strong>}
    </div>
  </section>;
}

function PreviewFrame({ label, detail, html }: Readonly<{ label: string; detail: string; html: string }>) {
  return <div className="pw-fix-preview-frame"><div className="pw-fix-preview-frame-head"><span>{label}</span><small>{detail}</small></div><iframe title={`${label} preview`} sandbox="" srcDoc={html} /></div>;
}

function safeHostname(value: string): string {
  try { return new URL(value).hostname; } catch { return "external target"; }
}

function previewOperationLabel(finding: DashboardFinding): string {
  const labels: Record<NonNullable<DashboardFinding["detector"]>, string> = {
    contrast: "Readable color operation",
    duplicate_action: "Distinct action labels",
    stale_copy: "Copy review operation",
    missing_label: "Accessible label operation",
    broken_link: "Safe link operation",
    layout_overflow: "Viewport-safe layout operation",
  };
  return labels[finding.detector ?? "contrast"];
}

function applyPreviewPatch(html: string, finding: DashboardFinding): string {
  if (typeof DOMParser === "undefined") return html;
  const document = new DOMParser().parseFromString(html, "text/html");
  const targets = findPreviewTargets(document, finding.targetIds ?? []);
  for (const [index, target] of targets.entries()) {
    const style = target instanceof HTMLElement ? target.style : null;
    switch (finding.detector) {
      case "contrast":
        style?.setProperty("color", "#172033");
        break;
      case "missing_label":
        target.setAttribute("aria-label", target.textContent?.trim() || `${target.tagName.toLowerCase()} control`);
        break;
      case "stale_copy":
        target.textContent = "Updated published copy";
        break;
      case "broken_link":
        target.setAttribute("href", "#patchwork-reviewed-link");
        break;
      case "layout_overflow":
        style?.setProperty("max-width", "100%");
        style?.setProperty("overflow-wrap", "anywhere");
        break;
      case "duplicate_action":
        target.setAttribute("aria-label", `${target.textContent?.trim() || "Action"} ${index === 0 ? "primary" : "secondary"}`);
        break;
      default:
        break;
    }
  }
  return `<!doctype html>${document.documentElement.outerHTML}`;
}

function findPreviewTargets(document: Document, targetIds: readonly string[]): Element[] {
  const all = [...document.querySelectorAll("button,a,input,textarea,select,[role],h1,h2,h3,p")];
  const selected = targetIds.flatMap((targetId) => {
    const direct = [...document.querySelectorAll("[id], [data-testid], [data-patchwork-id]")].find((element) => [element.id, element.getAttribute("data-testid"), element.getAttribute("data-patchwork-id")].includes(targetId));
    if (direct) return [direct];
    const index = /^live-[a-z0-9-]+-(\d+)$/i.exec(targetId)?.[1];
    const indexed = index ? all[Number(index) - 1] : undefined;
    return indexed ? [indexed] : [];
  });
  return selected.length > 0 ? selected : all.slice(0, 1);
}

function previewDocument(patched: boolean): string {
  const priceColor = patched ? "#132038" : "#777777";
  const stateLabel = patched ? "Readable price restored" : "Low-contrast price detected";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}body{margin:0;background:#f7f5f0;color:#172033;font:14px/1.45 Arial,sans-serif}.shell{padding:18px}.eyebrow{color:#7a746b;font-size:9px;letter-spacing:.14em;text-transform:uppercase}.product{margin-top:12px;border:1px solid #dedbd3;border-radius:12px;background:#fff;padding:14px}.art{height:76px;border-radius:9px;background:linear-gradient(135deg,#cad5dc,#667684);display:grid;place-items:center;color:#fff;font-size:9px;letter-spacing:.14em}.copy{padding-top:13px}.name{font-size:18px;font-weight:600}.price{margin-top:9px;color:${priceColor};font-size:20px;font-weight:700}.rule{height:1px;margin:12px 0;background:#ece9e2}.button{display:inline-flex;border-radius:999px;background:#172033;color:#fff;padding:8px 12px;font-size:10px}.status{margin-top:12px;color:${patched ? "#147a55" : "#9b6911"};font-size:10px}.status span{display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:currentColor}
  </style></head><body><main class="shell"><div class="eyebrow">ShopNest / Aurora</div><section class="product"><div class="art">AURORA HEADPHONES</div><div class="copy"><div class="name">Aurora wireless headphones</div><div class="price">$248</div><div class="rule"></div><span class="button">Add to cart</span><div class="status"><span></span>${stateLabel}</div></div></section></main></body></html>`;
}
