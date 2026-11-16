# Frontend architecture

Phase 5 adds a complete NFA editor to the Phase 4 application shell while preserving the generated
API boundary. DFA visualization, conversion playback, and simulation controls remain out of scope.

## Runtime structure

- `src/app/page.tsx` remains a synchronous App Router page and renders the client-side
  `ApplicationShell` boundary.
- `src/components/header/` owns branding, responsive mode navigation, backend status, examples,
  and validated import/export.
- `src/components/workspace/` owns the contextual sidebar, editor canvas, and expandable bottom
  dock.
- `src/components/editor/` owns the Build inspector, XYFlow graph, custom state nodes and
  transition edges, validation status, and editable transition table.
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
- `playback-store.ts` — future timeline position, status, and speed.

The API-shaped `NfaDocument` is the only mathematical source of truth. XYFlow nodes and visual
edges are derived by `src/lib/editor/graph-model.ts`; the transition table reads and writes the
same transition records. There is no parallel graph model.

Semantic edits increment `documentRevision`, clear stale conversion state, and reset future
playback state. Dragging and automatic layout update only `layoutRevision`, so cosmetic movement
does not invalidate a conversion or trigger backend validation. State rename and delete operations
update references and layout atomically. Deleting the initial state deliberately clears
`initialState` and reports the incomplete state instead of silently choosing a replacement.

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

## Phase 5 boundary

Available now:

- real backend health, curated examples, and authoritative NFA validation;
- complete state, alphabet, transition, layout, import, and export editing;
- synchronized graph, inspector, and transition table;
- responsive Build/Convert/Test shell and honest future-phase empty states.

Intentionally unavailable until later phases:

- DFA visualization;
- conversion submission and playback;
- interactive string simulation.
