import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { Page } from "playwright";
import type { ScreenshotEvidence, ViewportSpec } from "./contracts";

interface RawImage {
  data: Buffer;
  info: { width: number; height: number; channels: number };
}

interface SharpPipeline {
  ensureAlpha(): SharpPipeline;
  raw(): SharpPipeline;
  toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: RawImage["info"] }>;
}

async function raw(buffer: Buffer): Promise<RawImage> {
  const createImage = sharp as unknown as (input: Buffer) => SharpPipeline;
  const result = await createImage(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: result.data, info: result.info };
}

export async function captureVisualEvidence(published: Page, patched: Page, viewport: ViewportSpec, outputDirectory: string): Promise<ScreenshotEvidence> {
  await mkdir(outputDirectory, { recursive: true });
  const publishedBuffer = await published.screenshot({ fullPage: true });
  const patchedBuffer = await patched.screenshot({ fullPage: true });
  const publishedPath = join(outputDirectory, `published-${viewport.id}.png`);
  const patchedPath = join(outputDirectory, `patched-${viewport.id}.png`);
  await writeFile(publishedPath, publishedBuffer);
  await writeFile(patchedPath, patchedBuffer);
  const before = await raw(publishedBuffer);
  const after = await raw(patchedBuffer);
  const width = Math.min(before.info.width, after.info.width);
  const height = Math.min(before.info.height, after.info.height);
  let changedPixels = 0;
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * before.info.width + x) * 4;
    const afterIndex = (y * after.info.width + x) * 4;
    const different = Math.abs((before.data[index] ?? 0) - (after.data[afterIndex] ?? 0)) + Math.abs((before.data[index + 1] ?? 0) - (after.data[afterIndex + 1] ?? 0)) + Math.abs((before.data[index + 2] ?? 0) - (after.data[afterIndex + 2] ?? 0)) > 18;
    if (different) { changedPixels += 1; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  }
  return { viewport: viewport.id, publishedPath, patchedPath, changedPixels, changedRegion: changedPixels === 0 ? null : { left, top, right, bottom } };
}
