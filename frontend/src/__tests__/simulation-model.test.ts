import { describe, expect, it } from "vitest";
import type { NfaDocument, SimulationResponse } from "@/lib/api/types";
import { getSimulationSnapshot, inspectSimulation } from "@/lib/simulation/simulation-model";

const nfa: NfaDocument = { schemaVersion: 1, states: ["q0"], alphabet: ["a"], initialState: "q0", acceptingStates: ["q0"], transitions: [{ from: "q0", symbol: "a", to: ["q0"] }] };
const dfa: SimulationResponse["dfa"] = {
  alphabet: ["a"], initialState: "D0", acceptingStates: ["D0"],
  states: [{ id: "D0", subset: ["q0"], label: "{q0}", isInitial: true, isAccepting: true, isDead: false }],
  transitions: [{ from: "D0", symbol: "a", to: "D0" }],
  stats: { nfaStates: 1, dfaStates: 1, dfaTransitions: 1, hasDeadState: false },
};
function response(input: string): SimulationResponse {
  const symbols = [...input];
  return { dfa, simulation: { input, agree: true,
    nfa: { accepted: true, steps: symbols.map((symbol, index) => ({ position: index + 1, symbol, activeStates: ["q0"] })).reduce((steps, step) => [...steps, step], [{ position: 0, symbol: null, activeStates: ["q0"] }] as SimulationResponse["simulation"]["nfa"]["steps"]) },
    dfa: { accepted: true, steps: [{ position: 0, symbol: null, state: "D0" }, ...symbols.map((symbol, index) => ({ position: index + 1, symbol, state: "D0" }))] },
  } };
}

describe("backend simulation snapshots", () => {
  it("supports empty input and position-zero acceptance", () => {
    const result = response("");
    expect(inspectSimulation(result, nfa, "")).toEqual([]);
    const snapshot = getSimulationSnapshot(result, nfa, 0);
    expect(snapshot.complete).toBe(true);
    expect(snapshot.symbol).toBeNull();
    expect(snapshot.activeNfaStates).toEqual(["q0"]);
    expect(snapshot.dfaState).toBe("D0");
  });
  it("derives self-loop highlights and deterministic rewind", () => {
    const result = response("aa");
    expect(inspectSimulation(result, nfa, "aa")).toEqual([]);
    const first = getSimulationSnapshot(result, nfa, 1);
    expect(first.activeNfaTransitions).toEqual([{ from: "q0", symbol: "a", to: "q0" }]);
    expect(first.dfaTransition).toEqual({ from: "D0", symbol: "a", to: "D0" });
    getSimulationSnapshot(result, nfa, 2);
    expect(getSimulationSnapshot(result, nfa, 1)).toEqual(first);
    expect(getSimulationSnapshot(result, nfa, 2).complete).toBe(true);
  });
  it("rejects mismatched input and trace length", () => {
    expect(inspectSimulation(response("a"), nfa, "aa")).not.toEqual([]);
    const invalid = response("a");
    invalid.simulation.nfa.steps.pop();
    expect(inspectSimulation(invalid, nfa, "a")).not.toEqual([]);
  });
  it("handles a rejecting path that dies into the explicit DFA dead state", () => {
    const dyingNfa: NfaDocument = { ...nfa, transitions: [] };
    const rejected: SimulationResponse = {
      dfa: { ...dfa, states: [...dfa.states, { id: "D1", subset: [], label: "∅", isInitial: false, isAccepting: false, isDead: true }], transitions: [{ from: "D0", symbol: "a", to: "D1" }, { from: "D1", symbol: "a", to: "D1" }], stats: { nfaStates: 1, dfaStates: 2, dfaTransitions: 2, hasDeadState: true } },
      simulation: { input: "a", agree: true,
        nfa: { accepted: false, steps: [{ position: 0, symbol: null, activeStates: ["q0"] }, { position: 1, symbol: "a", activeStates: [] }] },
        dfa: { accepted: false, steps: [{ position: 0, symbol: null, state: "D0" }, { position: 1, symbol: "a", state: "D1" }] },
      },
    };
    expect(inspectSimulation(rejected, dyingNfa, "a")).toEqual([]);
    const snapshot = getSimulationSnapshot(rejected, dyingNfa, 1);
    expect(snapshot).toMatchObject({ activeNfaStates: [], dfaState: "D1", dfaTransition: { from: "D0", symbol: "a", to: "D1" }, complete: true });
  });
});
