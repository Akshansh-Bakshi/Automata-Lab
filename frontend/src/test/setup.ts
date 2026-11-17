import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { useAutomatonStore } from "@/store/automaton-store";
import { usePlaybackStore } from "@/store/playback-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { cancelActiveConversion } from "@/lib/conversion/run-conversion";
import { cancelActiveSimulation } from "@/lib/simulation/run-simulation";
import { useSimulationStore } from "@/store/simulation-store";

class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: ResizeObserverMock,
});

afterEach(() => {
  cancelActiveConversion();
  cancelActiveSimulation();
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  useAutomatonStore.getState().reset();
  usePlaybackStore.getState().reset();
  useSimulationStore.getState().reset();
  useWorkspaceStore.getState().reset();
});

