"use client";

import dagre from "@dagrejs/dagre";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import { Focus, LayoutDashboard, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { NfaDocument } from "@/lib/api/types";
import {
  documentToEdges,
  documentToNodes,
  type StateFlowNode,
  type TransitionFlowEdge,
} from "@/lib/editor/graph-model";
import { useAutomatonStore } from "@/store/automaton-store";
import { StateNode } from "./state-node";
import { TransitionEdge } from "./transition-edge";

const nodeTypes = { state: StateNode };
const edgeTypes = { transition: TransitionEdge };
const NODE_WIDTH = 86;
const NODE_HEIGHT = 70;

export function NfaGraph({
  document,
  revision,
  readOnly = false,
}: {
  document: NfaDocument;
  revision: number;
  readOnly?: boolean;
}) {
  return (
    <ReactFlowProvider>
      <GraphViewport key={revision} document={document} readOnly={readOnly} />
    </ReactFlowProvider>
  );
}

function GraphViewport({ document, readOnly }: { document: NfaDocument; readOnly: boolean }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<StateFlowNode>(documentToNodes(document));
  const edges = useMemo(() => documentToEdges(document), [document]);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TransitionFlowEdge | null>(null);
  const selectState = useAutomatonStore((state) => state.selectState);
  const setLayoutPosition = useAutomatonStore((state) => state.setLayoutPosition);
  const replaceLayout = useAutomatonStore((state) => state.replaceLayout);
  const removeVisualTransition = useAutomatonStore((state) => state.removeVisualTransition);
  const { fitView } = useReactFlow<StateFlowNode, TransitionFlowEdge>();

  const autoLayout = () => {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: "LR", ranksep: 110, nodesep: 62, marginx: 42, marginy: 42 });
    nodes.forEach((node) => graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
    edges.forEach((edge) => {
      if (edge.source !== edge.target) graph.setEdge(edge.source, edge.target);
    });
    dagre.layout(graph);
    const layout = Object.fromEntries(
      nodes.map((node) => {
        const position = graph.node(node.id) as { x: number; y: number };
        return [node.id, { x: position.x - NODE_WIDTH / 2, y: position.y - NODE_HEIGHT / 2 }];
      }),
    );
    setNodes((current) => current.map((node) => ({ ...node, position: layout[node.id] })));
    replaceLayout(layout);
    window.requestAnimationFrame(() => void fitView({ padding: 0.22, duration: 240 }));
  };

  return (
    <div
      className="nfa-graph"
      aria-label={readOnly ? "Read-only NFA graph" : "Interactive NFA graph editor"}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setPendingConnection(null);
          setSelectedEdge(null);
        }
      }}
    >
      <div className="graph-toolbar" aria-label="Graph controls">
        <button type="button" onClick={() => void fitView({ padding: 0.22, duration: 220 })}>
          <Focus size={15} aria-hidden="true" /> Fit view
        </button>
        {!readOnly ? (
          <button type="button" onClick={autoLayout}>
            <LayoutDashboard size={15} aria-hidden="true" /> Auto layout
          </button>
        ) : null}
      </div>
      <ReactFlow<StateFlowNode, TransitionFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={readOnly ? undefined : (_, node) => selectState(node.id)}
        onPaneClick={() => {
          selectState(null);
          setSelectedEdge(null);
        }}
        onNodeDragStop={readOnly ? undefined : (_, node) => setLayoutPosition(node.id, node.position)}
        onConnect={readOnly ? undefined : (connection) => {
          if (connection.source && connection.target) setPendingConnection(connection);
        }}
        onEdgeClick={readOnly ? undefined : (_, edge) => setSelectedEdge(edge)}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.25}
        maxZoom={2}
        deleteKeyCode={null}
        elementsSelectable
        nodesConnectable={!readOnly}
        nodesDraggable={!readOnly}
        panOnDrag
        zoomOnScroll
        aria-label={readOnly ? "Read-only NFA state and transition canvas" : "NFA state and transition canvas"}
      >
        <Background gap={22} size={1} color="#c9d0dc" />
        <Controls showInteractive={false} />
        {document.states.length > 8 ? (
          <MiniMap pannable zoomable nodeColor="#dfe4ff" maskColor="rgb(247 249 252 / 72%)" />
        ) : null}
      </ReactFlow>
      {!readOnly && pendingConnection?.source && pendingConnection.target ? (
        <ConnectionEditor
          document={document}
          source={pendingConnection.source}
          target={pendingConnection.target}
          onClose={() => setPendingConnection(null)}
        />
      ) : null}
      {!readOnly && selectedEdge ? (
        <div className="edge-inspector" role="dialog" aria-label="Selected transition">
          <button
            className="edge-inspector__close"
            type="button"
            aria-label="Close transition inspector"
            onClick={() => setSelectedEdge(null)}
          >
            <X size={14} />
          </button>
          <span>Selected transition</span>
          <strong>
            {selectedEdge.source} → {selectedEdge.target}
          </strong>
          <small>Symbols: {selectedEdge.data?.symbols.join(", ")}</small>
          <button
            className="danger-button danger-button--small"
            type="button"
            onClick={() => {
              if (window.confirm("Delete every symbol on this visual transition?")) {
                removeVisualTransition(selectedEdge.source, selectedEdge.target);
                setSelectedEdge(null);
              }
            }}
          >
            <Trash2 size={13} /> Delete edge
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ConnectionEditor({
  document,
  source,
  target,
  onClose,
}: {
  document: NfaDocument;
  source: string;
  target: string;
  onClose: () => void;
}) {
  const [symbol, setSymbol] = useState(document.alphabet[0] ?? "");
  const setTransitionTargets = useAutomatonStore((state) => state.setTransitionTargets);
  const existing = document.transitions.find(
    (transition) => transition.from === source && transition.symbol === symbol,
  );
  return (
    <form
      className="connection-editor"
      aria-label="Create transition"
      onSubmit={(event) => {
        event.preventDefault();
        if (!symbol) return;
        setTransitionTargets(source, symbol, [...(existing?.to ?? []), target]);
        onClose();
      }}
    >
      <div>
        <span>New transition</span>
        <strong>
          {source} → {target}
        </strong>
      </div>
      {document.alphabet.length ? (
        <label>
          Symbol
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)} autoFocus>
            {document.alphabet.map((candidate) => (
              <option value={candidate} key={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p>Add an alphabet symbol before creating a transition.</p>
      )}
      <div className="connection-editor__actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={!symbol}>
          Add transition
        </button>
      </div>
    </form>
  );
}
