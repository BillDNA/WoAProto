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

### WOA-016 — Add reserve-held-at-end-of-battle metric (per side)
**Area:** data · **Status:** Todo · **Type:** sonnet · **Docs:** data-and-reports, code-architecture

The LLM feels-match's central claim — *"saving Infantry/Cavalry reserves for turn 15+ wins"* — is
currently unmeasurable from any report we produce (final report §5c.4). This metric is the instrument
that proves or disproves the AI-eval finding (WOA-018): per side, how much of each unit type was still
**undeployed (in reserve)** at battle end. Build it **first** — WOA-018's verification depends on it.
Content-as-data seam: it should be a one-file addition to the balance fold (`game/report-model.js`) per
the *one-implementation-per-fact* goal; if it isn't, fix the seam before adding the metric.

**Acceptance criteria:**
- [ ] Every battle records reserve-held-at-end per side (per unit type, or at minimum aggregate reserve count), landing as a per-battle row in `logs/woa.db` and folded into the balance report
- [ ] The metric shows in a `balance-report` run (markdown + accumulator) with a documented interpretation/band in `data-and-reports`
- [ ] Adding it is a one-file diff to the balance fold (`report-model.js`) — or the seam was fixed first and that's noted in the closing note
- [ ] Golden balance diff: existing aggregates byte-identical (the metric is additive; no existing number moves); `node game/test.js` green
- [ ] User confirms done

### WOA-017 — Deploy-step-budget-vs-stock assertion in test.js
**Area:** test · **Status:** Todo · **Type:** sonnet · **Docs:** code-architecture

The *"single highest-value one-liner in the report"* (§5c.3). Oversubscription is invisible until
simulated and silently produces dead turns (measured: Raiding Party's 8th infantry step vs stock 7 →
Deploy Infantry Noop 26%); undersubscription strands units unrecoverably (there is **no deploy fallback**).
An assertion in `game/test.js` turns it into a load-time failure, not a 700-battle surprise: for every
active deck/unit config, summed printed deploy steps per unit type must be **≤ that unit's stock**.

**Acceptance criteria:**
- [ ] `game/test.js` asserts, for each active deck, printed deploy steps per unit type ≤ unit stock; `node game/test.js` green
- [ ] The assertion is shown to FAIL on a deliberately oversubscribed fixture (the `cavsplit17-raid` shape: 8 infantry steps vs stock 7) and pass once budgeted — the failing-first proof
- [ ] User confirms done

### WOA-018 — Fix the AI reserve/board eval bias  *(flagship)*
**Area:** ai · **Status:** Todo · **Depends on:** WOA-016 · **Type:** opus · **Docs:** code-architecture

The highest-leverage finding in the report (§5a.1). `unitOnBoard: 22` vs `unitReserve: 16` in
`game/engine/05-ai.js` tells the AI a board unit always beats a reserve unit — deploy now, always. Two
independent LLM players found the opposite wins (*hold reserve, deploy late*); both AI sides share the
error so it cancels in AI-vs-AI. Narrow the gap (`unitReserve` 16 → 19–20) or make it **urgency-scaled**
(reserve worth more early, less late). This may also compress the reflex band contaminating card metrics
and dissolve the second-mover advantage + drag we've been chasing with cards.

**Hazard (respect it):** tuning the AI to flatter the balance metrics *moves the ruler, not the game*.
This change is justified **only** because an independent population (the LLM match) says the heuristic is
wrong — not because the metrics would look nicer. The gate is behavioral + strength, below.

**Acceptance criteria:**
- [ ] The modified AI **beats current `hard`** in the WOA-012 beat-hard matchup gate — must win the matchup (the rejected weight-tuner sweep got **44% of 192**; that's the bar to clear)
- [ ] The reserve-held metric (WOA-016) shows the modified AI **actually holds reserve / deploys later** than current `hard` — the behavior, not just a win rate
- [ ] Full `core7` sweep re-run recorded, reporting whether **second-mover advantage and Drag move** (dissolve / unchanged) — a finding either way, not a pass/fail
- [ ] The change alters battle aggregates, so it is a deliberate **re-baseline**: bump the version SoT and update test pins atomically (golden-diff contract) — not a silent golden-diff break
- [ ] User confirms done

### WOA-019 — Drop per-card Win% from printed reports
**Area:** data · **Status:** Todo · **Type:** sonnet · **Docs:** data-and-reports

§5c.1. Per-card Win% is dead at n=700 — all 13 cards read 49–52 against a ±8 rubric threshold — and it
invites exactly the wrong grading instinct (reading noise as signal). Keep it in the DB (`logs/woa.db`);
stop **printing** it in the markdown report / card tables (`game/report-model.js`).

**Acceptance criteria:**
- [ ] Per-card Win% no longer appears in printed balance reports / card tables; still recorded in `logs/woa.db`
- [ ] `node game/test.js` green; golden diff otherwise unchanged (only the dropped column differs)
- [ ] User confirms done

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

_None._

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]] · [[constraint-temperature]].

#sprint
