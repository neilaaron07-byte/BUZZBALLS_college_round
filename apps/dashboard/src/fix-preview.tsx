import { Check, Eye, LockKeyhole } from "lucide-react";
import { Button } from "./ui/button";

export function IsolatedPreview({ target, canConfirm, onConfirm }: Readonly<{ target: string; canConfirm: boolean; onConfirm: () => void }>) {
  const targetLabel = target.includes("shopnest.example") ? "ShopNest · Aurora product" : "Safe snapshot · external target";
  return <section className="pw-fix-preview pw-fix-panel" aria-labelledby="isolated-preview-title">
    <div className="pw-fix-preview-heading">
      <div><span className="pw-fix-panel-label"><Eye size={12} aria-hidden="true" /> ISOLATED PREVIEW</span><h2 id="isolated-preview-title">See the change before it ships.</h2><p>{targetLabel} · sandboxed snapshot · production is unchanged</p></div>
      <span className="pw-fix-preview-lock"><LockKeyhole size={13} aria-hidden="true" /> Private</span>
    </div>
    <div className="pw-fix-preview-grid">
      <PreviewFrame label="Published state" detail="Current production" patched={false} />
      <PreviewFrame label="Patch preview" detail="Allowlisted color operation" patched />
    </div>
    <div className="pw-fix-preview-footer">
      <span><Check size={13} aria-hidden="true" /> No scripts or network requests run inside the preview.</span>
      {canConfirm ? <Button size="sm" onClick={onConfirm} leadingIcon={<Check size={13} aria-hidden="true" />}>Confirm preview</Button> : <strong><Check size={13} aria-hidden="true" /> Preview verified</strong>}
    </div>
  </section>;
}

function PreviewFrame({ label, detail, patched }: Readonly<{ label: string; detail: string; patched: boolean }>) {
  return <div className="pw-fix-preview-frame"><div className="pw-fix-preview-frame-head"><span>{label}</span><small>{detail}</small></div><iframe title={`${label} preview`} sandbox="" srcDoc={previewDocument(patched)} /></div>;
}

function previewDocument(patched: boolean): string {
  const priceColor = patched ? "#132038" : "#777777";
  const stateLabel = patched ? "Readable price restored" : "Low-contrast price detected";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}body{margin:0;background:#f7f5f0;color:#172033;font:14px/1.45 Arial,sans-serif}.shell{padding:18px}.eyebrow{color:#7a746b;font-size:9px;letter-spacing:.14em;text-transform:uppercase}.product{margin-top:12px;border:1px solid #dedbd3;border-radius:12px;background:#fff;padding:14px}.art{height:76px;border-radius:9px;background:linear-gradient(135deg,#cad5dc,#667684);display:grid;place-items:center;color:#fff;font-size:9px;letter-spacing:.14em}.copy{padding-top:13px}.name{font-size:18px;font-weight:600}.price{margin-top:9px;color:${priceColor};font-size:20px;font-weight:700}.rule{height:1px;margin:12px 0;background:#ece9e2}.button{display:inline-flex;border-radius:999px;background:#172033;color:#fff;padding:8px 12px;font-size:10px}.status{margin-top:12px;color:${patched ? "#147a55" : "#9b6911"};font-size:10px}.status span{display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:currentColor}
  </style></head><body><main class="shell"><div class="eyebrow">ShopNest / Aurora</div><section class="product"><div class="art">AURORA HEADPHONES</div><div class="copy"><div class="name">Aurora wireless headphones</div><div class="price">$248</div><div class="rule"></div><span class="button">Add to cart</span><div class="status"><span></span>${stateLabel}</div></div></section></main></body></html>`;
}
