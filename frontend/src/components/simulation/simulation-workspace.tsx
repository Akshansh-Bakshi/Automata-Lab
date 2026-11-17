"use client";

import type { NfaDocument } from "@/lib/api/types";
import { NfaGraph } from "@/components/editor/nfa-graph";
import { DfaGraph } from "@/components/conversion/dfa-graph";
import { getSimulationSnapshot, inspectSimulation } from "@/lib/simulation/simulation-model";
import { useSimulationStore } from "@/store/simulation-store";

export function SimulationWorkspace({ document, revision }: { document: NfaDocument; revision: number }) {
  const result = useSimulationStore((state) => state.result);
  const resultRevision = useSimulationStore((state) => state.revision);
  const resultInput = useSimulationStore((state) => state.resultInput);
  const input = useSimulationStore((state) => state.input);
  const position = useSimulationStore((state) => state.position);
  const status = useSimulationStore((state) => state.status);
  const error = useSimulationStore((state) => state.error);
  const fresh = result && resultRevision === revision && resultInput === input && status === "ready";
  const issues = fresh ? inspectSimulation(result, document, input) : [];
  if (!fresh) return <div className="conversion-stage-state" role={status === "error" ? "alert" : "status"}><strong>{status === "loading" ? "Simulating both machines…" : status === "stale" ? "Simulation invalidated" : status === "error" ? "Simulation failed" : "Run a string simulation"}</strong><span>{status === "error" ? error : status === "stale" ? "The NFA changed. Run again for the current document." : "Enter a string in the Test panel. Empty input tests ε."}</span></div>;
  if (issues.length) return <div className="conversion-stage-state conversion-stage-state--error" role="alert"><strong>Invalid simulation response</strong><span>{issues[0]}</span></div>;
  const snapshot = getSimulationSnapshot(result, document, position);
  const dfaState = result.dfa.states.find((state) => state.id === snapshot.dfaState)!;
  return <div className="simulation-workspace">
    <div className="simulation-input-strip" aria-label="Input consumption">
      {input.length ? [...input].map((symbol, index) => <span key={index} data-processed={index < position} data-current={index === position - 1}>{symbol}</span>) : <span data-current="true">ε</span>}
      <small>{snapshot.position} of {[...input].length} symbols processed</small>
    </div>
    <div className="dual-graph-workspace">
      <section className="dual-graph-panel" aria-label="Simulated NFA graph"><header><span>Original NFA</span><small>Active: {snapshot.activeNfaStates.length ? `{${snapshot.activeNfaStates.join(", ")}}` : "∅"}</small></header><div className="dual-graph-frame"><NfaGraph document={document} revision={revision} readOnly simulationHighlight={snapshot} /></div></section>
      <section className="dual-graph-panel dual-graph-panel--dfa" aria-label="Simulated DFA graph"><header><span>Generated DFA</span><small>Current: {snapshot.dfaState}</small></header><div className="dual-graph-frame"><DfaGraph dfa={result.dfa} revision={revision} readOnly simulationHighlight={{ state: snapshot.dfaState, transition: snapshot.dfaTransition }} /></div></section>
    </div>
    <section className="simulation-readout" aria-label="Execution details">
      <strong>Position {snapshot.position}: {snapshot.symbol === null ? "initial configuration" : `consumed '${snapshot.symbol}'`}</strong>
      <p>NFA active set {snapshot.activeNfaStates.length ? `{${snapshot.activeNfaStates.join(", ")}}` : "∅"} corresponds to {snapshot.dfaState} = {dfaState.subset.length ? `{${dfaState.subset.join(", ")}}` : "∅"}.</p>
      {snapshot.complete ? <div className="simulation-verdict" data-agree={result.simulation.agree} data-accepted={result.simulation.nfa.accepted} role={result.simulation.agree ? "status" : "alert"}>
        <strong>{result.simulation.agree ? result.simulation.nfa.accepted ? "Accepted" : "Rejected" : "NFA and DFA disagree — backend result requires investigation"}</strong>
        <span>NFA: {result.simulation.nfa.accepted ? "accepted" : "rejected"} · DFA: {result.simulation.dfa.accepted ? "accepted" : "rejected"} · Agreement: {result.simulation.agree ? "yes" : "no"}</span>
      </div> : <p>Verdict appears after the final symbol.</p>}
    </section>
  </div>;
}
