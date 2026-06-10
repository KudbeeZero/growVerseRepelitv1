# SYSTEM MAP — overnight maintenance shift (Cartographer)

**Date:** 2026-06-10 · **Repo:** `/home/user/growVerseRepelitv1` (GROWv2, package `growpodempire`)
**Branch at survey time:** `claude/grovers-night-shift-cm59p1` (off `main` @ `f7744b5`)

> ## ⚠️ MISSION-BRIEF CORRECTION — READ FIRST
> The night-shift mission brief described **"GROVERS single-file HTML5 canvas prototypes."
> Those do NOT exist anywhere in this repository.** There are no single-file HTML5/canvas game
> prototypes here (the only `index.html` is the Vite shell in `artifacts/mockup-sandbox/`, a
> Replit UI scaffold — see census below). This repo is the **production GROWv2 game**: a
> Python/Flask backend (`src/growpodempire/`), a Next.js 15 client (`web/`), SQLAlchemy+Alembic,
> an Algorand chain layer, and an AI advisor. All night-shift work must treat `src/` + `web/`
> as production code under the invariants in `CLAUDE.md` / `docs/memory/ARCHITECTURE.md`.

---

## 1. Repo inventory & canonical-vs-residue census

Ground truth for "what does CI/deploy actually use": `.github/workflows/ci.yml` runs
**(a)** a backend job — `pip install -r requirements.txt -r requirements-dev.txt`, `pip install -e .`,
ruff, `scripts/check_memory.py`, `scripts/check_single_head.py`, `alembic upgrade head`, pytest —
and **(b)** a web job — `cd web && npm ci && npm run typecheck && npm run lint && npm run build`
(cache key: `web/package-lock.json`). **CI never touches pnpm, the root `package.json`,
`artifacts/`, or `lib/`.** Deploy entry points: `render.yaml` → `gunicorn server:app`;
`.replit` workflows → `gunicorn server:app` + `cd web && npm run start`.

