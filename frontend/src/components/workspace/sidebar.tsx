"use client";

import { BuildInspector } from "@/components/editor/build-inspector";
import { ConvertInspector } from "@/components/conversion/convert-inspector";
import { TestInspector } from "@/components/simulation/test-inspector";
import type { NfaValidationState } from "@/hooks/use-nfa-validation";
import type { NfaDocument } from "@/lib/api/types";
import type { WorkspaceMode } from "@/store/workspace-store";

interface SidebarProps {
  mode: WorkspaceMode;
  document: NfaDocument | null;
  validation: NfaValidationState;
}

export function Sidebar({ mode, document, validation }: SidebarProps) {
  return (
    <aside className="workspace-sidebar" aria-label={`${capitalize(mode)} workspace panel`}>
      <div className="sidebar-heading">
        <p className="eyebrow">{mode} mode</p>
        <h2>{modeTitles[mode]}</h2>
        <p>{modeDescriptions[mode]}</p>
      </div>
      <div className="sidebar-sections">
        {mode === "build" ? <BuildInspector document={document} validation={validation} /> : null}
        {mode === "convert" ? <ConvertInspector document={document} validation={validation} /> : null}
        {mode === "test" ? <TestInspector document={document} validation={validation} /> : null}
      </div>
      <div className="phase-note">
        <span>Phase 8</span>
        Build, conversion playback, and synchronized string simulation are available.
      </div>
    </aside>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const modeTitles = {
  build: "Define the machine",
  convert: "Generate the DFA",
  test: "Compare language behavior",
} satisfies Record<WorkspaceMode, string>;

const modeDescriptions = {
  build: "Create states, alphabet symbols, and nondeterministic transitions.",
  convert: "Run backend subset construction and inspect every generated subset.",
  test: "A focused surface for input traces and NFA/DFA agreement.",
} satisfies Record<WorkspaceMode, string>;
