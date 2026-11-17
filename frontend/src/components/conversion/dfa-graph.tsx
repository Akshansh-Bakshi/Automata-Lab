"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { Focus, LayoutDashboard } from "lucide-react";
import { useMemo } from "react";
import type { DfaDocument } from "@/lib/api/types";
import type { PlaybackSnapshot } from "@/lib/conversion/playback-model";
import {
  createDfaLayout,
  dfaToEdges,
  dfaToNodes,
  type DfaFlowEdge,
  type DfaFlowNode,
} from "@/lib/conversion/dfa-graph-model";
import { useAutomatonStore } from "@/store/automaton-store";
import { TransitionEdge } from "@/components/editor/transition-edge";
import { DfaStateNode } from "./dfa-state-node";

const nodeTypes = { dfaState: DfaStateNode };
const edgeTypes = { transition: TransitionEdge };

export function DfaGraph({ dfa, revision, snapshot }: { dfa: DfaDocument; revision: number; snapshot?: PlaybackSnapshot }) {
  return (
    <ReactFlowProvider>
      <DfaGraphViewport key={revision} dfa={dfa} snapshot={snapshot} />
    </ReactFlowProvider>
  );
}

function DfaGraphViewport({ dfa, snapshot }: { dfa: DfaDocument; snapshot?: PlaybackSnapshot }) {
  const savedLayout = useAutomatonStore((state) => state.dfaLayout);
  // The complete layout is calculated once for this conversion revision.
  // Subsequent trace steps only filter these positioned nodes.
  const initialNodes = useMemo(() => dfaToNodes(dfa, savedLayout), [dfa]); // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState<DfaFlowNode>(initialNodes);
  const edges = useMemo(() => dfaToEdges(dfa), [dfa]);
  const shownNodes = useMemo(() => nodes.filter((node) => !snapshot || snapshot.visibleStateIds.includes(node.id)).map((node) => ({
    ...node,
    data: { ...node.data, processing: snapshot?.step && "dfaState" in snapshot.step && snapshot.step.dfaState === node.id, newlyDiscovered: snapshot?.newlyDiscoveredState === node.id },
  })), [nodes, snapshot]);
  const shownEdges = useMemo(() => {
    if (!snapshot) return edges;
    const partial = dfaToEdges({ ...dfa, transitions: snapshot.visibleTransitions });
    return partial.map((edge) => ({ ...edge, data: { symbols: edge.data?.symbols ?? [], selfLoop: edge.data?.selfLoop ?? false, reverse: edge.data?.reverse ?? false, active: edge.source === snapshot.currentTransition?.from && edge.target === snapshot.currentTransition?.to && edge.data?.symbols.includes(snapshot.currentTransition.symbol) } }));
  }, [dfa, edges, snapshot]);
  const selectDfaState = useAutomatonStore((state) => state.selectDfaState);
  const setDfaLayoutPosition = useAutomatonStore((state) => state.setDfaLayoutPosition);
  const replaceDfaLayout = useAutomatonStore((state) => state.replaceDfaLayout);
  const { fitView } = useReactFlow<DfaFlowNode, DfaFlowEdge>();

  const autoLayout = () => {
    const layout = createDfaLayout(dfa);
    setNodes((current) => current.map((node) => ({ ...node, position: layout[node.id] })));
    replaceDfaLayout(layout);
    window.requestAnimationFrame(() => void fitView({ padding: 0.22, duration: 240 }));
  };

  return (
    <div className="dfa-graph" aria-label="Generated DFA graph">
      <div className="graph-toolbar" aria-label="DFA graph controls">
        <button type="button" onClick={() => void fitView({ padding: 0.22, duration: 220 })}>
          <Focus size={15} aria-hidden="true" /> Fit view
        </button>
        <button type="button" onClick={autoLayout}>
          <LayoutDashboard size={15} aria-hidden="true" /> Auto layout
        </button>
      </div>
      <ReactFlow<DfaFlowNode, DfaFlowEdge>
        nodes={shownNodes}
        edges={shownEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => selectDfaState(node.id)}
        onPaneClick={() => selectDfaState(null)}
        onNodeDragStop={(_, node) => setDfaLayoutPosition(node.id, node.position)}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={null}
        nodesConnectable={false}
        nodesDraggable
        elementsSelectable
        panOnDrag
        zoomOnScroll
        aria-label="Generated DFA state and transition canvas"
      >
        <Background gap={22} size={1} color="#c9d0dc" />
        <Controls showInteractive={false} />
        {dfa.states.length > 8 ? (
          <MiniMap pannable zoomable nodeColor="#dff0e7" maskColor="rgb(247 249 252 / 72%)" />
        ) : null}
      </ReactFlow>
    </div>
  );
}
