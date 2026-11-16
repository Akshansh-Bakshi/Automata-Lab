import type { ApiIssue, NfaDocument } from "@/lib/api/types";

export const MAX_NFA_STATES = 20;
export const MAX_ALPHABET_SIZE = 10;
export const MAX_STATE_ID_LENGTH = 16;
export const STATE_ID_PATTERN = new RegExp(`^[A-Za-z0-9_]{1,${MAX_STATE_ID_LENGTH}}$`);

export type EditorReadiness =
  | { status: "incomplete"; issues: ApiIssue[] }
  | { status: "ready"; issues: [] };

export class ImportDocumentError extends Error {
  constructor(readonly issues: ApiIssue[]) {
    super(issues[0]?.message ?? "The selected file is not a valid NFA document.");
    this.name = "ImportDocumentError";
  }
}

export function createNewNfa(): NfaDocument {
  return withInitializedLayout({
    schemaVersion: 1,
    name: "Untitled NFA",
    alphabet: [],
    states: ["q0"],
    initialState: "q0",
    acceptingStates: [],
    transitions: [],
  });
}

export function defaultPosition(index: number) {
  const columns = 4;
  return { x: 90 + (index % columns) * 190, y: 90 + Math.floor(index / columns) * 145 };
}

export function withInitializedLayout(document: NfaDocument): NfaDocument {
  const existing = document.layout ?? {};
  const layout = Object.fromEntries(
    document.states.map((state, index) => [state, existing[state] ?? defaultPosition(index)]),
  );
  return { ...structuredClone(document), layout };
}

export function getEditorReadiness(document: NfaDocument): EditorReadiness {
  const issues: ApiIssue[] = [];
  if (document.states.length === 0) {
    issues.push(issue("EMPTY_STATE_SET", "states", "Add at least one state."));
  }
  if (document.alphabet.length === 0) {
    issues.push(issue("EMPTY_ALPHABET", "alphabet", "Add at least one alphabet symbol."));
  }
  if (!document.states.includes(document.initialState)) {
    issues.push(
      issue("INITIAL_STATE_REQUIRED", "initialState", "Choose an initial state before validation."),
    );
  }
  return issues.length ? { status: "incomplete", issues } : { status: "ready", issues: [] };
}

export function canonicalizeNfa(document: NfaDocument): NfaDocument {
  const stateOrder = new Map(document.states.map((state, index) => [state, index]));
  const symbolOrder = new Map(document.alphabet.map((symbol, index) => [symbol, index]));
  const compareStates = (left: string, right: string) =>
    (stateOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (stateOrder.get(right) ?? Number.MAX_SAFE_INTEGER) || left.localeCompare(right);
  const transitions = document.transitions
    .filter((transition) => transition.to.length > 0)
    .map((transition) => ({ ...transition, to: [...new Set(transition.to)].sort(compareStates) }))
    .sort(
      (left, right) =>
        compareStates(left.from, right.from) ||
        (symbolOrder.get(left.symbol) ?? Number.MAX_SAFE_INTEGER) -
          (symbolOrder.get(right.symbol) ?? Number.MAX_SAFE_INTEGER) ||
        left.symbol.localeCompare(right.symbol),
    );
  const layout: Record<string, { x: number; y: number }> = {};
  if (document.layout) {
    for (const state of document.states) {
      const position = document.layout[state];
      if (position) layout[state] = position;
    }
  }
  return {
    schemaVersion: 1,
    ...(document.name == null ? {} : { name: document.name }),
    alphabet: [...document.alphabet],
    states: [...document.states],
    initialState: document.initialState,
    acceptingStates: [...new Set(document.acceptingStates)].sort(compareStates),
    transitions,
    ...(Object.keys(layout).length ? { layout } : {}),
  };
}

export function serializeNfa(document: NfaDocument): string {
  return `${JSON.stringify(canonicalizeNfa(document), null, 2)}\n`;
}

export function parseNfaJson(source: string): NfaDocument {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new ImportDocumentError([
      issue("MALFORMED_JSON", "document", "The selected file does not contain valid JSON."),
    ]);
  }
  const issues = inspectNfaShape(value);
  if (issues.length) throw new ImportDocumentError(issues);
  return canonicalizeNfa(value as NfaDocument);
}

