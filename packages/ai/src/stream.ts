import type { PatchPilotResponse } from "./contracts";

export interface StreamOptions {
  chunkSize?: number;
  signal?: AbortSignal;
  delayMs?: number;
}

export async function* streamAnswer(response: PatchPilotResponse, options: StreamOptions = {}): AsyncGenerator<string> {
  const chunkSize = Math.max(1, options.chunkSize ?? 24);
  const delayMs = Math.max(0, options.delayMs ?? 0);
  for (let index = 0; index < response.answer.length; index += chunkSize) {
    if (options.signal?.aborted) return;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield response.answer.slice(index, index + chunkSize);
  }
}

export async function collectStream(stream: AsyncIterable<string>): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks.join("");
}
