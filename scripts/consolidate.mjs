#!/usr/bin/env node
// Consolidator for the GROWv2 Night/Audit/Quantum cycle.
//
// Reads every reports/night-<agent>.ndjson, enforces the Evidence Contract
// mechanically (§1.1), dedupes by `dedupe_key` (§2), flags contradictions as
// `disputed` (§1.5), and emits the Audit shift's input. A finding without valid
// evidence is REJECTED here — "never hallucinate" is enforced, not requested.
//
// Outputs:
//   consolidated/findings.json   — accepted + merged, ready for Jordan-Audit
//   consolidated/rejected.json    — dropped findings, each with a reason
//   consolidated/audit-input.md   — human master table + dispute list
//
// Usage: node scripts/consolidate.mjs   (run from repo root)

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REPORTS = join(ROOT, "reports");
const OUT = join(ROOT, "consolidated");
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const SEV_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const SEV_NAME = ["", "low", "medium", "high", "critical"];
const EVIDENCE_RANK = { doc: 1, trace: 2, test: 3, command: 4 };
const VALID_SEV = new Set(Object.keys(SEV_RANK));
const VALID_EV = new Set(["command", "test", "trace", "doc"]);

function nonEmpty(s) { return typeof s === "string" && s.trim().length > 0; }

// Returns { ok, reason } — does this finding's evidence satisfy the contract?
function evidenceOk(f) {
  const e = f.evidence;
  if (!e || !VALID_EV.has(e.type)) return { ok: false, reason: "missing/invalid evidence" };
  if (e.type === "command" || e.type === "test") {
    if (!nonEmpty(e.command) || !nonEmpty(e.output))
      return { ok: false, reason: `${e.type} evidence lacks command+output` };
  }
  if (e.type === "trace") {
    if (!Array.isArray(f.files) || f.files.length === 0 || !nonEmpty(f.files[0].path))
      return { ok: false, reason: "trace evidence lacks file/lines" };
  }
  if (e.type === "doc") {
    if (!nonEmpty(e.url)) return { ok: false, reason: "doc evidence lacks url" };
    if (!Array.isArray(f.files) || f.files.length === 0)
      return { ok: false, reason: "doc evidence not paired with a code trace" };
  }
  return { ok: true };
}

const accepted = [];   // post-validation, pre-merge
const rejected = [];

// ---- 1. load + validate every agent's NDJSON ------------------------------
const files = existsSync(REPORTS)
  ? readdirSync(REPORTS).filter((f) => /^night-.*\.ndjson$/.test(f))
  : [];
const agentStatus = {};

for (const file of files) {
  const agent = file.replace(/^night-|\.ndjson$/g, "");
  let lines;
  try {
    lines = readFileSync(join(REPORTS, file), "utf8").split("\n").filter((l) => l.trim());
  } catch { agentStatus[agent] = "unreadable"; continue; }
  let parsed = 0, bad = 0;
  for (const line of lines) {
    let f;
    try { f = JSON.parse(line); } catch { bad++; continue; }
    parsed++;
    // Normalize before validating — agents vary on case ("Medium" vs "medium").
    // Be liberal in what we accept so a casing slip never drops a real finding.
    if (typeof f.severity === "string") f.severity = f.severity.toLowerCase().trim();
    if (typeof f.category === "string") f.category = f.category.toLowerCase().trim();
    if (f.evidence && typeof f.evidence.type === "string")
      f.evidence.type = f.evidence.type.toLowerCase().trim();
    // schema floor
    if (!VALID_SEV.has(f.severity) || !nonEmpty(f.title) || !nonEmpty(f.dedupe_key)) {
      rejected.push({ ...f, _reason: "schema: bad severity/title/dedupe_key", _agent: agent });
      continue;
    }
    const ev = evidenceOk(f);
    if (!ev.ok) { rejected.push({ ...f, _reason: ev.reason, _agent: agent }); continue; }

    // Severity cap: Critical/High need command|test evidence (§1.1).
    let sev = f.severity, capNote = null;
    const strong = f.evidence.type === "command" || f.evidence.type === "test";
    if ((sev === "critical" || sev === "high") && !strong) {
      if ((f.confidence ?? 0) >= 9 && f.evidence.type === "trace") {
        capNote = "kept at severity: conf≥9 self-evident trace";
      } else {
        capNote = `downgraded ${sev}→medium: ${f.evidence.type}-only evidence`;
        sev = "medium";
      }
    }
    accepted.push({ ...f, severity: sev, _agent: agent, _capNote: capNote });
  }
  agentStatus[agent] = bad > 0 ? `ok (${parsed} ok, ${bad} malformed lines)` : `ok (${parsed})`;
}

// ---- 2. dedupe + dispute detection ----------------------------------------
const groups = new Map();
for (const f of accepted) {
  if (!groups.has(f.dedupe_key)) groups.set(f.dedupe_key, []);
  groups.get(f.dedupe_key).push(f);
}

