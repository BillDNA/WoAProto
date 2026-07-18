# Sprint run — M2 · Metrics v2 + dashboard, phase 1 (2026-07-18)

**Protocol:** full autonomous run (`run-sprint`, no bound — all 6 cards), strictly serial in
dependency order (WOA-030 → 031 → 032 → 033 → 034 → 035; 032 sequenced before 033 to keep
`game/test.js` single-writer). One build sub-agent per card via the Workflow primitive at the card's
`Type:` model, xhigh effort, `TICKET_RESULT` schema (per-shape extras: `goldenDiff` on capture/model
cards, `dbEvidence` on the persistence card, `screenshots` on both UI cards). Runner-verified gates:
suite(s) + real diff + live exercise (fresh sims, DB queries, fold smoke on real rows, vision-read
screenshots). Board writes via the `ds-board-hub` MCP. No steer questions (Step 0.5: no
conversation-shaped ACs; the two Bill-authority items rode as held-overs).

**Pre-flight:** `game/test.js` 237 ok, `dev/smoke.js` PASSED, tree clean at `a59a168` (sprint-open
commit). Rig-notes read (stub; no rig-specific recipes yet). No gitignored-dependency hits.

## Scorecard — full run, every card dispositioned

| Card | Model | Outcome | cost (tok / time / tools) |
|---|---|---|---|
| WOA-030 17-card adopt | sonnet | **closed** — flip live, both-deck suite proven, baselines re-stamped, matchup + n100 re-measured | 298k / 48.4m / 182 |
| WOA-031 trace capture | sonnet | **closed** — golden diff byte-identical, runner live-exercised | 183k / 18.8m / 72 |
| WOA-032 runs table + trace rows | sonnet | **closed** — additive migration, run identity live-verified (run 67) | 219k / 17.9m / 78 |
| WOA-033 bands + folds | opus | **closed** — BANDS unified into balanceScore (200k-sample equivalence), 6 folds live-smoked | 171k / 22.5m / 40 |
| WOA-034 dashboard shell | sonnet | **closed** — A/B pickers on real runs, Tables intact, vision-verified | 232k / 54.5m / 89 |
| WOA-035 Overview screen | sonnet | **closed** — 1c/1f/1e on real data, T0/T2 re-shading vision-verified | 361k / 37.1m / 110 |

**Totals:** 6/6 dispatched-and-closed (unbounded run; nothing skipped or blocked). Agent spend
≈ 1.46M tokens / ~3.3 h build+sim / 571 tool uses. **Zero bounces, zero regressions** — suites grew
237 → 1150 ok (`test.js`), 66 → 97 (`db.test.js`), smoke retargeted+extended; golden balance diff
byte-identical at every capture/model gate (4 committed evidence reports + sha match). Commits
`f897713`, `d8c26c6`, `c2aeae6`, `dbf95bc`, `2e02edf`, `4aaafa6` (+ this report's). Sprint done-when:
**met** (adopted-deck baselines ✓, trace rows + run identity in woa.db ✓, A/B Overview at selectable
temperature ✓, golden diff held all sprint ✓).

## Findings

1. **The escalation channel caught a product defect nobody knew about.** WOA-030's "hardcode =
   finding, not silent change" line led its agent to trace a hard-coded 16 into `index.html`'s
   applied-deck override — the browser has NEVER played the active-flagged deck (→ **WOA-036**, Bugs,
   Bill decides). Two cards later, WOA-034's Tables screenshot showed the stray deck's cards live —
   vision evidence confirming a finding from a different card.
2. **Feed-forward facts need the runner's premise-check before re-embedding.** WOA-033's agent named a
   `battle_timeline` table and treated `st.fsTimeline` as real; the gate grep showed the table is
   `timeline` and nothing populates fsTimeline (dev/db.js merely anticipates it). Corrected before it
   reached WOA-035's dispatch. The carry channel can propagate confident fiction — verify, then carry.
3. **Missing-capture degrades honestly through the small-n path.** Twice, a fold's data source turned
   out not to exist yet (vpDiffTrack/fsTimeline → **WOA-037**; Control%/hex-lead → **WOA-038**); both
   render greyed `n/a (n=N)` and are excluded from the verdict rather than fabricated. The SPEC §8
   small-n rule is doing double duty as the honest-degradation channel — worth keeping deliberate.
4. **Declare-and-pin beat bouncing on underspecified design.** Three judgment calls shipped as
   declared interpretations with tests/flags instead of stalls: half-open band widening
   (`D.D:half-open-band-widening`), progressive tier reveal (flagged for Bill), matchup-mode runs not
   persisted (not a §7 "run"). None required a re-dispatch.
5. **Sequencing WOA-030 first paid off exactly as planned** (`D.D:metrics-v2-phased-adopt`): every
   golden diff and baseline in the sprint was taken on the adopted deck; no re-measure will be thrown
   away at the rules-1.2 re-baseline.
6. **Cheap collision sentences work.** "A later card is queued against test.js — prefer a dev/ check"
   (WOA-032) and the WOA-034/035 mount-point handoff produced zero same-file conflicts across 6
   serial cards touching an overlapping file set.

## Held-over human steps (Bill)

1. **Goals.md annotation** (his file, not edited): physical-limitations bullet → append
   "…16-card decks **[17 for the adopted `cavsplit17-raid-paid` deck as of WOA-030, 2026-07-18 — 16
   remains the default guardrail for every other deck]**…" (full text in `D.D:seventeen-card-adopt`'s
   EXECUTED note / WOA-030 close).
