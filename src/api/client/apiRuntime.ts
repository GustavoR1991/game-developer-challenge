export interface ApiRuntimeSettings {
  timeoutMs: number;
  retryBaseDelayMs: number;
  maxQueryRetries: number;
  maxSubmitRetries: number;
}

const DEFAULT_SETTINGS: ApiRuntimeSettings = {
  timeoutMs: 5000,
  retryBaseDelayMs: 800,
  maxQueryRetries: 2,
  maxSubmitRetries: 2,
};

let settings: ApiRuntimeSettings = { ...DEFAULT_SETTINGS };

export function apiSettings(): ApiRuntimeSettings {
  return settings;
}

export function configureApi(next: Partial<ApiRuntimeSettings>): ApiRuntimeSettings {
  settings = { ...settings, ...next };
  return settings;
}

export function resetApiSettings(): void {
  settings = { ...DEFAULT_SETTINGS };
}

export function retryDelay(attempt: number): number {
  return Math.min(settings.retryBaseDelayMs * 2 ** attempt, 8000);
}
