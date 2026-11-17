import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { NfaDocument, SimulationResponse } from "@/lib/api/types";
import { ApplicationShell } from "@/components/workspace/application-shell";
import { useAutomatonStore } from "@/store/automaton-store";
import { useSimulationStore } from "@/store/simulation-store";
import { jsonResponse } from "@/test/fixtures";

const nfa: NfaDocument = { schemaVersion: 1, states: ["q0"], alphabet: ["a"], initialState: "q0", acceptingStates: ["q0"], transitions: [{ from: "q0", symbol: "a", to: ["q0"] }] };
const response: SimulationResponse = {
  dfa: { alphabet: ["a"], initialState: "D0", acceptingStates: ["D0"], states: [{ id: "D0", subset: ["q0"], label: "{q0}", isInitial: true, isAccepting: true, isDead: false }], transitions: [{ from: "D0", symbol: "a", to: "D0" }], stats: { nfaStates: 1, dfaStates: 1, dfaTransitions: 1, hasDeadState: false } },
  simulation: { input: "", agree: true, nfa: { accepted: true, steps: [{ position: 0, symbol: null, activeStates: ["q0"] }] }, dfa: { accepted: true, steps: [{ position: 0, symbol: null, state: "D0" }] } },
};

describe("Test workspace", () => {
  it("submits ε to the backend and synchronizes both graphs, timeline, and verdict", async () => {
    useAutomatonStore.getState().replaceDocument(nfa);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/api/health")) return jsonResponse({ status: "ok", version: "1.0.0" });
      if (url.endsWith("/api/examples")) return jsonResponse({ examples: [] });
      if (url.endsWith("/api/nfa/validate")) return jsonResponse({ valid: true, warnings: [] });
      if (url.endsWith("/api/simulate")) return jsonResponse(response);
      throw new Error(url);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ApplicationShell />);
    await user.click(screen.getByRole("button", { name: "Test" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Run simulation" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Run simulation" }));
    await waitFor(() => expect(screen.getByText("Accepted")).toBeInTheDocument());
    expect(screen.getByRole("region", { name: "Simulated NFA graph" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Simulated DFA graph" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Simulation timeline/ }));
    expect(screen.getByLabelText("Simulation playback controls")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/simulate$/), expect.any(Object));
    act(() => useSimulationStore.getState().setPlaying(true));
    await user.click(screen.getByRole("button", { name: "Build" }));
    expect(useSimulationStore.getState().playing).toBe(false);
    act(() => useAutomatonStore.getState().toggleAcceptingState("q0"));
    expect(useSimulationStore.getState()).toMatchObject({ status: "stale", result: null });
  });
});
