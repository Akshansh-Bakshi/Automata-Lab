import type { NfaDocument, SimulationResponse } from "@/lib/api/types";
import { inspectDfaContract } from "@/lib/conversion/dfa-graph-model";

export interface SimulationSnapshot {
  position: number;
  symbol: string | null;
  activeNfaStates: string[];
  activeNfaTransitions: Array<{ from: string; symbol: string; to: string }>;
  dfaState: string;
  dfaTransition: { from: string; symbol: string; to: string } | null;
  complete: boolean;
}

export function inspectSimulation(result: SimulationResponse, nfa: NfaDocument, input: string): string[] {
  if (!result || !result.simulation || !result.dfa) return ["Simulation response is incomplete."];
  const { simulation, dfa } = result;
  if (!Array.isArray(dfa.states) || !Array.isArray(dfa.transitions) || !Array.isArray(dfa.alphabet) || !Array.isArray(dfa.acceptingStates) || !simulation.nfa || !simulation.dfa) return ["Simulation response shape is invalid."];
  if (dfa.states.some((state) => !state || typeof state.id !== "string" || !Array.isArray(state.subset)) || dfa.transitions.some((transition) => !transition || typeof transition.from !== "string" || typeof transition.to !== "string" || typeof transition.symbol !== "string")) return ["Simulation DFA fields are invalid."];
  const symbols = [...input];
  if (simulation.input !== input || !simulation.nfa || !simulation.dfa) return ["Simulation input does not match this request."];
  const issues = inspectDfaContract(dfa);
  if (issues.length) return issues;
  const nfaSteps = simulation.nfa.steps;
  const dfaSteps = simulation.dfa.steps;
  if (!Array.isArray(nfaSteps) || !Array.isArray(dfaSteps) || nfaSteps.length !== symbols.length + 1 || dfaSteps.length !== nfaSteps.length) return ["Simulation trace length is inconsistent."];
  if (nfaSteps.some((step) => !step || !Array.isArray(step.activeStates)) || dfaSteps.some((step) => !step || typeof step.state !== "string")) return ["Simulation trace fields are invalid."];
  for (let index = 0; index < nfaSteps.length; index++) {
    const n = nfaSteps[index];
    const d = dfaSteps[index];
    const expectedSymbol = index === 0 ? null : symbols[index - 1];
    const state = dfa.states.find((candidate) => candidate.id === d.state);
    if (n.position !== index || d.position !== index || n.symbol !== expectedSymbol || d.symbol !== expectedSymbol || !state || !Array.isArray(n.activeStates)) return [`Malformed simulation step ${index}.`];
    if (n.activeStates.some((member) => !nfa.states.includes(member)) || !sameSet(n.activeStates, state.subset)) return [`NFA/DFA state mismatch at position ${index}.`];
    if (index === 0 && (d.state !== dfa.initialState || n.activeStates.length !== 1 || n.activeStates[0] !== nfa.initialState)) return ["Initial configuration is inconsistent."];
    if (index > 0 && !dfa.transitions.some((transition) => transition.from === dfaSteps[index - 1].state && transition.symbol === expectedSymbol && transition.to === d.state)) return [`DFA transition mismatch at position ${index}.`];
  }
  const finalNfa = nfaSteps.at(-1)!;
  const finalDfa = dfaSteps.at(-1)!;
  if (simulation.nfa.accepted !== finalNfa.activeStates.some((member) => nfa.acceptingStates.includes(member)) || simulation.dfa.accepted !== dfa.acceptingStates.includes(finalDfa.state)) return ["Final acceptance flags are inconsistent with the traces."];
  return [];
}

export function getSimulationSnapshot(result: SimulationResponse, nfa: NfaDocument, position: number): SimulationSnapshot {
  const { simulation, dfa } = result;
  const index = Math.max(0, Math.min(Math.floor(position), simulation.nfa.steps.length - 1));
  const nfaStep = simulation.nfa.steps[index];
  const dfaStep = simulation.dfa.steps[index];
  const previousNfa = index ? simulation.nfa.steps[index - 1] : null;
  const previousDfa = index ? simulation.dfa.steps[index - 1] : null;
  const activeNfaTransitions = previousNfa && nfaStep.symbol ? nfa.transitions
    .filter((transition) => previousNfa.activeStates.includes(transition.from) && transition.symbol === nfaStep.symbol)
    .flatMap((transition) => transition.to.filter((target) => nfaStep.activeStates.includes(target))
      .map((to) => ({ from: transition.from, symbol: transition.symbol, to }))) : [];
  const dfaTransition = previousDfa && dfaStep.symbol
    ? dfa.transitions.find((transition) => transition.from === previousDfa.state && transition.symbol === dfaStep.symbol && transition.to === dfaStep.state) ?? null
    : null;
  return {
    position: index, symbol: nfaStep.symbol, activeNfaStates: [...nfaStep.activeStates],
    activeNfaTransitions, dfaState: dfaStep.state, dfaTransition,
    complete: index === simulation.nfa.steps.length - 1,
  };
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((member) => b.includes(member));
}
