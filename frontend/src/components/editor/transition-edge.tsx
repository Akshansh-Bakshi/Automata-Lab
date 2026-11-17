"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { TransitionFlowEdge } from "@/lib/editor/graph-model";

export function TransitionEdge(props: EdgeProps<TransitionFlowEdge>) {
  const data = props.data;
  const [path, labelX, labelY] = data?.selfLoop
    ? selfLoopPath(props.sourceX, props.sourceY)
    : getBezierPath({
        sourceX: props.sourceX,
        sourceY: props.sourceY,
        sourcePosition: props.sourcePosition,
        targetX: props.targetX,
        targetY: props.targetY,
        targetPosition: props.targetPosition,
        curvature: data?.reverse ? 0.42 : 0.2,
      });

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        className={props.selected ? "automaton-edge automaton-edge--selected" : data?.active ? "automaton-edge automaton-edge--active" : "automaton-edge"}
      />
      <EdgeLabelRenderer>
        <span
          className="automaton-edge__label nodrag nopan"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {data?.symbols.join(", ")}
        </span>
      </EdgeLabelRenderer>
    </>
  );
}

function selfLoopPath(x: number, y: number): [string, number, number, number, number] {
  const top = y - 68;
  return [
    `M ${x - 12} ${y} C ${x - 58} ${top}, ${x + 12} ${top}, ${x + 12} ${y}`,
    x - 22,
    top + 5,
    0,
    0,
  ];
}