| Path | What it is | Referenced by | Verdict |
|---|---|---|---|
| `src/growpodempire/**` | The canonical backend (api/services/simulation/economy/genetics/chain/ai/db/data) | CI, Makefile, server.py, render.yaml, .replit, alembic | **CANONICAL** |
| `web/` | Next.js 15 client (App Router, TS, Tailwind, React Query, zustand). Own `package-lock.json`, npm-managed | CI web job, .replit "GrowPod Web" workflow, replit.md | **CANONICAL** |
| `tests/` | 35 pytest files, 185 test functions; property/invariant tests for ledger+genetics | CI, Makefile | **CANONICAL** |
| `alembic/` + `alembic.ini` | 12 forward-only migrations, single head `e7a9c1b3f2d8` | CI (`alembic upgrade head`), render.yaml preDeploy, `make check-migrations` | **CANONICAL** |
| `scripts/check_memory.py`, `scripts/check_single_head.py` | Memory-integrity + migration-fork CI gates | CI, Makefile | **CANONICAL** |
| `server.py` | The WSGI entry (`server:app`) wrapping `create_app()` | Makefile `serve`, render.yaml, .replit, replit.md | **CANONICAL** (entry point) |
| `Makefile`, `pyproject.toml`, `setup.py`, `requirements*.txt` | Build/test tooling. Note: `requirements.txt` contains a **duplicated dependency block** (every pin listed twice, plus `anthropic` both pinned `>=0.49.0` and unpinned) | CI, Makefile, hooks | **ACTIVE-CONFIG** |
| `render.yaml` | Render deploy: Postgres, `pip install`, `alembic upgrade head` + seed preDeploy, gunicorn | self-contained; mirrors config.py comments | **ACTIVE-CONFIG** (see §4 — one of two deploy targets) |
| `.replit`, `.replitignore`, `replit.md` | Replit deploy: two workflows (gunicorn :8000, `web npm run start` :3000), `[userenv.shared]` env. `replit.md` is fresh (2026-06-10) and accurate | self; replit.md cross-links CLAUDE.md | **ACTIVE-CONFIG** (the apparently-live deploy target) |
| `docs/` (memory/, manual/, audits/, research/, HANDOFF.md, SESSION_PROTOCOL.md) | Layered memory system + player manual + relay protocol | CI (check_memory), CLAUDE.md, hooks | **CANONICAL** (some manual content stale — see §3) |
| `.claude/` (hooks, skills, settings) | SessionStart hook (`make setup` best-effort + prints baton), relay skills | CLAUDE.md, SESSION_PROTOCOL | **ACTIVE-CONFIG** |
| `package.json` (root) | pnpm workspace shell (`name: "workspace"`), scripts only typecheck/build `artifacts/**`+`scripts`+`lib` | pnpm-workspace.yaml, .replit `[agent] stack="PNPM_WORKSPACE"` | **RESIDUE** (Replit agent-stack scaffold; CI/web never use it) |
| `pnpm-lock.yaml` (~200 KB), `pnpm-workspace.yaml`, `.npmrc`, `tsconfig.json`, `tsconfig.base.json` | The rest of the pnpm-workspace scaffold. Workspace members: `artifacts/*`, `lib/*`, `scripts` | each other; nothing canonical | **RESIDUE** (archive together; see caveat below) |
| `artifacts/api-server/` | A generic Express+pino server scaffolding **serving only `/api/healthz`** (`src/routes/` has just `health.ts`). Has its own `.replit-artifact/artifact.toml` Replit-artifact deploy descriptor. Fully superseded by the Flask backend | only root package.json filter + pnpm-workspace.yaml + its own artifact.toml | **RESIDUE** — nothing canonical imports it |
| `artifacts/mockup-sandbox/` | A Vite + React + full shadcn/ui component dump (50+ `components/ui/*.tsx`) with `@replit/vite-plugin-cartographer` — Replit's design-mockup sandbox. `web/` imports **none** of it (web has its own hand-rolled `components/ui/`) | only pnpm workspace files | **RESIDUE** |
| `lib/db/` | Drizzle ORM package whose schema is **empty** (`lib/db/src/schema/index.ts` is commented boilerplate ending `export {}`). The real DB is SQLAlchemy/Alembic | pnpm-workspace, `scripts/post-merge.sh` (`pnpm --filter db push` — a no-op push of an empty schema) | **RESIDUE** (and actively misleading next to the real Alembic stack) |
| `lib/api-spec/` | `openapi.yaml` describing **only `/healthz`** — a stub, NOT the real game API (the real spec is generated live at `/openapi.json`) | orval codegen below | **RESIDUE** |
| `lib/api-client-react/`, `lib/api-zod/` | Orval-generated client/zod types **from the stub healthz spec** | pnpm-workspace only; `web/` uses its own `src/lib/api/` client | **RESIDUE** |
| `scripts/package.json`, `scripts/tsconfig.json`, `scripts/src/hello.ts`, `scripts/post-merge.sh` | JS half of `scripts/`: a hello-world scaffold + a Replit post-merge hook that runs `pnpm install` + the empty drizzle push | .replit `[postMerge]` → post-merge.sh | **RESIDUE** (the two `check_*.py` files in the same dir are CANONICAL — split carefully) |
| `attached_assets/` | One pasted Replit-agent mission prompt (`Pasted-This-repo-GROWv2...txt`) — the import's setup instructions | nothing | **RESIDUE** (archive; harmless historical context) |
| `BUILDLOG.md` | Flat shipping log (maintained) | replit.md, docs | **ACTIVE-CONFIG** (doc) |
| `.env.example` | Config reference; all keys are read by code **except `WALLET_ENCRYPTION_KEY`** (grep: zero consumers) | humans | **ACTIVE-CONFIG** (one dead key) |