2. **WOA-036 (Bugs) — browser deck override**: decide the fix shape (clear the checked-in
   `game/custom-deck.js` + `woa-custom-deck` localStorage so the adopted deck shows through, vs keep
   the override but make it opt-in/visible). Until then browser play uses the stray 16-card deck.
3. **Restart `node game/server.js`** if one is running — it picks up the new `/api/runs` +
   `/api/battles` routes and the dashboard shell (CLI/sims need nothing).
4. **Eyeball the Overview** (screenshots in `dynamic-scrum/planning/sprint-runs/2026-07-18-M2-screenshots/`,
   or live after the server restart): notably the **progressive tier reveal** interpretation (T0 shows
   only the T0 band; T1/T2 nest wider) vs the mockup's static three-band triptych — flag if you want
   the static reading instead.
5. **Sanity matchup watch note**: adopted-deck sanity pairing measured 46% of 576 (~2σ below 50,
   labeled thin/within-noise in the rubric). If it drifts further on a re-measure, look at
   normal-tier asymmetry.

## Git-policy friction

None material. Explicit-path staging kept three mid-run generated artifacts
(`accumulated.json` — never-tracked accumulator — plus two n45 evidence reports committed
deliberately with this report) out of ticket commits. The two pre-session stragglers were committed
separately before ticket 1 (Step 0.4).

## Recommendations for these skills

- The per-shape schema extras (`goldenDiff`, `dbEvidence`, `screenshots` as *required* fields) made
  every gate mechanical — candidate for run-ticket's Step-2 evidence-shape list as a named pattern:
  "make the AC's proof a required schema field."
- Finding 2 (verify feed-forward facts at the gate before re-embedding) is a sharpening of the
  existing carry-classes prose; signal preserved in the WOA-033 observations drop.

**Refine pass:** deferred, not skipped — run-signal for `run-ticket`/`run-sprint` lives in the six
observation drops in canonical inbound (`from-WarOfAttrition-observations-WOA-03x-2026-07-18.md`);
Bill already has the combined M1+M1.1(+M2 now) canonical refine pass on offer. No project skill
accrued drift this run (`generate-reports` gained its matchup leg as WOA-030 ticket work, not drift).

## Verdict

**6/6 closed, zero bounces, zero regressions, done-when met.** Phase 1 of the metrics-v2 spec is
live end-to-end on the adopted 17-card deck: every battle leaves a trace, every run has identity,
and the Overview reads real saved runs A/B at a selectable temperature. P2 (rules-1.2 re-baseline,
map drill-down, cards) is decomposed in the spec's TICKETS.md for next sprint-planning; WOA-037/038
(capture gaps) queue in Backlog as natural P2 riders.
