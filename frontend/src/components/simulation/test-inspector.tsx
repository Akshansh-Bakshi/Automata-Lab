"use client";

import { useState } from "react";
import type { NfaDocument } from "@/lib/api/types";
import type { NfaValidationState } from "@/hooks/use-nfa-validation";
import { cancelActiveSimulation, runSimulation } from "@/lib/simulation/run-simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useAutomatonStore } from "@/store/automaton-store";
import { PanelSection } from "@/components/workspace/panel-section";

export function TestInspector({ document, validation }: { document: NfaDocument | null; validation: NfaValidationState }) {
  const input = useSimulationStore((state) => state.input);
  const status = useSimulationStore((state) => state.status);
  const error = useSimulationStore((state) => state.error);
  const errorPath = useSimulationStore((state) => state.errorPath);
  const setInput = useSimulationStore((state) => state.setInput);
  const [localError, setLocalError] = useState<string | null>(null);
  const invalid = document ? [...input].findIndex((symbol) => !document.alphabet.includes(symbol)) : -1;
  const symbols = [...input];
  const submit = () => {
    setLocalError(null);
    const submittedInput = input;
    const submittedRevision = useAutomatonStore.getState().documentRevision;
    void runSimulation(validation.status).then((result) => {
      if (useSimulationStore.getState().input !== submittedInput || useAutomatonStore.getState().documentRevision !== submittedRevision) return;
      if (!result.ok && useSimulationStore.getState().status !== "error" && result.message !== "Simulation cancelled.") setLocalError(result.message ?? "Simulation could not start.");
    });
  };
  return <>
    <PanelSection eyebrow="Input" title="Test a string">
      <p className="panel-hint">Alphabet: {document?.alphabet.length ? document.alphabet.map((symbol) => <code key={symbol} className="sim-alphabet-symbol">{symbol}</code>) : "Load a valid NFA"}</p>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label className="sim-input-label" htmlFor="simulation-input">Input string</label>
        <input id="simulation-input" className="sim-input" value={input} onChange={(event) => { if ([...event.target.value].length <= 1000) { cancelActiveSimulation(); setInput(event.target.value); setLocalError(null); } }} autoComplete="off" spellCheck={false} placeholder="Empty input = ε" aria-describedby="sim-input-help" />
        <p id="sim-input-help" className="panel-hint">{symbols.length ? `${symbols.length} / 1,000 symbols` : "Empty string ε will test the initial configuration."}</p>
        {invalid >= 0 ? <p className="sim-error" role="alert">Symbol &apos;{symbols[invalid]}&apos; at position {invalid + 1} is outside the alphabet.</p> : null}
        {error ? <p className="sim-error" role="alert">{error}{errorPath ? ` (${errorPath})` : ""}</p> : null}
        {localError ? <p className="sim-error" role="alert">{localError}</p> : null}
        <div className="sim-input-actions">
          <button type="button" className="secondary-button" onClick={() => { cancelActiveSimulation(); setInput(""); setLocalError(null); }}>Clear</button>
          <button type="submit" className="primary-button" disabled={!document || validation.status !== "valid" || status === "loading" || invalid >= 0 || symbols.length > 1000}>{status === "loading" ? "Running…" : "Run simulation"}</button>
        </div>
      </form>
    </PanelSection>
  </>;
}