**Archiving caveat (for the night shift):** `.replit` wires the residue in two places —
`[agent] stack = "PNPM_WORKSPACE"` and `[postMerge] path = "scripts/post-merge.sh"`. Archiving the
pnpm workspace without editing `.replit` will break Replit's post-merge hook. The safe unit of
archive is: `artifacts/`, `lib/`, `attached_assets/`, root `package.json`/`pnpm-lock.yaml`/
`pnpm-workspace.yaml`/`.npmrc`/`tsconfig.json`/`tsconfig.base.json`, `scripts/{package.json,
tsconfig.json,src/,post-merge.sh}` **plus** removal of the `[postMerge]` block (and ideally the
agent stack line) from `.replit`. CI proves none of this is needed to build, test, or deploy.

---

## 2. System decomposition (canonical backend + web)

### simulation engine — `src/growpodempire/simulation/` — **4/5**
- **Entry points:** `engine.catch_up(session, plant, now, cfg)` / `advance_to`; pure helpers
  `horticulture.py` (VPD/DLI), `curing.py` (`cure_progress`), `reactions.py` (condition flags),
  `conditions.py`, `clock.py`.
- **Owns:** plant trajectory derivation (water/nutrient decay, pest/disease, health drift, stage
  clock, dormancy snap) — all derived, compute-on-read, hour-seeded RNG (`_rng_for`, engine.py:33).
- **Shares:** mutates `Plant` rows + appends `PlantEvent` rows (db); reads the `simulation:` block
  of `balance.yaml` via `cfg.raw`; reads `GrowPod` env + automation flags.
- **Hidden couplings:** environment is sampled **once** per catch-up (engine.py:243) — correct only
  because `SimulationService.set_environment` syncs every plant under the old env first
  (simulation_service.py:204-211); engine trusts pod env fields to be numeric (see hunt 🟡-1);
  two tuning constants are hardcoded in code, not balance.yaml (see 🔴 section).
- **Score: 4** — deterministic, parity/property-tested, cost-bounded (dormancy); loses a point for
  Phase-A breadth (light/VPD only; 11 of 13 genes unread) and the unvalidated-env crash path.

### services layer — `src/growpodempire/services/` (16 services) — **4/5**
- **Entry points:** `GameService` (1,098 lines: breed/stabilize/market/auctions/harvest/verify),
  `SimulationService` (care, env, consumables, sync), plus settlement, minting, research, contract,
  leaderboard, weather, leveling, progression, advisor, autocare, cup, university, lecturer.
- **Owns:** all player-scoped economy/research/perk logic (correctly kept out of the pure engine).
- **Shares:** db session (caller-scoped via `session_scope`), ledger, providers.
- **Hidden couplings:** `research_effects()` modifier dicts consumed by string key across services;
  `SpendGuard` budget in autocare is the only thing standing between an agentic AI loop and the
  ledger (by design, and tested).
- **Score: 4** — well-layered, every service has tests; idempotency on retries is the known open
  risk (HANDOFF "NEXT ACTION").

### API layer — `src/growpodempire/api/` — **4/5**
- **Entry points:** `flask_api.create_app()` (CORS allowlist, ProxyFix, limiter, error envelope,
  observability, OpenAPI at `/openapi.json` + `/docs`), `game_api.py` blueprint — **71 route
  handlers** under `/api/game`.
- **Owns:** request shaping only; `auth.require_player` (API-key writes), `ratelimit.py`
  (global default 240/min keyed by IP + tighter per-route caps: players 30/h, withdraw 10/min, etc.),
  `validation.py` (positive_int/bounded_int/positive_money).
- **Hidden couplings:** rate-limit storage defaults to `memory://` — per-worker buckets under the
  2-worker gunicorn both deploy targets use (documented in .env.example, but no Redis is wired in
  either render.yaml or .replit env).
- **Score: 4** — auth/limits/validation/observability all real; minus one for no idempotency keys
  and the unvalidated `set_environment` body (🟡-1).

