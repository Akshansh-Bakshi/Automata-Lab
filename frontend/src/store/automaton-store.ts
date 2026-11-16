import { create } from "zustand";
import type { ConversionResponse, Example, NfaDocument } from "@/lib/api/types";
import {
  createNewNfa,
  MAX_ALPHABET_SIZE,
  MAX_NFA_STATES,
  STATE_ID_PATTERN,
  withInitializedLayout,
} from "@/lib/editor/nfa-document";
import { removeVisualEdge } from "@/lib/editor/graph-model";

type ConversionStatus = "idle" | "loading" | "ready" | "error";

export interface EditorActionResult {
  ok: boolean;
  message?: string;
}

interface AutomatonState {
  document: NfaDocument | null;
  selectedExampleId: string | null;
  selectedStateId: string | null;
  documentRevision: number;
  layoutRevision: number;
  conversion: ConversionResponse | null;
  conversionRevision: number | null;
  conversionStatus: ConversionStatus;
  conversionError: string | null;
  editorNotice: string | null;
  createDocument: () => void;
  loadExample: (example: Example) => void;
  replaceDocument: (document: NfaDocument) => void;
  setDocumentName: (name: string) => void;
  selectState: (state: string | null) => void;
  addState: (state: string) => EditorActionResult;
  renameState: (current: string, next: string) => EditorActionResult;
  deleteState: (state: string) => EditorActionResult;
  setInitialState: (state: string) => EditorActionResult;
  toggleAcceptingState: (state: string) => EditorActionResult;
  addSymbol: (symbol: string) => EditorActionResult;
  removeSymbol: (symbol: string) => EditorActionResult;
  setTransitionTargets: (source: string, symbol: string, targets: string[]) => EditorActionResult;
  removeVisualTransition: (source: string, target: string) => EditorActionResult;
  setLayoutPosition: (state: string, position: { x: number; y: number }) => void;
  replaceLayout: (layout: Record<string, { x: number; y: number }>) => void;
  clearEditorNotice: () => void;
  beginConversion: () => void;
  setConversion: (conversion: ConversionResponse) => void;
  failConversion: (message: string) => void;
  isConversionFresh: () => boolean;
  reset: () => void;
}

const initialState = {
  document: null,
  selectedExampleId: null,
  selectedStateId: null,
  documentRevision: 0,
  layoutRevision: 0,
  conversion: null,
  conversionRevision: null,
  conversionStatus: "idle" as const,
  conversionError: null,
  editorNotice: null,
};

function changedDocument(state: AutomatonState, document: NfaDocument, extras = {}) {
  return {
    document,
    selectedExampleId: null,
    documentRevision: state.documentRevision + 1,
    conversion: null,
    conversionRevision: null,
    conversionStatus: "idle" as const,
    conversionError: null,
    editorNotice: null,
    ...extras,
  };
}

