"""Loading and validation for packaged curated NFA examples."""

import json
from functools import lru_cache
from importlib import resources

from automatalab.api.mappers import nfa_to_core
from automatalab.api.schemas import ExampleSchema
from automatalab.api.validation import validate_api_nfa


@lru_cache(maxsize=1)
def load_examples() -> tuple[ExampleSchema, ...]:
    """Load examples in filename order and fail fast if a packaged NFA is invalid."""

    package_root = resources.files("automatalab.examples")
    example_files = sorted(
        (item for item in package_root.iterdir() if item.name.endswith(".json")),
        key=lambda item: item.name,
    )
    examples: list[ExampleSchema] = []
    for resource in example_files:
        raw: object = json.loads(resource.read_text(encoding="utf-8"))
        example = ExampleSchema.model_validate(raw)
        nfa = nfa_to_core(example.nfa)
        issues = validate_api_nfa(example.nfa, nfa)
        if issues:
            raise RuntimeError(
                f"Packaged example '{example.id}' is invalid: {issues[0].message}"
            )
        examples.append(example)
    return tuple(examples)

