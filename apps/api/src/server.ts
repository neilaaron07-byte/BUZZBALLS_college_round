import { createApiApp, createApiContext } from "./app";

const port = Number(process.env.PATCHWORK_API_PORT ?? 8787);
const context = await createApiContext();
const app = createApiApp(context);
const server = app.listen(port, "127.0.0.1", () => console.log(JSON.stringify({ level: "info", event: "api_started", port, health: `http://127.0.0.1:${port}/healthz` })));

function shutdown(signal: string): void {
  console.log(JSON.stringify({ level: "info", event: "api_shutdown", signal }));
  server.close(() => process.exit(0));
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
