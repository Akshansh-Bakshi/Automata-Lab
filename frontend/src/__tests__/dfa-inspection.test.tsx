import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConvertInspector } from "@/components/conversion/convert-inspector";
import { DfaTransitionTable } from "@/components/conversion/dfa-transition-table";
import type { NfaValidationState } from "@/hooks/use-nfa-validation";
import { useAutomatonStore } from "@/store/automaton-store";
import { sampleConversion, sampleNfa } from "@/test/fixtures";

const valid: NfaValidationState = { status: "valid", issues: [], warnings: [] };

describe("DFA inspection", () => {
  it("renders the complete table with initial, accepting, dead, and subset information", () => {
    render(<DfaTransitionTable dfa={sampleConversion.dfa} />);

    expect(screen.getAllByRole("row")).toHaveLength(sampleConversion.dfa.states.length + 1);
    expect(screen.getByLabelText("Initial")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Accepting")).toHaveLength(2);
    expect(screen.getByLabelText("Dead")).toBeInTheDocument();
    expect(screen.getByText("∅")).toBeInTheDocument();
  });

  it("shows subset mapping, statistics, and the selected-state explanation", async () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    const request = useAutomatonStore.getState().beginConversion();
    useAutomatonStore.getState().setConversion(request.requestId, request.revision, sampleConversion);
    const user = userEvent.setup();
    render(<ConvertInspector document={sampleNfa} validation={valid} />);

    expect(screen.getByText("DFA states").parentElement).toHaveTextContent("4");
    expect(screen.getByText("Transitions").parentElement).toHaveTextContent("8");
    expect(screen.getByText("Dead state included")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /D1.*q1, q2.*Accepting/ }));
    expect(screen.getByText(/Accepting because it contains q2/)).toBeInTheDocument();
  });

  it("surfaces an incomplete table response instead of inventing a target", () => {
    render(
      <DfaTransitionTable
        dfa={{ ...sampleConversion.dfa, transitions: sampleConversion.dfa.transitions.slice(1) }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Missing transition for D0 on '0'.");
  });

  it("explains a valid conversion with no accepting states", () => {
    useAutomatonStore.getState().replaceDocument({ ...sampleNfa, acceptingStates: [] });
    const noAccepting = {
      ...sampleConversion,
      dfa: {
        ...sampleConversion.dfa,
        acceptingStates: [],
        states: sampleConversion.dfa.states.map((state) => ({ ...state, isAccepting: false })),
      },
    };
    const request = useAutomatonStore.getState().beginConversion();
    useAutomatonStore.getState().setConversion(request.requestId, request.revision, noAccepting);
    render(<ConvertInspector document={useAutomatonStore.getState().document} validation={valid} />);

    expect(screen.getByText(/language is empty/)).toBeInTheDocument();
  });

  it("blocks conversion when authoritative validation is unavailable", () => {
    const unavailable: NfaValidationState = {
      status: "unavailable",
      issues: [{ code: "NETWORK_ERROR", path: "backend", message: "Offline" }],
      warnings: [],
    };
    render(<ConvertInspector document={sampleNfa} validation={unavailable} />);

    expect(screen.getByRole("button", { name: "Generate DFA" })).toBeDisabled();
    expect(screen.getByText("Backend validation is unavailable.")).toBeInTheDocument();
  });
});
