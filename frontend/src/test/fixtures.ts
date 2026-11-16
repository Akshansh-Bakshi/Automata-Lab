import type { Example, ExamplesResponse, HealthResponse, NfaDocument } from "@/lib/api/types";
import { vi } from "vitest";

export const sampleNfa: NfaDocument = {
  schemaVersion: 1,
  name: "Ends with 01",
  alphabet: ["0", "1"],
  states: ["q0", "q1", "q2"],
  initialState: "q0",
  acceptingStates: ["q2"],
  transitions: [
    { from: "q0", symbol: "0", to: ["q0", "q1"] },
    { from: "q0", symbol: "1", to: ["q0"] },
    { from: "q1", symbol: "1", to: ["q2"] },
  ],
};

export const sampleExample: Example = {
  id: "ends-with-01",
  name: "Ends with 01",
  description: "Uses nondeterminism to guess the final suffix.",
  nfa: sampleNfa,
};

export const healthResponse: HealthResponse = { status: "ok", version: "1.0.0" };
export const examplesResponse: ExamplesResponse = { examples: [sampleExample] };

export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

export function mockSuccessfulApi() {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/api/health")) return jsonResponse(healthResponse);
    if (url.endsWith("/api/examples")) return jsonResponse(examplesResponse);
    if (url.endsWith("/api/nfa/validate")) return jsonResponse({ valid: true, warnings: [] });
    throw new Error(`Unexpected request: ${url}`);
  });
}

