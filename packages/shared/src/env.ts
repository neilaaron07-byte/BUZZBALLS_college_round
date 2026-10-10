export interface PublicRuntimeEnv {
  appUrl: string;
  apiUrl: string;
  demoMode: boolean;
}

export interface EnvironmentSource {
  PATCHWORK_APP_URL?: string;
  PATCHWORK_API_URL?: string;
  PATCHWORK_DEMO_MODE?: string;
}

function readUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;
  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid PATCHWORK URL: ${candidate}`);
  }
}

export function readPublicRuntimeEnv(source: EnvironmentSource): PublicRuntimeEnv {
  return {
    appUrl: readUrl(source.PATCHWORK_APP_URL, "http://localhost:3000"),
    apiUrl: readUrl(source.PATCHWORK_API_URL, "http://localhost:3000/api"),
    demoMode: source.PATCHWORK_DEMO_MODE !== "false",
  };
}
