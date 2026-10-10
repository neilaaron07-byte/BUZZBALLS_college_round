import type { OptionalProviderAdapter, PatchPilotProvider, PatchPilotRequest, PatchPilotResponse } from "./contracts";
import { OfflinePatchPilot } from "./offline";
import { sanitizePatchPilotContext, sanitizePatchPilotQuestion } from "./redaction";

export class AdapterPatchPilot implements PatchPilotProvider {
  readonly name: string;
  private readonly adapter: OptionalProviderAdapter;
  private readonly fallback: OfflinePatchPilot;

  constructor(adapter: OptionalProviderAdapter, fallback = new OfflinePatchPilot()) {
    this.name = adapter.name;
    this.adapter = adapter;
    this.fallback = fallback;
  }

  async complete(request: PatchPilotRequest): Promise<PatchPilotResponse> {
    const safeRequest: PatchPilotRequest = { ...request, context: sanitizePatchPilotContext(request.context), question: sanitizePatchPilotQuestion(request.question) };
    try {
      const response = this.adapter.normalize(await this.adapter.complete(safeRequest), safeRequest);
      return response;
    } catch {
      return this.fallback.complete(safeRequest);
    }
  }
}

export function createPatchPilot(adapter?: OptionalProviderAdapter): PatchPilotProvider {
  const offline = new OfflinePatchPilot();
  return adapter ? new AdapterPatchPilot(adapter, offline) : offline;
}