function inspectNfaShape(value: unknown): ApiIssue[] {
  if (!isRecord(value)) {
    return [issue("SCHEMA_VIOLATION", "document", "The document must be a JSON object.")];
  }
  const issues: ApiIssue[] = [];
  const allowed = new Set([
    "schemaVersion",
    "name",
    "alphabet",
    "states",
    "initialState",
    "acceptingStates",
    "transitions",
    "layout",
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(issue("SCHEMA_VIOLATION", key, `Unknown field '${key}'.`));
  }
  if (value.schemaVersion !== 1) {
    issues.push(issue("SCHEMA_VIOLATION", "schemaVersion", "schemaVersion must be 1."));
  }
  if (value.name !== undefined && value.name !== null && typeof value.name !== "string") {
    issues.push(issue("SCHEMA_VIOLATION", "name", "name must be a string or null."));
  }
  inspectStringArray(value.states, "states", issues);
  inspectStringArray(value.alphabet, "alphabet", issues);
  inspectStringArray(value.acceptingStates, "acceptingStates", issues);
  if (typeof value.initialState !== "string") {
    issues.push(issue("SCHEMA_VIOLATION", "initialState", "initialState must be a string."));
  }
  if (!Array.isArray(value.transitions)) {
    issues.push(issue("SCHEMA_VIOLATION", "transitions", "transitions must be an array."));
  } else {
    value.transitions.forEach((transition, index) => inspectTransition(transition, index, issues));
  }
  if (value.layout !== undefined && value.layout !== null) inspectLayout(value.layout, issues);
  return issues;
}

function inspectStringArray(value: unknown, path: string, issues: ApiIssue[]) {
  if (!Array.isArray(value)) {
    issues.push(issue("SCHEMA_VIOLATION", path, `${path} must be an array.`));
    return;
  }
  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      issues.push(issue("SCHEMA_VIOLATION", `${path}[${index}]`, "Expected a string."));
    }
  });
}

function inspectTransition(value: unknown, index: number, issues: ApiIssue[]) {
  const path = `transitions[${index}]`;
  if (!isRecord(value)) {
    issues.push(issue("SCHEMA_VIOLATION", path, "Each transition must be an object."));
    return;
  }
  for (const key of Object.keys(value)) {
    if (!["from", "symbol", "to"].includes(key)) {
      issues.push(issue("SCHEMA_VIOLATION", `${path}.${key}`, `Unknown field '${key}'.`));
    }
  }
  if (typeof value.from !== "string") {
    issues.push(issue("SCHEMA_VIOLATION", `${path}.from`, "from must be a string."));
  }
  if (typeof value.symbol !== "string") {
    issues.push(issue("SCHEMA_VIOLATION", `${path}.symbol`, "symbol must be a string."));
  }
  inspectStringArray(value.to, `${path}.to`, issues);
}

function inspectLayout(value: unknown, issues: ApiIssue[]) {
  if (!isRecord(value)) {
    issues.push(issue("SCHEMA_VIOLATION", "layout", "layout must be an object or null."));
    return;
  }
  for (const [state, position] of Object.entries(value)) {
    if (
      !isRecord(position) ||
      Object.keys(position).some((key) => !["x", "y"].includes(key)) ||
      typeof position.x !== "number" ||
      !Number.isFinite(position.x) ||
      typeof position.y !== "number" ||
      !Number.isFinite(position.y)
    ) {
      issues.push(
        issue("SCHEMA_VIOLATION", `layout.${state}`, "Layout positions require finite x and y numbers."),
      );
    }
  }
}

function issue(code: string, path: string, message: string): ApiIssue {
  return { code, path, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
