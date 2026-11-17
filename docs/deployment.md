# Deployment

AutomataLab has two independent services: a static/client-rendered Next.js frontend and a
stateless FastAPI backend. The backend holds no persistent user data. Deploy them under HTTPS on
separate origins, then configure each origin explicitly.

## Environment variables

| Service | Variable | Example | Purpose |
| --- | --- | --- | --- |
| Frontend | `NEXT_PUBLIC_API_BASE_URL` | `https://api.example.com` | Browser-reachable API origin, embedded at build time. No trailing `/api`. |
| Backend | `FRONTEND_ORIGIN` | `https://app.example.com` | Exact allowed browser origin for CORS. |
| Backend container | `PORT` | `8000` | Uvicorn listen port; default is 8000. |

The frontend has no server-side API proxy. Set its public URL before building or redeploy after
changing it. Do not place secrets in public frontend variables. The backend has no required secret
or database configuration. For preview deployments on changing origins, set `FRONTEND_ORIGIN` to
the exact current preview URL; wildcard CORS is intentionally unsupported.

## Local production run (Windows PowerShell)

From the repository root, start the Python 3.12 backend in one terminal:

```powershell
Set-Location backend
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install -e .
$env:FRONTEND_ORIGIN = 'http://localhost:3000'
.\.venv\Scripts\python -m uvicorn automatalab.api.main:app --host 127.0.0.1 --port 8000
```

In another terminal, build and serve the frontend:

```powershell
Set-Location frontend
npm ci
$env:NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8000'
npm run build
npm run start
```

Verify `Invoke-RestMethod http://localhost:8000/api/health` and open
<http://localhost:3000>. Start commands assume each terminal begins at the repository root.

## Backend container

`backend/Dockerfile` uses Python 3.12, installs the packaged backend, runs as a non-root user,
listens on `PORT`, and checks `/api/health`. From the repository root:

```powershell
docker build -t automatalab-backend:local .\backend
docker run --rm -p 8000:8000 -e FRONTEND_ORIGIN=http://localhost:3000 automatalab-backend:local
Invoke-RestMethod http://localhost:8000/api/health
```

Use a Python container host that accepts a Dockerfile, supports a public HTTPS service, and probes
`GET /api/health` (for example, Render or Fly.io). Point it at `backend/` as the build context and
set `FRONTEND_ORIGIN`. Do not expose the backend's development reload mode in production.

## Vercel frontend

Import this repository as a Vercel project with **Root Directory** `frontend` and the Next.js
framework preset. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed HTTPS backend origin for each
environment, then build/deploy. Set the backend's `FRONTEND_ORIGIN` to the exact resulting Vercel
frontend URL. Verify health, examples, conversion, and simulation from the deployed browser. A
custom frontend configuration file is unnecessary for the current Next.js application.

## Operational limits

The API caps request bodies at 256 KiB and validates automaton and input sizes before conversion
or simulation. The frontend displays backend availability and structured errors. Traffic control,
TLS termination, logs, and uptime monitoring belong to the deployment platform. No account or
storage service is configured; document data lives in the user's browser session until exported.