### ledger / economy — `src/growpodempire/economy/` — **4/5**
- **Entry points:** `ledger.post()` (append-only `LedgerEntry` + denormalized
  `wallet.cached_balance`, `InsufficientFundsError` guard), `ledger.recompute_balance()` (audit),
  `pricing.py` (pure Decimal formulas: seed/breeding/harvest/cup_score), `config.py`.
- **Owns:** the money truth. All `Decimal`, quantized to 1e-6 (matches planned ASA decimals).
- **Hidden couplings:** `wallet.version` is incremented but **never used for optimistic locking**
  (🟡-2); pricing divides by balance.yaml norm constants (🟡-3).
- **Score: 4** — invariant property tests exist; concurrency (lost-update under multi-worker
  Postgres) and retry idempotency are the residual risks, both already on the carried-risks ledger.

### genetics / strains — `src/growpodempire/genetics/` + `data/strains.yaml` — **4/5**
- **Entry points:** `traits.py` (`TRAIT_SPECS` — **13 traits**: 9 base + 4 terpenes),
  `breeding.py` (`cross()` — dominance-weighted blend + seeded Gaussian segregation).
- **Owns:** genome construction, rarity assignment, terpene expression.
- **Shares:** `BreedingEvent.rng_seed` makes every cross replayable —
  `GameService.verify_strain`/`verify_lineage` + public `/provenance` & `/lineage` routes.
- **Score: 4** — deterministic, provably-fair, property-tested; docs disagree with themselves on
  trait count (§3).

### chain providers — `src/growpodempire/chain/` — **2/5**
- **Entry points:** `provider.py` ABC (+ `TREASURY` sentinel), `mock.py` (deterministic, CI),
  `algorand.py` (py-algorand-sdk, TestNet), `factory.py` (config-picked), `metadata.py` (ARC-3),
  `token.py`; ops script `scripts/reset_asa.py`.
