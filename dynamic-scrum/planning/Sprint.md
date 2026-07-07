# Sprint — S2 · Bill drives V1

**Goal:** Bill can run the whole balance-iteration loop himself — an onboarding doc that walks him from
server start to reading a report, and a standard-runs runbook so a content change gets an
apples-to-apples comparison. Friction found while dogfooding gets minted straight into this sprint.

**Orientation:** [[data-and-reports]] + [[code-architecture]] · new docs land in
`dynamic-scrum/docs/human-instructions/`.

**Done when:** Bill has walked the onboarding doc end-to-end (server → run → report → DB query), run one
standard run before/after a content tweak and compared them, and confirms the loop works without Claude
in the loop. Friction tickets minted mid-sprint count toward the goal, not against it.

## Ticket overview

| Ticket  | Title                                          | Area | Status | Depends on |
| ------- | ---------------------------------------------- | ---- | ------ | ---------- |
| WOA-004 | Bill's onboarding doc: driving the balance loop | docs | Todo   | —          |
| WOA-005 | Standard-runs runbook (apples-to-apples recipes) | docs | Todo   | —          |

**Suggested order:** WOA-004 first (WOA-005 slots its recipes into the doc's "now iterate" ending).

## In Progress / Todo

### WOA-004 — Bill's onboarding doc: driving the balance loop
**Area:** docs · **Status:** Todo · **Type:** opus · **Docs:** data-and-reports, code-architecture

A single `human-instructions/` doc that takes Bill from zero to reading balance data: start the server
(`node game/server.js`), play/watch a battle, generate a report set (`dev/balance-report.js`, or the
`generate-reports` skill via Claude), where everything lands (`logs/woa.db`, `logs/reports/{balance,
battle,analysis}/`), how to query the DB (`dev/db-query.js`), what each `dev/` script is for (one line
each), and which skills (`generate-reports`, `review-reports`, `run-tournament`, `create-card`,
`create-map`) do what. Written for a human at the command line, not for Claude — copy-pasteable commands
with expected output snippets.

**Acceptance criteria:**
- [ ] Doc exists in `dynamic-scrum/docs/human-instructions/`, indexed in Docs Index, every command in it
      actually run and verified during writing
- [ ] Covers: server, battle, report generation, data locations, DB query, dev-script inventory, skill map
- [ ] Bill walks it end-to-end and confirms done

### WOA-005 — Standard-runs runbook (apples-to-apples recipes)
**Area:** docs · **Status:** Todo · **Type:** opus · **Docs:** data-and-reports

A named home for repeatable balance runs so a content change can be measured before/after on identical
settings: each recipe = a name, the exact command line (fixed seeds, battle count, map set, AI levels),
what it measures, and which baselines to watch (first-mover ~46%, Red ~52%, tie-goes-to-2nd ~26%, skill
premium, attacks/swaps). Start with ~3 recipes (e.g. quick smoke-run, full balance sweep, best-map LLM
match) — Bill adds more as he designs them. A markdown runbook is the deliverable; thin script wrappers
only if a recipe's command line proves too fiddly to paste.

**Acceptance criteria:**
- [ ] Runbook exists in `human-instructions/`, indexed; ~3 named recipes with exact commands, each run once
      to verify it works and produces the promised artifact
- [ ] One recipe demonstrated as before/after: run, tweak a data value, rerun, compare (and revert the tweak)
- [ ] Bill confirms the format works for organizing his own runs

## Finished

_None yet._

## Blockers

- _None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]].

#sprint
