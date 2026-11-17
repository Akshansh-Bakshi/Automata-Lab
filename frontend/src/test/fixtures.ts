import type {
  ConversionResponse,
  Example,
  ExamplesResponse,
  HealthResponse,
  NfaDocument,
} from "@/lib/api/types";
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

export const sampleConversion: ConversionResponse = {
  dfa: {
    alphabet: ["0", "1"],
    states: [
      { id: "D0", subset: ["q0"], label: "{q0}", isInitial: true, isAccepting: false, isDead: false },
      { id: "D1", subset: ["q1", "q2"], label: "{q1, q2}", isInitial: false, isAccepting: true, isDead: false },
      { id: "D2", subset: [], label: "∅", isInitial: false, isAccepting: false, isDead: true },
      { id: "D3", subset: ["q0", "q1", "q2"], label: "{q0, q1, q2}", isInitial: false, isAccepting: true, isDead: false },
    ],
    initialState: "D0",
    acceptingStates: ["D1", "D3"],
    transitions: [
      { from: "D0", symbol: "0", to: "D1" },
      { from: "D0", symbol: "1", to: "D2" },
      { from: "D1", symbol: "0", to: "D3" },
      { from: "D1", symbol: "1", to: "D1" },
      { from: "D2", symbol: "0", to: "D2" },
      { from: "D2", symbol: "1", to: "D2" },
      { from: "D3", symbol: "0", to: "D3" },
      { from: "D3", symbol: "1", to: "D1" },
    ],
    stats: { nfaStates: 3, dfaStates: 4, dfaTransitions: 8, hasDeadState: true },
  },
  trace: { steps: [] },
};

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
    if (url.endsWith("/api/nfa/convert")) return jsonResponse(sampleConversion);
    throw new Error(`Unexpected request: ${url}`);
  });
}

