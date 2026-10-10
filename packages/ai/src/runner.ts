import { scanPage } from "../../core/src/index";
import type { BlastRadiusNarrative, PatchPilotProvider, PatchProposal } from "./contracts";
import { parseToolInput, type ToolInputMap, type ToolOutputMap } from "./tools";

export async function executeTool<TName extends keyof ToolInputMap>(provider: PatchPilotProvider, name: TName, input: unknown): Promise<ToolOutputMap[TName]> {
  const parsed = parseToolInput(name, input) as ToolInputMap[TName];
  if (name === "scan") return scanPage((parsed as ToolInputMap["scan"]).snapshot) as ToolOutputMap[TName];
  if (name === "explain") {
    const toolInput = parsed as ToolInputMap["explain"];
    const result = await provider.complete({ intent: "explain", context: { pageUrl: "https://patchwork.invalid", findings: [toolInput.finding] }, question: toolInput.question });
    return result.answer as ToolOutputMap[TName];
  }
  if (name === "suggest") {
    const toolInput = parsed as ToolInputMap["suggest"];
    const result = await provider.complete({ intent: "suggest", context: { ...toolInput.context, findings: [toolInput.finding], target: toolInput.target } });
    return result.proposal as ToolOutputMap[TName];
  }
  if (name === "summarize") {
    const toolInput = parsed as ToolInputMap["summarize"];
    const result = await provider.complete({ intent: "summarize", context: toolInput.context });
    return result.blastRadius as ToolOutputMap[TName];
  }
  const toolInput = parsed as ToolInputMap["draft"];
  const result = await provider.complete({ intent: "draft", context: { pageUrl: "https://patchwork.invalid" } });
  return (result.proposal ?? toolInput.proposal) as ToolOutputMap[TName];
}

export function isReviewableProposal(value: PatchProposal | null | undefined): value is PatchProposal {
  return Boolean(value && value.status === "review" && value.autoApproved === false && value.operation);
}

export function summarizeBlastRadius(value: BlastRadiusNarrative): string {
  return `${value.headline}. ${value.detail}`;
}
