#!/usr/bin/env bash
# SessionStart hook — make a fresh Claude Code (web) session able to run the
# suite and linters without manual setup, mirroring CI.
#
# Why a venv: a bare `pip install` collides with the distro-managed PyYAML on
# some boxes (see CLAUDE.md / Makefile). We install into ./.venv so it never
# touches system packages, then editable-install the package so `growpodempire`
# imports without PYTHONPATH games. Idempotent + fast on warm containers: if the
# venv already imports Flask, we skip straight out.
set -euo pipefail

cd "$(dirname "$0")/../.." || exit 0   # repo root; never fail the session start
VENV=".venv"
PY="$VENV/bin/python"

# Fast path: deps already present.
if [ -x "$PY" ] && "$PY" -c "import flask, sqlalchemy, yaml" >/dev/null 2>&1; then
  echo "session-start: deps already installed (.venv ready)."
else
  echo "session-start: provisioning .venv (one-time)…"
  python3 -m venv "$VENV"
  "$PY" -m pip install --quiet --upgrade pip
  "$PY" -m pip install --quiet -r requirements.txt -r requirements-dev.txt ruff
  "$PY" -m pip install --quiet -e .
  echo "session-start: dependencies installed."
fi

# Mirror CI's import path for any tooling that runs the system python directly.
export PYTHONPATH="src${PYTHONPATH:+:$PYTHONPATH}"
echo "session-start: ready (PYTHONPATH=src; use .venv/bin/python or 'make test')."
