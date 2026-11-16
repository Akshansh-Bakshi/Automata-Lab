# Implementation Status

## Completed phases

### Phase 1 — Project foundation

The Next.js frontend shell, FastAPI application, `/api/health` endpoint, linting, testing, and
Windows PowerShell setup remain intact.

### Phase 2 — Mathematical core and conversion engine

The immutable NFA/DFA models, semantic validation, deterministic breadth-first subset
construction, conversion trace/replay, and independent simulations remain framework-free.
Invariants I1–I10 and exhaustive/property-based equivalence tests remain in place.

### Phase 3 — Complete FastAPI integration

Implemented:

- Strict Pydantic v2 request/response schemas with camelCase JSON and unknown-field rejection.
- Explicit schema/core/result mapping functions; no algorithm logic was copied into the API.
- `GET /api/examples` with five stable packaged and semantically validated NFAs.
- `POST /api/nfa/validate` with deterministic unreachable-state and unused-symbol warnings.
- `POST /api/nfa/convert` returning the complete DFA, stats, and contiguous conversion trace.
- `POST /api/simulate` converting internally and returning both simulations, agreement, and DFA.
- Structured handlers for malformed JSON, schema and semantic failures, invalid input symbols,
  generated-state limits, HTTP errors, and sanitized internal errors.
- A 256 KiB ASGI request-body limit.
- OpenAPI response models and error documentation.

No frontend feature, graph editor, or playback UI was added during Phase 3.

### Phase 4 — Premium frontend foundation and design system

Implemented:

- A responsive light-mode application shell with Build, Convert, and Test workspaces, a
  contextual sidebar, graph-ready canvas region, and expandable bottom dock.
- Reusable design tokens and loading, error, and empty-state components.
- Independent Zustand stores for workspace preferences, automaton documents and conversion
  freshness, and future playback state.
- Live backend health reporting and curated example browsing/loading.
- A readable NFA summary with JSON export while interactive editing and import remain deferred.
- A generated OpenAPI workflow backed by the live FastAPI schema and a typed client for all five
  endpoints, including timeouts, cancellation, and structured errors.
- Frontend coverage for the shell, mode switching, stores, example loading and failure behavior,
  backend status, API requests/errors, and the generated contract.

No graph editor, subset-construction UI, conversion playback, DFA visualization, or interactive
string-testing interface was added.

## Contract decisions

- Public JSON uses camelCase; transition endpoints retain the contract keys `from` and `to`.
- `name` and `layout` are API metadata. Layout references are validated, but metadata is omitted
  from core dataclasses.
- Invalid `/api/nfa/validate` requests use the shared 422 error envelope; successful validation
  returns `valid: true` plus non-blocking warnings.
- The blueprint's abbreviated DFA example is not literal: responses always include the total
  transition function in deterministic state/symbol order.
- DFA stats are calculated by the mapper so core DFA equality and replay remain unchanged.

## Verification

Executed on 16 November 2026:

- Initial Phase 2 regression gate — 50 tests passed; core coverage remained 100%.
- Final backend suite — 71 tests passed, including all core and health tests.
- Core coverage — 100% statements and branches (368 statements, 112 branches).
- API coverage — 96% statements and branches combined (402 statements, 50 branches).
- `ruff check .` — passed.
- `mypy automatalab` in strict mode with Python 3.12 semantics — passed across 23 source files.
- Contract tests cover all five endpoints, OpenAPI aliases, deterministic bytes, curated example
  validity, trace structure, empty input, warnings, malformed/schema/semantic errors, resource
  limits, 404 responses, and sanitized internal exceptions.
- Phase 4 frontend gate — 6 test files and 13 tests passed; ESLint, TypeScript, generated-contract
  checking, and the Next.js production build passed.
- Live integration smoke test — the Next.js page, FastAPI health endpoint, CORS header, and all
  five curated examples responded successfully on temporary local ports.

## Remaining limitations

- Python 3.12 is unavailable on this host. Runtime tests used Python 3.10.0; project metadata,
  Ruff, and mypy continue to target Python 3.12.
- The passing health/API tests emit one third-party FastAPI/Starlette test-client deprecation
  warning about its HTTP dependency.
- Hypothesis remains constrained to 6.100.x for compatibility with the host's Python 3.10.0
  dataclass implementation.
- This environment did not provide an interactive browser preview, so verification covered the
  production build, DOM behavior in jsdom, and real HTTP integration rather than visual browser
  inspection.

## Next planned phase

Phase 5 should introduce the first approved interactive automaton workflow while preserving the
generated API boundary and store separation established here. Its exact scope should follow the
next phase brief; Phase 5 work has not started.

