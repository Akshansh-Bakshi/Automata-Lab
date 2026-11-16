import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TransitionTable } from "@/components/editor/transition-table";
import { documentToEdges } from "@/lib/editor/graph-model";
import { useAutomatonStore } from "@/store/automaton-store";
import { sampleNfa } from "@/test/fixtures";

function TableHarness() {
  const document = useAutomatonStore((state) => state.document);
  return document ? <TransitionTable document={document} /> : null;
}

describe("graph and transition table synchronization", () => {
  it("updates graph-derived edges immediately after a table edit", async () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    const user = userEvent.setup();
    render(<TableHarness />);

    await user.click(screen.getByLabelText("Edit transition from q1 on 0"));
    const picker = screen.getByText("δ(q1, 0)").parentElement!;
    await user.click(picker.querySelector<HTMLInputElement>('input[type="checkbox"]')!);

    const document = useAutomatonStore.getState().document!;
    expect(document.transitions).toContainEqual({ from: "q1", symbol: "0", to: ["q0"] });
    expect(documentToEdges(document)).toContainEqual(
      expect.objectContaining({ source: "q1", target: "q0" }),
    );
  });

  it("reflects a graph-style connection mutation in the table", () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    useAutomatonStore.getState().setTransitionTargets("q1", "0", ["q1"]);
    render(<TableHarness />);

    expect(screen.getByLabelText("Edit transition from q1 on 0")).toHaveTextContent("{ q1 }");
  });
});
