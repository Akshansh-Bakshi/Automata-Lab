import { create } from "zustand";
import type { ConversionResponse, Example, NfaDocument } from "@/lib/api/types";

type ConversionStatus = "idle" | "loading" | "ready" | "error";

interface AutomatonState {
  document: NfaDocument | null;
  selectedExampleId: string | null;
  documentRevision: number;
  conversion: ConversionResponse | null;
  conversionRevision: number | null;
  conversionStatus: ConversionStatus;
  conversionError: string | null;
  loadExample: (example: Example) => void;
  replaceDocument: (document: NfaDocument) => void;
  beginConversion: () => void;
  setConversion: (conversion: ConversionResponse) => void;
  failConversion: (message: string) => void;
  isConversionFresh: () => boolean;
  reset: () => void;
}

const initialState = {
  document: null,
  selectedExampleId: null,
  documentRevision: 0,
  conversion: null,
  conversionRevision: null,
  conversionStatus: "idle" as const,
  conversionError: null,
};

export const useAutomatonStore = create<AutomatonState>((set, get) => ({
  ...initialState,
  loadExample: (example) =>
    set((state) => ({
      document: structuredClone(example.nfa),
      selectedExampleId: example.id,
      documentRevision: state.documentRevision + 1,
      conversion: null,
      conversionRevision: null,
      conversionStatus: "idle",
      conversionError: null,
    })),
  replaceDocument: (document) =>
    set((state) => ({
      document: structuredClone(document),
      selectedExampleId: null,
      documentRevision: state.documentRevision + 1,
      conversion: null,
      conversionRevision: null,
      conversionStatus: "idle",
      conversionError: null,
    })),
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

