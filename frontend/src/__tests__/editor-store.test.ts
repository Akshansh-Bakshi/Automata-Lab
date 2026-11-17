import { describe, expect, it } from "vitest";
import type { ConversionResponse } from "@/lib/api/types";
import { documentToEdges } from "@/lib/editor/graph-model";
import { useAutomatonStore } from "@/store/automaton-store";
import { sampleNfa } from "@/test/fixtures";

const conversion = {
  dfa: {
    acceptingStates: [],
    alphabet: ["0", "1"],
    initialState: "D0",
    states: [],
    stats: { dfaStates: 0, dfaTransitions: 0, hasDeadState: false, nfaStates: 3 },
    transitions: [],
  },
  trace: { steps: [] },
} satisfies ConversionResponse;

describe("NFA editor store", () => {
  it("creates, renames, classifies, and deletes states atomically", () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    expect(useAutomatonStore.getState().addState("q3")).toEqual({ ok: true });
    expect(useAutomatonStore.getState().addState("q3").ok).toBe(false);

    useAutomatonStore.getState().setInitialState("q1");
    useAutomatonStore.getState().toggleAcceptingState("q1");
    expect(useAutomatonStore.getState().renameState("q1", "middle")).toEqual({ ok: true });

    const renamed = useAutomatonStore.getState().document!;
    expect(renamed.initialState).toBe("middle");
    expect(renamed.acceptingStates).toEqual(["q2", "middle"]);
    expect(renamed.transitions).toContainEqual({ from: "q0", symbol: "0", to: ["q0", "middle"] });
    expect(renamed.transitions).toContainEqual({ from: "middle", symbol: "1", to: ["q2"] });
    expect(renamed.layout?.middle).toBeDefined();
    expect(renamed.layout?.q1).toBeUndefined();

    useAutomatonStore.getState().deleteState("middle");
    const deleted = useAutomatonStore.getState().document!;
    expect(deleted.initialState).toBe("");
    expect(deleted.states).not.toContain("middle");
    expect(deleted.transitions.every((transition) => transition.from !== "middle" && !transition.to.includes("middle"))).toBe(true);
    expect(useAutomatonStore.getState().editorNotice).toMatch(/choose a new initial state/i);
  });

  it("edits the alphabet safely and removes affected transitions", () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    expect(useAutomatonStore.getState().addSymbol("x")).toEqual({ ok: true });
    expect(useAutomatonStore.getState().addSymbol("x").ok).toBe(false);
    expect(useAutomatonStore.getState().addSymbol(" ").ok).toBe(false);

    useAutomatonStore.getState().removeSymbol("0");
    const document = useAutomatonStore.getState().document!;
    expect(document.alphabet).toEqual(["1", "x"]);
    expect(document.transitions.every((transition) => transition.symbol !== "0")).toBe(true);
  });

  it("represents nondeterminism, self-loops, and merged visual edge symbols without duplicates", () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    useAutomatonStore.getState().setTransitionTargets("q0", "1", ["q0", "q1"]);
    const document = useAutomatonStore.getState().document!;
    const pairs = document.transitions.map((transition) => `${transition.from}:${transition.symbol}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(document.transitions).toContainEqual({ from: "q0", symbol: "1", to: ["q0", "q1"] });

    const edges = documentToEdges(document);
    expect(edges.find((edge) => edge.source === "q0" && edge.target === "q0")?.data).toMatchObject({
      selfLoop: true,
      symbols: ["0", "1"],
    });
    expect(edges.find((edge) => edge.source === "q0" && edge.target === "q1")?.data?.symbols).toEqual(["0", "1"]);

    useAutomatonStore.getState().removeVisualTransition("q0", "q1");
    expect(
      useAutomatonStore
        .getState()
        .document?.transitions.every(
          (transition) => transition.from !== "q0" || !transition.to.includes("q1"),
        ),
    ).toBe(true);
  });

  it("invalidates conversion for semantic edits but isolates cosmetic layout metadata", () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    const request = useAutomatonStore.getState().beginConversion();
    useAutomatonStore
      .getState()
      .setConversion(request.requestId, request.revision, conversion);
    const revision = useAutomatonStore.getState().documentRevision;

    useAutomatonStore.getState().setLayoutPosition("q0", { x: 501, y: 202 });
    expect(useAutomatonStore.getState().documentRevision).toBe(revision);
    expect(useAutomatonStore.getState().isConversionFresh()).toBe(true);

    useAutomatonStore.getState().toggleAcceptingState("q0");
    expect(useAutomatonStore.getState().documentRevision).toBe(revision + 1);
    expect(useAutomatonStore.getState().conversion).toBeNull();
  });
});
