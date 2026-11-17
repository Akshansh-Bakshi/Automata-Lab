# AutomataLab

AutomataLab is an interactive NFA-to-DFA learning application. Build an NFA, watch subset
construction produce a DFA, then run an input string through both machines. The FastAPI backend
owns all automata mathematics; the Next.js frontend renders its conversion and simulation traces.

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

The application provides:

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

## Algorithm

The Python core validates the NFA, computes epsilon closures, and performs breadth-first subset
construction. Each reachable subset becomes one DFA state; an empty subset is retained as a dead
state when needed. Canonical ordering makes conversion repeatable. The backend returns a trace for
step playback and independently simulates the NFA and DFA for each test string. See
[`docs/algorithm.md`](docs/algorithm.md).

## Demonstration

1. Open **Examples** and load **One or more a symbols**.
2. Open **Build** to inspect its NFA graph and transition table.
3. Open **Convert**, select **Generate DFA**, inspect the dead state, and use **Step by step** to
   follow the subset worklist to the complete DFA.
4. Open **Test**, run `a` for acceptance, `b` for rejection, and an empty input for epsilon.
5. Export the NFA from **Import / export**, then import that JSON to restore it.

## Environment and deployment

Copy `frontend/.env.example` to `frontend/.env.local` for local development. Set
`NEXT_PUBLIC_API_BASE_URL` to the browser-reachable backend origin; Next.js embeds this public
value at build time. Set backend `FRONTEND_ORIGIN` to the exact frontend origin for CORS. Neither
variable is a secret. Do not put secrets in `NEXT_PUBLIC_*` values. The app has no database,
account system, or required secret keys. See [`docs/deployment.md`](docs/deployment.md) for
container, Vercel, health-check, and production-run instructions.

## Run all checks

Frontend:

```powershell
Set-Location frontend
npm run lint
npm run typecheck
npm test
npm run check:api-contract
npm run build
npm run test:e2e
```

Backend:

```powershell
Set-Location backend
.\.venv\Scripts\Activate.ps1
python -m ruff check .
python -m mypy automatalab
python -m pytest --cov=automatalab.core --cov=automatalab.api --cov-branch --cov-report=term-missing --cov-fail-under=95
```

Browser tests use installed Google Chrome and start isolated local frontend/backend servers.
Set `AUTOMATALAB_BACKEND_PYTHON` to the Python executable with backend dependencies installed if
`python` is not that interpreter. The test ports are 3000 and 8017.

## Known limitations

- Input symbols are single characters and the API enforces documented state, input, and request
  size limits to keep conversion and simulation bounded.
- Graph canvases are visual and pointer-friendly. The synchronized transition tables and inspector
  forms provide keyboard-accessible alternatives.
- Python 3.12 is the declared backend runtime. If it is unavailable locally, use the included
  Python 3.12 container; local fallback interpreter results should be reported separately.