export const useAutomatonStore = create<AutomatonState>((set, get) => ({
  ...initialState,
  createDocument: () =>
    set((state) => ({
      ...changedDocument(state, createNewNfa()),
      selectedStateId: "q0",
    })),
  loadExample: (example) =>
    set((state) => ({
      ...changedDocument(state, withInitializedLayout(example.nfa)),
      selectedExampleId: example.id,
      selectedStateId: null,
    })),
  replaceDocument: (document) =>
    set((state) => ({
      ...changedDocument(state, withInitializedLayout(document)),
      selectedStateId: null,
    })),
  setDocumentName: (name) => {
    const document = get().document;
    if (!document || document.name === name) return;
    set((state) => changedDocument(state, { ...document, name }));
  },
  selectState: (selectedStateId) => set({ selectedStateId }),
  addState: (rawState) => {
    const stateId = rawState.trim();
    const document = get().document;
    if (!document) return failure("Create or load an NFA first.");
    if (!STATE_ID_PATTERN.test(stateId)) {
      return failure("State IDs use 1–16 letters, numbers, or underscores.");
    }
    if (document.states.includes(stateId)) return failure(`State '${stateId}' already exists.`);
    if (document.states.length >= MAX_NFA_STATES) return failure("At most 20 states are allowed.");
    const next = withInitializedLayout({ ...document, states: [...document.states, stateId] });
    set((state) => ({ ...changedDocument(state, next), selectedStateId: stateId }));
    return success();
  },
  renameState: (current, rawNext) => {
    const nextId = rawNext.trim();
    const document = get().document;
    if (!document?.states.includes(current)) return failure(`State '${current}' does not exist.`);
    if (!STATE_ID_PATTERN.test(nextId)) {
      return failure("State IDs use 1–16 letters, numbers, or underscores.");
    }
    if (current !== nextId && document.states.includes(nextId)) {
      return failure(`State '${nextId}' already exists.`);
    }
    if (current === nextId) return success();
    const layout = { ...(document.layout ?? {}) };
    if (layout[current]) {
      layout[nextId] = layout[current];
      delete layout[current];
    }
    const nextDocument: NfaDocument = {
      ...document,
      states: document.states.map((state) => (state === current ? nextId : state)),
      initialState: document.initialState === current ? nextId : document.initialState,
      acceptingStates: document.acceptingStates.map((state) =>
        state === current ? nextId : state,
      ),
      transitions: document.transitions.map((transition) => ({
        ...transition,
        from: transition.from === current ? nextId : transition.from,
        to: transition.to.map((target) => (target === current ? nextId : target)),
      })),
      layout,
    };
    set((state) => ({ ...changedDocument(state, nextDocument), selectedStateId: nextId }));
    return success();
  },
  deleteState: (stateId) => {
    const document = get().document;
    if (!document?.states.includes(stateId)) return failure(`State '${stateId}' does not exist.`);
    const deletingInitial = document.initialState === stateId;
    const layout = { ...(document.layout ?? {}) };
    delete layout[stateId];
    const transitions = document.transitions.flatMap((transition) => {
      if (transition.from === stateId) return [];
      const to = transition.to.filter((target) => target !== stateId);
      return to.length ? [{ ...transition, to }] : [];
    });
    const nextDocument: NfaDocument = {
      ...document,
      states: document.states.filter((state) => state !== stateId),
      initialState: deletingInitial ? "" : document.initialState,
      acceptingStates: document.acceptingStates.filter((state) => state !== stateId),
      transitions,
      layout,
    };
    const notice = deletingInitial
      ? "The initial state was deleted. Choose a new initial state before validating or converting."
      : `State '${stateId}' and its transitions were deleted.`;
    set((state) => ({
      ...changedDocument(state, nextDocument),
      selectedStateId: null,
      editorNotice: notice,
    }));
    return { ok: true, message: notice };
  },
  setInitialState: (stateId) => {
    const document = get().document;
    if (!document?.states.includes(stateId)) return failure(`State '${stateId}' does not exist.`);
    if (document.initialState === stateId) return success();
    set((state) => changedDocument(state, { ...document, initialState: stateId }));
    return success();
  },
  toggleAcceptingState: (stateId) => {
    const document = get().document;
    if (!document?.states.includes(stateId)) return failure(`State '${stateId}' does not exist.`);
    const acceptingStates = document.acceptingStates.includes(stateId)
      ? document.acceptingStates.filter((state) => state !== stateId)
      : [...document.acceptingStates, stateId];
    set((state) => changedDocument(state, { ...document, acceptingStates }));
    return success();
  },
  addSymbol: (rawSymbol) => {
    const symbol = rawSymbol.trim();
    const document = get().document;
    if (!document) return failure("Create or load an NFA first.");
    if (symbol.length !== 1 || /\s/.test(symbol)) {
      return failure("Symbols must be exactly one non-whitespace character.");
    }
    if (document.alphabet.includes(symbol)) return failure(`Symbol '${symbol}' already exists.`);
    if (document.alphabet.length >= MAX_ALPHABET_SIZE) {
      return failure("At most 10 alphabet symbols are allowed.");
    }
    set((state) => changedDocument(state, { ...document, alphabet: [...document.alphabet, symbol] }));
    return success();
  },
  removeSymbol: (symbol) => {
    const document = get().document;
    if (!document?.alphabet.includes(symbol)) return failure(`Symbol '${symbol}' does not exist.`);
    const removedMoves = document.transitions.filter((transition) => transition.symbol === symbol).length;
    const next = {
      ...document,
      alphabet: document.alphabet.filter((candidate) => candidate !== symbol),
      transitions: document.transitions.filter((transition) => transition.symbol !== symbol),
    };
    const notice = removedMoves
      ? `Symbol '${symbol}' and ${removedMoves} affected transition${removedMoves === 1 ? "" : "s"} were deleted.`
      : `Symbol '${symbol}' was deleted.`;
    set((state) => ({ ...changedDocument(state, next), editorNotice: notice }));
    return { ok: true, message: notice };
  },
  setTransitionTargets: (source, symbol, rawTargets) => {
    const document = get().document;
    if (!document?.states.includes(source)) return failure("Choose a valid source state.");
    if (!document.alphabet.includes(symbol)) return failure("Choose a symbol from the alphabet.");
    const targets = [...new Set(rawTargets)];
    if (targets.some((target) => !document.states.includes(target))) {
      return failure("Every target must be an existing state.");
    }
    const pairIndex = document.transitions.findIndex(
      (transition) => transition.from === source && transition.symbol === symbol,
    );
    const transitions = [...document.transitions];
    if (targets.length === 0) {
      if (pairIndex >= 0) transitions.splice(pairIndex, 1);
    } else {
      const stateOrder = new Map(document.states.map((state, index) => [state, index]));
      targets.sort((left, right) => (stateOrder.get(left) ?? 0) - (stateOrder.get(right) ?? 0));
      const transition = { from: source, symbol, to: targets };
      if (pairIndex >= 0) transitions[pairIndex] = transition;
      else transitions.push(transition);
    }
    if (JSON.stringify(transitions) === JSON.stringify(document.transitions)) return success();
    set((state) => changedDocument(state, { ...document, transitions }));
    return success();
  },
  removeVisualTransition: (source, target) => {
    const document = get().document;
    if (!document) return failure("No NFA is loaded.");
    const transitions = removeVisualEdge(document, source, target);
    if (JSON.stringify(transitions) === JSON.stringify(document.transitions)) {
      return failure("That transition no longer exists.");
    }
    set((state) => changedDocument(state, { ...document, transitions }));
    return success();
  },
  setLayoutPosition: (stateId, position) => {
    const document = get().document;
    if (!document?.states.includes(stateId)) return;
    const current = document.layout?.[stateId];
    if (current?.x === position.x && current.y === position.y) return;
    set((state) => ({
      document: { ...document, layout: { ...(document.layout ?? {}), [stateId]: position } },
      layoutRevision: state.layoutRevision + 1,
    }));
  },
  replaceLayout: (layout) => {
    const document = get().document;
    if (!document) return;
    set((state) => ({
      document: { ...document, layout: structuredClone(layout) },
      layoutRevision: state.layoutRevision + 1,
    }));
  },
  clearEditorNotice: () => set({ editorNotice: null }),
  beginConversion: () => set({ conversionStatus: "loading", conversionError: null }),
  setConversion: (conversion) =>
    set((state) => ({
      conversion,
      conversionRevision: state.documentRevision,
      conversionStatus: "ready",
      conversionError: null,
    })),
  failConversion: (conversionError) => set({ conversionStatus: "error", conversionError }),
  isConversionFresh: () => {
    const state = get();
    return state.conversion !== null && state.conversionRevision === state.documentRevision;
  },
  reset: () => set(initialState),
}));

function success(): EditorActionResult {
  return { ok: true };
}

function failure(message: string): EditorActionResult {
  return { ok: false, message };
}
