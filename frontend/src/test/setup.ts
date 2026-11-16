import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { useAutomatonStore } from "@/store/automaton-store";
import { usePlaybackStore } from "@/store/playback-store";
import { useWorkspaceStore } from "@/store/workspace-store";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  useAutomatonStore.getState().reset();
  usePlaybackStore.getState().reset();
  useWorkspaceStore.getState().reset();
});

