# LUT round-table — 2026-06-10 (overnight maintenance shift)

> Unattended night shift: hunt/fix/document only — no features, no tuning. One branch
> (`claude/grovers-night-shift-cm59p1`), atomic commits, full audit trail in
> `night-reports/NIGHT-AUDIT-2026-06-10.md` + `night-reports/SYSTEM-MAP.md`.

## What happened

1. **Protocol:** independent audit of merged PR #3 → **PASS** (`docs/audits/PR-3-session-relay-protocol.md`);
   gates re-ran green on the merged tree.
2. **Mission-brief mismatch (notable):** the shift's brief described "GROVERS HTML5 canvas
   prototypes" that do not exist in this repo or its history. Executed the shift in spirit
   against the real codebase; documented as the audit's first finding.
3. **System map:** full canonical-vs-residue census (the Replit-import cluster is inventoried,
   coupled to `.replit` postMerge — archive needs a day-shift deploy decision), per-system
   production-readiness scores (chain 2/5 and web 3/5 are the laggards).
4. **Fixes (8 commits):** `set_environment` validation at the service chokepoint (was: non-numeric
   body → TypeError on every later sim read of the pod's plants); `cup_score` zero-norm guard;
   web localStorage guards + Toast timer cleanup/memoization + derived `outputFileTracingRoot`;
   13 unused imports; deduped `requirements.txt`; single API entry point; untracked `egg-info`;
   doc-vs-code factual drift (13 traits, 22 strains, 71 routes, 190 tests, venv Quick Launch).
5. **Memory reconciliation:** two more false ✅ found and annotated in `BACKLOG.md` — the Vitest
   harness and Playwright e2e suite have specs/configs on disk but stubbed runners, no
   devDependencies, and no CI jobs. The drift class the protocol exists to catch.

## Tests

185 → **190** (+5: env-validation incl. engine round-trip regression; cup zero-norm with
old-math parity). All gates green at handoff (backend four + web typecheck/lint/build).

## Carried to morning (ranked in the night audit)

idempotency keys + wallet row-lock together · Replit-residue archive decision · reinstate web
test runners · rate-limit storage/per-route caps · engine tuning constants → balance.yaml ·
strain-codex content gap (6 strains).
