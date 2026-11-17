"use client";

import { AlertTriangle, Boxes, LoaderCircle, Network, RefreshCw, Route } from "lucide-react";
import type { NfaDocument } from "@/lib/api/types";
import { inspectDfaContract } from "@/lib/conversion/dfa-graph-model";
import { useAutomatonStore } from "@/store/automaton-store";
import { EmptyState } from "@/components/ui/empty-state";
import { NfaGraph } from "@/components/editor/nfa-graph";
import { DfaGraph } from "./dfa-graph";

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

  return (
    <div className="dual-graph-workspace" data-testid="dual-graph-workspace">
      <section className="dual-graph-panel" aria-label="Original NFA graph">
        <header>
          <span><Network size={14} /> Original NFA</span>
          <small>Read-only source</small>
        </header>
        <div className="dual-graph-frame">
          <NfaGraph document={document} revision={revision} readOnly />
        </div>
      </section>
      <section className="dual-graph-panel dual-graph-panel--dfa" aria-label="Generated DFA graph">
        <header>
          <span><Route size={14} /> Generated DFA</span>
          <small>{statusLabel(status, fresh)}</small>
        </header>
        <div className="dual-graph-frame">
          {status === "loading" ? (
            <div className="conversion-stage-state" role="status">
              <LoaderCircle className="spin" size={24} />
              <strong>Running subset construction</strong>
              <span>The FastAPI engine is generating the complete DFA.</span>
            </div>
          ) : conversion && fresh && !contractIssues.length ? (
            <DfaGraph dfa={conversion.dfa} revision={conversionRevision ?? revision} />
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
