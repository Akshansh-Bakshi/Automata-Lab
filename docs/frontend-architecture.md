# Frontend architecture

Phase 4 establishes the application shell and typed service boundary without implementing graph
editing, conversion playback, or simulation controls.

## Runtime structure

- `src/app/page.tsx` remains a synchronous App Router page and renders the client-side
  `ApplicationShell` boundary.
- `src/components/header/` owns branding, responsive mode navigation, backend status, examples,
  and document actions.
- `src/components/workspace/` owns the contextual sidebar, graph-ready canvas region, temporary
  NFA summary, and expandable bottom dock.
- `src/components/ui/` contains reusable loading, error, and empty-state primitives.
- `src/hooks/` contains abortable health and example queries.

The visual system uses CSS custom properties in `src/app/globals.css` for color, type, spacing,
radii, borders, elevation, and semantic states. Light mode is the only supported theme in this
phase. Layout breakpoints preserve a sidebar on larger screens and stack panels below 980 px.

## Client state

Zustand is split by change frequency and responsibility:

- `workspace-store.ts` — active Build/Convert/Test mode and bottom-dock preference.
- `automaton-store.ts` — active NFA document, selected example, revision, conversion result, and
  conversion freshness.
- `playback-store.ts` — future timeline position, status, and speed.

Every document replacement increments its revision and clears the conversion result. A
conversion is fresh only when its recorded revision matches the current document revision.
No automata algorithm is implemented in these stores.

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

## Phase 4 behavior

Available now:

- real backend health state;
- real curated-example browsing and selection;
- readable NFA state, alphabet, initial/accepting state, and transition summaries;
- responsive Build/Convert/Test shell and honest empty states;
- JSON export for the active document.

Intentionally unavailable until later phases:

- NFA editing and JSON import;
- React Flow canvases;
- conversion submission and playback;
- DFA visualization;
- interactive string simulation.

