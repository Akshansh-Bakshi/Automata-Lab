import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { NfaDocument } from "@/lib/api/types";
import { defaultPosition } from "./nfa-document";

export interface StateNodeData extends Record<string, unknown> {
  label: string;
  initial: boolean;
  accepting: boolean;
}

export interface TransitionEdgeData extends Record<string, unknown> {
  symbols: string[];
  reverse: boolean;
  selfLoop: boolean;
}

export type StateFlowNode = Node<StateNodeData, "state">;
export type TransitionFlowEdge = Edge<TransitionEdgeData, "transition">;

export function documentToNodes(document: NfaDocument): StateFlowNode[] {
  return document.states.map((state, index) => ({
    id: state,
    type: "state",
    position: document.layout?.[state] ?? defaultPosition(index),
    data: {
      label: state,
      initial: state === document.initialState,
      accepting: document.acceptingStates.includes(state),
    },
    ariaLabel: `${state}${state === document.initialState ? ", initial" : ""}${
      document.acceptingStates.includes(state) ? ", accepting" : ""
    } state`,
  }));
}

export function documentToEdges(document: NfaDocument): TransitionFlowEdge[] {
  const pairs = new Map<string, { source: string; target: string; symbols: string[] }>();
  for (const transition of document.transitions) {
    for (const target of transition.to) {
      const id = edgeId(transition.from, target);
      const existing = pairs.get(id) ?? { source: transition.from, target, symbols: [] };
      if (!existing.symbols.includes(transition.symbol)) existing.symbols.push(transition.symbol);
      pairs.set(id, existing);
    }
  }
  return [...pairs.entries()].map(([id, pair]) => ({
    id,
    type: "transition",
    source: pair.source,
    target: pair.target,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    data: {
      symbols: pair.symbols,
      selfLoop: pair.source === pair.target,
      reverse: pairs.has(edgeId(pair.target, pair.source)) && pair.source !== pair.target,
    },
    ariaLabel: `Transition from ${pair.source} to ${pair.target} on ${pair.symbols.join(", ")}`,
  }));
}

export function edgeId(source: string, target: string): string {
  return `edge:${encodeURIComponent(source)}:${encodeURIComponent(target)}`;
}

export function removeVisualEdge(
  document: NfaDocument,
  source: string,
  target: string,
): NfaDocument["transitions"] {
  return document.transitions.flatMap((transition) => {
    if (transition.from !== source || !transition.to.includes(target)) return [transition];
    const to = transition.to.filter((candidate) => candidate !== target);
    return to.length ? [{ ...transition, to }] : [];
  });
}
