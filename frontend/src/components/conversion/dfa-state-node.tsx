"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import type { DfaFlowNode } from "@/lib/conversion/dfa-graph-model";

export function DfaStateNode({ data, selected }: NodeProps<DfaFlowNode>) {
  const subsetText = data.dead ? "∅" : `{${data.subset.join(", ")}}`;
  return (
    <div
      className="dfa-state-node"
      data-accepting={data.accepting}
      data-dead={data.dead}
      data-initial={data.initial}
      data-selected={selected}
      title={`${data.id} = ${subsetText}`}
      aria-label={`${data.id}, ${data.dead ? "empty subset dead state" : `subset ${data.subset.join(", ")}`}${
        data.initial ? ", initial" : ""
      }${data.accepting ? ", accepting" : ""}`}
    >
      {data.initial ? (
        <span className="state-node__initial" aria-hidden="true">
          <ArrowRight size={23} strokeWidth={1.8} />
        </span>
      ) : null}
      <Handle type="target" position={Position.Left} id="target-left" />
      <span className="dfa-state-node__ring">
        <strong>{data.id}</strong>
        <small>{subsetText}</small>
      </span>
      <Handle type="source" position={Position.Right} id="source-right" />
      <Handle type="source" position={Position.Top} id="source-top" style={{ left: "66%" }} />
      <Handle type="target" position={Position.Top} id="target-top" style={{ left: "34%" }} />
    </div>
  );
}
