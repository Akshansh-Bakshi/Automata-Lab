# AutomataLab API contract

The FastAPI service is stateless and mounted under `/api`. OpenAPI at `/openapi.json` is the
machine-readable source of truth. Public JSON uses camelCase and every request model rejects
unknown fields.

## NFA input

The validation, conversion, and simulation endpoints accept the same NFA shape:

```json
{
  "schemaVersion": 1,
  "name": "Example",
  "alphabet": ["a", "b"],
  "states": ["q0", "q1"],
  "initialState": "q0",
  "acceptingStates": ["q1"],
  "transitions": [
    {"from": "q0", "symbol": "a", "to": ["q0", "q1"]}
  ],
  "layout": {"q0": {"x": 80, "y": 120}}
}
```

`name` and `layout` are optional. Layout is validated but remains UI metadata and is never sent
to the mathematical engine. A missing state/symbol transition means the empty set; an explicit
empty `to` array is invalid.

## Endpoints

### `GET /api/health`

Returns the service liveness response:

```json
{"status": "ok", "version": "1.0.0"}
```

### `GET /api/examples`

Returns `{ "examples": [...] }` with five stable, packaged NFAs. Each item has `id`, `name`,
`description`, and `nfa`. The set covers nondeterminism, missing moves and a reachable dead
state, multiple accepting states, and empty-string acceptance.

### `POST /api/nfa/validate`

Request:

```json
{"nfa": {"schemaVersion": 1, "alphabet": ["a"], "states": ["q0"], "initialState": "q0", "acceptingStates": [], "transitions": []}}
```

Valid semantic content returns:

```json
{
  "valid": true,
  "warnings": [
    {"code": "UNUSED_SYMBOL", "path": "alphabet[0]", "message": "Symbol 'a' is not used by any explicit transition."}
  ]
}
```

Warnings are non-blocking and deterministic. Implemented warning codes are
`UNREACHABLE_STATE` and `UNUSED_SYMBOL`. Invalid content returns the standard 422 error envelope
instead of a `valid: false` body.

### `POST /api/nfa/convert`

Accepts `{ "nfa": NFA }` and returns `{ "dfa": DFA, "trace": Trace }`. A DFA contains its
alphabet, ordered states, initial and accepting IDs, complete ordered transitions, and stats.
The trace contains contiguous `INIT`, `PROCESS_SYMBOL`, `STATE_COMPLETE`, and `FINISH` steps.

### `POST /api/simulate`

Accepts `{ "nfa": NFA, "input": string }` and returns
`{ "simulation": {"input", "nfa", "dfa", "agree"}, "dfa": DFA }`. The service always converts
the supplied NFA internally and never accepts a client-provided DFA. Both machine traces contain
a position-zero start step, including for the empty string.

## Errors

Every handled failure uses:

```json
{
  "error": {
    "code": "UNKNOWN_STATE_REFERENCE",
    "message": "State 'q9' is not in states.",
    "issues": [
      {"code": "UNKNOWN_STATE_REFERENCE", "path": "transitions[0].to[0]", "message": "State 'q9' is not in states."}
    ]
  }
}
```

- `400 MALFORMED_JSON` — the request body is not valid JSON.
- `413 LIMIT_EXCEEDED` — the HTTP body exceeds 256 KiB.
- `422 SCHEMA_VIOLATION` — wrong types, missing fields, unknown fields, or wrong schema version.
- `422` semantic code — invalid NFA references, duplicates, symbols, or resource limits.
- `422 SYMBOL_NOT_IN_ALPHABET` — simulation input contains an invalid character; the path is
  `input[index]`.
- `500 INTERNAL_ERROR` — an unexpected server failure; details and stack traces are not returned.

The core limits are 20 NFA states, 10 alphabet symbols, 512 generated DFA states, and 1,000
input characters.

## Blueprint clarifications

- The blueprint's DFA JSON shows only two transitions for brevity. The implemented response
  always returns the mathematically required total transition function.
- `POST /api/nfa/validate` returns `valid: true` only for valid content. Invalid content follows
  the shared error envelope, as required by the Phase 3 specification.
- API-only `name` and `layout` metadata are not copied into core dataclasses.
- DFA statistics are derived during mapping and do not alter core DFA equality or trace replay.

