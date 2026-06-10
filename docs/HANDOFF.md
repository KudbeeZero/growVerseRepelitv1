# HANDOFF — the baton

> Single source of truth for **what the next chat does first**. Rewritten by `/closeout` at
> the end of every chat; read by `/handoff-audit` at the start of the next. If this file and
> the code disagree, the code wins — fix the baton. See `docs/SESSION_PROTOCOL.md`.

**Last rewritten:** 2026-06-10 · **By:** overnight maintenance shift (hunt/fix/document)
**Active branch:** `claude/grovers-night-shift-cm59p1`
**Open PR awaiting audit:** _this branch's PR — run `/handoff-audit` on it next chat._
**Previous PR audit status:** PR #3 audited this chat → **PASS**
(`docs/audits/PR-3-session-relay-protocol.md`); merged by owner, CI green on a real runner.

---

## NEXT ACTION (the one scoped item the next chat does)

**Idempotency keys on mutations + wallet concurrency guard (OPEN RISK #3, one workstream).**
A retry or double-click can double-post the ledger today, and `economy/ledger.py:61-71`
increments `wallet.version` without ever enforcing it (no optimistic-lock WHERE / row lock), so
two concurrent debits can both pass the `InsufficientFundsError` check. Fix both in one pass —
they close the two halves of the same double-spend class:
- Optional `Idempotency-Key` request header on money-moving mutations (care/buy/sell/bid/enroll/
  etc.): store key → response, replay the stored response on a duplicate, scope keys per player,
  expire after ~24 h.
- Enforce the wallet version (`UPDATE … WHERE version = :read_version`, retry/409 on miss) or
  `SELECT … FOR UPDATE` on the wallet row inside `post()`.
- Property test hammering one mutation with the same key concurrently; the ledger invariant
  (every spend posts exactly once) must hold.

- **Scope:** API layer + ledger.py + a small table/migration + tests. No engine, chain, or web.
- **Risks:** the key store must not become a second source of money truth — it stores
  *responses*; the ledger stays authoritative. Watch migration single-head
  (`make check-migrations`).
- **Off-limits:** sim/genetics/web work in that chat.

---

## What THIS chat did (overnight maintenance shift, one branch)

1. **Audited PR #3** (protocol step) → PASS with two cosmetic nits (coverage figure 79.26 vs the
   claimed 79.29; "teeth-tested" checkers had no committed test artifact).
2. **Mapped the repo** (`night-reports/SYSTEM-MAP.md`): canonical-vs-Replit-residue census,
   per-system production-readiness, doc↔code drift, severity-tagged hunt list. NB: the shift's
   own mission brief described "GROVERS canvas prototypes" that do not exist in this repo —
   documented, executed the maintenance mission against the real codebase instead.
3. **Fixed 5 🟡 + a 🟢 sweep** (8 atomic commits): `set_environment` input validation at the
   service chokepoint (ADR in `DECISIONS.md` — bounds reuse `simulation.weather.clamps`, no new
   tuning surface); `cup_score` zero-norm guard (curing.py house pattern, old-math parity
   asserted); web localStorage try/catch in `session.tsx`; Toast timer cleanup + memoized
   context; derived `outputFileTracingRoot` (was hardcoded Replit path); 13 unused imports;
   deduped `requirements.txt`; removed second Flask `__main__`; untracked `egg-info`; fixed
   factual doc drift (13 traits / 22 strains / 71 routes / 190 tests / venv Quick Launch).
4. **Reconciled two more false ✅ in `BACKLOG.md`:** the Vitest harness (71 tests) and Playwright
   e2e suite exist as files but their runners are `echo` stubs, deps absent, no CI jobs.
5. **Full audit trail:** `night-reports/NIGHT-AUDIT-2026-06-10.md` (7 critical findings, ranked
   morning priorities) + standup `docs/memory/standups/2026-06-10-lut-report-night.md`.

## Verification split (this chat)

**Agent-verifiable (proven — test-backed):**
- `make test` → **190 passed** (was 185; +5 new), coverage gate ≥79 holds · `make lint` ✅ ·
  `make check-memory` ✅ · `make check-migrations` ✅ (single head `e7a9c1b3f2d8`).
- Web: `tsc --noEmit` ✅ · `next lint` ✅ · `next build` ✅ (run locally in this container after
  the three web fixes).
- Every 🟡 fix carries a test or a gate proof; every commit message names its severity.

**Device/human-verifiable (owner, please confirm):**
- The Replit deployment still builds/runs after the `next.config.mjs` tracing-root change (the
  derived value is identical on Replit by construction, but only a real deploy proves it).
- Decide the **Replit-residue question** (night audit finding 6) before anyone archives the root
  pnpm workspace: is the Replit deploy disposable?

---

## OPEN RISKS (carried) — clears only when VERIFIED FIXED (test-backed)

| # | Sev | Risk | Evidence | Status |
|---|-----|------|----------|--------|
| 3 | HIGH | **No idempotency keys on mutations** + **wallet update unenforced version** (`economy/ledger.py:61-71`) — retries/double-clicks and concurrent debits can double-post/overdraft. | `BACKLOG.md`; `night-reports/SYSTEM-MAP.md` hunt 🟡-2 | OPEN → NEXT ACTION (both halves, one workstream) |
| 4 | MED | **Chain fully mocked.** No funded TestNet, `ASA_ID` unset, metadata not on IPFS. | `BACKLOG.md` | OPEN |
| 6 | MED | **Web test layer is phantom**: vitest/playwright specs + configs on disk, runners are `echo` stubs, no deps, no CI jobs (was claimed ✅ shipped). | `web/package.json:11-13`; annotations in `BACKLOG.md` | OPEN (new this chat) — reinstate runners + CI |
| 7 | MED | **Rate limits per-worker** (`memory://`, no `RATELIMIT_STORAGE_URI` in either deploy config) — caps double per worker and reset on recycle; most write routes share the 240/min default. | `night-reports/SYSTEM-MAP.md` 🟡-6/7 | OPEN (new this chat) — needs Redis decision |
| 8 | LOW | **Tuning constants in code** (engine.py:181,196 pest-init/disease-decay; pricing.py:35,68 formula shapes) violate "balance is data". Value-preserving moves, but tuning-surface changes. | night audit finding 4 | OPEN (new this chat) — day shift with parity tests |

> Risks #1/#2/#5 (phantom gates, unbounded sim reads, phantom hook) were FIXED 2026-06-10 and
> re-verified by this chat's PR #3 audit; see `docs/audits/PR-3-session-relay-protocol.md`.
