import { describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  convertNfa,
  getExamples,
  getHealth,
  simulateNfa,
  validateNfa,
} from "@/lib/api/client";
import { examplesResponse, healthResponse, jsonResponse, sampleNfa } from "@/test/fixtures";

describe("typed API client", () => {
  it("returns typed health and example responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthResponse))
      .mockResolvedValueOnce(jsonResponse(examplesResponse));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHealth()).resolves.toEqual(healthResponse);
    await expect(getExamples()).resolves.toEqual(examplesResponse);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/health",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("posts generated-contract request bodies for validation, conversion, and simulation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ valid: true, warnings: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await validateNfa(sampleNfa);
    await convertNfa(sampleNfa);
    await simulateNfa(sampleNfa, "01");

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8000/api/simulate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ nfa: sampleNfa, input: "01" }),
      }),
    );
  });

  it("parses the structured backend error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "UNKNOWN_STATE_REFERENCE",
              message: "State q9 is unknown.",
              issues: [
                { code: "UNKNOWN_STATE_REFERENCE", path: "states[0]", message: "Unknown." },
              ],
            },
          },
          422,
        ),
      ),
    );

    const error = await validateNfa(sampleNfa).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 422, code: "UNKNOWN_STATE_REFERENCE" });
  });

  it("returns an understandable network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));

    await expect(getHealth()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: expect.stringContaining("Could not reach"),
    });
  });
});

