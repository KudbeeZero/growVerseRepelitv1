# NIGHT AUDIT — 2026-06-10

> Overnight maintenance shift on branch `claude/grovers-night-shift-cm59p1`.
> Mission: hunt, fix, document — no features, no tuning changes, one audited PR.
> Companion detail: [`SYSTEM-MAP.md`](SYSTEM-MAP.md) (full census, scores, hunt list).

## 🔴 CRITICAL FINDINGS (read first — untouched, hands off by rule)

1. **The mission brief targeted a codebase that is not here.** The night-shift prompt described
   "GROVERS single-file HTML5 canvas prototypes (grow chamber v1–v4)" and a
   `GROVERS-build-prompts.md` prompt pack. Neither exists in this repo nor anywhere in its git
   history (verified: no prototype HTML, no `mulberry32`/`devParams`/`clusterDev` signatures).
   This repo is **GROWv2 / GrowPod Empire** (Flask backend + Next.js web). The shift was executed
   in spirit against the real codebase; if the prototypes live elsewhere (local machine or another
   repo), that repo was not reachable from this session's scope.
2. **Wallet update has no concurrency guard** — `src/growpodempire/economy/ledger.py:61-71`.
   `wallet.version` is incremented but never enforced (no optimistic-lock WHERE, no
   `SELECT … FOR UPDATE`). Two concurrent debits under multi-worker gunicorn + Postgres can both
   read the same `cached_balance` and overdraft past `InsufficientFundsError`. **Recommendation:**
   fix inside the already-scoped idempotency-keys workstream (HANDOFF NEXT ACTION / open risk #3)
   — same files, same tests, don't do it piecemeal.
3. **Rate limits are per-worker in both deploy targets.** `api/ratelimit.py:30-33` defaults to
   `memory://`; neither `render.yaml` nor `.replit` sets `RATELIMIT_STORAGE_URI`, so with
   `--workers 2` every documented cap is doubled and resets on worker recycle. Config-only fix,
   but it needs a provisioned Redis — a deploy decision, not a 3am edit. Companion decision: most
   of the ~60 write routes share the generous 240/min global default; money-moving
   market/auction/shop mutations deserve a deliberate per-route cap pass.
4. **Two tuning constants live in code, violating "balance is data"** (ARCHITECTURE invariant):
   `simulation/engine.py:196` (disease decay 0.5/h in dry air) and `engine.py:181` (initial pest
   infestation 5.0). Moving them to `balance.yaml` is value-preserving but is a tuning-surface
   change — day-shift with tests. Same class: `economy/pricing.py:35` (0.5 quality floor), `:68`
   (THC bonus pivot 15%).
5. **The web test layer is stubbed.** `web/package.json` `test`/`test:e2e` scripts are `echo`
   stubs while vitest/playwright configs + specs exist in the tree. CI's web job (typecheck/lint/
   build) is real, but no web test actually runs anywhere. Reinstate the runners or the specs rot.
