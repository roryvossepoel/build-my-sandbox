from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPS_DIR = ROOT / "apps"
PROFILES_DIR = ROOT / "profiles"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


app_ids: dict[str, Path] = {}
for path in sorted(APPS_DIR.glob("*.json")):
    data = load_json(path)
    app_id = data.get("id")
    if not app_id:
        raise SystemExit(f"{path}: missing id")
    if app_id in app_ids:
        raise SystemExit(f"Duplicate app id {app_id}: {app_ids[app_id]} and {path}")
    app_ids[app_id] = path

for path in sorted(PROFILES_DIR.glob("*.json")):
    data = load_json(path)
    for app_id in data.get("apps", []):
        if app_id not in app_ids:
            raise SystemExit(f"{path}: unknown app id {app_id}")

for app_id, path in app_ids.items():
    data = load_json(path)
    for dependency in data.get("dependencies", []):
        if dependency not in app_ids:
            raise SystemExit(f"{path}: unknown dependency {dependency}")

print(f"Validated {len(app_ids)} app manifests and {len(list(PROFILES_DIR.glob('*.json')))} profiles.")
