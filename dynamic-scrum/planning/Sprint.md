# Sprint — M1 · Fix the bent ruler

**Goal:** make the AI's evaluation encode the *winning* strategy (hold reserve, deploy late) and build
the instruments to prove it — so every future balance sweep measures the real game, not a shared AI
error. This is the **trustworthy half** of Roadmap M1; the overnight-autonomous half is a follow-on.

**Done when:** the modified AI beats current `hard` while holding reserve (WOA-018's beat-hard gate
cleared), the reserve-held metric + deploy-step-budget guard are in place, dead per-card Win% is dropped,
The Void is repaired-or-cut, and `starting:true` is a documented lever — so the next sweep runs on a
trustworthy ruler.

## Orientation

Planned from the **balance-loop-v2 final report** (`logs/reports/analysis/1.1/2026-07-12-1.1-balance-loop-final.md`,
§5). The report's own bottom line: **the AI eval is strategically wrong** — `unitOnBoard: 22` vs
`unitReserve: 16` says deploy-on-sight, but two independent LLM players found that *holding reserve and
deploying late wins*. Both AI sides share the error, so it cancels in AI-vs-AI and 4,200 battles couldn't
see it. Fixing that ruler (**WOA-018**, the flagship) is the sprint's spine; the metric (**WOA-016**) is
its proof and lands first.

**Watch the hazard on WOA-018:** tuning the AI to flatter the balance metrics *moves the ruler, not the
game*. The change is justified only because an independent population says the heuristic is wrong — so its
gate is behavioral + strength (beat `hard`, actually hold reserve), never "the numbers look nicer."

**Build order:** WOA-016 → WOA-017 → WOA-018 (depends on 016) → WOA-019 → WOA-020 → WOA-021. The last
three are independent instrument-cleanups.

**Not in this sprint** (filed to Backlog): §5a.2 `aiPlanTurn` real lookahead, §5a.3 `CARD_KEEP` review,
§5b.1 reserve-economy-as-*rules* (gated — measure WOA-018 first, then rule). **Parked:** the 16-card
ceiling / 17-card-deck call → [[constraint-temperature]]. **Already done:** §5c.2 (rubric demotion).

## Tickets

### WOA-020 — Fix or cut The Void from core7
**Area:** content · **Status:** Todo · **Type:** sonnet · **Docs:** code-architecture

§5b.4. The Void is geometrically broken — a **donut**: hexes `(-1,0)` and `(0,0)` are absent from its
`shapeDef` (`game/content/maps/the-void.js`), splitting the HQs by a hole into two narrow arms. Fewer
adjacencies → fewer *legal* attacks (Atk 4.5 vs fleet 6.1; Drag 3.7 vs a 2.5 ceiling), and instrumented
on The Void the AI commits attackers into outright **losses 44%** of the time — nowhere to fight from,
not cold feet. While it's in `core7` (`game/content/mapsets/core7.js`) it contaminates the sweep.
**Default: repair first** — fill the two missing hexes so the HQs reconnect, then re-measure; cut it from
`core7` only if the repair can't bring Atk/Drag into band (keeping map variety is worth the two hexes).

**Acceptance criteria:**
- [ ] `shapeDef` repaired (HQs connected, legal-attack count back in band, re-measured) — **or**, only if repair fails to land Atk/Drag in band, the-void removed from `core7`; the path taken + rationale in the closing note
- [ ] If repaired: a `core7` sweep shows The Void's Atk/Drag within band. If cut: `core7` resolves as 6 maps and stays the loop default
- [ ] `node game/test.js` green
- [ ] User confirms done

### WOA-021 — Document `starting:true` as a tunable balance lever
**Area:** rubric · **Status:** Todo · **Type:** sonnet · **Docs:** grading-rubrics

§5b.2. The `starting: true` card (the guaranteed opener) is a live balance lever nobody was treating as
one — measured: one flag moved first-mover **42 → 40**, HQ **17 → 10**, battle length **+1.8 turns** (the
`cavsplit17-tempo` slot). It deserves a line in `grading-rubrics.md` flagging it as a deliberate tunable
(alongside the Temperature / Best-map lines), so future card design treats the opener as a lever, not a
default.

**Acceptance criteria:**
- [ ] `grading-rubrics.md` carries a line documenting `starting: true` as a tunable balance lever, with the measured first-mover / HQ / battle-length effect as evidence
- [ ] The line names which metrics it moves, so a card-design pass can tune it deliberately
- [ ] User confirms done

## In Progress

_None._

## Finished

- **WOA-019 — drop dead per-card Win%** (Done 2026-07-15, sprint-run): removed the Win% column from the terminal (`balance.js`) + saved-markdown (`report-model.js`, both styles) card tables + its "how to read it" note (§5c.1: dead at n=700, all cards 49–52 vs ±8 — invited reading noise as signal). `won` stays in `logs/woa.db` (30072 card_plays rows, independent write path). test.js green (237); golden diff = only the dropped column. Held: dashboard live winPct column/bar untouched (out of scope — parity follow-on). cost: ~84k tok / 22 tools.
- **WOA-018 — fix AI reserve/board eval bias** (Done/**REJECTED** 2026-07-15, sprint-run): the §5a.1 "bent ruler" hypothesis does **not** survive AI-vs-AI measurement. Both levers measured vs current `hard` on core7 and rejected — narrow-gap (`unitReserve`→19) is a coin-flip (**50.7% of 672** agent; **49.5% of 196** runner re-check), urgency-scale monotonically WEAKER (uu6 38% → uu12 4%; it turtles into a loss). No lever clears the beat-`hard` gate → eval reverted to pristine, defaults stand, RULES_VERSION unchanged (1.1), test.js green (237). **Finding:** deploy-on-sight is ~neutral for this attrition dynamic (`fieldScore` counts only deployed units; the attrition projection already punishes undeployment) — the ruler is NOT distorted; the LLM's hold-reserve edge doesn't transfer to the greedy heuristic. If the felt-note is real it's a **rules/content** question → WOA-024. See [[Decisions]] `D.D:ai-reserve-eval-rejected`. cost: ~127k tok / 33 tools / ~43min sim.
- **WOA-017 — deploy-step-budget test** (Done 2026-07-15, sprint-run): `game/test.js` sums printed deploy steps per unit type over the active deck (`E.CARDS`) and asserts ≤ `E.PIECE_TOTALS[type]` (stock from resolved defs, not hardcoded; trench skipped); 234→237. Failing-first proven on `cavsplit17-raid` (8 infantry > 7 stock). Finding: `default` saturates stock exactly (7/7·2/2·1/1) — zero headroom, so any deploy-step-adding card trips it. cost: ~104k tok / 20 tools.

- **WOA-016 — reserve-held-at-end metric** (Done 2026-07-15, sprint-run): per-side reserve-at-end share computed in the engine agg (`engine/06-sim.js`, split of the same `deployedShare` read) + folded/rendered in `report-model.js` (both styles) + `res_end_red/blue` columns in `logs/woa.db`; documented in `data-and-reports.md`. Additive — golden diff holds live (red 48% / 6.0 atk / 5.8 swp match 1.1 baselines); test.js 230→234 with a reconciliation invariant. Baseline reading: hard-vs-hard holds **10%/10%** at end (the deploy-on-sight number WOA-018 must move). cost: ~187k tok / 81 tools.

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]] · [[constraint-temperature]].

#sprint
