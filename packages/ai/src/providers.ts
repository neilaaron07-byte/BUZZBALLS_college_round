import type { OptionalProviderAdapter, PatchPilotProvider, PatchPilotRequest, PatchPilotResponse } from "./contracts";
import { OfflinePatchPilot } from "./offline";

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
    try {
      const response = this.adapter.normalize(await this.adapter.complete(request), request);
      return response;
    } catch {
      return this.fallback.complete(request);
    }
  }
}

export function createPatchPilot(adapter?: OptionalProviderAdapter): PatchPilotProvider {
  const offline = new OfflinePatchPilot();
  return adapter ? new AdapterPatchPilot(adapter, offline) : offline;
}
