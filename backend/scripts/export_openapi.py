"""Export AutomataLab's live FastAPI OpenAPI document deterministically."""

import argparse
import json
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()

    backend_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_root))
    from automatalab.api.main import app

    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    document = json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True)
    arguments.output.write_text(document + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

