import { describe, expect, it } from "vitest";
import type { ConversionTrace, DfaDocument, NfaDocument } from "@/lib/api/types";
import { getPlaybackSnapshot, inspectPlaybackTrace } from "@/lib/conversion/playback-model";

const nfa: NfaDocument = { schemaVersion: 1, states: ["q0"], alphabet: ["a"], initialState: "q0", acceptingStates: [], transitions: [] };
const dfa: DfaDocument = {
  alphabet: ["a"], initialState: "D0", acceptingStates: [],
  states: [
    { id: "D0", subset: ["q0"], label: "{q0}", isInitial: true, isAccepting: false, isDead: false },
    { id: "D1", subset: [], label: "∅", isInitial: false, isAccepting: false, isDead: true },
  ],
  transitions: [{ from: "D0", symbol: "a", to: "D1" }, { from: "D1", symbol: "a", to: "D1" }],
  stats: { nfaStates: 1, dfaStates: 2, dfaTransitions: 2, hasDeadState: true },
};
const trace: ConversionTrace = { steps: [
  { index: 0, type: "INIT", dfaState: "D0", subset: ["q0"], worklist: ["D0"], explanation: "Start." },
  { index: 1, type: "PROCESS_SYMBOL", dfaState: "D0", symbol: "a", lookups: [{ nfaState: "q0", targets: [] }], result: [], targetDfaState: "D1", isNew: true, worklist: ["D1"], explanation: "Discover empty subset." },
  { index: 2, type: "STATE_COMPLETE", dfaState: "D0", isAccepting: false, worklist: ["D1"], explanation: "D0 complete." },
  { index: 3, type: "PROCESS_SYMBOL", dfaState: "D1", symbol: "a", lookups: [], result: [], targetDfaState: "D1", isNew: false, worklist: [], explanation: "Reuse dead state." },
  { index: 4, type: "STATE_COMPLETE", dfaState: "D1", isAccepting: false, worklist: [], explanation: "D1 complete." },
  { index: 5, type: "FINISH", dfaStateCount: 2, worklist: [], explanation: "Finished." },
] };

describe("conversion playback snapshots", () => {
  it("reconstructs all event types and the final DFA", () => {
    expect(inspectPlaybackTrace(trace, nfa, dfa)).toEqual([]);
    const init = getPlaybackSnapshot(trace, 0, nfa, dfa);
    expect(init.visibleStateIds).toEqual(["D0"]);
    expect(init.visibleTransitions).toEqual([]);
    expect(init.worklist).toEqual(["D0"]);
    const discovered = getPlaybackSnapshot(trace, 1, nfa, dfa);
    expect(discovered.visibleStateIds).toEqual(["D0", "D1"]);
    expect(discovered.visibleTransitions).toEqual([dfa.transitions[0]]);
    expect(discovered.newlyDiscoveredState).toBe("D1");
    expect(discovered.activeNfaStates).toEqual(["q0"]);
    expect(discovered.activeNfaTransitions).toEqual([]);
    expect(getPlaybackSnapshot(trace, 2, nfa, dfa).completedStateIds).toEqual(["D0"]);
    expect(getPlaybackSnapshot(trace, 3, nfa, dfa).worklist).toEqual([]);
    const finish = getPlaybackSnapshot(trace, 5, nfa, dfa);
    expect(finish.visibleTransitions).toEqual(dfa.transitions);
    expect(finish.visibleStateIds).toEqual(dfa.states.map((state) => state.id));
  });

  it("returns identical snapshots after arbitrary jumps and rejects malformed traces", () => {
    const direct = getPlaybackSnapshot(trace, 1, nfa, dfa);
    getPlaybackSnapshot(trace, 5, nfa, dfa);
    getPlaybackSnapshot(trace, 3, nfa, dfa);
    expect(getPlaybackSnapshot(trace, 1, nfa, dfa)).toEqual(direct);
    expect(inspectPlaybackTrace({ steps: trace.steps.slice(1) }, nfa, dfa)).not.toEqual([]);
  });
});
