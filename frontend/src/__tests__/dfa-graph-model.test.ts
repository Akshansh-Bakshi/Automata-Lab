import { describe, expect, it } from "vitest";
import {
  createDfaLayout,
  dfaToEdges,
  dfaToNodes,
  inspectDfaContract,
} from "@/lib/conversion/dfa-graph-model";
import { sampleConversion } from "@/test/fixtures";

describe("DFA graph derivation", () => {
  it("derives canonical initial, accepting, and dead-state node data", () => {
    const nodes = dfaToNodes(sampleConversion.dfa);
    expect(nodes.find((node) => node.id === "D0")?.data).toMatchObject({ initial: true });
    expect(nodes.find((node) => node.id === "D1")?.data).toMatchObject({ accepting: true });
    expect(nodes.find((node) => node.id === "D2")?.data).toMatchObject({ dead: true, subset: [] });
    expect(Object.keys(createDfaLayout(sampleConversion.dfa))).toEqual(["D0", "D1", "D2", "D3"]);
  });

  it("merges labels only for transitions sharing the same ordered state pair", () => {
    const edges = dfaToEdges(sampleConversion.dfa);
    expect(edges.find((edge) => edge.source === "D2" && edge.target === "D2")?.data).toMatchObject({
      selfLoop: true,
      symbols: ["0", "1"],
    });
    expect(edges.find((edge) => edge.source === "D1" && edge.target === "D3")?.data?.reverse).toBe(true);
  });

  it("treats a missing deterministic transition as an API contract violation", () => {
    expect(inspectDfaContract(sampleConversion.dfa)).toEqual([]);
    const incomplete = {
      ...sampleConversion.dfa,
      transitions: sampleConversion.dfa.transitions.slice(1),
    };
    expect(inspectDfaContract(incomplete)).toContain("Missing transition for D0 on '0'.");
  });
});
