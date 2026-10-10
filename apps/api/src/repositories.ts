import type { Patch, Release, Site } from "../../../packages/core/src/index";
import type { ApiContext, ApiState, ScanRunRecord } from "./types";
import { findPatch, findRelease, findSite, readState, updateState } from "./services";

export interface CollectionRepository<T> {
  list(): Promise<readonly T[]>;
  get(id: string): Promise<T | null>;
}

class StateCollection<T> implements CollectionRepository<T> {
  protected readonly context: ApiContext;
  private readonly select: (state: ApiState) => readonly T[];
  private readonly key: (value: T) => string;

  constructor(context: ApiContext, select: (state: ApiState) => readonly T[], key: (value: T) => string) {
    this.context = context;
    this.select = select;
    this.key = key;
  }

  async list(): Promise<readonly T[]> {
    return this.select(await readState(this.context));
  }

  async get(id: string): Promise<T | null> {
    return (await this.list()).find((value) => this.key(value) === id) ?? null;
  }
}

export class SiteRepository extends StateCollection<Site> {
  constructor(context: ApiContext) { super(context, (state) => state.sites, (site) => site.id); }
  async required(id: string): Promise<Site> { return findSite(await readState(this.context), id); }
}

export class PatchRepository extends StateCollection<Patch> {
  constructor(context: ApiContext) { super(context, (state) => state.patches, (patch) => patch.identity.id); }
  async required(id: string): Promise<Patch> { return findPatch(await readState(this.context), id); }
}

export class ReleaseRepository extends StateCollection<Release> {
  constructor(context: ApiContext) { super(context, (state) => state.releases, (release) => release.id); }
  async required(id: string): Promise<Release> { return findRelease(await readState(this.context), id); }
}

export class ScanRepository extends StateCollection<ScanRunRecord> {
  constructor(context: ApiContext) { super(context, (state) => state.scanRuns, (scan) => scan.id); }
}

export interface ApiRepositories {
  sites: SiteRepository;
  patches: PatchRepository;
  releases: ReleaseRepository;
  scans: ScanRepository;
}

export function createRepositories(context: ApiContext): ApiRepositories {
  return { sites: new SiteRepository(context), patches: new PatchRepository(context), releases: new ReleaseRepository(context), scans: new ScanRepository(context) };
}

export async function countCollections(context: ApiContext): Promise<Record<string, number>> {
  const state = await readState(context);
  return { sites: state.sites.length, patches: state.patches.length, releases: state.releases.length, scans: state.scanRuns.length, findings: state.findings.length, conflicts: state.conflicts.length, auditEntries: state.auditEntries.length };
}

export async function replaceCollection<T extends Site | Patch | Release | ScanRunRecord>(context: ApiContext, name: "sites" | "patches" | "releases" | "scanRuns", values: readonly T[]): Promise<void> {
  await updateState(context, (state) => ({ ...state, [name]: [...values] } as ApiState), () => undefined);
}
