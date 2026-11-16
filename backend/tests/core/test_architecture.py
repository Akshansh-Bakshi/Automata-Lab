import ast
from pathlib import Path


def test_core_imports_no_web_framework() -> None:
    core_root = Path(__file__).parents[2] / "automatalab" / "core"
    forbidden = {"fastapi", "pydantic", "starlette"}
    imported_roots: set[str] = set()

    for source_path in core_root.glob("*.py"):
        tree = ast.parse(source_path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported_roots.update(alias.name.split(".")[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imported_roots.add(node.module.split(".")[0])

    assert imported_roots.isdisjoint(forbidden)

