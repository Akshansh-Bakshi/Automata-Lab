# Frontend architecture

Phase 7 adds trace-driven subset-construction playback to the Phase 6 conversion workspace.
String simulation remains a future phase.

## Runtime structure

- `src/app/page.tsx` remains a synchronous App Router page and renders the client-side
  `ApplicationShell` boundary.
- `src/components/header/` owns branding, responsive mode navigation, backend status, examples,
  and validated import/export.
- `src/components/workspace/` owns the contextual sidebar, editor canvas, and expandable bottom
  dock.
- `src/components/editor/` owns the Build inspector, XYFlow graph, custom state nodes and
  transition edges, validation status, and editable transition table.
- `src/components/conversion/` owns the Convert inspector, dual-graph workspace, DFA graph,
  custom DFA nodes, subset mapping, statistics, and deterministic transition table.
- `src/components/ui/` contains reusable loading, error, and empty-state primitives.
- `src/hooks/` contains abortable health/example queries and debounced authoritative NFA
  validation.

The visual system uses CSS custom properties in `src/app/globals.css` for color, type, spacing,
radii, borders, elevation, and semantic states. Light mode remains the supported theme. The editor
stacks below 980 px and preserves keyboard-accessible forms and table editing at every breakpoint.

## Client state and synchronization

Zustand remains split by change frequency and responsibility:

- `workspace-store.ts` — active Build/Convert/Test mode and bottom-dock preference.
- `automaton-store.ts` — active NFA document, editor selection/notices, atomic state/alphabet/
  transition mutations, semantic and layout revisions, conversion result, and conversion
  freshness.
- `playback-store.ts` — timeline position, playing/paused status, speed, and full/step view.

The API-shaped `NfaDocument` is the only mathematical source of truth. XYFlow nodes and visual
edges are derived by `src/lib/editor/graph-model.ts`; the transition table reads and writes the
same transition records. There is no parallel graph model.

Semantic edits increment `documentRevision`, clear stale conversion state, and reset future
playback state. Dragging and automatic layout update only `layoutRevision`, so cosmetic movement
does not invalidate a conversion or trigger backend validation. State rename and delete operations
update references and layout atomically. Deleting the initial state deliberately clears
`initialState` and reports the incomplete state instead of silently choosing a replacement.

Conversion requests capture both an incrementing request ID and `documentRevision`. Only the
matching active request may commit a result. Semantic edits increment the request ID, cancel the
active HTTP request, clear result data, and mark the conversion stale. Late successes and errors
are discarded. Cosmetic NFA and DFA layout changes do not change `documentRevision`.

## Graph and table model

- Custom XYFlow state nodes display a start arrow and accepting double ring.
- API transitions remain unique by `(from, symbol)` with set-valued `to` arrays.
- Visual edges are grouped by ordered state pair and display all applicable symbols with a stable
  encoded edge ID.
- Self-loops use a custom path; opposite-direction edges use curved Bezier paths.
- Dagre calculates optional left-to-right layout. Positions are saved in API `layout` metadata.
- Graph connections, the inspector form, and table cells all call the same
  `setTransitionTargets` store action.

## Editing and validation

Straightforward constraints are enforced locally: state IDs match `[A-Za-z0-9_]{1,16}`, the
alphabet contains at most ten unique single non-whitespace characters, and the document contains
at most twenty states. The backend `/api/nfa/validate` endpoint remains authoritative.

`use-nfa-validation.ts` debounces semantic revisions and exposes distinct `incomplete`,
`validating`, `valid`, `invalid`, and `unavailable` states. Incomplete documents are never sent to
the backend, and layout-only changes do not make validation requests.

JSON import first checks the exact public structure, then calls backend validation. The existing
document is replaced only after success. Export uses `canonicalizeNfa` and `serializeNfa` for
stable transition, target, accepting-state, and layout ordering while retaining API metadata.

## Generated API contract

`backend/scripts/export_openapi.py` exports the actual FastAPI OpenAPI document. From
`frontend/`, run:

```powershell
npm run generate:api-types
```

This updates `openapi.json` and `src/lib/api/generated.ts` with `openapi-typescript`. Do not edit
the generated TypeScript file manually. `src/lib/api/types.ts` only defines convenient aliases
to generated schemas.

`src/lib/api/client.ts` provides typed functions for health, examples, validation, conversion,
and simulation. It uses `NEXT_PUBLIC_API_BASE_URL`, an eight-second default timeout, abort
signals, and the backend's structured error envelope.

## DFA visualization

`src/lib/conversion/run-conversion.ts` is the only frontend conversion coordinator. It checks
editor and validation readiness, calls the typed `/api/nfa/convert` client, and commits the full
backend response—including its trace—through the revision-bound store API. No subset-construction
logic exists in TypeScript.

`src/lib/conversion/dfa-graph-model.ts` derives XYFlow nodes and grouped visual edges solely from
the returned DFA. It also verifies that every DFA state/symbol pair has exactly one returned
transition. Missing or duplicate pairs are surfaced as contract violations instead of being
invented locally.

The Convert workspace renders the source `NfaGraph` in read-only mode beside a draggable DFA
graph. Canonical IDs remain `D0`, `D1`, and so on; node labels display compact NFA subsets and use
tooltips for the full membership. Initial, accepting, and empty-subset dead states have distinct
visual treatments. Dagre provides initial and user-requested layout without changing mathematics.

The Convert inspector exposes returned statistics, subset membership, accepting-state reasoning,
and selected-state details. The bottom dock renders the complete deterministic transition table.
`src/lib/conversion/playback-model.ts` derives random-access snapshots from the backend trace,
original NFA, and complete DFA. It uses trace events as the source for visible states,
transitions, NFA lookup highlights, and recorded worklist order. A trace contract check prevents
playback of malformed or inconsistent records. Each snapshot drives both graph canvases, the
progressive table, the worklist, and the explanation panel. The full view uses the same conversion
response without a second request.

Playback owns only the current trace index, playing/paused status, and speed. Its interval is
cleaned up on status changes and unmount; scrubbing calculates snapshots directly instead of
mutating an incremental partial automaton.

The DFA graph initializes positions from the complete DFA once per conversion revision and filters
visible nodes and transitions at each step. NFA lookup highlights are derived from recorded
per-state targets. Blue thick borders identify active states/edges, an amber dashed ring marks a
new DFA state, and the table marks newly established cells. Pending cells are distinct from
transitions to the empty-subset dead state. Reduced-motion preferences suppress transitions.

## Current phase boundary

Available now:

- real backend health, curated examples, and authoritative NFA validation;
- complete state, alphabet, transition, layout, import, and export editing;
- synchronized graph, inspector, and transition table;
- backend conversion with freshness and racing-response protection;
- dual NFA/DFA graphs, DFA subset mapping, statistics, and complete transition table;
- responsive Build/Convert/Test shell and honest future-phase empty states.

Intentionally unavailable until later phases:

- interactive string simulation.
