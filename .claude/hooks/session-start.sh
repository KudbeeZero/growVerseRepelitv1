#!/usr/bin/env bash
# SessionStart hook (GROWv2) — fulfills the promise in CLAUDE.md / BACKLOG.md that web
# sessions install deps automatically and start informed. Two jobs:
#   1. Best-effort dependency install via the venv flow (sidesteps the system-PyYAML
#      collision a bare `pip install` hits on some boxes).
#   2. Print the baton (docs/HANDOFF.md) so every session starts knowing what's next.
# Never fails the session: dep install is best-effort; the baton print is the important part.
set -uo pipefail

# Resolve repo root from this script's location, so it works regardless of CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT" || exit 0

# Mirror CI: src layout on the path (also set durably in .claude/settings.json).
export PYTHONPATH="src${PYTHONPATH:+:$PYTHONPATH}"

# 1) Best-effort deps: only if a venv isn't already present. Keep it quiet and non-fatal.
if [ ! -d ".venv" ] && command -v make >/dev/null 2>&1; then
  echo "[session-start] No .venv found — installing deps via 'make setup' (best-effort)…" >&2
  make setup >/tmp/growv2-setup.log 2>&1 || \
    echo "[session-start] 'make setup' did not complete; see /tmp/growv2-setup.log" >&2
fi

# 2) Print the baton so the session starts informed.
if [ -f "docs/HANDOFF.md" ]; then
  echo "================ GROWv2 baton (docs/HANDOFF.md) ================"
  cat docs/HANDOFF.md
  echo "==============================================================="
  echo "Protocol: start with /handoff-audit, end with /closeout. See docs/SESSION_PROTOCOL.md."
else
  echo "[session-start] docs/HANDOFF.md missing — no baton to print." >&2
fi

exit 0
