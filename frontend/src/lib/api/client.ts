import type {
  ApiIssue,
  ConversionResponse,
  ErrorResponse,
  ExamplesResponse,
  HealthResponse,
  NfaDocument,
  SimulationResponse,
  ValidationResponse,
} from "./types";

const DEFAULT_TIMEOUT_MS = 8_000;

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export interface ApiRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function getHealth(options?: ApiRequestOptions): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health", undefined, options);
}

export function getExamples(options?: ApiRequestOptions): Promise<ExamplesResponse> {
  return request<ExamplesResponse>("/api/examples", undefined, options);
}

export function validateNfa(
  nfa: NfaDocument,
  options?: ApiRequestOptions,
): Promise<ValidationResponse> {
  return post<ValidationResponse>("/api/nfa/validate", { nfa }, options);
}

export function convertNfa(
  nfa: NfaDocument,
  options?: ApiRequestOptions,
): Promise<ConversionResponse> {
  return post<ConversionResponse>("/api/nfa/convert", { nfa }, options);
}

export function simulateNfa(
  nfa: NfaDocument,
  input: string,
  options?: ApiRequestOptions,
): Promise<SimulationResponse> {
  return post<SimulationResponse>("/api/simulate", { nfa, input }, options);
}

function post<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) {
    controller.abort();
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { accept: "application/json", ...init.headers },
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw parseApiError(response.status, payload);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (timedOut) {
      throw new ApiClientError("The AutomataLab API took too long to respond.", 0, "TIMEOUT");
    }
    if (controller.signal.aborted) {
      throw new ApiClientError("The request was cancelled.", 0, "REQUEST_CANCELLED");
    }
    throw new ApiClientError(
      "Could not reach the AutomataLab API. Check that the backend is running.",
      0,
      "NETWORK_ERROR",
    );
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}

function parseApiError(status: number, payload: unknown): ApiClientError {
  if (isErrorResponse(payload)) {
    return new ApiClientError(
      payload.error.message,
      status,
      payload.error.code,
      payload.error.issues,
    );
  }
  return new ApiClientError(`The API returned an unexpected ${status} response.`, status, "HTTP_ERROR");
}

function isErrorResponse(payload: unknown): payload is ErrorResponse {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return false;
  }
  const error = (payload as { error?: unknown }).error;
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      "message" in error &&
      typeof error.message === "string" &&
      "issues" in error &&
      Array.isArray(error.issues),
  );
}