let n = 0;
const merged = [];
for (const [key, items] of groups) {
  const ranks = items.map((i) => SEV_RANK[i.severity]);
  const maxR = Math.max(...ranks), minR = Math.min(...ranks);
  const disputed = maxR - minR >= 2;
  // strongest evidence wins as the representative
  items.sort((a, b) => (EVIDENCE_RANK[b.evidence.type] - EVIDENCE_RANK[a.evidence.type])
    || ((b.confidence ?? 0) - (a.confidence ?? 0)));
  const rep = items[0];
  const id = "F" + String(++n).padStart(3, "0");
  merged.push({
    id,
    severity: SEV_NAME[maxR],
    severity_disputed: disputed ? { low: SEV_NAME[minR], high: SEV_NAME[maxR] } : null,
    disputed,
    category: rep.category,
    title: rep.title,
    files: rep.files || [],
    description: rep.description,
    impact: rep.impact,
    evidence: rep.evidence,
    fix: rep.fix || null,
    test_idea: rep.test_idea || null,
    confidence: Math.max(...items.map((i) => i.confidence ?? 0)),
    dedupe_key: key,
    agents: [...new Set(items.map((i) => i._agent))],
    corroborations: items.length,
    cap_notes: items.map((i) => i._capNote).filter(Boolean),
    verified: null,           // filled by Jordan-Audit
    verification_note: null,
  });
}

// sort: severity desc, then corroborations desc, then confidence desc
merged.sort((a, b) =>
  SEV_RANK[b.severity] - SEV_RANK[a.severity] ||
  b.corroborations - a.corroborations ||
  b.confidence - a.confidence);

// ---- 3. write outputs ------------------------------------------------------
writeFileSync(join(OUT, "findings.json"), JSON.stringify(merged, null, 2));
writeFileSync(join(OUT, "rejected.json"), JSON.stringify(rejected, null, 2));

const sevCount = (s) => merged.filter((m) => m.severity === s).length;
const disputedItems = merged.filter((m) => m.disputed);

const md = [];
md.push("# Audit Input — Consolidated Findings");
md.push("");
md.push(`**Agents reporting:** ${Object.keys(agentStatus).length}  ` +
  Object.entries(agentStatus).map(([a, s]) => `\`${a}\`: ${s}`).join(" · "));
md.push(`**Accepted (merged):** ${merged.length}  |  **Rejected:** ${rejected.length}  |  ` +
  `**Disputed:** ${disputedItems.length}`);
md.push(`**By severity:** Critical ${sevCount("critical")} · High ${sevCount("high")} · ` +
  `Medium ${sevCount("medium")} · Low ${sevCount("low")}`);
md.push("");
md.push("## Master table");
md.push("| ID | Sev | Disp | Cat | File | Title | Ev | Conf | Agents | Corrob |");
md.push("|----|-----|------|-----|------|-------|----|------|--------|--------|");
for (const m of merged) {
  const file = m.files[0]?.path ?? "—";
  md.push(`| ${m.id} | ${m.severity} | ${m.disputed ? "⚠️" : ""} | ${m.category} | ` +
    `\`${file}\` | ${m.title} | ${m.evidence.type} | ${m.confidence} | ` +
    `${m.agents.join(",")} | ${m.corroborations} |`);
}
md.push("");
md.push("## Disputed items (Jordan-Audit MUST resolve by re-running evidence)");
if (disputedItems.length === 0) md.push("_none_");
for (const m of disputedItems)
  md.push(`- **${m.id}** ${m.dedupe_key}: ${m.severity_disputed.low} ↔ ${m.severity_disputed.high} (agents: ${m.agents.join(", ")})`);
md.push("");
md.push("## Audit worklist (re-verify all Critical + top High ≤15, spot-check 3 Medium)");
const worklist = merged.filter((m) => m.severity === "critical" || m.severity === "high").slice(0, 15);
for (const m of worklist) md.push(`- [ ] ${m.id} (${m.severity}) — re-run: \`${m.evidence.command ?? m.evidence.type}\``);
md.push("");
md.push("## Rejected (no/insufficient evidence — not backlog candidates)");
for (const r of rejected) md.push(`- \`${r._agent}\` ${r.title ?? "(untitled)"} — ${r._reason}`);

writeFileSync(join(OUT, "audit-input.md"), md.join("\n") + "\n");

console.log(`Consolidated ${accepted.length} accepted → ${merged.length} merged ` +
  `(${rejected.length} rejected, ${disputedItems.length} disputed) from ` +
  `${Object.keys(agentStatus).length} agents.`);
console.log(`By severity: C${sevCount("critical")} H${sevCount("high")} ` +
  `M${sevCount("medium")} L${sevCount("low")}`);
