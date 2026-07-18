# Sprint — M2 · Metrics v2 + dashboard, phase 1

**Goal:** the loop measures on the adopted 17-card deck, every battle leaves a per-play trace, and the
data is *seen* — a view-only A/B dashboard Overview reading saved runs from `logs/woa.db`.

**Orientation:** this sprint executes the adopted deck flip (WOA-030, first — so every later baseline
and golden diff is taken on the adopted deck) and then Phase 1 of the **metrics-v2 + dashboard spec**
(`dynamic-scrum/planning/specs/design_handoff_metrics_dashboard/` — SPEC.md is the metric SOT,
README.md the screen/design SOT, `Metrics and Charts.dc.html` the visual reference). Phase 1 is
**golden-diff-safe**: trace capture + folds + dashboard shell + Overview, **no printed-number
changes**. The re-baseline (rules-1.2) and drill-down/cards/units screens are Phase 2/3 — next
sprint, not this one. Standing gates on every ticket: `node game/test.js` green · `node dev/smoke.js`
after UI changes · frozen paths untouched (`game/engine.js`, `game/balance.js`, `game/test.js`,
`dev/balance-report.js`, report dirs, `SAVED:`/`BEST_MAP:` stdout lines) · reports stay markdown ·
`game/` stays zero-dependency classic scripts.

**Done when:** the suite is green on the adopted deck with baselines re-stamped; a balance run (CLI or
dashboard) lands per-battle trace rows + a run-identity row in `woa.db`; and the dashboard Overview
renders the triage band board + per-map dumbbells for any two saved runs A/B at a selectable
temperature — with aggregates byte-identical to pre-sprint (golden diff holds all sprint).

## Tickets

### WOA-030 — Execute the 17-card adopt (`D.D:seventeen-card-adopt`)
**Area:** content+tests · **Status:** Todo · **Type:** sonnet · **Docs:** grading-rubrics, code-architecture

Bill adopted `cavsplit17-raid-paid` (2026-07-16, per the WOA-029 T2 probe). The first flip attempt
found **card-pinned tests coupled to the active deck** (`game/test.js:543` resolves Ordered Withdraw
from the active deck; the adopted deck cuts that card + Airdrop → suite crashes at 136/237), so the
adopt ships as one atomic ticket: decouple, flip, record, re-baseline. **Runs first in this sprint**
so every later golden diff and baseline is taken on the adopted deck.

**Acceptance criteria:**
- [ ] Card-behavior tests decoupled from the active deck (pin their card defs from the full content catalog or an explicit fixture deck — a cut card must never crash the suite); suite green with EITHER deck active
- [ ] `cavsplit17-raid-paid` flipped `active:true` (default → false); suite green at the new count
- [ ] Guardrail recorded atomically per the policy's re-measure-to-ship clause: rubric §Temperature (ceiling 17 for this deck, ADOPTED note) + `Goals.md` physical-limitations annotation (flag to Bill — his file) + play-cap references 32→34 where deck-size-derived
- [ ] Rubric + CLAUDE.md baselines re-stamped for the adopted deck — transcribe from the already-saved candidate sweeps (`2026-07-16-1514/1515-...-deck-cavsplit17-raid-paid.md`, no new sims needed for hard/normal); old default-deck figures marked superseded
- [ ] Skill premium (north star 1) re-measured under the adopted deck (`matchup 96` recipe) — the only baseline the saved sweeps don't cover; add a matchup leg to the `generate-reports` standard set while there (WOA-028 shakedown gap)
- [ ] n≥100 normal-tier confirmation run for the 0-kill drift (1→4%) — watch item, record the reading either way
- [ ] User confirms done

### WOA-031 — Per-play trace capture in the engine (P1.1)
**Area:** engine · **Status:** Todo · **Type:** sonnet · **Depends on:** WOA-030 · **Docs:** specs/design_handoff_metrics_dashboard, code-architecture

Every temporal/hex/unit metric in the spec derives from a per-play battle trace that doesn't exist
yet — this ticket creates the capture (SPEC §4), extending the existing `playLog` (already per-play,
`game/engine/04-battle.js`). Capture only: adds fields, changes **no** aggregate.

