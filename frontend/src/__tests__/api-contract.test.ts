import { describe, expect, it } from "vitest";
import openapi from "../../openapi.json";
import type {
  ErrorResponse,
  ExamplesResponse,
  HealthResponse,
  NfaDocument,
} from "@/lib/api/types";
import { examplesResponse, healthResponse, sampleNfa } from "@/test/fixtures";

describe("generated API contract", () => {
  it("contains every operational backend route", () => {
    expect(Object.keys(openapi.paths).sort()).toEqual([
      "/api/examples",
      "/api/health",
      "/api/nfa/convert",
      "/api/nfa/validate",
      "/api/simulate",
    ]);
  });

  it("keeps representative backend payloads compatible with generated types", () => {
    const health: HealthResponse = healthResponse;
    const examples: ExamplesResponse = examplesResponse;
    const nfa: NfaDocument = sampleNfa;
    const error: ErrorResponse = {
      error: { code: "SCHEMA_VIOLATION", message: "Invalid.", issues: [] },
    };

    expect(health.status).toBe("ok");
    expect(examples.examples[0].nfa).toEqual(nfa);
    expect(error.error.code).toBe("SCHEMA_VIOLATION");
  });
});

