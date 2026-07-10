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
| WOA-004 | Bill's onboarding doc: driving the balance loop | docs | Done   | —          |
| WOA-005 | Standard-runs runbook (apples-to-apples recipes) | docs | In Progress | —     |
| WOA-006 | Load saved balance reports into the Dashboard Charts tab | game-ui | Todo | — |
| WOA-007 | Define "best map": ideal-range scoring, rubric as SOT | balance | Todo | — |
| WOA-008 | claude-plays match mode draws maps from the map-set pool | dev-tools | Done | — |

**Suggested order:** WOA-004 first (WOA-005 slots its recipes into the doc's "now iterate" ending).

## In Progress / Todo

### WOA-005 — Standard-runs runbook (apples-to-apples recipes)
**Area:** docs · **Status:** In Progress · **Type:** opus · **Docs:** data-and-reports

A named home for repeatable balance runs so a content change can be measured before/after on identical
settings: each recipe = a name, the exact command line (fixed seeds, battle count, map set, AI levels),
what it measures, and which baselines to watch (first-mover ~46%, Red ~52%, tie-goes-to-2nd ~26%, skill
premium, attacks/swaps). Start with ~3 recipes (e.g. quick smoke-run, full balance sweep, best-map LLM
match) — Bill adds more as he designs them. A markdown runbook is the deliverable; thin script wrappers
only if a recipe's command line proves too fiddly to paste.

**Acceptance criteria:**
- [x] Runbook exists in `human-instructions/`, indexed; ~3 named recipes with exact commands, each run once
      to verify it works and produces the promised artifact (2026-07-07: quick pulse, standard sweep,
      LLM match — sweep run live, match verified via Bill's causeway run + --mock)
- [x] One recipe demonstrated as before/after: run, tweak a data value, rerun, compare (and revert the tweak)
      (attack_plus1 mod 1→2 on The Ford: HQ% 25→42, AvgSeen 10.4→5.6; revert reproduced baseline exactly)
- [ ] Bill confirms the format works for organizing his own runs

### WOA-007 — Define "best map": ideal-range scoring, rubric as SOT
**Area:** balance · **Status:** Todo · **Docs:** grading-rubrics

Bill wants "best map" properly defined: each metric gets an ideal *range* and the map is scored
against those ranges — replacing today's ad-hoc formula (`balanceScore`, `game/report-model.js:37` —
fairness deltas + degeneracy penalties − swing reward; attrition-only deliberately unscored per the
Round-4 ruling, which this may revisit). The definition lands in the grading rubrics as the SOT;
`balanceScore` then implements the rubric (one implementation per fact — CLI, dashboard, tuner all
read it). (S2 dogfood friction: BEST_MAP picked an attrition-only map and the "why" wasn't findable.)

**Acceptance criteria:**
- [ ] Ideal ranges per metric decided by Bill and written into the rubrics doc as SOT
- [ ] `balanceScore` reimplements the rubric; reports/skills that cite the old formula updated
- [ ] User confirms done

### WOA-006 — Load saved balance reports into the Dashboard Charts tab
**Area:** game-ui · **Status:** Todo

Dashboard→logs data flow is one-way today: the Balance Dashboard only charts its own live in-browser
sims. Let it load previous CLI runs (`logs/reports/balance/<version>/` — `accumulated.json` and/or
saved reports) so `dev/balance-report.js` terminal runs get the Charts tab too. (S2 dogfood friction,
minted mid-sprint — counts toward the goal.)

**Acceptance criteria:**
- [ ] Dashboard can display data from a prior CLI balance run (at minimum the accumulator)
- [ ] User confirms done

## Finished

- **WOA-008 — claude-plays match mode draws maps from the map-set pool** (2026-07-09) — shipped as the balance-loop pre-flight (commit bba0dd3): no `--map` → match pool = the (mapset-filtered) roster via the engine's seed-shuffled mapOrder; `--map` still pins; Typicality footer uses the last battle's map; generate-reports reshaped off BEST_MAP pinning same session. Verified across 9 live matches (map rotation observed by Bill mid-run).
- **WOA-004 — Bill's onboarding doc: driving the balance loop** (2026-07-07) — `human-instructions/driving-the-balance-loop.md` shipped, indexed, every command run live; Bill dogfooded it end-to-end (spawning WOA-006/007/008 friction tickets) and confirmed.

## Blockers

- _None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]].

#sprint
