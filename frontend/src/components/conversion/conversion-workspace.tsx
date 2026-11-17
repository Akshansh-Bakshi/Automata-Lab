"use client";

import { AlertTriangle, Boxes, LoaderCircle, Network, RefreshCw, Route } from "lucide-react";
import type { NfaDocument } from "@/lib/api/types";
import { inspectDfaContract } from "@/lib/conversion/dfa-graph-model";
import { useAutomatonStore } from "@/store/automaton-store";
import { EmptyState } from "@/components/ui/empty-state";
import { NfaGraph } from "@/components/editor/nfa-graph";
import { DfaGraph } from "./dfa-graph";
import { getPlaybackSnapshot, inspectPlaybackTrace } from "@/lib/conversion/playback-model";
import { usePlaybackStore } from "@/store/playback-store";

export function ConversionWorkspace({
  document,
  revision,
}: {
  document: NfaDocument;
  revision: number;
}) {
  const conversion = useAutomatonStore((state) => state.conversion);
  const conversionRevision = useAutomatonStore((state) => state.conversionRevision);
  const status = useAutomatonStore((state) => state.conversionStatus);
  const error = useAutomatonStore((state) => state.conversionError);
  const fresh = useAutomatonStore((state) => state.isConversionFresh());
  const contractIssues = conversion ? inspectDfaContract(conversion.dfa) : [];
  const traceIssues = conversion && conversion.trace.steps.length ? inspectPlaybackTrace(conversion.trace, document, conversion.dfa) : [];
  const stepIndex = usePlaybackStore((state) => state.position);
  const view = usePlaybackStore((state) => state.view);
  const setView = usePlaybackStore((state) => state.setView);
  const snapshot = conversion && fresh && !contractIssues.length && !traceIssues.length && view === "step" && conversion.trace.steps.length
    ? getPlaybackSnapshot(conversion.trace, stepIndex, document, conversion.dfa)
    : null;

  return (
    <div className="dual-graph-workspace" data-testid="dual-graph-workspace">
      <section className="dual-graph-panel" aria-label="Original NFA graph">
        <header>
          <span><Network size={14} /> Original NFA</span>
          <small>Read-only source</small>
        </header>
        <div className="dual-graph-frame">
          <NfaGraph document={document} revision={revision} readOnly snapshot={snapshot ?? undefined} />
        </div>
      </section>
      <section className="dual-graph-panel dual-graph-panel--dfa" aria-label="Generated DFA graph">
        <header>
          <span><Route size={14} /> Generated DFA</span>
          <small>{statusLabel(status, fresh)}</small>
        </header>
        {conversion && fresh ? <div className="playback-view-switch" role="group" aria-label="DFA view">
          <button type="button" aria-pressed={view === "full"} onClick={() => setView("full")}>Full DFA</button>
          <button type="button" aria-pressed={view === "step"} disabled={!conversion.trace.steps.length || Boolean(traceIssues.length)} onClick={() => setView("step")}>Step by step</button>
        </div> : null}
        {traceIssues.length ? <p className="playback-error" role="alert">Playback trace unavailable: {traceIssues[0]}</p> : null}
        <div className="dual-graph-frame">
          {status === "loading" ? (
            <div className="conversion-stage-state" role="status">
              <LoaderCircle className="spin" size={24} />
              <strong>Running subset construction</strong>
              <span>The FastAPI engine is generating the complete DFA.</span>
            </div>
          ) : conversion && fresh && !contractIssues.length ? (
            <DfaGraph dfa={conversion.dfa} revision={conversionRevision ?? revision} snapshot={snapshot ?? undefined} />
          ) : contractIssues.length ? (
            <div className="conversion-stage-state conversion-stage-state--error" role="alert">
              <AlertTriangle size={24} />
              <strong>DFA contract violation</strong>
              <span>{contractIssues[0]}</span>
            </div>
          ) : status === "stale" ? (
            <EmptyState
              compact
              icon={RefreshCw}
              title="Previous DFA invalidated"
              description="The source NFA changed. Generate a fresh DFA from the Convert panel."
            />
          ) : status === "error" ? (
            <EmptyState
              compact
              icon={AlertTriangle}
              title="Conversion unavailable"
              description={error ?? "The backend could not generate a DFA."}
            />
          ) : (
            <EmptyState
              compact
              icon={Boxes}
              title="Generate the DFA"
              description="Use Generate DFA in the Convert panel to run backend subset construction."
            />
          )}
        </div>
      </section>
      {conversion && fresh && snapshot ? (
        <section className="trace-study" aria-label="Subset construction trace">
          <div className="trace-study__heading"><strong>{snapshot.step?.type.replaceAll("_", " ") ?? "Trace"}</strong><span>Step {stepIndex + 1} of {conversion.trace.steps.length}</span></div>
          <p>{snapshot.step?.explanation ?? "No trace step is available."}</p>
          {snapshot.step?.type === "PROCESS_SYMBOL" ? <>
            <div className="trace-study__math"><code>δ<sub>D</sub>({snapshot.step.dfaState}, {snapshot.step.symbol}) = {snapshot.step.targetDfaState}</code><span>Result: {snapshot.step.result.length ? `{${snapshot.step.result.join(", ")}}` : "∅"}</span><span>{snapshot.step.isNew ? "New state" : "Reused state"}</span></div>
            <div className="trace-study__lookups">{snapshot.step.lookups.map((lookup) => <code key={lookup.nfaState}>δ({lookup.nfaState}, {snapshot.step?.type === "PROCESS_SYMBOL" ? snapshot.step.symbol : ""}) = {lookup.targets.length ? `{${lookup.targets.join(", ")}}` : "∅"}</code>)}</div>
          </> : null}
          {snapshot.step?.type === "STATE_COMPLETE" ? <p>{snapshot.step.dfaState} is {snapshot.step.isAccepting ? "accepting" : "not accepting"}; its subset {snapshot.step.isAccepting ? "intersects" : "does not intersect"} the NFA accepting set.</p> : null}
          {snapshot.step?.type === "FINISH" ? <p>Complete: {conversion.dfa.states.length} states, {conversion.dfa.transitions.length} transitions, {conversion.dfa.acceptingStates.length} accepting states.</p> : null}
          <div className="trace-study__worklist"><b>Backend worklist</b>{snapshot.worklist.length ? snapshot.worklist.map((id) => <code key={id}>{id}</code>) : <span>Empty</span>}{snapshot.newlyDiscoveredState ? <span>Newly enqueued: {snapshot.newlyDiscoveredState}</span> : null}</div>
          <small>Blue thick border: current subset or transition. Dashed amber ring: newly discovered DFA state.</small>
        </section>
      ) : null}
    </div>
  );
}

function statusLabel(status: ReturnType<typeof useAutomatonStore.getState>["conversionStatus"], fresh: boolean) {
  if (status === "ready" && fresh) return "Fresh result";
  if (status === "loading") return "Generating…";
  if (status === "stale") return "Needs regeneration";
  if (status === "error") return "Request failed";
  return "Awaiting conversion";
}
