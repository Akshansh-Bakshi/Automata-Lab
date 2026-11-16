"use client";

import { Boxes, Focus, Network, Route, ScanSearch } from "lucide-react";
import type { NfaDocument } from "@/lib/api/types";
import type { WorkspaceMode } from "@/store/workspace-store";
import { EmptyState } from "@/components/ui/empty-state";
import { NfaGraph } from "@/components/editor/nfa-graph";
import { useAutomatonStore } from "@/store/automaton-store";
import { NfaSummary } from "./nfa-summary";

interface WorkspaceCanvasProps {
  mode: WorkspaceMode;
  document: NfaDocument | null;
}

export function WorkspaceCanvas({ mode, document }: WorkspaceCanvasProps) {
  const meta = canvasCopy[mode];
  const revision = useAutomatonStore((state) => state.documentRevision);
  const createDocument = useAutomatonStore((state) => state.createDocument);
  return (
    <main className="workspace-canvas" id="workspace">
      <header className="workspace-canvas__header">
        <div>
          <div className="workspace-kicker">
            <span>{meta.kicker}</span>
            {document ? <span className="document-live">Document loaded</span> : null}
          </div>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
        <div className="canvas-toolbar" aria-label="Canvas status">
          <span><Focus size={14} aria-hidden="true" /> {mode === "build" ? "Interactive graph" : "Graph surface"}</span>
          <span><ScanSearch size={14} aria-hidden="true" /> Zoom & pan</span>
        </div>
      </header>
      <section className="canvas-surface" aria-label={`${meta.title} visualization area`}>
        <div className="canvas-grid" aria-hidden="true" />
        {!document ? (
          <div className="canvas-empty">
            <EmptyState
              icon={Network}
              eyebrow="No active document"
              title="Start with a curated NFA"
              description="Create a blank NFA or open Examples in the top bar to load a tested automaton."
            />
            <button className="primary-button" type="button" onClick={createDocument}>
              Create blank NFA
            </button>
          </div>
        ) : mode === "build" ? (
          <NfaGraph document={document} revision={revision} />
        ) : mode === "convert" ? (
          <div className="split-visualization">
            <section className="visual-region">
              <div className="visual-region__label"><Network size={14} /> Source NFA</div>
              <NfaSummary document={document} compact />
            </section>
            <section className="visual-region visual-region--placeholder">
              <div className="visual-region__label"><Route size={14} /> Generated DFA</div>
              <EmptyState
                compact
                icon={Boxes}
                title="DFA canvas reserved"
                description="Conversion and playback are intentionally deferred. No client-side algorithm is running."
              />
            </section>
          </div>
        ) : (
          <NfaSummary document={document} />
        )}
      </section>
    </main>
  );
}

const canvasCopy = {
  build: {
    kicker: "Machine definition",
    title: "NFA workspace",
    description: "Drag states, connect transitions, or use the inspector and transition table for keyboard editing.",
  },
  convert: {
    kicker: "Subset construction",
    title: "Conversion workspace",
    description: "The source and destination regions are ready for a deterministic backend trace in a later phase.",
  },
  test: {
    kicker: "Language comparison",
    title: "Test workspace",
    description: "The active NFA remains visible while future simulation traces occupy the contextual panels.",
  },
} satisfies Record<WorkspaceMode, { kicker: string; title: string; description: string }>;

