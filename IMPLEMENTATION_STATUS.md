# Implementation Status

## Completed phases

### Phase 1 — Project foundation

The Next.js frontend, FastAPI application, `/api/health` endpoint, linting, testing, and Windows
PowerShell setup remain intact.

### Phase 2 — Mathematical core and conversion engine

The immutable NFA/DFA models, semantic validation, deterministic breadth-first subset
construction, conversion trace/replay, independent simulations, invariants, and equivalence tests
remain framework-free.

### Phase 3 — Complete FastAPI integration

Implemented strict Pydantic v2 contracts, five packaged examples, validation warnings, conversion,
simulation, structured errors, request limits, OpenAPI response models, and explicit API/core
mapping. Public JSON uses camelCase; transition endpoints retain `from` and `to`.

### Phase 4 — Premium frontend foundation and design system

Implemented the responsive application shell, reusable light-mode design tokens and states,
separated Zustand stores, real backend health/example integration, a generated OpenAPI workflow,
and typed clients for all five endpoints.

### Phase 5 — Complete interactive NFA graph editor

Implemented:

- XYFlow state/transition editing with custom nodes and edges, dragging, selection, zoom, pan,
  fit-to-view, Dagre automatic layout, self-loops, curved reverse edges, and merged symbol labels.
- Atomic state creation, rename, delete, initial-state selection, accepting-state toggles, and
  layout-reference updates in the existing Zustand document store.
- Alphabet addition/removal with local contract feedback, duplicate prevention, destructive
  confirmation, and removal of affected transitions.
- Nondeterministic transition editing through graphical connection, inspector form, and a
  keyboard-accessible state-by-symbol transition table sharing one document model.
- Initialization and graph/table rendering for all five backend-curated examples.
- Exact-schema JSON import with backend semantic validation, failure preservation, deterministic
  API-compatible export, and round-trip coverage.
- Debounced backend-authoritative validation with incomplete, validating, valid, invalid, and
  unavailable states; layout-only changes do not make validation calls.
- Semantic revision invalidation for stale conversion/playback state and separate cosmetic layout
  revisions.

No DFA visualization, conversion playback controls, or string-simulation interface was added.

### Phase 6 — Complete DFA generation and visualization

Implemented:

- Functional Convert action using the typed `/api/nfa/convert` client and backend subset
  construction; no conversion algorithm was added to TypeScript.
- Request IDs and captured document revisions prevent duplicate, late, or racing responses from
  overwriting newer state.
- Explicit idle, loading, ready, stale, and error conversion states with structured resource-limit,
  offline, invalid/incomplete, and unexpected-error presentation.
- Responsive dual-graph workspace with the original NFA in read-only mode and the complete backend
  DFA in a draggable XYFlow canvas.
- Custom DFA nodes for canonical IDs, compact subset labels, initial arrows, accepting double
  circles, empty-subset dead states, selection, zoom/pan, fit view, and Dagre auto-layout.
- DFA graph edges derived only from returned transitions, including self-loops, curved reverse
  edges, and merged symbols for shared ordered pairs.
- Complete DFA transition table with initial, accepting, dead, and subset annotations. Missing or
  duplicate state/symbol transitions are treated as API-contract violations.
- Subset mapping and selected-state inspector explaining membership and acceptance, plus backend
  statistics and explicit empty-language handling.
- Semantic NFA edits invalidate results and active requests; NFA/DFA layout changes preserve fresh
  mathematical results.

The backend conversion trace is stored for Phase 7, but no playback controls or step animation were
implemented. String simulation remains deferred to Phase 8.

## Key editor decisions

- The generated `NfaDocument` API type remains the only mathematical source of truth.
- Graph nodes and grouped visual edges are derived from the document; the transition table edits
  the same `(source, symbol) -> targets` records.
- Deleting the initial state clears `initialState` and reports an incomplete document instead of
  silently choosing a replacement.
- State renames update the initial state, accepting states, transition endpoints, selection, and
  layout metadata atomically.
- Semantic edits invalidate downstream results. Dragging and auto-layout only change visual
  metadata and do not invalidate or revalidate the automaton.
- Import never replaces the current document until local structure and backend semantics pass.

## Verification

Executed on 16 November 2026:

- Frontend: ESLint passed.
- Frontend: strict TypeScript checking passed.
- Frontend: 13 Vitest files and 27 tests passed.
- Frontend: generated OpenAPI contract verification passed.
- Frontend: Next.js production build passed with a statically prerendered root route.
- Backend regression: Ruff and strict mypy passed across 23 source files.
- Backend regression: all 71 pytest tests passed.
- Phase 5 tests cover state/alphabet/transition CRUD, rename/delete reference safety,
  nondeterminism, self-loops, graph/table synchronization, all five examples, validated import,
  invalid-import preservation, stable serialization, conversion invalidation, layout isolation,
  validation states, and keyboard-only editing.
- Phase 6 frontend gate: 17 Vitest files and 43 tests passed; ESLint, strict TypeScript, generated
  OpenAPI verification, and the Next.js production build passed.
- Phase 6 backend regression gate: Ruff, strict mypy, and all 71 pytest tests passed.
- Phase 6 coverage includes successful/blocked/error conversion requests, duplicate and stale
  responses, semantic invalidation, layout preservation, DFA graph derivation, initial/accepting/
  dead rendering, total-table enforcement, subset inspection, curated-example conversion, and
  import-to-conversion workflow.

## Remaining limitations

- Python 3.12 is unavailable on this host. Runtime backend tests used Python 3.10.0; project
  metadata, Ruff, and mypy continue to target Python 3.12.
- Backend tests emit one third-party FastAPI/Starlette test-client deprecation warning about its
  HTTP dependency.
- Playwright/browser tooling was not installed, so no browser visual-validation claim is made.
  Graph behavior is covered by model, DOM, synchronization, production-build, and accessibility
  tests; an actual browser review remains recommended.

## Next planned phase

Phase 7 should add conversion-trace playback using the already stored backend trace. It must not
reimplement subset construction or mutate the static DFA result. Phase 7 work has not started.
