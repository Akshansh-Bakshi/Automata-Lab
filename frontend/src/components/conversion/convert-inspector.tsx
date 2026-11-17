"use client";

import {
  AlertCircle,
  Braces,
  CheckCircle2,
  CircleDot,
  LoaderCircle,
  Play,
  RefreshCw,
  Skull,
} from "lucide-react";
import { useState } from "react";
import type { NfaValidationState } from "@/hooks/use-nfa-validation";
import type { NfaDocument } from "@/lib/api/types";
import { runConversion } from "@/lib/conversion/run-conversion";
import { useAutomatonStore } from "@/store/automaton-store";
import { PanelSection } from "@/components/workspace/panel-section";

export function ConvertInspector({
  document,
  validation,
}: {
  document: NfaDocument | null;
  validation: NfaValidationState;
}) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const status = useAutomatonStore((state) => state.conversionStatus);
  const conversion = useAutomatonStore((state) => state.conversion);
  const conversionError = useAutomatonStore((state) => state.conversionError);
  const conversionErrorCode = useAutomatonStore((state) => state.conversionErrorCode);
  const fresh = useAutomatonStore((state) => state.isConversionFresh());
  const selectedDfaStateId = useAutomatonStore((state) => state.selectedDfaStateId);
  const selectDfaState = useAutomatonStore((state) => state.selectDfaState);
  const readyToConvert = Boolean(document && validation.status === "valid");
  const dfa = conversion?.dfa;
  const selectedState = dfa?.states.find((state) => state.id === selectedDfaStateId) ?? null;

  return (
    <>
      <PanelSection eyebrow="Subset construction" title="Generate DFA">
        <p className="panel-hint">
          Conversion runs on the FastAPI mathematical engine. The source NFA remains unchanged.
        </p>
        <button
          className="primary-button primary-button--wide"
          type="button"
          disabled={!readyToConvert || status === "loading"}
          onClick={() => {
            setActionMessage(null);
            void runConversion(validation.status).then((result) => {
              if (!result.ok && result.reason !== "error") setActionMessage(result.message);
            });
          }}
        >
          {status === "loading" ? (
            <><LoaderCircle className="spin" size={15} /> Generating DFA…</>
          ) : status === "ready" && fresh ? (
            <><RefreshCw size={15} /> Regenerate DFA</>
          ) : (
            <><Play size={15} /> Generate DFA</>
          )}
        </button>
        {!readyToConvert && status !== "loading" ? (
          <p className="conversion-blocked">{blockedCopy(document, validation.status)}</p>
        ) : null}
        {actionMessage ? <p className="conversion-blocked" role="status">{actionMessage}</p> : null}
        {status === "stale" ? (
          <div className="conversion-callout" data-tone="warning" role="status">
            <RefreshCw size={15} />
            <span>The NFA changed. Generate a fresh DFA for this revision.</span>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="conversion-callout" data-tone="danger" role="alert">
            <AlertCircle size={15} />
            <span>
              <strong>{conversionErrorCode === "LIMIT_EXCEEDED" ? "Conversion limit reached" : "Conversion failed"}</strong>
              {conversionError}
            </span>
          </div>
        ) : null}
      </PanelSection>

      {dfa && fresh ? (
        <>
          <PanelSection eyebrow="Result" title="Conversion statistics">
            <div className="conversion-stats">
              <Stat label="NFA states" value={dfa.stats.nfaStates} />
              <Stat label="DFA states" value={dfa.stats.dfaStates} />
              <Stat label="Transitions" value={dfa.stats.dfaTransitions} />
              <Stat label="Accepting" value={dfa.acceptingStates.length} />
            </div>
            <div className="dead-state-readout" data-present={dfa.stats.hasDeadState}>
              <Skull size={13} />
              {dfa.stats.hasDeadState ? "Dead state included" : "No dead state required"}
            </div>
            {!dfa.acceptingStates.length ? (
              <p className="conversion-note">This valid DFA has no accepting states, so its language is empty.</p>
            ) : null}
          </PanelSection>
          <PanelSection eyebrow="Subset mapping" title="DFA state membership">
            <div className="subset-mapping-list">
              {dfa.states.map((state) => (
                <button
                  type="button"
                  key={state.id}
                  data-selected={selectedDfaStateId === state.id}
                  onClick={() => selectDfaState(state.id)}
                  title={`${state.id} = ${state.subset.length ? `{${state.subset.join(", ")}}` : "∅"}`}
                >
                  <strong>{state.id}</strong>
                  <span>{state.subset.length ? `{${state.subset.join(", ")}}` : "∅"}</span>
                  {state.isInitial ? <CircleDot size={11} aria-label="Initial" /> : null}
                  {state.isAccepting ? <CheckCircle2 size={11} aria-label="Accepting" /> : null}
                </button>
              ))}
            </div>
            {selectedState ? <DfaStateInspector state={selectedState} document={document} /> : null}
          </PanelSection>
        </>
      ) : null}
    </>
  );
}

function DfaStateInspector({
  state,
  document,
}: {
  state: NonNullable<ReturnType<typeof useAutomatonStore.getState>["conversion"]>["dfa"]["states"][number];
  document: NfaDocument | null;
}) {
  const acceptingMembers = state.subset.filter((member) => document?.acceptingStates.includes(member));
  return (
    <div className="dfa-state-inspector" aria-label={`Inspect DFA state ${state.id}`}>
      <div>
        <Braces size={14} />
        <strong>{state.id} = {state.subset.length ? `{${state.subset.join(", ")}}` : "∅"}</strong>
      </div>
      {state.isDead ? <p>The empty subset is the rejecting dead state.</p> : null}
      {state.isAccepting ? (
        <p>Accepting because it contains {acceptingMembers.join(", ")} from the NFA accepting set.</p>
      ) : (
        <p>No member of this subset is an accepting NFA state.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function blockedCopy(document: NfaDocument | null, status: NfaValidationState["status"]) {
  if (!document) return "Create or load an NFA before converting.";
  if (status === "incomplete") return "Complete the NFA definition before converting.";
  if (status === "invalid") return "Resolve validation errors before converting.";
  if (status === "unavailable") return "Backend validation is unavailable.";
  if (status === "validating") return "Waiting for backend validation…";
  return "The NFA is not ready for conversion.";
}
