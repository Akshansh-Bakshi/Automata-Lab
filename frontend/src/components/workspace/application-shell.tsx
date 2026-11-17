"use client";

import { AppHeader } from "@/components/header/app-header";
import { useBackendHealth } from "@/hooks/use-backend-health";
import { useExamples } from "@/hooks/use-examples";
import { useNfaValidation } from "@/hooks/use-nfa-validation";
import { cancelActiveConversion } from "@/lib/conversion/run-conversion";
import type { Example } from "@/lib/api/types";
import { useAutomatonStore } from "@/store/automaton-store";
import { usePlaybackStore } from "@/store/playback-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { BottomDock } from "./bottom-dock";
import { Sidebar } from "./sidebar";
import { WorkspaceCanvas } from "./workspace-canvas";
import { useEffect } from "react";

export function ApplicationShell() {
  const health = useBackendHealth();
  const examples = useExamples();
  const validation = useNfaValidation();
  const mode = useWorkspaceStore((state) => state.activeMode);
  const setMode = useWorkspaceStore((state) => state.setActiveMode);
  const document = useAutomatonStore((state) => state.document);
  const selectedExampleId = useAutomatonStore((state) => state.selectedExampleId);
  const loadExample = useAutomatonStore((state) => state.loadExample);
  const resetPlayback = usePlaybackStore((state) => state.reset);

  useEffect(
    () =>
      useAutomatonStore.subscribe((state, previous) => {
        if (state.documentRevision !== previous.documentRevision) {
          cancelActiveConversion();
          resetPlayback();
        }
      }),
    [resetPlayback],
  );

  const selectExample = (example: Example) => {
    loadExample(example);
    resetPlayback();
    setMode("build");
  };

  return (
    <div className="application-shell">
      <AppHeader
        health={health}
        retryHealth={health.retry}
        examples={examples.examples}
        examplesStatus={examples.status}
        examplesError={examples.error}
        selectedExampleId={selectedExampleId}
        document={document}
        onSelectExample={selectExample}
        onRetryExamples={examples.retry}
      />
      <div className="workspace-layout">
        <Sidebar mode={mode} document={document} validation={validation} />
        <div className="workspace-stage">
          <WorkspaceCanvas mode={mode} document={document} />
          <BottomDock mode={mode} document={document} />
        </div>
      </div>
    </div>
  );
}