- **Owns:** nothing gameplay-true (correct per invariant #1 — chain mirrors DB).
- **Score: 2** — the abstraction is real and tested via mock, but live wiring is not: `ASA_ID`
  unset, metadata not on IPFS, treasury custody unencrypted (ARCHITECTURE risk list). Sprint 4 work.

### AI providers — `src/growpodempire/ai/` — **4/5**
- **Entry points:** `provider.py` ABC + Pydantic `AdvisorReport`; `mock.py` / `claude.py`
  (advisor), `autocare.py` (Mock rule-loop / Claude `@beta_tool` runner), `lecturer_mock.py` /
  `lecturer_claude.py` (University professor), `factory.py`.
- **Owns:** advice text + bounded tool-calls; all spending flows through normal care paths behind
  `SpendGuard`.
- **Score: 4** — CI-safe mocks, clean error surfacing with request-id logging; real-provider paths
  are inherently unexercised in CI (by design).

### db / models + alembic — `src/growpodempire/db/` + `alembic/` — **4/5**
- **Entry points:** `models.py` (493 lines, ~20 tables), `session.py` (lazy engine,
  `session_scope`), `seed.py` (idempotent 22-strain upsert), 12 migrations, single head enforced
  by `scripts/check_single_head.py` in CI.
- **Hidden couplings:** `init_db()` (`create_all`) runs on app boot — convenient for SQLite but
  means prod schema truth is *also* reachable outside Alembic; `datetime.utcnow` naive timestamps
  throughout (consistent, but a Postgres-tz migration foot-gun to keep in mind).
- **Score: 4** — migrations CI-tested forward-only; minus one for the create_all/migration duality.

### balance.yaml data layer — `src/growpodempire/data/` — **4/5**
- **Files:** `balance.yaml` (383 lines — economy, simulation, research tree, shop, cup, auto_care),
  `strains.yaml` (22 strains), `strain_knowledge.yaml` (22-entry KB, 1:1-sync-tested),
  `curriculum.yaml` (University).
- **Score: 4** — genuinely the tuning surface; two engine constants leaked into code (🔴 section)
  and zero-value norms can divide-by-zero (🟡-3).

### web client — `web/` — **3/5**
- **Entry points:** App Router pages (`src/app/**`), `providers.tsx` (React Query + session +
  toast), `lib/api/client.ts` (typed fetch, same-origin-relative default, X-API-Key injection),
  `next.config.mjs` (CSP/security headers + `/api/*` rewrite proxy to `BACKEND_URL`).
- **Owns:** session (localStorage key+playerId via `lib/session.tsx`), optimistic UI only — server
  authoritative; polling (`usePlantState`, 7 s, stops on dead/harvested) drives the lazy sim.
- **Hidden couplings:** `NEXT_PUBLIC_API_BASE` baked at build time (mitigated by relative-URL
  default); hardcoded Replit `outputFileTracingRoot` (🟡-5); CSP requires prod builds (dev-mode
  eval never hydrates — documented in replit.md).
- **Score: 3** — clean architecture, CI typecheck/lint/build green, careful cleanup in effects
  (Countdown/Modal/Constellation all tear down correctly); but the **test layer is stubbed out**
  (`"test": "echo 'vitest not installed...'"`) while vitest.config.ts, playwright.config.ts,
  `e2e/smoke.spec.ts`, and `src/components/viz/__tests__/` all exist — zero executed web tests.

---

## 3. Doc ↔ code drift audit

`docs/memory/MAP.md` + `ARCHITECTURE.md` are the contract; `make check-memory` guards links and
✅-citations but **not numeric claims** — and that's where all the drift lives:

1. **Trait count is internally inconsistent.** `docs/memory/design/02-genetics.md:12-13` says
   "**14 traits**" then enumerates **13** (9 base + 4 terpenes); `MAP.md:55` repeats "14-trait
   core"; code truth is **13** (`genetics/traits.py:44-56`, `TRAIT_SPECS` = 9 + `TERPENE_TRAITS`).
   README.md:151 still says "**9 inheritable traits**" (pre-terpene). Three different numbers in
   docs; one in code.
2. **Route count stale.** `MAP.md:89` claims "~52 routes under `/api/game`"; actual is **71**
   handlers in `api/game_api.py` (Cup + University waves were never reflected).
3. **Strain count stale in the player docs.** README.md:78,174, `docs/manual/README.md:21`,
   `docs/manual/getting-started.md:45`, `docs/manual/strain-codex.md:14` all say "**16 founding
   strains**"; the catalog (`data/strains.yaml`) and KB have **22** (MAP.md says 22, correctly).
   The strain-codex manual therefore documents only 16 of 22.
4. **Test-count badge stale.** README.md:30 badge says "TESTS 139 green"; the suite is **185**
   (HANDOFF verification + 185 collected test functions).
5. **README Quick Launch contradicts Layer 0.** README.md:170-183 instructs bare
   `pip install -r requirements.txt` with no `PYTHONPATH=src` note; CLAUDE.md explicitly warns the
   bare-pip path breaks on distro PyYAML and mandates `make setup`.
6. **BUILDLOG claims artifacts that don't exist.** BUILDLOG.md:23 — "`feature/dockerize` (merged) ·
   Dockerfile + compose (Postgres) + gunicorn server" — **no Dockerfile or docker-compose exists**
   anywhere in the tree or in this clone's git history (likely lost in the Replit import squash).
   Also BUILDLOG.md:47-48 describes a "path-filtered web CI workflow"; today's `ci.yml` web job is
   not path-filtered (runs on every push/PR — arguably better, but the log describes a different
   artifact).
7. **ARCHITECTURE system map omits three shipped services.** The `services/` box
   (ARCHITECTURE.md:19-22) lists 12 services; code has 16 — `cup_service`, `university_service`,
   `lecturer_service`, `game_service` missing from the diagram (MAP.md covers cup/university, so
   this is Layer-1 lag, not a phantom).
8. **`.env.example` documents a key nothing reads:** `WALLET_ENCRYPTION_KEY` (zero grep hits in
   `src/`). Conversely `ALGORAND_NETWORK` is read by `config.py` but absent from `.env.example`
   (it appears only in the pasted Replit prompt).
9. **Stale planning docs (already self-acknowledged in BACKLOG):** `docs/ROADMAP.md` shows shipped
   sprints as ⬜/🔨; `docs/NEXT_SESSION_SPRINT3.md` is a handoff for a sprint that finished.
10. **replit.md** — checked against `.replit`, `next.config.mjs`, `client.ts`, and
    `game_api.py:44` (30/h player-create limit): **accurate, no drift found.** Same for the
    Makefile targets cited in CLAUDE.md (all exist).

---

## 4. "Built but unused" census

| Item | Evidence | Recommendation |
|---|---|---|
| **Two deployment targets: `render.yaml` vs `.replit`** | Both fully configured for the same `gunicorn server:app`. replit.md freshly maintained (2026-06-10) and `.replit` carries live env; render.yaml references a Render Postgres + autoDeploy on `main`. config.py/server.py comments say "Render injects…" | **Keep both, but document which is live** (evidence points to Replit). If Render is dead, render.yaml is one `git mv` from archive — but verify no Render service is still auto-deploying `main` first. |
| **`server.py` vs `flask_api.py.__main__`** | server.py is the canonical entry (Makefile/render/.replit). `flask_api.py:77-82` has a second vestigial dev `__main__` on port **5000** (server.py uses 10000) | Salvage: delete the `__main__` block in flask_api.py (🟢-15). |
| **Root pnpm workspace vs `web/package.json`** | CI uses **`web/` + npm ci** exclusively. The root pnpm workspace exists only for the Replit agent stack | Archive the whole workspace unit (see §1 caveat re `.replit [postMerge]`/`[agent]`). |
| **`lib/db` drizzle package** | Schema file is empty boilerplate (`export {}`); `scripts/post-merge.sh` "pushes" it on every Replit merge — a no-op that *looks* like a second database authority next to Alembic | Archive with the workspace; it violates the spirit of "DB is authoritative (SQLAlchemy)". |
| **`lib/api-spec` + generated `lib/api-zod`/`lib/api-client-react`** | Spec covers only `/healthz`; the real spec is generated at `/openapi.json`. web/ has its own client | Archive. (If a typed client is ever wanted, regenerate orval **from the live `/openapi.json`** instead — note that as a salvage idea, not an action.) |
| **`artifacts/api-server`** | Express healthz-only scaffold + Replit artifact descriptor; superseded by Flask | Archive. |
| **`artifacts/mockup-sandbox`** | shadcn/ui Vite sandbox; web/ imports none of it | Archive. (Salvage option: if the team ever wants shadcn in web/, this is a reference dump, nothing more.) |
| **Web test scaffolding without runners** | `web/vitest.config.ts`, `web/playwright.config.ts`, `web/e2e/smoke.spec.ts`, `web/src/components/viz/__tests__/graphAdapters.test.ts` exist; `web/package.json` `test`/`test:watch`/`test:e2e` are **echo stubs** and vitest/playwright are not in devDependencies | **Salvage** — this is finished work one `npm i -D vitest @playwright/test` away from running. Highest-value reactivation in the repo. Do NOT archive. |
| **`.env.example: WALLET_ENCRYPTION_KEY`** | No consumer in src/ | Dead config key: remove or implement when player-key custody ships (it's a named ARCHITECTURE risk — probably keep as a documented placeholder, but mark it "not yet read by code"). |
| **`ENABLE_AUTO_CARE`, `USE_MOCK_*`, `RNG_SEED`, `RATELIMIT_*`, `MAX_WITHDRAWAL_PER_DAY`** | All genuinely read (config.py, settlement_service.py:60, snapshot.py:196-202) | In use — not dead. |
| **Seasonal-strain gate** | `strains.season` defaults `"all"`; `events.current_season` never rotated | Dormant-by-design LiveOps lever, not residue. Leave. |
| **`growpodempire/scripts/{snapshot,reset_asa}.py`** | Ops CLIs; not wired to any scheduler/cron in either deploy target | Salvage: wire snapshot.py to a scheduler when prod matters; harmless now. |
| **`src/growpodempire.egg-info/`** | Build artifact tracked in the tree | Should be gitignored (it's generated by `pip install -e .`). |
| **`docs/NEXT_SESSION_SPRINT3.md`, stale ROADMAP states** | BACKLOG already tracks both as 🔴 ⬜ | Leave for the documented backlog items; don't double-fix. |

---

## 5. Hunt list for the Janitor

### 🟢 LOW (dead code, unused imports, leftovers, typos)
1. 🟢 `src/growpodempire/chain/mock.py:9` — unused import `Optional` (ruff F401)
2. 🟢 `src/growpodempire/services/advisor_service.py:20` — unused import `GameError`
3. 🟢 `src/growpodempire/services/autocare_service.py:11` — unused import `Decimal`
4. 🟢 `src/growpodempire/services/game_service.py:26` — unused import `Rarity`
5. 🟢 `tests/conftest.py:10` — unused import `tempfile`
6. 🟢 `tests/test_advisor.py:15` — unused import `Plant`
7. 🟢 `tests/test_contracts.py:5` — unused import `timedelta`
8. 🟢 `tests/test_curing.py:6` + `:13` — unused `Decimal`, `Harvest`
9. 🟢 `tests/test_leaderboards.py:45` — local `idler` assigned, never used (ruff F841)
10. 🟢 `tests/test_progression.py:5` — unused import `timedelta`
11. 🟢 `tests/test_properties.py:22` — unused import `Rarity`
12. 🟢 `tests/test_simulation.py:11` — unused imports `GrowPod`, `Plant`
13. 🟢 `requirements.txt:20-33` — entire dependency block duplicated (every pin listed twice; `anthropic` appears both as `>=0.49.0` and unpinned — the unpinned one silently wins resolution ambiguity)
14. 🟢 `src/growpodempire/api/flask_api.py:77-82` — vestigial `__main__` dev entry on port 5000 (server.py is the entry, port 10000); delete to keep one entry point
15. 🟢 `web/src/components/ui/Toast.tsx:34` — `setTimeout` never cleared on provider unmount (setState-after-unmount); `:37-41` — `api` object rebuilt every render (context value not memoized → all consumers re-render on any toast change)
16. 🟢 `pnpm-workspace.yaml:20` — typo "packsges" (moot if the workspace is archived)
17. 🟢 `scripts/src/hello.ts:1` — scaffold `console.log("Hello from @workspace/scripts")` (archive with workspace)
18. 🟢 `web/package.json:9-11` — `test*` scripts are `echo` stubs (see §4 salvage — fix by reinstating runners, not by deleting the configs)
19. 🟢 `src/growpodempire.egg-info/` — generated build metadata tracked in git; add to `.gitignore`

### 🟡 MID (missing guards / robustness)
1. 🟡 **`src/growpodempire/api/game_api.py:643-654` + `services/simulation_service.py:184-196` —
   `set_environment` accepts unvalidated values.** The route checks the 5 keys are *present* but
   never that they're numeric, non-null, or in range (`validation.py` helpers are imported at
   game_api.py:27 but unused here). A body like `{"temperature": "hot", ...}` or
   `{"humidity": null}` is stored on the pod; the next sim read then TypeErrors in
   `engine._health_target` (engine.py:100-119) / `horticulture.vpd_kpa` (engine.py:129) — note
   `engine._env_for` (engine.py:74-80) gates only on `pod.temperature is not None` and passes
   `pod.humidity` through raw (`GrowPod.humidity` is `Optional[float]`, models.py:224). Fix:
   coerce + bound all five inputs at the route (bounds are display/physics sanity, not tuning).
2. 🟡 **`src/growpodempire/economy/ledger.py:61-71` — wallet update has no concurrency guard.**
   `wallet.version` is incremented but never enforced (no optimistic-lock WHERE clause, no
   `SELECT … FOR UPDATE`). Under 2-worker gunicorn + Postgres, two concurrent debits can read the
   same `cached_balance` and both commit → lost update / overdraft past the
   `InsufficientFundsError` check. Companion to the HANDOFF "idempotency keys" NEXT ACTION
   (open risk #3) — flag for the same workstream, don't fix piecemeal tonight.
3. 🟡 **`src/growpodempire/economy/pricing.py:111-118` — `cup_score` divides by tunable norms**
   (`weight_norm_grams`, `thc_norm_pct`, `cbd_norm_pct`) with no zero-guard; a balance.yaml edit
   to 0 → ZeroDivisionError on every cup entry. `curing.py:54` shows the house pattern
   (`if optimal > 0 else 1.0`). Adding the guard changes no current values.
4. 🟡 **`web/src/lib/session.tsx:34-48` — raw `localStorage` access without try/catch.** The
   sibling `lib/api/client.ts:37-46` deliberately wraps localStorage ("can throw — privacy mode,
   disabled storage") but the SessionProvider's hydrate effect and `login`/`logout` callbacks do
   not; in storage-disabled browsers the app crashes on mount instead of degrading to
   logged-out.
5. 🟡 **`web/next.config.mjs:51` — `outputFileTracingRoot: "/home/runner/workspace/web"`**
   hardcoded Replit absolute path; on any other machine/CI the trace root is wrong (mis-traced
   standalone output / warnings). Should be derived (`process.cwd()` / import.meta) or
   env-gated.
6. 🟡 **Rate-limit storage is per-worker in both deploy configs.** `ratelimit.py:30-33` defaults
   to `memory://`; neither `render.yaml` envVars nor `.replit [userenv.shared]` sets
   `RATELIMIT_STORAGE_URI`, so with `--workers 2` every documented cap is effectively doubled and
   resets on worker recycle. .env.example documents the fix (Redis URI); the deploy configs never
   apply it. Config-only change.
7. 🟡 **`src/growpodempire/api/game_api.py` — most of the ~60 write routes rely only on the
   global 240/min default.** Tighter caps exist on player-create (line 44, 30/h), two routes at
   530/554 (20/min, 10/min), and five more (759-930). Money-moving market/auction/shop/care
   mutations otherwise share the generous default. Worth a deliberate pass — list which mutations
   deserve per-route caps (decision, not a mechanical fix).

### 🔴 DOCUMENT-ONLY (touches balance/tuning — do NOT change tonight)
1. 🔴 `simulation/engine.py:196` — disease decay in dry air is a hardcoded `0.5`/hour, and
   `engine.py:181` — initial pest infestation level is a hardcoded `5.0`. Both are gameplay tuning
   constants living in code, violating "balance is data, not code" (ARCHITECTURE invariant #7).
   Moving them to `balance.yaml` preserves values but **is a tuning-surface change** — needs a
   day-shift decision + tests.
2. 🔴 `economy/pricing.py:35` (`quality_factor` 0.5 floor), `:68` (THC bonus pivot at 15%) —
   formula shapes hardcoded; consistent with current balance.yaml exponents but any "cleanup"
   here is a balance change. Leave.
3. 🔴 `genetics/traits.py:44-56` — trait bounds/segregation sigmas; the 13-vs-14 doc drift (§3.1)
   should be fixed **in the docs**, never by adding a trait.
4. 🔴 `balance.yaml` faucet/sink magnitudes (starting_balance 500, stipend 50, etc.) — observed,
   not audited; any inflation concern goes to the day shift with the ledger sums from
   `scripts/snapshot.py`, not a night edit.

---

*Survey method: every verdict above is grep-backed (references checked against
`.github/workflows/ci.yml`, `Makefile`, `render.yaml`, `.replit`, root and web `package.json`,
and full-tree import greps). Ruff findings from `ruff check --select=F401,F841,B006` (read-only).
No files outside `night-reports/` were modified; no test/npm gates were run.*
