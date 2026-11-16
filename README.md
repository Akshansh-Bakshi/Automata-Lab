# AutomataLab

AutomataLab is an incremental full-stack NFA-to-DFA learning application. It now includes a
responsive scientific workspace, typed FastAPI integration, curated example loading, a
deterministic conversion engine, and a production-style API. Interactive graph editing,
conversion playback, and string-simulation controls remain deferred to later phases.

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

The Phase 4 frontend currently provides:

- responsive Build, Convert, and Test workspace modes;
- live backend health status;
- curated example browsing and loading;
- a readable NFA document summary;
- typed clients for every backend endpoint;
- honest empty states for later editing, conversion, playback, and simulation features.

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

