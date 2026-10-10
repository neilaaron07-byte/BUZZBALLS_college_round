import { Router } from "express";
import { z } from "zod";
import { OfflinePatchPilot, patchPilotIntentSchema, streamAnswer, type PatchPilotContext } from "../../../../packages/ai/src/index";
import { asyncRoute } from "../route-helpers";

const aiRequestSchema = z.object({
  intent: patchPilotIntentSchema,
  context: z.object({ pageUrl: z.string().url() }).passthrough(),
  question: z.string().max(1_000).optional(),
}).strict();

function event(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function aiRoutes(): Router {
  const router = Router();
  router.post("/ai/stream", asyncRoute(async (request, response) => {
    const input = aiRequestSchema.parse(request.body);
    const pilot = new OfflinePatchPilot();
    const result = await pilot.complete({ intent: input.intent, context: input.context as unknown as PatchPilotContext, question: input.question });
    response.status(200).setHeader("content-type", "text/event-stream; charset=utf-8").setHeader("cache-control", "no-cache").setHeader("connection", "keep-alive");
    response.flushHeaders();
    response.write(event("meta", { provider: pilot.name, status: result.status, intent: result.intent }));
    for await (const chunk of streamAnswer(result, { chunkSize: 28 })) response.write(event("token", { text: chunk }));
    response.write(event("complete", { response: result }));
    response.end();
  }));
  return router;
}
