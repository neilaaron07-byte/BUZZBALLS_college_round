export interface ClientResponse<T> {
  data: T;
  requestId: string;
  status: number;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
  requestId?: () => string;
}

export class PatchworkApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly requestId: () => string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetcher ?? fetch;
    this.requestId = options.requestId ?? (() => `client_${Date.now().toString(36)}`);
  }

  async get<T>(path: string): Promise<ClientResponse<T>> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<ClientResponse<T>> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) } });
  }

  async patch<T>(path: string, body: unknown): Promise<ClientResponse<T>> {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
  }

  async request<T>(path: string, init: RequestInit): Promise<ClientResponse<T>> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers: { accept: "application/json", "x-request-id": this.requestId(), ...init.headers } });
    const payload = await response.json() as { data?: T; requestId?: string; error?: { message: string; code: string } };
    if (!response.ok || !payload.data) throw new Error(`${payload.error?.code ?? "API_ERROR"}: ${payload.error?.message ?? "The API request failed."}`);
    return { data: payload.data, requestId: payload.requestId ?? response.headers.get("x-request-id") ?? "req_unknown", status: response.status };
  }
}

export function apiPath(resource: string, id?: string, suffix?: string): string {
  const segments = [resource, id, suffix].filter((segment): segment is string => Boolean(segment)).map((segment) => encodeURIComponent(segment));
  return `/${segments.join("/")}`;
}

export function isApiClientError(error: unknown): error is Error {
  return error instanceof Error && /API_ERROR|NOT_FOUND|SCHEMA_INVALID/.test(error.message);
}
