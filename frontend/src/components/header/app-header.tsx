"use client";

import { Orbit } from "lucide-react";
import type { BackendHealthState } from "@/hooks/use-backend-health";
import type { Example, NfaDocument } from "@/lib/api/types";
import { BackendStatus } from "./backend-status";
import { DocumentActions } from "./document-actions";
import { ModeSwitcher } from "./mode-switcher";
import { ExamplePicker } from "@/components/examples/example-picker";

interface AppHeaderProps {
  health: BackendHealthState;
  retryHealth: () => void;
  examples: Example[];
  examplesStatus: "loading" | "ready" | "empty" | "error";
  examplesError: string | null;
  selectedExampleId: string | null;
  document: NfaDocument | null;
  onSelectExample: (example: Example) => void;
  onRetryExamples: () => void;
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="#workspace">
        <span className="brand__mark" aria-hidden="true">
          <Orbit size={21} strokeWidth={1.8} />
        </span>
        <span className="brand__wordmark">
          Automata<span>Lab</span>
        </span>
        <span className="brand__phase">v1.0</span>
      </a>
      <ModeSwitcher />
      <div className="app-header__actions">
        <ExamplePicker
          examples={props.examples}
          status={props.examplesStatus}
          error={props.examplesError}
          selectedId={props.selectedExampleId}
          onSelect={props.onSelectExample}
          onRetry={props.onRetryExamples}
        />
        <DocumentActions document={props.document} />
        <BackendStatus {...props.health} onRetry={props.retryHealth} />
      </div>
    </header>
  );
}

