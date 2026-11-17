import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SimulationResponse } from "@/lib/api/types";
import { runSimulation } from "@/lib/simulation/run-simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useAutomatonStore } from "@/store/automaton-store";
import { jsonResponse, sampleNfa } from "@/test/fixtures";

const result: SimulationResponse = {
  dfa: { alphabet: ["0", "1"], states: [{ id: "D0", subset: ["q0"], label: "{q0}", isInitial: true, isAccepting: false, isDead: false }], initialState: "D0", acceptingStates: [], transitions: [{ from: "D0", symbol: "0", to: "D0" }, { from: "D0", symbol: "1", to: "D0" }], stats: { nfaStates: 3, dfaStates: 1, dfaTransitions: 2, hasDeadState: false } },
  simulation: { input: "", agree: true, nfa: { accepted: false, steps: [{ position: 0, symbol: null, activeStates: ["q0"] }] }, dfa: { accepted: false, steps: [{ position: 0, symbol: null, state: "D0" }] } },
};

describe("simulation request workflow", () => {
  beforeEach(() => useAutomatonStore.getState().replaceDocument(sampleNfa));

  it("posts the original NFA and empty input and stores the matching result", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toMatch(/\/api\/simulate$/);
      expect(init?.method).toBe("POST");
      return jsonResponse(result);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await runSimulation("valid")).toEqual({ ok: true });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ nfa: expect.objectContaining({ states: sampleNfa.states }), input: "" });
    expect(useSimulationStore.getState()).toMatchObject({ status: "ready", resultInput: "", result });
  });

  it("rejects invalid symbols before requesting and preserves input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    useSimulationStore.getState().setInput("02");
    expect(await runSimulation("valid")).toMatchObject({ ok: false, message: expect.stringContaining("position 2") });
    expect(useSimulationStore.getState().input).toBe("02");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("discards a late response after input or NFA changes", async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const pending = runSimulation("valid");
    expect((await runSimulation("valid")).ok).toBe(false);
    useSimulationStore.getState().setInput("0");
    resolve(jsonResponse(result));
    await pending;
    expect(useSimulationStore.getState().result).toBeNull();
    expect(useSimulationStore.getState().input).toBe("0");
  });

  it("shows a structured backend symbol error without dropping the input", async () => {
    useSimulationStore.getState().setInput("0");
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: { code: "SYMBOL_NOT_IN_ALPHABET", message: "Bad symbol", issues: [{ code: "SYMBOL_NOT_IN_ALPHABET", path: "input[0]", message: "Bad symbol" }] } }, 422)));
    expect((await runSimulation("valid")).ok).toBe(false);
    expect(useSimulationStore.getState()).toMatchObject({ input: "0", status: "error", errorPath: "input[0]" });
  });
});
