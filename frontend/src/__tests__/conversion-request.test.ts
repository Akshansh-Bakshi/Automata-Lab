import { beforeEach, describe, expect, it, vi } from "vitest";
import { runConversion } from "@/lib/conversion/run-conversion";
import { useAutomatonStore } from "@/store/automaton-store";
import { jsonResponse, sampleConversion, sampleNfa } from "@/test/fixtures";

describe("conversion requests", () => {
  beforeEach(() => useAutomatonStore.getState().replaceDocument(sampleNfa));

  it("posts the canonical NFA and stores a fresh backend conversion and trace", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchMock = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        expect(String(input)).toMatch(/\/api\/nfa\/convert$/);
        capturedInit = init;
        return jsonResponse(sampleConversion);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(runConversion("valid")).resolves.toEqual({ ok: true });

    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      nfa: expect.objectContaining({ states: sampleNfa.states }),
    });
    expect(useAutomatonStore.getState()).toMatchObject({
      conversionStatus: "ready",
      conversion: sampleConversion,
      selectedDfaStateId: "D0",
    });
    expect(useAutomatonStore.getState().isConversionFresh()).toBe(true);
  });

  it("blocks incomplete and invalid documents without making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    useAutomatonStore.getState().createDocument();

    expect(await runConversion("valid")).toMatchObject({ ok: false, reason: "blocked" });
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    expect(await runConversion("invalid")).toMatchObject({ ok: false, reason: "blocked" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retains the NFA and exposes structured backend failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          {
            error: {
              code: "LIMIT_EXCEEDED",
              message: "Generated DFA state limit exceeded.",
              issues: [],
            },
          },
          422,
        ),
      ),
    );
    const before = structuredClone(useAutomatonStore.getState().document);

    expect(await runConversion("valid")).toMatchObject({ ok: false, reason: "error" });
    expect(useAutomatonStore.getState()).toMatchObject({
      conversionStatus: "error",
      conversionErrorCode: "LIMIT_EXCEEDED",
      document: before,
    });
  });

  it("blocks duplicates and discards a response after a semantic revision change", async () => {
    let resolveResponse!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveResponse = resolve;
          }),
      ),
    );

    const pending = runConversion("valid");
    expect(await runConversion("valid")).toMatchObject({ ok: false, reason: "duplicate" });
    useAutomatonStore.getState().setDocumentName("Changed while converting");
    resolveResponse(jsonResponse(sampleConversion));

    expect(await pending).toMatchObject({ ok: false, reason: "stale" });
    expect(useAutomatonStore.getState()).toMatchObject({
      conversion: null,
      conversionStatus: "stale",
    });
  });

  it("preserves a fresh conversion across cosmetic NFA and DFA layout changes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(sampleConversion)));
    await runConversion("valid");
    const revision = useAutomatonStore.getState().documentRevision;

    useAutomatonStore.getState().setLayoutPosition("q0", { x: 800, y: 100 });
    useAutomatonStore.getState().setDfaLayoutPosition("D0", { x: 600, y: 200 });

    expect(useAutomatonStore.getState().documentRevision).toBe(revision);
    expect(useAutomatonStore.getState().isConversionFresh()).toBe(true);
    expect(useAutomatonStore.getState().dfaLayout.D0).toEqual({ x: 600, y: 200 });
  });
});
