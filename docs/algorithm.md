# AutomataLab conversion algorithm

AutomataLab supports epsilon-free nondeterministic finite automata (NFAs). The mathematical
core is implemented with immutable Python dataclasses and has no dependency on FastAPI,
Pydantic, Starlette, or the frontend.

## Canonical subsets

A DFA state represents a subset of NFA states. The subset is stored as a tuple ordered by the
positions of its members in the NFA's declared `states` tuple. It is never sorted
alphabetically. This makes equivalent sets byte-stable even for IDs such as `q2` and `q10`.

Externally, reachable subsets receive IDs `D0`, `D1`, ... in discovery order. The empty tuple
is displayed as `∅`; other subsets are displayed as `{q0,q2}`.

## Breadth-first subset construction

1. Validate the NFA semantically.
2. Create `D0` for the singleton containing the NFA initial state and put it on a FIFO queue.
3. Remove the next queued subset.
4. For each symbol in the NFA's declared alphabet order:
   - look up the target set for every NFA state in the subset;
   - union the targets and canonicalize the result in NFA state order;
   - reuse its DFA ID if already discovered, otherwise allocate the next ID and enqueue it;
   - record exactly one DFA transition and one `PROCESS_SYMBOL` trace step.
5. Record `STATE_COMPLETE`, then continue until the queue is empty.
6. Record `FINISH` and return the complete DFA and trace.

The implementation discovers only reachable subsets and never enumerates the power set. It
stops before adding a 513th DFA state.

## Dead-state handling

Missing NFA transitions mean the empty set. If a union first produces the empty subset, it is
discovered like any other state and becomes an explicit, non-accepting dead state. Processing
that subset produces the empty subset for every symbol, so all of its transitions loop to
itself. No dead state is emitted when no reachable move produces the empty subset.

## Conversion trace and replay

The trace starts with one `INIT` step, contains one `PROCESS_SYMBOL` step per DFA-state/symbol
pair and one `STATE_COMPLETE` step per DFA state, and ends with one `FINISH` step. Its length is
therefore:

```text
2 + |Q_D| × (|alphabet| + 1)
```

Each symbol step records the source, per-NFA-state lookups, canonical result, target ID,
discovery status, worklist, and deterministic explanation. Replay constructs fresh DFA state
and transition objects from these records; it does not retain or return the conversion result.

## Simulation

NFA simulation carries a canonical set of active NFA states. DFA simulation carries one DFA
state. Both include the position-zero start configuration, so the empty string has one step.
Characters outside the alphabet produce `SYMBOL_NOT_IN_ALPHABET` with an `input[index]` path.
The comparison helper runs both implementations independently and reports whether their
acceptance verdicts agree.

## Correctness invariants

- **I1:** Every DFA state is a distinct canonical subset of the NFA state set.
- **I2:** `D0` is exactly the singleton containing the NFA initial state.
- **I3:** The DFA transition function is total.
- **I4:** Every generated DFA state is reachable from `D0`.
- **I5:** A DFA state is accepting exactly when its subset intersects the NFA accepting set.
- **I6:** Every DFA target is the union of the corresponding NFA targets.
- **I7:** The empty subset exists exactly when reached; it is non-accepting and self-loops.
- **I8:** Repeated conversion of the same input is byte-deterministic.
- **I9:** NFA and DFA simulation agree on every tested string.
- **I10:** Replaying the trace from scratch reconstructs the returned DFA exactly.

