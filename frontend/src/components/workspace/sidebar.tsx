"use client";

import { Braces, CircleDot, Clock3, ListTree, TextCursorInput } from "lucide-react";
import { BuildInspector } from "@/components/editor/build-inspector";
import type { NfaValidationState } from "@/hooks/use-nfa-validation";
import type { NfaDocument } from "@/lib/api/types";
import type { WorkspaceMode } from "@/store/workspace-store";
import { PanelSection } from "./panel-section";

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
        {mode === "convert" ? <ConvertSections document={document} /> : null}
        {mode === "test" ? <TestSections document={document} /> : null}
      </div>
      <div className="phase-note">
        <span>Phase 5</span>
        The NFA editor is live. DFA conversion and string simulation remain intentionally deferred.
      </div>
    </aside>
  );
}

function ConvertSections({ document }: { document: NfaDocument | null }) {
  return (
    <>
      <PanelSection eyebrow="Algorithm" title="Explanation">
        <PlaceholderLine
          icon={ListTree}
          text={document ? "This NFA is ready for the future conversion workflow." : "Load an NFA to prepare conversion."}
        />
      </PanelSection>
      <PanelSection eyebrow="Current state" title="Subset information">
        <PlaceholderLine icon={Braces} text="No subset is being processed." />
      </PanelSection>
      <PanelSection eyebrow="Breadth-first queue" title="Worklist">
        <PlaceholderLine icon={Clock3} text="The worklist appears after a conversion begins." />
      </PanelSection>
    </>
  );
}

function TestSections({ document }: { document: NfaDocument | null }) {
  return (
    <>
      <PanelSection eyebrow="Input" title="Input string">
        <PlaceholderLine
          icon={TextCursorInput}
          text={document ? "String entry arrives with the simulation workflow." : "Load an NFA before testing strings."}
        />
      </PanelSection>
      <PanelSection eyebrow="Trace" title="Execution history">
        <PlaceholderLine icon={Clock3} text="No simulation has been run." />
      </PanelSection>
      <PanelSection eyebrow="Agreement" title="Results">
        <PlaceholderLine icon={CircleDot} text="NFA and DFA verdicts will appear here." />
      </PanelSection>
    </>
  );
}

function PlaceholderLine({ icon: Icon, text }: { icon: typeof CircleDot; text: string }) {
  return (
    <div className="placeholder-line">
      <Icon size={16} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const modeTitles = {
  build: "Define the machine",
  convert: "Trace subset construction",
  test: "Compare language behavior",
} satisfies Record<WorkspaceMode, string>;

const modeDescriptions = {
  build: "Create states, alphabet symbols, and nondeterministic transitions.",
  convert: "A structured home for explanations, subsets, and the BFS worklist.",
  test: "A focused surface for input traces and NFA/DFA agreement.",
} satisfies Record<WorkspaceMode, string>;
