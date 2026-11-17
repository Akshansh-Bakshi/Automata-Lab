"use client";

import { ChevronDown, ChevronUp, Clock3, Info } from "lucide-react";
import type { WorkspaceMode } from "@/store/workspace-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { NfaDocument } from "@/lib/api/types";
import { TransitionTable } from "@/components/editor/transition-table";
import { DfaTransitionTable } from "@/components/conversion/dfa-transition-table";
import { useAutomatonStore } from "@/store/automaton-store";
import { usePlaybackStore } from "@/store/playback-store";
import { getPlaybackSnapshot, inspectPlaybackTrace } from "@/lib/conversion/playback-model";
import { PlaybackControls } from "@/components/conversion/playback-controls";
import { useSimulationStore } from "@/store/simulation-store";
import { SimulationControls } from "@/components/simulation/simulation-controls";

export function BottomDock({ mode, document }: { mode: WorkspaceMode; document: NfaDocument | null }) {
  const open = useWorkspaceStore((state) => state.bottomDockOpen);
  const toggle = useWorkspaceStore((state) => state.toggleBottomDock);
  const copy = dockCopy[mode];
  const conversion = useAutomatonStore((state) => state.conversion);
  const conversionFresh = useAutomatonStore((state) => state.isConversionFresh());
  const position = usePlaybackStore((state) => state.position);
  const view = usePlaybackStore((state) => state.view);
  const traceValid = conversion && document && conversion.trace.steps.length && !inspectPlaybackTrace(conversion.trace, document, conversion.dfa).length;
  const snapshot = conversion && conversionFresh && document && view === "step" && traceValid
    ? getPlaybackSnapshot(conversion.trace, position, document, conversion.dfa) : undefined;
  const simulation = useSimulationStore((state) => state.result);
  const simulationStatus = useSimulationStore((state) => state.status);
  const simulationRevision = useSimulationStore((state) => state.revision);
  const documentRevision = useAutomatonStore((state) => state.documentRevision);

  return (
    <section className="bottom-dock" data-open={open} aria-label={copy.title}>
      <button className="bottom-dock__toggle" type="button" onClick={toggle} aria-expanded={open}>
        <span className="bottom-dock__icon"><Clock3 size={16} aria-hidden="true" /></span>
        <span>
          <strong>{copy.title}</strong>
          <small>{copy.summary}</small>
        </span>
        {open ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronUp size={17} aria-hidden="true" />}
      </button>
      {open ? (
        <div className="bottom-dock__body">
          {mode === "build" && document ? (
            <TransitionTable document={document} />
          ) : mode === "convert" && conversion && conversionFresh ? (
            <div className="playback-dock">{view === "step" && traceValid ? <PlaybackControls trace={conversion.trace} /> : null}<DfaTransitionTable dfa={conversion.dfa} snapshot={snapshot} /></div>
          ) : mode === "test" && simulation && simulationStatus === "ready" && simulationRevision === documentRevision ? (
            <SimulationControls result={simulation} />
          ) : (
            <>
              <Info size={17} aria-hidden="true" />
              <p>{copy.empty}</p>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

const dockCopy = {
  build: {
    title: "Transition table",
    summary: "Edit the NFA relation by state and symbol",
    empty: "Create or load an NFA to edit its transition table.",
  },
  convert: {
    title: "DFA transition table",
    summary: "Inspect the complete deterministic transition function",
    empty: "Generate a fresh DFA to inspect its complete transition table.",
  },
  test: {
    title: "Simulation timeline",
    summary: "Navigate synchronized NFA and DFA execution",
    empty: "Run a string simulation to inspect its execution positions.",
  },
} satisfies Record<WorkspaceMode, { title: string; summary: string; empty: string }>;

