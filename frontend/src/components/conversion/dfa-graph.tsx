"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import { Focus, LayoutDashboard } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
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

export function DfaGraph({ dfa, revision, snapshot, simulationHighlight, readOnly = false }: { dfa: DfaDocument; revision: number; snapshot?: PlaybackSnapshot; simulationHighlight?: { state: string; transition: { from: string; symbol: string; to: string } | null }; readOnly?: boolean }) {
  return (
    <ReactFlowProvider>
      <DfaGraphViewport key={revision} dfa={dfa} snapshot={snapshot} simulationHighlight={simulationHighlight} readOnly={readOnly} />
    </ReactFlowProvider>
  );
}

function DfaGraphViewport({ dfa, snapshot, simulationHighlight, readOnly }: { dfa: DfaDocument; snapshot?: PlaybackSnapshot; simulationHighlight?: { state: string; transition: { from: string; symbol: string; to: string } | null }; readOnly: boolean }) {
  const savedLayout = useAutomatonStore((state) => state.dfaLayout);
  // The complete layout is calculated once for this conversion revision.
  // Subsequent trace steps only filter these positioned nodes.
  const initialNodes = useMemo(() => dfaToNodes(dfa, readOnly ? {} : savedLayout), [dfa, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState<DfaFlowNode>(initialNodes);
  const edges = useMemo(() => dfaToEdges(dfa), [dfa]);
  const shownNodes = useMemo(() => nodes.filter((node) => !snapshot || snapshot.visibleStateIds.includes(node.id)).map((node) => ({
    ...node,
    data: { ...node.data, processing: simulationHighlight?.state === node.id || Boolean(snapshot?.step && "dfaState" in snapshot.step && snapshot.step.dfaState === node.id), newlyDiscovered: snapshot?.newlyDiscoveredState === node.id },
  })), [nodes, snapshot, simulationHighlight]);
  const shownEdges = useMemo(() => {
    if (!snapshot) return edges.map((edge) => ({ ...edge, data: { symbols: edge.data?.symbols ?? [], selfLoop: edge.data?.selfLoop ?? false, reverse: edge.data?.reverse ?? false, active: edge.source === simulationHighlight?.transition?.from && edge.target === simulationHighlight.transition.to && edge.data?.symbols.includes(simulationHighlight.transition.symbol) } }));
    const partial = dfaToEdges({ ...dfa, transitions: snapshot.visibleTransitions });
    return partial.map((edge) => ({ ...edge, data: { symbols: edge.data?.symbols ?? [], selfLoop: edge.data?.selfLoop ?? false, reverse: edge.data?.reverse ?? false, active: edge.source === snapshot.currentTransition?.from && edge.target === snapshot.currentTransition?.to && edge.data?.symbols.includes(snapshot.currentTransition.symbol) } }));
  }, [dfa, edges, snapshot, simulationHighlight]);
  const selectDfaState = useAutomatonStore((state) => state.selectDfaState);
  const setDfaLayoutPosition = useAutomatonStore((state) => state.setDfaLayoutPosition);
  const replaceDfaLayout = useAutomatonStore((state) => state.replaceDfaLayout);
  const { fitView } = useReactFlow<DfaFlowNode, DfaFlowEdge>();
  const nodesInitialized = useNodesInitialized();
  const didFit = useRef(false);

  useEffect(() => {
    if (!nodesInitialized || didFit.current) return;
    didFit.current = true;
    window.requestAnimationFrame(() => void fitView({ padding: 0.35, maxZoom: 0.85, duration: 0 }));
  }, [nodesInitialized, fitView]);

  const autoLayout = () => {
    const layout = createDfaLayout(dfa);
    setNodes((current) => current.map((node) => ({ ...node, position: layout[node.id] })));
    replaceDfaLayout(layout);
    window.requestAnimationFrame(() => void fitView({ padding: 0.35, maxZoom: 0.85, duration: 240 }));
  };

  return (
    <div className="dfa-graph" aria-label="Generated DFA graph">
      <div className="graph-toolbar" aria-label="DFA graph controls">
        <button type="button" onClick={() => void fitView({ padding: 0.35, maxZoom: 0.85, duration: 220 })}>
          <Focus size={15} aria-hidden="true" /> Fit view
        </button>
        {!readOnly ? <button type="button" onClick={autoLayout}>
          <LayoutDashboard size={15} aria-hidden="true" /> Auto layout
        </button> : null}
      </div>
      <ReactFlow<DfaFlowNode, DfaFlowEdge>
        nodes={shownNodes}
        edges={shownEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={readOnly ? undefined : (_, node) => selectDfaState(node.id)}
        onPaneClick={readOnly ? undefined : () => selectDfaState(null)}
        onNodeDragStop={readOnly ? undefined : (_, node) => setDfaLayoutPosition(node.id, node.position)}
        fitView
        fitViewOptions={{ padding: 0.35, maxZoom: 0.85 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={null}
        nodesConnectable={false}
        nodesDraggable={!readOnly}
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
