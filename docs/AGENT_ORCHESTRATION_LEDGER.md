# GrowPod Empire — Agent Orchestration Ledger (REC-004)

> **The roster of who-deploys-whom.** Where the [Studio Agent Registry](STUDIO_AGENT_REGISTRY.md)
> tracks *which directive owns which file surface*, this ledger tracks *how persistent employee
> chats deploy ephemeral sub-agents* — the self-deployment caps, the temporary `SA-XXX` audit
> numbers, and the Work Orders that move work between chats. It governs **orchestration**, not code.
>
> **Maintainer:** Records Department · **Authority:** Studio Director (Mission Control)
> **Protected surface:** yes — this file is single-writer; coordinate before editing.
> **Last updated:** 2026-06-14 (REC-004 — ledger created)

---

## Employee Self-Deployment Log

One row per persistent employee chat; update as it spawns or retires sub-agents.

| Employee | Current Sub-Agents Active | Max Allowed | Last Deployment |
|---|---|---|---|
|  |  | 10 |  |

## Active Sub-Agent Registry

One row per *live* sub-agent. Sub-agents are one-and-done; the `SA-#` is logged for traceability
only and the row is cleared when the sub-agent finishes.

| SA-# | Parent Employee | Task | Spawned | Status |
|---|---|---|---|---|
|  |  |  |  |  |

## Work Order Log

One row per Work Order. Update **Status** as it moves (`🟢 Open` / `🔨 Doing` / `✅ Done`).

| WO-# | Assignee | Title | Status |
|---|---|---|---|
| WO-001 | REC-A01 | Create the orchestration ledger | ✅ Done |
| WO-002 | REC-A01 | Employee vs Sub-Agent Rules | ✅ Done |
| WO-003 | REC-A01 | Mandatory Work Order Format | ✅ Done |
| WO-004 | REC-A01 + DX-A01 | Wire ledger into Studio Agent Registry | ✅ Done |
| WO-005 | REC-A01 | Draft self-deployment protocol (WO-006…010) | ✅ Done |
| WO-006 | (employee) | Self-deploy up to 10 sub-agents | 🟢 Open |
| WO-007 | (employee) | Assign SA-XXX audit numbers | 🟢 Open |
| WO-008 | (employee) | Write the "Prompt for Employee Chat" field | 🟢 Open |
| WO-009 | (employee) | Enforce the max-10 sub-agent cap | 🟢 Open |
| WO-010 | (employee) | One-and-done sub-agent logging | 🟢 Open |

## Employee Roster

One row per persistent employee chat (a long-term role with cross-session memory).

| Employee ID | Role | Persistent memory? | Notes |
|---|---|---|---|
|  |  |  |  |

---

## Employee vs Sub-Agent Rules

- **Persistent employee chat = a long-term role with cross-session memory.** An employee keeps
  context across sessions (its baton, its registry rows, its history) and owns a department slot
  such as `REC-A01` or `DX-A01`.
- **Sub-agent = ephemeral, one-and-done.** A sub-agent is spawned for a single task, runs, returns
  its result, and is gone. It is assigned a **temporary `SA-XXX` number for audit only** — the
  number exists for traceability, not as a standing identity.
- **Hard limit: max 10 active sub-agents per employee chat at any time.** Never exceed 10
  concurrently; let one finish before spawning the eleventh.
- **Self-deployment rule:** an employee **may** spawn its own sub-agents, but **must log the `SA-#`
  in this ledger immediately** (Active Sub-Agent Registry + bump its Self-Deployment Log row).
  Clear the row when the sub-agent finishes.

WO-002 complete.

---

## Mandatory Work Order Format

Every Work Order in GrowPod Empire uses this exact 5-field structure:

1. **Name/Role** — the employee or slot that owns the WO (e.g. `REC-A01`).
2. **What's Needed** — the one-line outcome the WO delivers.
3. **Problem** — why it's needed; the gap or friction it closes.
4. **What Needs to Happen** — the concrete steps / acceptance criteria.
5. **Prompt for Employee Chat** — the paste-ready prompt that hands the WO into a chat, ending
   with a `WO-### complete` line.

All future work orders in GrowPod Empire must use this format.

WO-003 complete – format locked.

---

## Work Orders — Self-Deployment & Handoff Protocol

The standing protocol every employee follows to deploy and log its own sub-agents.

### WO-006 — Self-deploy up to 10 sub-agents
- **Name/Role:** any employee chat.
- **What's Needed:** authority + steps to spawn sub-agents without a Director round-trip.
- **Problem:** employees stall waiting for permission to parallelize one-off work.
- **What Needs to Happen:** spawn 1–10 sub-agents for independent subtasks; never exceed 10 live.
- **Prompt for Employee Chat:** "Spawn N (≤10) sub-agents for these independent subtasks; log each
  before they run. WO-006 complete."

### WO-007 — Assign SA-XXX audit numbers
- **Name/Role:** the spawning employee.
- **What's Needed:** a unique, traceable id per sub-agent.
- **Problem:** un-numbered sub-agents can't be audited after they vanish.
- **What Needs to Happen:** assign the next free `SA-XXX`; record it in the Active Sub-Agent Registry.
- **Prompt for Employee Chat:** "Assign each sub-agent the next `SA-XXX` and log it. WO-007 complete."

### WO-008 — Write the "Prompt for Employee Chat" field
- **Name/Role:** the spawning employee.
- **What's Needed:** a clean, paste-ready handoff prompt per sub-agent/WO.
- **Problem:** vague handoffs lose context and cause rework.
- **What Needs to Happen:** write the prompt in the 5-field format; end it with a `complete` line.
- **Prompt for Employee Chat:** "Draft the paste-ready prompt in 5-field format. WO-008 complete."

### WO-009 — Enforce the max-10 sub-agent cap
- **Name/Role:** the spawning employee.
- **What's Needed:** a hard ceiling of 10 concurrent sub-agents.
- **Problem:** unbounded fan-out makes orchestration un-auditable.
- **What Needs to Happen:** before spawning, count live `SA-#` rows; if ≥10, wait for one to finish.
- **Prompt for Employee Chat:** "Confirm <10 sub-agents live before spawning. WO-009 complete."

### WO-010 — One-and-done sub-agent logging
- **Name/Role:** the spawning employee.
- **What's Needed:** sub-agents that terminate and leave a clean audit trail.
- **Problem:** lingering sub-agents inflate the live count and blur ownership.
- **What Needs to Happen:** on finish, mark the `SA-#` done and clear its row; the number stays only
  in history for traceability.
- **Prompt for Employee Chat:** "Mark the sub-agent done, clear its row, keep the number logged.
  WO-010 complete."

WO-005 complete – deployment protocol drafted.
