import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DfaTransitionTable } from "@/components/conversion/dfa-transition-table";
import { sampleConversion, sampleNfa } from "@/test/fixtures";
import { getPlaybackSnapshot } from "@/lib/conversion/playback-model";

const trace = { steps: [
  { index: 0, type: "INIT" as const, dfaState: "D0", subset: ["q0"], worklist: ["D0"], explanation: "Start" },
  { index: 1, type: "PROCESS_SYMBOL" as const, dfaState: "D0", symbol: "0", lookups: [{ nfaState: "q0", targets: ["q0", "q1"] }], result: ["q0", "q1"], targetDfaState: "D1", isNew: true, worklist: ["D1"], explanation: "Move" },
] };

describe("progressive transition table", () => {
  it("distinguishes pending cells from processed cells and highlights the current one", () => {
    const dfa = sampleConversion.dfa;
    const { rerender } = render(<DfaTransitionTable dfa={dfa} snapshot={getPlaybackSnapshot(trace, 0, sampleNfa, dfa)} />);
    expect(screen.getAllByText("Pending")).toHaveLength(2);
    expect(screen.queryByText("D2")).toBeNull();
    rerender(<DfaTransitionTable dfa={dfa} snapshot={getPlaybackSnapshot(trace, 1, sampleNfa, dfa)} />);
    expect(screen.getByText("D1", { selector: "td code" }).closest("td")?.getAttribute("data-active")).toBe("true");
    expect(screen.getAllByText("Pending")).toHaveLength(3);
  });
});
