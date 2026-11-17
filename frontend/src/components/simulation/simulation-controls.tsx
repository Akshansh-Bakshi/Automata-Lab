"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import type { SimulationResponse } from "@/lib/api/types";

export function SimulationControls({ result }: { result: SimulationResponse }) {
  const position = useSimulationStore((state) => state.position);
  const playing = useSimulationStore((state) => state.playing);
  const speed = useSimulationStore((state) => state.speed);
  const setPosition = useSimulationStore((state) => state.setPosition);
  const setPlaying = useSimulationStore((state) => state.setPlaying);
  const setSpeed = useSimulationStore((state) => state.setSpeed);
  const last = result.simulation.nfa.steps.length - 1;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const state = useSimulationStore.getState();
      if (!state.playing || state.result !== result) return;
      const next = Math.min(last, state.position + 1);
      state.setPosition(next);
      if (next === last) state.setPlaying(false);
    }, 1200 / speed);
    return () => window.clearInterval(timer);
  }, [last, playing, result, speed]);
  useEffect(() => () => useSimulationStore.getState().setPlaying(false), []);
  const go = (next: number) => { setPlaying(false); setPosition(Math.max(0, Math.min(last, next))); };
  return <div className="simulation-controls" aria-label="Simulation playback controls">
    <div className="playback-buttons">
      <button type="button" onClick={() => go(0)}>Restart</button>
      <button type="button" onClick={() => go(0)}>First</button>
      <button type="button" onClick={() => go(position - 1)}>Previous</button>
      <button type="button" onClick={() => setPlaying(!playing && position < last)}>{playing ? "Pause" : "Play"}</button>
      <button type="button" onClick={() => go(position + 1)}>Next</button>
      <button type="button" onClick={() => go(last)}>Last</button>
    </div>
    <label className="playback-timeline">{position} of {last} symbols processed
      <input type="range" min={0} max={last} value={position} aria-label="Simulation position" onChange={(event) => go(Number(event.target.value))} />
    </label>
    <label className="playback-speed">Speed
      <select aria-label="Simulation speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value) as 0.5 | 1 | 2 | 4)}>
        {[0.5, 1, 2, 4].map((value) => <option key={value} value={value}>{value}×</option>)}
      </select>
    </label>
    <div className="simulation-timeline" aria-label="Execution positions">
      {result.simulation.nfa.steps.map((step, index) => <button type="button" key={index} data-active={position === index} onClick={() => go(index)} aria-label={`Position ${index}: ${step.activeStates.length ? step.activeStates.join(", ") : "empty set"}`}>
        <strong>{index}</strong><span>{step.symbol ?? "ε"}</span><small>{step.activeStates.length ? `{${step.activeStates.join(", ")}}` : "∅"} · {result.simulation.dfa.steps[index].state}</small>
      </button>)}
    </div>
  </div>;
}
