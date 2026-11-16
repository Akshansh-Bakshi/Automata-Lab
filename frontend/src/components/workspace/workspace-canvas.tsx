"use client";

import { Boxes, Focus, Network, Route, ScanSearch } from "lucide-react";
import type { NfaDocument } from "@/lib/api/types";
import type { WorkspaceMode } from "@/store/workspace-store";
import { EmptyState } from "@/components/ui/empty-state";
import { NfaSummary } from "./nfa-summary";

interface WorkspaceCanvasProps {
  mode: WorkspaceMode;
  document: NfaDocument | null;
}

export function WorkspaceCanvas({ mode, document }: WorkspaceCanvasProps) {
  const meta = canvasCopy[mode];
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
          <span><Focus size={14} aria-hidden="true" /> Graph-ready surface</span>
          <span><ScanSearch size={14} aria-hidden="true" /> Responsive viewport</span>
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
              description="Open Examples in the top bar to load a tested automaton. Your selection stays intact if the API later becomes unavailable."
            />
          </div>
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
    description: "Inspect the active automaton now; visual editing will attach to this canvas without changing the shell.",
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

