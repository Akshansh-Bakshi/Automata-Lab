import { create } from "zustand";

type PlaybackStatus = "idle" | "playing" | "paused";
type PlaybackSpeed = 0.5 | 1 | 2 | 4;
type PlaybackView = "full" | "step";

interface PlaybackState {
  position: number;
  status: PlaybackStatus;
  speed: PlaybackSpeed;
  view: PlaybackView;
  setPosition: (position: number) => void;
  setStatus: (status: PlaybackStatus) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setView: (view: PlaybackView) => void;
  reset: () => void;
}

const initialState = { position: 0, status: "idle" as const, speed: 1 as const, view: "full" as const };

export const usePlaybackStore = create<PlaybackState>((set) => ({
  ...initialState,
  setPosition: (position) => set({ position: Math.max(0, position) }),
  setStatus: (status) => set({ status }),
  setSpeed: (speed) => set({ speed }),
  setView: (view) => set({ view, status: "paused" }),
  reset: () => set(initialState),
}));

