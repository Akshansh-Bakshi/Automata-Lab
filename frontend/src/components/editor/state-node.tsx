"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import type { StateFlowNode } from "@/lib/editor/graph-model";

export function StateNode({ data, selected }: NodeProps<StateFlowNode>) {
  return (
    <div
      className="automaton-state-node"
      data-accepting={data.accepting}
      data-initial={data.initial}
      data-selected={selected}
      data-active={Boolean(data.active)}
      aria-label={`${data.label}${data.initial ? ", initial" : ""}${
        data.accepting ? ", accepting" : ""
      } state`}
    >
      {data.initial ? (
        <span className="state-node__initial" aria-hidden="true">
          <ArrowRight size={23} strokeWidth={1.8} />
        </span>
      ) : null}
      <Handle type="target" position={Position.Left} id="target-left" aria-label="Transition target" />
      <span className="state-node__ring">
        <span className="state-node__label">{data.label}</span>
      </span>
      <Handle type="source" position={Position.Right} id="source-right" aria-label="Start transition" />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        aria-label="Start self-loop"
        style={{ left: "66%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        aria-label="Self-loop target"
        style={{ left: "34%" }}
      />
    </div>
  );
}
