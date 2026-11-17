import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SimulationResponse } from "@/lib/api/types";
import { SimulationControls } from "@/components/simulation/simulation-controls";
import { useSimulationStore } from "@/store/simulation-store";

const result: SimulationResponse = {
  dfa: { alphabet: ["a"], initialState: "D0", acceptingStates: [], states: [{ id: "D0", subset: ["q0"], label: "{q0}", isInitial: true, isAccepting: false, isDead: false }], transitions: [{ from: "D0", symbol: "a", to: "D0" }], stats: { nfaStates: 1, dfaStates: 1, dfaTransitions: 1, hasDeadState: false } },
  simulation: { input: "aa", agree: true,
    nfa: { accepted: false, steps: [{ position: 0, symbol: null, activeStates: ["q0"] }, { position: 1, symbol: "a", activeStates: ["q0"] }, { position: 2, symbol: "a", activeStates: ["q0"] }] },
    dfa: { accepted: false, steps: [{ position: 0, symbol: null, state: "D0" }, { position: 1, symbol: "a", state: "D0" }, { position: 2, symbol: "a", state: "D0" }] },
  },
};

describe("simulation playback controls", () => {
  it("plays, changes speed, scrubs backwards, and cleans timers", () => {
    vi.useFakeTimers();
    useSimulationStore.getState().setInput("aa");
    const requestId = useSimulationStore.getState().begin(1);
    useSimulationStore.getState().succeed(requestId, 1, "aa", result);
    const { unmount } = render(<SimulationControls result={result} />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => vi.advanceTimersByTime(1200));
    expect(useSimulationStore.getState().position).toBe(1);
    fireEvent.change(screen.getByRole("combobox", { name: "Simulation speed" }), { target: { value: "2" } });
    act(() => vi.advanceTimersByTime(600));
    expect(useSimulationStore.getState()).toMatchObject({ position: 2, playing: false });
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(useSimulationStore.getState().position).toBe(1);
    fireEvent.change(screen.getByRole("slider", { name: "Simulation position" }), { target: { value: "0" } });
    expect(useSimulationStore.getState().position).toBe(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
