"use client";

import { ChevronDown, ChevronUp, Clock3, Info } from "lucide-react";
import type { WorkspaceMode } from "@/store/workspace-store";
import { useWorkspaceStore } from "@/store/workspace-store";

export function BottomDock({ mode }: { mode: WorkspaceMode }) {
  const open = useWorkspaceStore((state) => state.bottomDockOpen);
  const toggle = useWorkspaceStore((state) => state.toggleBottomDock);
  const copy = dockCopy[mode];

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
          <Info size={17} aria-hidden="true" />
          <p>{copy.empty}</p>
        </div>
      ) : null}
    </section>
  );
}

const dockCopy = {
  build: {
    title: "Document activity",
    summary: "No unsaved editing activity",
    empty: "Document history will appear when NFA editing is introduced. The loaded example is already held in the document store.",
  },
  convert: {
    title: "Conversion timeline",
    summary: "Playback is not available in Phase 4",
    empty: "Algorithm steps, playback controls, and the DFA transition table will live here after conversion is connected.",
  },
  test: {
    title: "Simulation timeline",
    summary: "No input has been simulated",
    empty: "Per-character NFA and DFA execution steps will appear here in the testing phase.",
  },
} satisfies Record<WorkspaceMode, { title: string; summary: string; empty: string }>;

