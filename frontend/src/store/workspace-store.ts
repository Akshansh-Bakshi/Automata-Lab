import { create } from "zustand";

export type WorkspaceMode = "build" | "convert" | "test";

interface WorkspaceState {
  activeMode: WorkspaceMode;
  bottomDockOpen: boolean;
  setActiveMode: (mode: WorkspaceMode) => void;
  toggleBottomDock: () => void;
  reset: () => void;
}

const initialState = { activeMode: "build" as const, bottomDockOpen: false };

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...initialState,
  setActiveMode: (activeMode) => set({ activeMode }),
  toggleBottomDock: () => set((state) => ({ bottomDockOpen: !state.bottomDockOpen })),
  reset: () => set(initialState),
}));

