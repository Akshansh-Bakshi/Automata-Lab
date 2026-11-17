import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaybackControls } from "@/components/conversion/playback-controls";
import { usePlaybackStore } from "@/store/playback-store";

const trace = { steps: [
  { index: 0, type: "INIT" as const, dfaState: "D0", subset: ["q0"], worklist: ["D0"], explanation: "Start" },
  { index: 1, type: "FINISH" as const, dfaStateCount: 1, worklist: [], explanation: "Done" },
] };

afterEach(() => { vi.useRealTimers(); usePlaybackStore.getState().reset(); });

describe("playback controls", () => {
  it("steps, scrubs, rewinds, and stops at the final frame", () => {
    vi.useFakeTimers();
    const { unmount } = render(<PlaybackControls trace={trace} />);
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(usePlaybackStore.getState().position).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(usePlaybackStore.getState().position).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => vi.advanceTimersByTime(1200));
    expect(usePlaybackStore.getState().position).toBe(1);
    act(() => vi.advanceTimersByTime(1200));
    expect(usePlaybackStore.getState().status).toBe("paused");
    fireEvent.change(screen.getByRole("slider", { name: "Conversion step" }), { target: { value: "0" } });
    expect(usePlaybackStore.getState().position).toBe(0);
    fireEvent.change(screen.getByRole("combobox", { name: "Speed" }), { target: { value: "2" } });
    expect(usePlaybackStore.getState().speed).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => vi.advanceTimersByTime(600));
    expect(usePlaybackStore.getState().position).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