**Acceptance criteria:**
- [ ] `playLog` entries carry the SPEC §4 per-play fields — `a` (deploy|attack|swap|march), `h` (hex), `k` (kills), `ld` (leader after turn), `u` (unit type on deploys) — for every play in a simulated battle
- [ ] A per-battle `units` block (`{dep:[…], atk, abs, kill, die}` per unit type fielded — `abs` = attacks absorbed) is folded at battle end onto the battle result
- [ ] `node game/test.js` green, extended with a trace-shape assertion (a simmed battle's trace has one entry per play with the §4 fields; `units` totals consistent with the trace)
- [ ] Golden balance diff **byte-identical** vs pre-change HEAD on the adopted deck (same seeds → identical aggregates)
- [ ] User confirms done

### WOA-032 — Trace rows + `runs` table in woa.db (P1.2)
**Area:** data · **Status:** Todo · **Type:** sonnet · **Depends on:** WOA-031 · **Docs:** specs/design_handoff_metrics_dashboard, data-and-reports

The dashboard's A/B model needs run identity: today `logs/woa.db` has per-battle rows but no notion of
"a run" or a pinned baseline (SPEC §7). Persistence path is the existing `dev/db.js` behind
`game/server.js` / `Engine.hooks.onBattleEnd`.

**Acceptance criteria:**
- [ ] Per-battle rows gain the trace JSON (SPEC §4 shape, incl. the `units` block); ~1.3 KB/battle cost accepted per spec
- [ ] New `runs` table per SPEC §7 (`{id, ts, rulesVersion, deck, mapset, aiRed, aiBlue, nPerMap, seedBase, label, baseline}`); battle rows reference their run id
- [ ] Exactly one `baseline` flag per rules version — pinning a new baseline clears the old (asserted in a test or a `dev/` check)
- [ ] `game/balance.js` and the dashboard Run loop stamp run identity on the runs they write; the charts side stays view-only (never creates runs)
- [ ] `node game/test.js` + `node dev/smoke.js` green; zipped `file://` copy still works (db absent is fine, as today)
- [ ] User confirms done

### WOA-033 — report-model.js: bands as data + trace folds (P1.3)
**Area:** data · **Status:** Todo · **Type:** opus · **Depends on:** WOA-031 · **Docs:** specs/design_handoff_metrics_dashboard, data-and-reports, grading-rubrics

The pattern-setter: every derivation the dashboard renders is a **fold in `game/report-model.js`**
(one implementation per fact — node and browser both consume). Also moves the rubric's bands into
data so the temperature selector can widen them (SPEC §6). No printed numbers change yet.

**Acceptance criteria:**
- [ ] Per-metric band table in `report-model.js` — `{lo, hi, weight, feedsScore}` per scored metric — with an SOT comment pointing at `dynamic-scrum/rubrics/grading-rubrics.md`; T1/T2 effective bands = each *closed* edge widened by 20%/40% of band width (open edges stay open), exposed as a function of (metric, temperature)
- [ ] Trace folds added as pure functions over battle rows: deploy interleave, first-contact turn, settle point, per-turn action-octile lanes, |VP-diff| track, per-card play-turn quartiles (SPEC §1–2)
- [ ] Folds are consumable from both node and the browser (same shared-global idiom as the rest of `report-model.js`); unit assertions in `node game/test.js` cover each fold on a known trace fixture
- [ ] No printed report numbers change — golden balance diff byte-identical
- [ ] User confirms done

### WOA-034 — Dashboard shell: view-only, run pickers, tabs (P1.4)
**Area:** game-ui · **Status:** Todo · **Type:** sonnet · **Depends on:** WOA-032 · **Docs:** specs/design_handoff_metrics_dashboard, code-architecture

The chrome the Overview lands in (README *Screens*): dark header, run-A/B pickers over the `runs`
table, pill nav, temperature selector — charts become **view-only** (the Tables view keeps today's
run loop untouched). Files: `game/ui/dashboard.js`, `game/ui/boot.js`, `game/index.html`.

**Acceptance criteria:**
- [ ] Header run-A/B pickers list runs from the `runs` table via server fetch; A defaults to the run flagged `baseline` for the current rules version
- [ ] Pill nav Overview | Maps | Cards | Units | Tables; Tables is today's dashboard unchanged (run loop + Save intact there); Run/Save removed from the charts context
- [ ] Temperature selector T0/T1/T2 wired into extended `DASH` state (`{runA, runB, view, mapFocus, abMode, temperature, runs}` per README *State Management*)
- [ ] Under `file://` (no server): charts tab shows the current in-memory run only + a "start the server for run history" note — zip-and-double-click keeps working
- [ ] `node dev/smoke.js` + `node game/test.js` green; **visual check is human/vision** — header, pills, pickers render per the design reference (mockup 4a chrome)
- [ ] User confirms done

### WOA-035 — Overview screen: band board, map dumbbells, verdict, pacing minis (P1.5)
**Area:** game-ui · **Status:** Todo · **Type:** sonnet · **Depends on:** WOA-033, WOA-034 · **Docs:** specs/design_handoff_metrics_dashboard

The landing view (README *Screen 1*, mockup 4a; full-fidelity chart references: designs 1c/1f/1e in
the design canvas). All numbers from woa.db via WOA-033's folds; charts in the established
`game/ui/charts.js` idiom (inline SVG by string concat, greedy label placer, `.chtip` tooltips).

**Acceptance criteria:**
- [ ] Triage band board (design 1c): one bullet row per scored metric, nested T-band shading that re-renders with the temperature selector, run A hollow / run B filled dots, breach styling (red outline + bold label), `A → B` monospace values; small-n rule per SPEC §8 (slice-n < 40/map → greyed, `value (n=N)`, excluded from verdict)
- [ ] Balance-score-by-map dumbbells (design 1f) on a 0–20 scale sorted by run-B, connector colored regress/improve; row click sets `DASH.mapFocus` and navigates to the Maps pill (a stub view until P2.2 builds the drill-down — next sprint)
- [ ] Verdict banner: count of T0-tier breaches at the selected temperature + named breach links that navigate to the explaining view/filter
- [ ] Pacing minis (design 1e): deploy-interleave histogram + settle curves (A dashed / B solid)
- [ ] `node dev/smoke.js` green; **visual check is human/vision** — layout/palette match the design reference per README *Fidelity* (mockup numbers are synthesized; real numbers from the DB)
- [ ] User confirms done

## In Progress

_None._

## Finished

_None._

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]] · spec: `specs/design_handoff_metrics_dashboard/`.

#sprint
