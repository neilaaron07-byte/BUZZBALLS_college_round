import { Router } from "express";
import { send } from "../middleware";
import { readState } from "../services";
import type { ApiContext } from "../types";

export interface GithubProvider {
  listPullRequests(): Promise<readonly import("../types").GithubPullRequest[]>;
  getPullRequest(number: number): Promise<import("../types").GithubPullRequest | null>;
}

export class MockGithubProvider implements GithubProvider {
  private readonly context: ApiContext;
  constructor(context: ApiContext) { this.context = context; }
  async listPullRequests() { return (await readState(this.context)).pullRequests; }
  async getPullRequest(number: number) { return (await this.listPullRequests()).find((pullRequest) => pullRequest.number === number) ?? null; }
}

export class OptionalOctokitProvider implements GithubProvider {
  readonly name = "octokit-optional";
  async listPullRequests(): Promise<readonly import("../types").GithubPullRequest[]> { throw new Error("Octokit credentials are not configured for the local demo."); }
  async getPullRequest(number: number): Promise<import("../types").GithubPullRequest | null> { void number; throw new Error("Octokit credentials are not configured for the local demo."); }
}

export function integrationRoutes(context: ApiContext): Router {
  const router = Router();
  const github = new MockGithubProvider(context);
  router.get("/integrations/github/pull-requests", async (request, response) => send(request, response, await github.listPullRequests()));
  router.get("/integrations/github/pull-requests/:number", async (request, response) => { const pullRequest = await github.getPullRequest(Number(request.params.number)); if (!pullRequest) return response.status(404).json({ error: { code: "NOT_FOUND", message: "Pull request was not found.", requestId: request.header("x-request-id") ?? "req_unknown" } }); send(request, response, pullRequest); });
  router.get("/integrations/github/status", async (request, response) => send(request, response, { provider: "mock", authenticated: false, pullRequests: (await github.listPullRequests()).length, checksMapped: (await github.listPullRequests()).flatMap((pullRequest) => pullRequest.checks).length }));
  return router;
}
