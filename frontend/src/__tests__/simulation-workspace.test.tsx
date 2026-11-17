import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NfaDocument, SimulationResponse } from "@/lib/api/types";
import { SimulationWorkspace } from "@/components/simulation/simulation-workspace";
import { useSimulationStore } from "@/store/simulation-store";

const nfa: NfaDocument = { schemaVersion: 1, states: ["q0"], alphabet: ["a"], initialState: "q0", acceptingStates: ["q0"], transitions: [{ from: "q0", symbol: "a", to: ["q0"] }] };
function result(disagree = false): SimulationResponse {
  return {
    dfa: { alphabet: ["a"], initialState: "D0", acceptingStates: disagree ? [] : ["D0"], states: [{ id: "D0", subset: ["q0"], label: "{q0}", isInitial: true, isAccepting: !disagree, isDead: false }], transitions: [{ from: "D0", symbol: "a", to: "D0" }], stats: { nfaStates: 1, dfaStates: 1, dfaTransitions: 1, hasDeadState: false } },
    simulation: { input: "", agree: !disagree, nfa: { accepted: true, steps: [{ position: 0, symbol: null, activeStates: ["q0"] }] }, dfa: { accepted: !disagree, steps: [{ position: 0, symbol: null, state: "D0" }] } },
  };
}
function load(value: SimulationResponse) {
  const store = useSimulationStore.getState();
  const id = store.begin(1);
  store.succeed(id, 1, "", value);
}

describe("simulation verdict presentation", () => {
  it("shows ε and acceptance at the initial configuration", () => {
    load(result());
    render(<SimulationWorkspace document={nfa} revision={1} />);
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("ε")).toBeInTheDocument();
    expect(screen.getByText(/Agreement: yes/)).toBeInTheDocument();
  });
  it("exposes backend disagreement without altering either verdict", () => {
    load(result(true));
    render(<SimulationWorkspace document={nfa} revision={1} />);
    expect(screen.getByRole("alert")).toHaveTextContent("NFA and DFA disagree");
    expect(screen.getByRole("alert")).toHaveTextContent("NFA: accepted · DFA: rejected · Agreement: no");
  });
});
