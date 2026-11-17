"use client";

import { useEffect } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import type { ConversionTrace } from "@/lib/api/types";
import { usePlaybackStore } from "@/store/playback-store";

export function PlaybackControls({ trace }: { trace: ConversionTrace }) {
  const position = usePlaybackStore((state) => state.position);
  const status = usePlaybackStore((state) => state.status);
  const speed = usePlaybackStore((state) => state.speed);
  const setPosition = usePlaybackStore((state) => state.setPosition);
  const setStatus = usePlaybackStore((state) => state.setStatus);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const last = Math.max(0, trace.steps.length - 1);
  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => {
      const current = usePlaybackStore.getState();
      if (current.status !== "playing") return;
      if (current.position >= last) current.setStatus("paused");
      else {
        current.setPosition(current.position + 1);
        if (current.position + 1 >= last) current.setStatus("paused");
      }
    }, 1200 / speed);
    return () => window.clearInterval(timer);
  }, [last, speed, status]);
  useEffect(() => () => usePlaybackStore.getState().setStatus("paused"), []);
  const go = (value: number) => setPosition(Math.max(0, Math.min(last, value)));
  return (
    <section className="playback-controls" aria-label="Conversion playback controls">
      <div className="playback-buttons">
        <button type="button" aria-label="Restart" onClick={() => { setStatus("paused"); go(0); }}><RotateCcw size={15} /></button>
        <button type="button" aria-label="First step" onClick={() => { setStatus("paused"); go(0); }}><SkipBack size={15} /></button>
        <button type="button" aria-label="Previous step" onClick={() => { setStatus("paused"); go(position - 1); }}>Previous</button>
        <button type="button" aria-label={status === "playing" ? "Pause" : "Play"} onClick={() => setStatus(status === "playing" ? "paused" : position >= last ? "paused" : "playing")}>
          {status === "playing" ? <Pause size={15} /> : <Play size={15} />}{status === "playing" ? "Pause" : "Play"}
        </button>
        <button type="button" aria-label="Next step" onClick={() => { setStatus("paused"); go(position + 1); }}>Next</button>
        <button type="button" aria-label="Final step" onClick={() => { setStatus("paused"); go(last); }}><SkipForward size={15} /></button>
      </div>
      <label className="playback-timeline">Step {position + 1} / {trace.steps.length}
        <input type="range" min={0} max={last} value={position} onChange={(event) => { setStatus("paused"); go(Number(event.target.value)); }} aria-label="Conversion step" />
      </label>
      <label className="playback-speed">Speed
        <select value={speed} onChange={(event) => setSpeed(Number(event.target.value) as 0.5 | 1 | 2 | 4)}>
          {[0.5, 1, 2, 4].map((value) => <option key={value} value={value}>{value}×</option>)}
        </select>
      </label>
    </section>
  );
}
