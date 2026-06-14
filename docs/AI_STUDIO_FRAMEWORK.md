# AI Studio Framework — working concept

> **Status: concept / vision.** This is a *meta* design doc — it is about **how we build**,
> not about the game itself. It is the generalization of the system this repo already runs:
> the Session Relay Protocol (`docs/SESSION_PROTOCOL.md`) + the Layer 0–4 memory system
> (`docs/memory/README.md`) + the owner charter (`CLAUDE.md`). It lives in `docs/` (process),
> deliberately **not** in `docs/memory/design/` (that codex is the *game's* vision).
>
> Honesty tags, same discipline as the Design Codex:
> **✅ live** (running in this repo today) · **🔨 partial** (thin version exists) ·
> **⬜ concept** (not built — do not describe as if it works).

## Vision

A portable, AI-native multi-agent development framework that lets a team or solo founder operate
an entire software company through coordinated AI agents, persistent memory, role-based
responsibilities, and standardized handoff protocols.

**The goal is not autonomous coding. The goal is structured, supervised, high-throughput software
execution.** The human stays Director; the AI is the workforce. The system scales through
*structure, memory, and standardized handoffs* — not raw model intelligence alone.

## Why this concept has standing: GROWv2 already runs most of it

The strongest validation is that this isn't theoretical — it's an extraction of the live system
driving this repo. The gap to a *product* is enforcement and packaging, not invention.

| Framework pillar | State | Where it lives in GROWv2 today |
|---|---|---|
| One chat = one PR | ✅ live | `docs/SESSION_PROTOCOL.md` |
| Standardized handoffs (start/end) | ✅ live | `/handoff-audit` + `/closeout` skills |
| Persistent agent memory | ✅ live | `CLAUDE.md` + `docs/memory/` Layers 0–4 |
| The baton (next-chat-does-first) | ✅ live | `docs/HANDOFF.md` |
| Memory integrity gate | ✅ live | `scripts/check_memory.py` (`make check-memory`) |
| Human approval gates | ✅ live | CLAUDE.md "Owner delegation charter" + `.claude/settings.json` allowlist |
| Standard reporting format | ✅ live | the End-of-chat report (Asked / Done / Needs you) |
| Multi-role round-table | 🔨 partial | LUT standups (`docs/memory/standups/`) — *roles are a writing convention, not separate agents* |
| One chat = one **responsibility** (role) | ⬜ concept | not enforced — a single chat still plays planner+builder+auditor |
| Canonical machine-readable state table | ⬜ concept | state lives as *prose* in `HANDOFF.md`, not a lint-checked table |
| Skills marketplace / studio packs | ⬜ concept | — |

## Core principles (as stated)

- **One chat = one responsibility.** Roles: Planner, Builder, Frontend Designer, QA Tester,
  Security Monitor, Research Analyst, Performance Engineer, Product Manager, DevOps Coordinator,
  Documentation Writer. No role overlap.
- **One chat = one PR.** Start with audit/handoff → build one deliverable → open one PR → report
  → stop. Natural checkpoints; prevents context pollution.
- **Standard reporting format**, every role, identical structure:
  `Asked: / Done: / Risks: / Needs You: / Next:` (optional `Blocked: / Observations: /
  Recommendation:`). No essays, no hidden decisions, no ambiguity.
- **Human approval gates.** Agents never merge, modify prod, delete repos, rotate secrets, or
  deploy. Humans own: architecture decisions, merge order, priority changes, product direction,
  launch decisions.
- **Canonical state tables** (machine-readable single source of truth):
  `Internal | GitHub | Title | Status | Owner`, plus a roadmap
  (Phase 1 → MVP, Phase 2 → Closed TestNet, Phase 3 → Value-Bearing Launch).
- **Agent memory system** — persistent docs (`MEMORY.md`, `ROADMAP.md`, `HANDOFF.md`,
  `SESSION_PROTOCOL.md`, `SKILL.md`, charters, SOPs). Agents inherit state through documents,
  not just conversation context.
- **Monitoring layer** — Observe → Report → Warn → Recommend → Stop. No autonomous remediation.
  Event-driven, low-noise; park when idle, wake on defined conditions.

## The gap: from "we do this" to "it's a product"

Three pieces of real engineering stand between the live convention and a portable framework:

1. **Roles must become enforced subagents, not prose.** "One chat = one responsibility" is only
   real when each role is an actual agent with scoped tools and permissions — a Builder that
   *cannot* merge, a Monitor that *cannot* write code. Today a single agent is trusted to honor
   the role by convention, and routinely doesn't (this very session ran planner+builder+auditor
   in one chat). Harness support (subagents + per-role permission sets + hooks) is the work.

2. **State must become machine-readable + drift-checked.** The framework calls for a canonical
   `Internal | GitHub | Title | Status | Owner` table. Today that state is *prose* in
   `HANDOFF.md` — which is exactly why a recent session found the baton stale and wrong about a
   PR's status. The fix is the same pattern already proven by `check_memory.py`: state as data +
   a gate that fails when the table drifts from GitHub reality.

3. **It must lift out of `growpodempire` into a template/plugin.** A "Game Studio Pack" or
   "SaaS Builder Pack" means the protocol + memory scaffold + skills + hooks install clean into a
   new repo. Until it's extractable, it's a house style, not a framework.

## Long-term vision

An AI Operating System where a founder can: define company structure → create agent roles →
install skills → launch projects → review reports → approve decisions → and sleep while
supervised execution continues. **Skills marketplace:** package agent roles, SOPs, memory
structures, reporting templates, PR workflows, and industry playbooks — e.g. Game Studio,
Startup, Crypto Project, SaaS Builder, Agency, Research Lab packs.

## The one standing risk

This is a meta-project that competes for attention with shipping the actual game — and **the game
is the proof-of-concept that makes the framework credible/sellable.** GROWv2's MVP launch work
(feature-flag layer → sim test-clock → e2e grow-loop → FTUE) is mid-flight. Per the owner
charter, productizing the methodology is a direction-level scope decision: it should not displace
the launch without an explicit owner call. Build the framework *out of* a shipped game, not
*instead of* one.

## Related

- `docs/SESSION_PROTOCOL.md` — the live protocol this generalizes.
- `docs/memory/README.md` — the live Layer 0–4 memory system.
- `CLAUDE.md` — the live owner-delegation charter (the human approval gates).
