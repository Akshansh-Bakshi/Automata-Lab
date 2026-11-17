import { create } from "zustand";
import type { SimulationResponse } from "@/lib/api/types";

type SimulationStatus = "idle" | "loading" | "ready" | "error" | "stale";
type SimulationSpeed = 0.5 | 1 | 2 | 4;

interface SimulationState {
  input: string;
  status: SimulationStatus;
  result: SimulationResponse | null;
  revision: number | null;
  resultInput: string | null;
  requestId: number;
  error: string | null;
  errorCode: string | null;
  errorPath: string | null;
  position: number;
  playing: boolean;
  speed: SimulationSpeed;
  setInput: (input: string) => void;
  begin: (revision: number) => number;
  succeed: (requestId: number, revision: number, input: string, result: SimulationResponse) => boolean;
  fail: (requestId: number, revision: number, input: string, code: string, message: string, path?: string | null) => boolean;
  invalidate: () => void;
  setPosition: (position: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: SimulationSpeed) => void;
  reset: () => void;
}

const initial = {
  input: "", status: "idle" as const, result: null, revision: null,
  resultInput: null, requestId: 0, error: null, errorCode: null, errorPath: null,
  position: 0, playing: false, speed: 1 as const,
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  ...initial,
  setInput: (input) => set((state) => ({
    input, requestId: state.requestId + 1, result: null, revision: null,
    resultInput: null, status: "idle", error: null, errorCode: null, errorPath: null,
    position: 0, playing: false,
  })),
  begin: (revision) => {
    const requestId = get().requestId + 1;
    set({ requestId, revision, result: null, resultInput: null, status: "loading", error: null, errorCode: null, errorPath: null, position: 0, playing: false });
    return requestId;
  },
  succeed: (requestId, revision, input, result) => {
    const state = get();
    if (state.requestId !== requestId || state.revision !== revision || state.input !== input) return false;
    set({ result, resultInput: input, status: "ready", position: 0, playing: false });
    return true;
  },
  fail: (requestId, revision, input, code, error, path = null) => {
    const state = get();
    if (state.requestId !== requestId || state.revision !== revision || state.input !== input) return false;
    set({ status: "error", result: null, error, errorCode: code, errorPath: path, playing: false });
    return true;
  },
  invalidate: () => set((state) => ({
    requestId: state.requestId + 1, revision: null, result: null, resultInput: null,
    status: state.result || state.status === "loading" ? "stale" : "idle",
    error: null, errorCode: null, errorPath: null, position: 0, playing: false,
  })),
  setPosition: (position) => set({ position: Math.max(0, Math.floor(position)) }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  reset: () => set(initial),
}));
