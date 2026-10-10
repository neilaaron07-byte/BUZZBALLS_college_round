import { auditEntrySchema, type AuditEntry } from "./evidence";
import { canonicalJson, sha256 } from "./canonical";
import type { Author } from "./schemas";

export interface AuditEntryInput {
  id: string;
  action: AuditEntry["action"];
  actor: Author;
  subjectId: string;
  timestamp: string;
  details: Readonly<Record<string, string>>;
}

export interface AuditChainResult {
  valid: boolean;
  failedAt: number | null;
  reason: string;
}

async function entryHash(entry: Omit<AuditEntry, "entryHash">): Promise<`sha256-${string}`> {
  return sha256(canonicalJson(entry));
}

export async function createAuditEntry(input: AuditEntryInput, previous: AuditEntry | null): Promise<AuditEntry> {
  const draft: Omit<AuditEntry, "entryHash"> = {
    sequence: previous ? previous.sequence + 1 : 0,
    id: input.id,
    action: input.action,
    actor: input.actor,
    subjectId: input.subjectId,
    timestamp: input.timestamp,
    details: input.details,
    previousHash: previous?.entryHash ?? null,
  };
  const entry = { ...draft, entryHash: await entryHash(draft) };
  return auditEntrySchema.parse(entry);
}

export async function verifyChain(entries: readonly AuditEntry[]): Promise<AuditChainResult> {
  let previous: AuditEntry | null = null;
  for (const [index, entry] of entries.entries()) {
    if (entry.sequence !== index) return { valid: false, failedAt: index, reason: "Audit sequence is not contiguous." };
    if (entry.previousHash !== (previous?.entryHash ?? null)) return { valid: false, failedAt: index, reason: "Audit entry does not point to the previous hash." };
    const { entryHash: claimedHash, ...withoutHash } = entry;
    const calculatedHash = await entryHash(withoutHash);
    if (calculatedHash !== claimedHash) return { valid: false, failedAt: index, reason: "Audit entry content no longer matches its hash." };
    previous = entry;
  }
  return { valid: true, failedAt: null, reason: entries.length === 0 ? "The audit chain is empty." : "The audit chain is intact." };
}
