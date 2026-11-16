import { describe, expect, it } from "vitest";
import type { ConversionResponse } from "@/lib/api/types";
import { useAutomatonStore } from "@/store/automaton-store";
import { usePlaybackStore } from "@/store/playback-store";
import { sampleExample, sampleNfa } from "@/test/fixtures";

describe("client stores", () => {
  it("loads examples and invalidates stale conversion results when the document changes", () => {
    const store = useAutomatonStore.getState();
    store.loadExample(sampleExample);
    const conversion = {
      dfa: {
        acceptingStates: [],
        alphabet: ["0", "1"],
        initialState: "D0",
        states: [],
        stats: { dfaStates: 0, dfaTransitions: 0, hasDeadState: false, nfaStates: 3 },
        transitions: [],
      },
      trace: { steps: [] },
    } satisfies ConversionResponse;
    useAutomatonStore.getState().setConversion(conversion);

    expect(useAutomatonStore.getState().isConversionFresh()).toBe(true);
    const firstRevision = useAutomatonStore.getState().documentRevision;

    useAutomatonStore.getState().replaceDocument({ ...sampleNfa, name: "Changed" });

    const changed = useAutomatonStore.getState();
    expect(changed.documentRevision).toBe(firstRevision + 1);
    expect(changed.conversion).toBeNull();
    expect(changed.conversionStatus).toBe("idle");
    expect(changed.isConversionFresh()).toBe(false);
  });

  it("keeps playback state independent and resets it explicitly", () => {
    usePlaybackStore.getState().setPosition(4);
    usePlaybackStore.getState().setStatus("playing");
    usePlaybackStore.getState().setSpeed(2);

    useAutomatonStore.getState().loadExample(sampleExample);
    expect(usePlaybackStore.getState().position).toBe(4);

    usePlaybackStore.getState().reset();
    expect(usePlaybackStore.getState()).toMatchObject({ position: 0, status: "idle", speed: 1 });
  });
});

