# Sprint run — M2 · Metrics v2 + dashboard, phase 3 (2026-07-18)

**Protocol:** run-sprint over 4 tickets in dependency order (WOA-041 → 042 → 043 → 044), serial
throughout (WOA-042/043/044 collide on `charts.js`; 041 gates data visibility). One Workflow dispatch
per card at the card's `Type:` model, xhigh effort; runner verified every gate (suites re-run, golden
diff re-diffed, screenshots independently vision-read). Board writes via the ds-board-hub MCP. Full
run — no cards deliberately skipped. Owner steered live once: WOA-042 bumped sonnet→opus pre-dispatch
(adopted as an owner edit, per the re-resolve rule).

## Pre-flight

All five suites green at baseline (test.js; smoke; db.test 104→107 over the run; claude-plays;
llm-session — no known flakes). Golden 24-normal/24-easy captured pre-run from HEAD (df2866f);
**never legitimately broken this phase** — re-verified byte-identical (excl. the Persisted-trailer)
after every one of the three game/-touching cards, including WOA-044's engine capture extension.
Pre-existing untracked `logs/reports/balance/1.1/accumulated.json` left for Bill's triage (third run
in a row — worth a decision). Freshly-planned board committed as its own start-sprint commit before
ticket 1.

## Scorecard (4/4 closed, zero bounces)

| Card | Type | Result | cost (tokens / time / calls) |
|---|---|---|---|
| WOA-041 balance-report zero battle rows | bug (default tier) | closed — parent-writer envelope, runs 92–94 annotated unpersistable | 99,483 / 8.8m / 22 |
| WOA-042 hex lenses (P2.3) | opus (owner bump) | closed — SVG lenses, 6 screenshots, 4 runner-vision-read | 270,533 / 32.5m / 94 |
| WOA-043 Cards tab (P2.4) | sonnet | closed — SPEC §2 win-slice doctrine honored, small-n DOM-proven | 295,607 / 25.1m / 99 |
| WOA-044 Units tab (P3.1) | sonnet | closed — dieT capture extension golden-diff-proven, legacy greys honest | 313,192 / 26.7m / 116 |

Total subagent spend: ~979k tokens / ~93 min / 331 tool calls.

## Findings

1. **Premise corrections at dispatch, three cards out of four.** WOA-041's "workers never wire
   battles" guess was actually a *deliberate documented skip*; WOA-043's named screenshot pair
   (106/107) is a byte-identical parity fixture, useless for divergence demos (agent caught this one
   and generated a real pair); WOA-044's "fold lifespan from the units block" was impossible as
   written (no death turns in the capture) — runner pre-settled the dieT extension and the card
   landed single-pass. The mint-time lesson: an AC naming a *data source* should be premise-checked
   against the source's actual fields, same as an AC naming a file.
2. **The metrics-v2 spec is fully shipped** — every pane of the dashboard is real (Overview, Maps +
   hex lenses, Cards, Units, Tables). **distill-spec is due at sprint close** (spec → living doc,
   retire the handoff bundle, drop the graduated parking-lot note if any remains).
3. **Two new capture/semantics decisions recorded** for Bill's overrule window:
   `D.D:hex-lenses-svg-not-clippath` (SVG polygons over the spec ticket's clip-path divs) and
   `D.D:unit-lifespan-diet-capture` (dieT death-turn capture; FIFO pairing; right-censored
   survivors). Plus `D.D:parallel-battles-via-parent-writer` (WOA-041's single-writer envelope).
4. **Small-n reality check worth carrying into rubric conversations:** even 144-battle runs grey the
   entire Cards win-axis (the HQ×non-simple slice runs n≈45–50 per card, fleet threshold 240). That
   is the doctrine working, but it means the sight quadrant's x-axis is *always* grey at ordinary run
   sizes — if Bill wants it scoreable, the lever is bigger runs (n≥40/map × HQ% ≈ needs ~n=60+ runs)
   or a rethought slice, not a UI fix.
5. **Fixed-seed cross-run validation is free:** same-mode runs before/after a capture change (114 vs
   120) must render identical seed-derived charts — the Units screenshots doubled as a UI-layer
   golden diff. Added to rig-notes candidates (see recommendations).
6. **Fresh A/B-able data now in woa.db** from the run itself: 106/107 (hard, parity pair), 114/115 +
   120/121 (normal-vs-easy divergent pairs, 120/121 dieT-bearing). The pickers finally have
   measurement-grade rows from balance-report too, going forward.

## Held-over human steps

- **Restart `node game/server.js`** (carried from Phase 1/2, STILL pending) — the live server
  predates WOA-037's `/api/battles` fs join and everything since; every new pane needs the restart.
- **Bill: eyeball the Phase-3 screenshots** (`planning/sprint-runs/2026-07-18-M2-p3-screenshots/`,
  untracked scratch): hex-lens trio + hover, Cards tab (label-collision cluster is the known
  cosmetic), Units tab legacy-vs-fresh. Move keepers to `planning/attachments/`.
- **Bill: overrule window on three runner decisions** — `D.D:hex-lenses-svg-not-clippath`,
  `D.D:unit-lifespan-diet-capture`, `D.D:parallel-battles-via-parent-writer` (each a small named
  diff to reverse).
- **Bill: `accumulated.json` triage** (1.1 leftover, third surfacing).
- **distill-spec** for `design_handoff_metrics_dashboard` at sprint close (runner can do it on ask —
  it edits spec + docs + indexes, close-ceremony scope, not this run's).

## Git-policy friction

None new. Explicit-path staging kept the untracked accumulated.json + screenshot scratch out of all
six commits. The hub's close stamps read 2026-07-19 (UTC?) while the session runs 2026-07-18 local —
cosmetic, but a date-boundary run could mis-file an archive; noted for the hub backlog (WOA-015's
neighborhood, not minted).

## Recommendations for these skills

- **run-ticket / decompose:** premise-check ACs that name a *data source* (a capture block, a table,
  a fixture) against its actual fields at mint AND dispatch — this run's 3-of-4 correction rate says
  data-source pins rot as fast as file pins (routed via refine pass / observations).
- **rig-notes (this repo):** add the fixed-seed cross-run check (same-seed runs across a capture
  change differ only in the new field's charts) and the parity-fixture warning (106/107 byte-identical
  — name what test data *can't* show when citing it in a dispatch).
- **run-sprint:** nothing structural — serial + feed-forward + pre-settled premises produced a
  second consecutive zero-bounce run.

**Refine pass: explicitly DEFERRED** (session budget-deep; same call as the P2 run). Signal lives
in: canonical `inbound/` (now **15** observation drops — 6 P1 + 5 P2 + 4 this run) + the three
phase run reports. One folded `alignment-pass refine:run-ticket` (+ `refine:decompose` for the
data-source-premise mint rule) should drain them together on Bill's ask — draft one next-pass
per skill, no duplicates.

## Verdict

**4/4 closed, zero bounces, full run.** M2 Phase 3 complete; the metrics-v2 spec has shipped in
full across three same-day phases. Golden diff held through an engine capture extension. Sprint
done-when is met pending Bill's visual pass + the held-over server restart; distill-spec fires at
sprint close.
