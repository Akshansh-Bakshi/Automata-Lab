"use client";

import { Check, CirclePlus, Flag, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { NfaValidationState } from "@/hooks/use-nfa-validation";
import type { NfaDocument } from "@/lib/api/types";
import { useAutomatonStore } from "@/store/automaton-store";
import { PanelSection } from "@/components/workspace/panel-section";
import { ValidationStatus } from "./validation-status";

export function BuildInspector({
  document,
  validation,
}: {
  document: NfaDocument | null;
  validation: NfaValidationState;
}) {
  const createDocument = useAutomatonStore((state) => state.createDocument);
  const setDocumentName = useAutomatonStore((state) => state.setDocumentName);
  const notice = useAutomatonStore((state) => state.editorNotice);
  const clearNotice = useAutomatonStore((state) => state.clearEditorNotice);

  if (!document) {
    return (
      <PanelSection eyebrow="New machine" title="Create an NFA">
        <p className="panel-hint">
          Begin with one initial state, then define the alphabet and transitions.
        </p>
        <button className="primary-button primary-button--wide" type="button" onClick={createDocument}>
          <CirclePlus size={15} /> Create blank NFA
        </button>
        <ValidationStatus validation={validation} />
      </PanelSection>
    );
  }

  return (
    <>
      {notice ? (
        <div className="editor-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice} aria-label="Dismiss editor notice">
            ×
          </button>
        </div>
      ) : null}
      <PanelSection eyebrow="Document" title="NFA configuration">
        <label className="field-label">
          Name
          <input
            type="text"
            value={document.name ?? ""}
            maxLength={80}
            onChange={(event) => setDocumentName(event.target.value)}
          />
        </label>
        <ValidationStatus validation={validation} />
      </PanelSection>
      <StateEditor document={document} />
      <AlphabetEditor document={document} />
      <TransitionEditor key={`${document.states.join("|")}:${document.alphabet.join("|")}`} document={document} />
    </>
  );
}

function StateEditor({ document }: { document: NfaDocument }) {
  const [newState, setNewState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selectedStateId = useAutomatonStore((state) => state.selectedStateId);
  const selectState = useAutomatonStore((state) => state.selectState);
  const addState = useAutomatonStore((state) => state.addState);
  const renameState = useAutomatonStore((state) => state.renameState);
  const deleteState = useAutomatonStore((state) => state.deleteState);
  const setInitialState = useAutomatonStore((state) => state.setInitialState);
  const toggleAcceptingState = useAutomatonStore((state) => state.toggleAcceptingState);
  const selected = selectedStateId && document.states.includes(selectedStateId) ? selectedStateId : null;

  const submitState = (event: FormEvent) => {
    event.preventDefault();
    const result = addState(newState);
    if (!result.ok) return setError(result.message ?? "Could not add the state.");
    setNewState("");
    setError(null);
  };

  return (
    <PanelSection eyebrow="States" title={`${document.states.length} defined`}>
      <form className="inline-editor" onSubmit={submitState}>
        <label className="sr-only" htmlFor="new-state-id">
          New state ID
        </label>
        <input
          id="new-state-id"
          value={newState}
          onChange={(event) => setNewState(event.target.value)}
          placeholder="e.g. q1"
          maxLength={16}
        />
        <button type="submit" aria-label="Add state">
          <Plus size={15} />
        </button>
      </form>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <div className="inspector-chip-list" aria-label="States">
        {document.states.map((state) => (
          <button
            type="button"
            className="inspector-chip"
            data-selected={selected === state}
            key={state}
            onClick={() => {
              selectState(state);
              setError(null);
            }}
          >
            <span>{state}</span>
            {state === document.initialState ? <Flag size={10} aria-label="Initial" /> : null}
            {document.acceptingStates.includes(state) ? <Check size={10} aria-label="Accepting" /> : null}
          </button>
        ))}
      </div>
      {selected ? (
        <SelectedStateEditor
          key={selected}
          document={document}
          selected={selected}
          renameState={renameState}
          deleteState={deleteState}
          setInitialState={setInitialState}
          toggleAcceptingState={toggleAcceptingState}
          onError={setError}
        />
      ) : (
        <p className="panel-hint">Select a state in this list or on the graph to inspect it.</p>
      )}
    </PanelSection>
  );
}

function SelectedStateEditor({
  document,
  selected,
  renameState,
  deleteState,
  setInitialState,
  toggleAcceptingState,
  onError,
}: {
  document: NfaDocument;
  selected: string;
  renameState: ReturnType<typeof useAutomatonStore.getState>["renameState"];
  deleteState: ReturnType<typeof useAutomatonStore.getState>["deleteState"];
  setInitialState: ReturnType<typeof useAutomatonStore.getState>["setInitialState"];
  toggleAcceptingState: ReturnType<typeof useAutomatonStore.getState>["toggleAcceptingState"];
  onError: (message: string | null) => void;
}) {
  const [renameValue, setRenameValue] = useState(selected);
  return (
    <div className="state-inspector" aria-label={`Inspect state ${selected}`}>
      <div className="state-inspector__heading">
        <span>Selected state</span>
        <strong>{selected}</strong>
      </div>
      <form
        className="inline-editor"
        onSubmit={(event) => {
          event.preventDefault();
          const result = renameState(selected, renameValue);
          onError(result.ok ? null : result.message ?? "Could not rename the state.");
        }}
      >
        <label className="sr-only" htmlFor="rename-state-id">Rename state</label>
        <input
          id="rename-state-id"
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          maxLength={16}
        />
        <button type="submit" aria-label="Rename state"><Pencil size={14} /></button>
      </form>
      <label className="toggle-row">
        <input
          type="radio"
          name="initial-state"
          checked={document.initialState === selected}
          onChange={() => setInitialState(selected)}
        />
        Initial state
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={document.acceptingStates.includes(selected)}
          onChange={() => toggleAcceptingState(selected)}
        />
        Accepting state
      </label>
      <button
        type="button"
        className="danger-button danger-button--small"
        onClick={() => {
          if (window.confirm(`Delete state '${selected}' and all connected transitions?`)) {
            deleteState(selected);
          }
        }}
      >
        <Trash2 size={13} /> Delete state
      </button>
    </div>
  );
}

function AlphabetEditor({ document }: { document: NfaDocument }) {
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addSymbol = useAutomatonStore((state) => state.addSymbol);
  const removeSymbol = useAutomatonStore((state) => state.removeSymbol);

  return (
    <PanelSection eyebrow="Alphabet" title={`${document.alphabet.length} symbols`}>
      <form
        className="inline-editor"
        onSubmit={(event) => {
          event.preventDefault();
          const result = addSymbol(symbol);
          if (!result.ok) return setError(result.message ?? "Could not add the symbol.");
          setSymbol("");
          setError(null);
        }}
      >
        <label className="sr-only" htmlFor="new-symbol">New alphabet symbol</label>
        <input
          id="new-symbol"
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
          placeholder="One character"
          maxLength={2}
        />
        <button type="submit" aria-label="Add symbol"><Plus size={15} /></button>
      </form>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <div className="alphabet-chips" aria-label="Alphabet symbols">
        {document.alphabet.map((candidate) => {
          const affected = document.transitions.some((transition) => transition.symbol === candidate);
          return (
            <span key={candidate}>
              <code>{candidate}</code>
              <button
                type="button"
                aria-label={`Remove symbol ${candidate}`}
                onClick={() => {
                  if (
                    !affected ||
                    window.confirm(`Remove '${candidate}' and every transition that uses it?`)
                  ) {
                    removeSymbol(candidate);
                  }
                }}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      {!document.alphabet.length ? (
        <p className="field-error">Add a symbol to complete this NFA.</p>
      ) : null}
    </PanelSection>
  );
}

function TransitionEditor({ document }: { document: NfaDocument }) {
  const initialSource = document.states[0] ?? "";
  const initialSymbol = document.alphabet[0] ?? "";
  const [source, setSource] = useState(initialSource);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [draft, setDraft] = useState<{
    source: string;
    symbol: string;
    base: string[];
    targets: string[];
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const setTransitionTargets = useAutomatonStore((state) => state.setTransitionTargets);
  const savedTargets = document.transitions.find(
    (transition) => transition.from === source && transition.symbol === symbol,
  )?.to ?? [];
  const draftIsCurrent = draft?.source === source && draft.symbol === symbol &&
    draft.base.length === savedTargets.length &&
    draft.base.every((target, index) => target === savedTargets[index]);
  const targets = draftIsCurrent ? draft.targets : savedTargets;

  return (
    <PanelSection eyebrow="Transitions" title="Edit one state-symbol pair">
      {!document.states.length || !document.alphabet.length ? (
        <p className="panel-hint">Add a state and an alphabet symbol before defining transitions.</p>
      ) : (
        <form
          className="transition-editor"
          onSubmit={(event) => {
            event.preventDefault();
            const result = setTransitionTargets(source, symbol, targets);
            setMessage(
              result.ok
                ? targets.length
                  ? "Transition saved."
                  : "Transition removed."
                : result.message ?? "Could not update the transition.",
            );
          }}
        >
          <div className="field-pair">
            <label className="field-label">
              Source
              <select
                value={source}
                onChange={(event) => {
                  setSource(event.target.value);
                }}
              >
                {document.states.map((state) => <option key={state}>{state}</option>)}
              </select>
            </label>
            <label className="field-label">
              Symbol
              <select
                value={symbol}
                onChange={(event) => {
                  setSymbol(event.target.value);
                }}
              >
                {document.alphabet.map((candidate) => <option key={candidate}>{candidate}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="target-picker">
            <legend>Destination states</legend>
            {document.states.map((state) => (
              <label key={state}>
                <input
                  type="checkbox"
                  checked={targets.includes(state)}
                  onChange={() => setDraft({
                    source,
                    symbol,
                    base: savedTargets,
                    targets: targets.includes(state)
                      ? targets.filter((target) => target !== state)
                      : [...targets, state],
                  })}
                />
                {state}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="secondary-button secondary-button--wide">
            Save transition
          </button>
          {message ? <p className="form-message" role="status">{message}</p> : null}
        </form>
      )}
    </PanelSection>
  );
}
