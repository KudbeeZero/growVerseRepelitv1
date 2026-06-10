#!/usr/bin/env python3
"""Memory-layer integrity gate (`make check-memory`, and CI).

The `docs/memory/` system is only trustworthy if its cross-references stay
honest. This script fails the build on three classes of rot:

  1. Broken internal links — a relative markdown link `[text](path)` in a memory
     doc (or CLAUDE.md) that points at a file/dir that doesn't exist.
  2. Hollow ✅ claims — a line marked done (✅) that cites a backticked repo path
     `like/this.py` which doesn't exist. "Done" must point at something real.
  3. Codex drift — a design-codex file under `docs/memory/design/` that isn't
     registered in the layer map (`docs/memory/MAP.md` or `CLAUDE.md`).

It is deliberately conservative: it only checks links and ✅-line tokens that
clearly denote repository paths, so prose and route examples don't trip it.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEM = ROOT / "docs" / "memory"

# Markdown link: [text](target)
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
# Backticked token, e.g. `src/foo/bar.py`
BACKTICK_RE = re.compile(r"`([^`]+)`")

# A token denotes a repo path if it has a known source extension or sits under a
# known top-level directory. Both also require a path separator to avoid bare
# nouns like `Makefile` being treated as ambiguous filenames (those are skipped).
KNOWN_EXT = (".py", ".md", ".yaml", ".yml", ".ts", ".tsx", ".json", ".toml",
             ".sh", ".ini", ".txt", ".mjs", ".cfg")
KNOWN_DIRS = ("src/", "docs/", "web/", "tests/", "scripts/", "alembic/",
              "lib/", ".claude/", "artifacts/", ".github/")


def _markdown_files():
    files = sorted(MEM.rglob("*.md"))
    claude = ROOT / "CLAUDE.md"
    if claude.exists():
        files.append(claude)
    return files


def _is_external(target: str) -> bool:
    return target.startswith(("http://", "https://", "mailto:", "#"))


def _looks_like_repo_path(token: str) -> bool:
    if " " in token or "://" in token:
        return False
    # strip a trailing :line / :col or anchor and trailing punctuation
    # (rstrip, not strip: a leading ".." in a doc-relative path must survive)
    cleaned = token.strip().rstrip(".,;:)")
    cleaned = re.split(r"[:#]", cleaned, 1)[0]
    if "/" not in cleaned:
        return False
    if cleaned.startswith(KNOWN_DIRS):
        return True
    return cleaned.endswith(KNOWN_EXT)


# Docs cite paths in three conventional shorthands: repo-root-relative, relative
# to the package root (`services/foo.py` == `src/growpodempire/services/foo.py`),
# relative to the web app, or relative to the citing doc's own directory. A token
# is valid if it resolves under any of these bases.
def _path_exists_any(token: str, doc_dir: Path) -> bool:
    cleaned = token.strip().rstrip(".,;:)")
    cleaned = re.split(r"[:#]", cleaned, 1)[0]
    if cleaned.startswith("/"):
        cleaned = cleaned.lstrip("/")
    bases = [
        ROOT,
        ROOT / "src" / "growpodempire",
        ROOT / "web",
        ROOT / "web" / "src",
        doc_dir,
    ]
    return any((base / cleaned).exists() for base in bases)



def check_links_and_claims(errors: list):
    for md in _markdown_files():
        text = md.read_text(encoding="utf-8")
        base = md.parent
        rel = md.relative_to(ROOT)

        for m in LINK_RE.finditer(text):
            target = m.group(1).strip()
            if _is_external(target) or not target:
                continue
            # strip anchor / title
            target = target.split()[0]
            target = target.split("#", 1)[0]
            if not target:
                continue
            resolved = (base / target).resolve() if not target.startswith("/") \
                else (ROOT / target.lstrip("/"))
            if not resolved.exists():
                errors.append(f"{rel}: broken link -> {m.group(1)}")

        for i, line in enumerate(text.splitlines(), 1):
            if "✅" not in line:
                continue
            for tok in BACKTICK_RE.findall(line):
                if _looks_like_repo_path(tok) and not _path_exists_any(tok, base):
                    errors.append(f"{rel}:{i}: ✅ cites missing path -> `{tok}`")


def check_codex_drift(errors: list):
    design = MEM / "design"
    if not design.exists():
        return
    map_text = ""
    for p in (MEM / "MAP.md", ROOT / "CLAUDE.md"):
        if p.exists():
            map_text += p.read_text(encoding="utf-8")
    for codex in sorted(design.glob("*.md")):
        if codex.name == "README.md":
            continue
        if codex.name not in map_text:
            errors.append(
                f"docs/memory/design/{codex.name}: codex not registered in the "
                f"layer map (MAP.md / CLAUDE.md)"
            )


def main() -> int:
    if not MEM.exists():
        print(f"ERROR: {MEM} not found", file=sys.stderr)
        return 1
    errors: list = []
    check_links_and_claims(errors)
    check_codex_drift(errors)
    if errors:
        print("Memory integrity check FAILED:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    print("OK: memory layer integrity verified (links, ✅ claims, codex map).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
