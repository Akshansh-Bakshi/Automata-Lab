# AutomataLab

AutomataLab is an incremental full-stack NFA-to-DFA learning application. It includes a polished
interactive NFA editor, typed FastAPI integration, curated examples, a deterministic conversion
engine, complete static DFA visualization, and a production-style API. Step-by-step conversion
playback and string-simulation controls remain deferred to later phases.

## Repository layout

- `frontend/` — Next.js, TypeScript, Tailwind CSS, Vitest
- `backend/` — Python 3.12, FastAPI, Pydantic v2, pytest, Ruff
- `docs/` — architecture blueprint, algorithm notes, and API contract

## Prerequisites

- Node.js 22.12 or newer
- Python 3.12 available through the Windows Python launcher (`py -3.12`)

## Frontend setup (Windows PowerShell)

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

## Backend setup (Windows PowerShell)

In a second PowerShell window, from the repository root:

```powershell
Set-Location backend
py -3.12 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
python -m uvicorn automatalab.api.main:app --reload
```

The API runs at <http://localhost:8000>. Verify it with:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

Available endpoints:

- `GET /api/health`
- `GET /api/examples`
- `POST /api/nfa/validate`
- `POST /api/nfa/convert`
- `POST /api/simulate`

Interactive API documentation is available at <http://localhost:8000/docs>. See
[`docs/api-contract.md`](docs/api-contract.md) for the JSON contract and error conventions.

The Phase 6 frontend provides:

- responsive Build, Convert, and Test workspace modes;
- live backend health status;
- curated example browsing and loading;
- an XYFlow graph editor with dragging, zoom, pan, fit-to-view, and Dagre auto-layout;
- state, alphabet, and nondeterministic-transition CRUD through accessible inspector forms;
- custom initial/accepting states, self-loops, bidirectional edges, and merged edge labels;
- an editable transition table synchronized with the graph and document store;
- backend-authoritative validation with distinct incomplete, invalid, valid, and offline states;
- validated JSON import and deterministic API-compatible export;
- backend-powered NFA-to-DFA conversion with request racing and stale-result protection;
- side-by-side read-only NFA and generated DFA graphs;
- canonical DFA subset labels, accepting/initial/dead-state styling, and Dagre layout;
- complete DFA transition table, subset mapping inspector, and backend statistics;
- trace-driven step playback with progressive DFA graph/table reveal, synchronized NFA lookup
  highlights, recorded worklist, explanations, timeline controls, and full DFA view;
- backend-powered string simulation with synchronized NFA/DFA traces, active-state highlights,
  input timeline, and explicit acceptance/agreement results;
- typed clients for every backend endpoint;
- structured simulation errors and revision-bound result freshness.

Basic editor workflow:

1. Select **Create blank NFA** or open **Examples**.
2. Add states and alphabet symbols in the Build inspector.
3. Drag from a state handle to create a graphical transition, use the transition form, or expand
   the Transition table at the bottom of the workspace.
4. Select states to rename them or change initial/accepting status.
5. Use **Import / export** for backend-compatible JSON files.

Conversion workflow:

1. Build, import, or load a valid NFA.
2. Select **Convert** and wait for authoritative validation to finish.
3. Select **Generate DFA** to call the backend subset-construction engine.
4. Inspect the source NFA and generated DFA side by side, select DFA states to review their NFA
   subsets, and expand the DFA transition table.
5. Select **Step by step** above the DFA, expand the bottom dock, and use Play, Pause, step buttons,
   the timeline, or speed selector. Select **Full DFA** to return to the complete graph and table.
6. Return to **Build** to edit the source. Semantic edits invalidate the result; graph dragging
   preserves it. Generate again when the result is marked stale.

String-testing workflow:

1. Load or build a valid NFA, then select **Test**.
2. Enter symbols from the displayed alphabet, or leave the field empty to test ε.
3. Select **Run simulation** (or press Enter). The backend returns independent NFA and DFA traces.
4. Expand the bottom timeline to play, pause, step, scrub, or change speed. The two graphs and
   input strip stay on the same position. The final verdict appears at the last position.

Regenerate frontend API types after changing FastAPI schemas or routes:

```powershell
Set-Location frontend
npm run generate:api-types
```

See [`docs/frontend-architecture.md`](docs/frontend-architecture.md) for component, state, and
generated-contract details.

## Run all checks

Frontend:

```powershell
Set-Location frontend
npm run lint
npm run typecheck
npm test
npm run check:api-contract
npm run build
```

Backend:

```powershell
Set-Location backend
.\.venv\Scripts\Activate.ps1
python -m ruff check .
python -m mypy automatalab
python -m pytest --cov=automatalab.core --cov=automatalab.api --cov-branch --cov-report=term-missing --cov-fail-under=95
```

