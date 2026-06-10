#!/usr/bin/env python3
"""Fail if the Alembic migration graph has more than one head (a fork).

A single linear head keeps `alembic upgrade head` unambiguous — two heads mean a
migration was branched and must be merged before deploy. Run via
`make check-migrations` (and CI). No database connection is needed; this only
reads the version scripts.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Config(str(ROOT / "alembic.ini"))
    # script_location in alembic.ini is repo-relative; pin it to an absolute path
    # so this works regardless of the caller's working directory.
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    script = ScriptDirectory.from_config(cfg)

    heads = script.get_heads()
    if len(heads) == 1:
        print(f"OK: single Alembic head ({heads[0]}).")
        return 0

    print(
        f"ERROR: expected exactly one Alembic head, found {len(heads)}: "
        f"{sorted(heads)}",
        file=sys.stderr,
    )
    print(
        "Fix: re-parent the forked migration's down_revision, or create a merge "
        "migration with `alembic merge -m 'merge heads' <rev1> <rev2>`.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
