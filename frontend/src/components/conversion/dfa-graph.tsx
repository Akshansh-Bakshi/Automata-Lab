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

export function DfaGraph({ dfa, revision }: { dfa: DfaDocument; revision: number }) {
  return (
    <ReactFlowProvider>
      <DfaGraphViewport key={revision} dfa={dfa} />
    </ReactFlowProvider>
  );
}

function DfaGraphViewport({ dfa }: { dfa: DfaDocument }) {
  const savedLayout = useAutomatonStore((state) => state.dfaLayout);
  const [nodes, setNodes, onNodesChange] = useNodesState<DfaFlowNode>(dfaToNodes(dfa, savedLayout));
  const edges = useMemo(() => dfaToEdges(dfa), [dfa]);
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
        nodes={nodes}
        edges={edges}
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
