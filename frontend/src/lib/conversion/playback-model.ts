import type { ConversionTrace, ConversionTraceStep, DfaDocument, NfaDocument } from "@/lib/api/types";

export interface PlaybackSnapshot {
  step: ConversionTraceStep | null;
  index: number;
  visibleStateIds: string[];
  visibleTransitions: DfaDocument["transitions"];
  worklist: string[];
  completedStateIds: string[];
  activeNfaStates: string[];
  activeNfaTransitions: Array<{ from: string; symbol: string; to: string }>;
  currentTransition: { from: string; symbol: string; to: string } | null;
  newlyDiscoveredState: string | null;
}

export function inspectPlaybackTrace(trace: ConversionTrace, nfa: NfaDocument, dfa: DfaDocument): string[] {
  const steps = trace.steps;
  if (!steps.length || steps[0].type !== "INIT" || steps.at(-1)?.type !== "FINISH") return ["Trace boundaries are missing."];
  if (steps.some((step, index) => step.index !== index)) return ["Trace indexes are not contiguous."];
  const init = steps[0];
  if (init.type !== "INIT" || init.dfaState !== dfa.initialState || init.subset.length !== 1 || init.subset[0] !== nfa.initialState) return ["Initial trace state does not match the NFA and DFA."];
  const known = new Map<string, string[]>([[init.dfaState, init.subset]]);
  const observed = new Map<string, string>();
  const completed = new Set<string>();
  for (const step of steps.slice(1, -1)) {
    if (step.type === "PROCESS_SYMBOL") {
      const source = known.get(step.dfaState);
      const target = dfa.states.find((state) => state.id === step.targetDfaState);
      const actual = dfa.transitions.find((transition) => transition.from === step.dfaState && transition.symbol === step.symbol);
      if (!source || !target || !actual || actual.to !== step.targetDfaState || !dfa.alphabet.includes(step.symbol) || observed.has(`${step.dfaState}\u0000${step.symbol}`)) return ["Trace transition conflicts with the generated DFA."];
      if (step.lookups.length !== source.length || step.lookups.some((lookup, index) => lookup.nfaState !== source[index] || !arraysEqual(lookup.targets, nfa.states.filter((state) => nfa.transitions.find((move) => move.from === lookup.nfaState && move.symbol === step.symbol)?.to.includes(state))))) return ["Trace NFA lookups conflict with the original NFA."];
      const union = nfa.states.filter((state) => step.lookups.some((lookup) => lookup.targets.includes(state)));
      if (!arraysEqual(union, step.result) || !arraysEqual(target.subset, step.result)) return ["Trace result conflicts with the generated DFA."];
      if (step.isNew !== !known.has(step.targetDfaState)) return ["Trace discovery flag is inconsistent."];
      known.set(step.targetDfaState, step.result);
      observed.set(`${step.dfaState}\u0000${step.symbol}`, step.targetDfaState);
    } else if (step.type === "STATE_COMPLETE") {
      const subset = known.get(step.dfaState);
      if (!subset || completed.has(step.dfaState) || step.isAccepting !== subset.some((state) => nfa.acceptingStates.includes(state))) return ["Trace completion is inconsistent."];
      completed.add(step.dfaState);
    } else return ["Trace contains an unexpected event."];
  }
  const last = steps.at(-1);
  if (last?.type !== "FINISH" || last.dfaStateCount !== dfa.states.length || known.size !== dfa.states.length || completed.size !== dfa.states.length || observed.size !== dfa.transitions.length) return ["Trace does not reconstruct the complete DFA."];
  return [];
}

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function getPlaybackSnapshot(
  trace: ConversionTrace,
  stepIndex: number,
  nfa: NfaDocument,
  dfa: DfaDocument,
): PlaybackSnapshot {
  const steps = trace.steps;
  const index = Math.max(0, Math.min(stepIndex, steps.length - 1));
  const visible = steps.slice(0, index + 1);
  const states = new Set<string>();
  const transitions = new Set<string>();
  const completed = new Set<string>();
  for (const step of visible) {
    if (step.type === "INIT") states.add(step.dfaState);
    if (step.type === "PROCESS_SYMBOL") {
      states.add(step.dfaState);
      states.add(step.targetDfaState);
      transitions.add(`${step.dfaState}\u0000${step.symbol}`);
    }
    if (step.type === "STATE_COMPLETE") completed.add(step.dfaState);
  }
  const step = steps[index] ?? null;
  const lookups = step?.type === "PROCESS_SYMBOL" ? step.lookups : [];
  const currentTransition = step?.type === "PROCESS_SYMBOL"
    ? { from: step.dfaState, symbol: step.symbol, to: step.targetDfaState }
    : null;
  const nfaActive = step?.type === "PROCESS_SYMBOL" ? step.lookups.map((lookup) => lookup.nfaState)
    : step?.type === "INIT" ? step.subset
    : step?.type === "STATE_COMPLETE" ? dfa.states.find((state) => state.id === step.dfaState)?.subset ?? [] : [];
  const activeNfaTransitions = step?.type === "PROCESS_SYMBOL"
    ? lookups.flatMap((lookup) => lookup.targets.map((target) => ({ from: lookup.nfaState, symbol: step.symbol, to: target })))
    : [];
  const worklist = step && "worklist" in step ? step.worklist : [];
  return {
    step,
    index,
    visibleStateIds: dfa.states.filter((state) => states.has(state.id)).map((state) => state.id),
    visibleTransitions: dfa.transitions.filter((transition) => transitions.has(`${transition.from}\u0000${transition.symbol}`)),
    worklist: [...worklist],
    completedStateIds: [...completed],
    activeNfaStates: nfa.states.filter((state) => nfaActive.includes(state)),
    activeNfaTransitions,
    currentTransition,
    newlyDiscoveredState: step?.type === "PROCESS_SYMBOL" && step.isNew ? step.targetDfaState : null,
  };
}

