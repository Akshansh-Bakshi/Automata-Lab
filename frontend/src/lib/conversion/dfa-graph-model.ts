import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { DfaDocument } from "@/lib/api/types";
import type { TransitionEdgeData } from "@/lib/editor/graph-model";
import { edgeId } from "@/lib/editor/graph-model";

export interface DfaNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  subset: string[];
  initial: boolean;
  accepting: boolean;
  dead: boolean;
}

export type DfaFlowNode = Node<DfaNodeData, "dfaState">;
export type DfaFlowEdge = Edge<TransitionEdgeData, "transition">;

const NODE_WIDTH = 112;
const NODE_HEIGHT = 82;

export function createDfaLayout(dfa: DfaDocument) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", ranksep: 120, nodesep: 72, marginx: 48, marginy: 48 });
  dfa.states.forEach((state) => graph.setNode(state.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  dfa.transitions.forEach((transition) => {
    if (transition.from !== transition.to) graph.setEdge(transition.from, transition.to);
  });
  dagre.layout(graph);
  return Object.fromEntries(
    dfa.states.map((state) => {
      const position = graph.node(state.id) as { x: number; y: number };
      return [state.id, { x: position.x - NODE_WIDTH / 2, y: position.y - NODE_HEIGHT / 2 }];
    }),
  );
}

export function dfaToNodes(
  dfa: DfaDocument,
  savedLayout: Record<string, { x: number; y: number }> = {},
): DfaFlowNode[] {
  const generatedLayout = createDfaLayout(dfa);
  return dfa.states.map((state) => ({
    id: state.id,
    type: "dfaState",
    position: savedLayout[state.id] ?? generatedLayout[state.id],
    data: {
      id: state.id,
      label: state.label,
      subset: state.subset,
      initial: state.isInitial,
      accepting: state.isAccepting,
      dead: state.isDead,
    },
    ariaLabel: `${state.id}, subset ${state.subset.length ? state.subset.join(", ") : "empty set"}${
      state.isInitial ? ", initial" : ""
    }${state.isAccepting ? ", accepting" : ""}${state.isDead ? ", dead" : ""} DFA state`,
  }));
}

export function dfaToEdges(dfa: DfaDocument): DfaFlowEdge[] {
  const pairs = new Map<string, { source: string; target: string; symbols: string[] }>();
  for (const transition of dfa.transitions) {
    const id = edgeId(transition.from, transition.to);
    const pair = pairs.get(id) ?? {
      source: transition.from,
      target: transition.to,
      symbols: [],
    };
    if (!pair.symbols.includes(transition.symbol)) pair.symbols.push(transition.symbol);
    pairs.set(id, pair);
  }
  return [...pairs.entries()].map(([id, pair]) => ({
    id: `dfa-${id}`,
    type: "transition",
    source: pair.source,
    target: pair.target,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    data: {
      symbols: pair.symbols,
      selfLoop: pair.source === pair.target,
      reverse: pairs.has(edgeId(pair.target, pair.source)) && pair.source !== pair.target,
    },
    ariaLabel: `DFA transition from ${pair.source} to ${pair.target} on ${pair.symbols.join(", ")}`,
  }));
}

export function inspectDfaContract(dfa: DfaDocument): string[] {
  const issues: string[] = [];
  const stateIds = new Set(dfa.states.map((state) => state.id));
  if (stateIds.size !== dfa.states.length) issues.push("DFA state IDs are not unique.");
  if (!stateIds.has(dfa.initialState)) issues.push("The DFA initial state is missing.");

  const pairCounts = new Map<string, number>();
  for (const transition of dfa.transitions) {
    if (!stateIds.has(transition.from) || !stateIds.has(transition.to)) {
      issues.push(`Transition ${transition.from}/${transition.symbol} references an unknown state.`);
    }
    if (!dfa.alphabet.includes(transition.symbol)) {
      issues.push(`Transition ${transition.from}/${transition.symbol} uses an unknown symbol.`);
    }
    const key = `${transition.from}\u0000${transition.symbol}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  for (const state of dfa.states) {
    for (const symbol of dfa.alphabet) {
      const count = pairCounts.get(`${state.id}\u0000${symbol}`) ?? 0;
      if (count !== 1) {
        issues.push(
          count === 0
            ? `Missing transition for ${state.id} on '${symbol}'.`
            : `Duplicate transitions for ${state.id} on '${symbol}'.`,
        );
      }
    }
  }
  return issues;
}