6. **Replit-residue cluster awaits archival, but it is coupled to the live deploy.** Root pnpm
   workspace (`package.json`, ~200KB `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `tsconfig*`,
   `.npmrc`), `artifacts/api-server` (Express healthz scaffold), `artifacts/mockup-sandbox`
   (shadcn/Vite dump), `lib/*`, `attached_assets/` — nothing canonical references them (CI uses
   only pip + `web/`), **but** `.replit`'s `[postMerge]`/`[agent]` blocks do. Archiving must edit
   `.replit` in the same change and needs confirmation that the Replit deployment is disposable.
   Deliberately NOT moved tonight (including the `pnpm-workspace.yaml` "packsges" typo — fixing it
   could change what a live Replit postMerge resolves).
7. **The Strain Codex manual is 6 strains behind the game** — `strains.yaml` seeds 22, the manual
   catalogues the original 16 (missing: Acapulco Gold, Maui Wowie, Chemdawg, AK-47, Bubba Kush,
   Super Lemon Haze). Content authoring, not a night fix; READMEs now say so honestly.

## ✅ FIXED TONIGHT (every commit atomic, gates green after each)

| Commit | Sev | What |
|---|---|---|
| `74cd754` | — | Protocol: independent audit of merged PR #3 → **PASS** (`docs/audits/PR-3-session-relay-protocol.md`) |
| `f8f811b` | — | `night-reports/SYSTEM-MAP.md`: full census, readiness scores, hunt list |
| `3d35c8f` | 🟢 | 13 unused imports + 1 unused local removed (ruff F401/F841), side effects preserved |
| `14f96cc` | 🟢 | `requirements.txt` full duplicate pin block removed (incl. ambiguous unpinned `anthropic`); vestigial `flask_api.py` `__main__` (port 5000) deleted — `server.py` is the one entry; tracked `egg-info/` untracked |
| `ef90267` | 🟡 | **`set_environment` validation**: non-numeric/null/NaN/inf body values were stored raw on the pod and TypeError'd every later sim read of every plant in it. Now coerced + bounded by `balance.yaml simulation.weather.clamps` (existing authority — zero tuning change) at the service chokepoint. +4 tests |
| `ae238c0` | 🟡 | **`cup_score` zero-norm guard**: `weight_norm_grams`/`thc_norm_pct`/`cbd_norm_pct` divided unguarded — a balance edit to 0 would crash every cup entry. House pattern from `curing.py`; bit-identical for positive norms (asserted against the old inline math). +1 test |
| `07ba733` | 🟡 | **Web robustness**: `session.tsx` localStorage now try/caught (privacy-mode browsers crashed on mount); `Toast.tsx` dismiss timers cleared on unmount + context value memoized; `next.config.mjs` tracing root derived instead of hardcoded `/home/runner/workspace/web` (identical on Replit, correct everywhere else) |
| `53caab8` | 🟢 | Doc-vs-code factual drift: 14→13 traits (code + codex enumeration agree), 16→22 strains where it means the seed, ~52→71 routes, 139→190 test badge, bare-pip Quick Launch → `make setup` per CLAUDE.md |

**Not fixed on purpose:** items 2–7 above (🔴/decision class), `pnpm-workspace.yaml` typo,
`scripts/src/hello.ts` scaffold log (archive candidates — touching them tonight risks the live
Replit deploy), web test stubs (needs dep + CI decision).

## 🗺️ SYSTEM MAP HIGHLIGHTS (full detail in SYSTEM-MAP.md)

- **Canonical:** `src/growpodempire/**` (backend), `web/` (client), `tests/`, `alembic/`,
  `server.py`. Replit-import residue identified and inventoried (see finding 6).
- **Production-readiness:** simulation 4/5 · services 4/5 · API 4/5 · ledger 4/5 · genetics 4/5 ·
  **chain 2/5** (mock-only: no funded TestNet, `ASA_ID` unset, no IPFS — open risk #4) · AI 4/5 ·
  db/alembic 4/5 · balance.yaml 4/5 · **web 3/5** (test layer stubbed).
- **Doc↔code drift:** factual counts fixed tonight; structural drift left for day shift
  (ARCHITECTURE services box omits cup/university/lecturer; BUILDLOG claims a Dockerfile+compose
  that never existed in tree or history).

## 🧪 TEST BASELINE

**185 → 190** (+4 `set_environment` validation incl. an engine round-trip regression test,
+1 `cup_score` zero-norm guard with old-math parity assertion). Coverage gate ≥79 holds.
Backend gates at end of shift: `make test` 190 passed · `make lint` · `make check-memory`
(18 files) · `make check-migrations` all green. Web gates: `tsc --noEmit`, `next lint`,
`next build` all green locally.

## ⏭️ RECOMMENDED MORNING PRIORITIES (ranked)

1. **Idempotency keys + wallet row-lock together** (open risk #3 + finding 2) — the baton's
   NEXT ACTION, already scoped; the lock closes the half of double-spend that idempotency alone
   doesn't.
2. **Decide the Replit question** (finding 6): if the Replit deploy is disposable, archive the
   residue cluster + edit `.replit` in one PR; if not, document it as a supported target.
3. **Reinstate web test runners** (finding 5) — vitest + playwright deps, un-stub scripts, wire
   into CI's web job.
4. **Rate-limit storage + per-route caps** (finding 3) — needs a Redis decision for prod.
5. **Move the two engine tuning constants into balance.yaml** (finding 4) with parity tests, then
   the codex content gap (finding 7).

## ⛔ SKIPPED / STUCK

- Nothing left half-done; every started item was either committed green or reverted to
  document-only. No merge conflicts with main (branch is fast-forward from `f7744b5`).
- GROVERS prototype work (the literal brief): unstartable here — see finding 1. If the owner
  points the next session at the actual prototype repo, tonight's process (map → severity-gated
  janitor → port-contract tests → audit) ports directly.
