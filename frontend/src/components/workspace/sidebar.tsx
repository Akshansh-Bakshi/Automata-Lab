"use client";

import { Braces, CircleDot, Clock3, ListTree, Route, TextCursorInput } from "lucide-react";
import type { NfaDocument } from "@/lib/api/types";
import type { WorkspaceMode } from "@/store/workspace-store";
import { PanelSection } from "./panel-section";

interface SidebarProps {
  mode: WorkspaceMode;
  document: NfaDocument | null;
}

export function Sidebar({ mode, document }: SidebarProps) {
  return (
    <aside className="workspace-sidebar" aria-label={`${capitalize(mode)} workspace panel`}>
      <div className="sidebar-heading">
        <p className="eyebrow">{mode} mode</p>
        <h2>{modeTitles[mode]}</h2>
        <p>{modeDescriptions[mode]}</p>
      </div>
      <div className="sidebar-sections">
        {mode === "build" ? <BuildSections document={document} /> : null}
        {mode === "convert" ? <ConvertSections document={document} /> : null}
        {mode === "test" ? <TestSections document={document} /> : null}
      </div>
      <div className="phase-note">
        <span>Phase 4</span>
        Structure is ready; editing and execution controls arrive in later phases.
      </div>
    </aside>
  );
}

function BuildSections({ document }: { document: NfaDocument | null }) {
  return (
    <>
      <PanelSection eyebrow="Document" title="NFA configuration">
        <Readout label="Name" value={document?.name || "No document loaded"} />
        <Readout label="Initial state" value={document?.initialState ?? "—"} mono />
      </PanelSection>
      <PanelSection eyebrow="Definition" title="States & alphabet">
        <div className="mini-stat-grid">
          <MiniStat icon={CircleDot} label="States" value={document?.states.length ?? 0} />
          <MiniStat icon={Braces} label="Symbols" value={document?.alphabet.length ?? 0} />
        </div>
      </PanelSection>
      <PanelSection eyebrow="Relation" title="Transitions">
        <MiniStat icon={Route} label="Explicit moves" value={document?.transitions.length ?? 0} wide />
        <p className="panel-hint">Missing pairs are interpreted as the empty set.</p>
      </PanelSection>
    </>
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

function Readout({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="readout">
      <span>{label}</span>
      <strong className={mono ? "mono" : undefined}>{value}</strong>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  wide,
}: {
  icon: typeof CircleDot;
  label: string;
  value: number;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "mini-stat mini-stat--wide" : "mini-stat"}>
      <Icon size={15} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
  build: "Review the NFA document that future editing controls will modify.",
  convert: "A structured home for explanations, subsets, and the BFS worklist.",
  test: "A focused surface for input traces and NFA/DFA agreement.",
} satisfies Record<WorkspaceMode, string>;

