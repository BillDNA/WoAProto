---
last-reviewed: 2026-07-18
---
#onboarding #human-instructions
# Grading rubrics — north stars + what to measure

Reference doc for grading cards, maps, units, and the game overall. This is what the
create-card / create-map / run-tournament / review-reports skills grade against, and what an
"is this change good?" conversation with Bill leans on. It is a written reasoning aid, **not a
scoring engine** and not a CI gate. It serves **two readers** — Bill (human grading) and the
review-reports / run-tournament skills (a machine-ish grading recipe) — so keep it scannable.

**Every criterion carries four parts (Bill's shape):**
- **Goal** — what the artifact/metric should achieve.
- **Evidence** — the exact metric that measures it and where it prints (a `balance.js` /
  `report-model.js` column, or a Behaviour/Decisiveness line), or "qualitative — playtest
  judgment" when no metric exists. Never grade on vibes when a number is available; never invent a
  number when one isn't.
- **Score** — what a good / marginal / failing reading looks like. All thresholds are **tunable
  targets, Bill's to adjust** — written as "target: X (tune me)", never hardcoded gates.
- **Lever** — the knob you turn when the reading is bad, and the file/data it lives in. Where a
  metric only *reads* the system and has no knob of its own, the lever line says **"none —
  diagnostic"** and why.

**Setup-label rule (WOA-026 — the structural fix for the mislabel bug).** Every figure in this
doc MUST carry its setup: **(AI tier, n, mapset, date)**. A number missing any of the four is
unciteable — it can't be graded against. This rule exists because a Behaviour baseline drifted for
a whole era on a "normal"-labelled figure that was actually a hard-vs-hard read (see Game-level §1).
No new number lands here label-less.

**Re-baselined 2026-07-16 (WOA-026)** on rules 1.1 / the **Core Six** map pool (mapset id `core7`,
6 maps since WOA-020 cut The Void). The **default setup** for any figure is **hard-vs-hard, Core
Six, `--once`** (`dev/balance-report.js <n> hard hard --parallel --once`); a figure on a different
setup labels it inline — the Behaviour guard has a normal-AI n=40/map read, and the skill-premium
north star is the `matchup` recipe across AI tiers (neither is hard-vs-hard). Superseded pre-1.1
(June) and pre-WOA-020 (7-map) figures are **compacted into a trailing `_Superseded:_` note per
item** — kept so drift stays traceable, never left in a grading position.

*(Meta note, WOA-025 AC12: this project rubric is **deliberately outside** the canonical
`rubric-rubric`'s enumerated set — it predates that rubric's MUST/SHOULD/NICE handle scheme and uses
Bill's Goal/Evidence/Score/Lever shape instead, so running `rubric-rubric` against it would fire on
schema mismatch, not real drift. Kept as a local note rather than editing the canonical-served
rubric-rubric, which would change it for every consuming project.)*

**Deck flip (2026-07-18, WOA-030 — `D.D:seventeen-card-adopt`): `cavsplit17-raid-paid` (17 cards)
is now the ADOPTED/active deck; `default.js` (16 cards) is superseded but stays in `content/decks/`
active:false.** Every figure below re-stamped from the already-saved candidate sweeps
(`logs/reports/balance/1.1/2026-07-16-1514-hard-vs-hard-n60-deck-cavsplit17-raid-paid.md` and
`...-1515-normal-vs-normal-n40-deck-cavsplit17-raid-paid.md`) carries the new deck in its setup
label; the prior default-deck reading trails as a `_Superseded (default deck, pre-WOA-030):_` note
on the same item, same pattern as the pre-1.1/pre-WOA-020 rows above it.

**Metric re-baseline (2026-07-18, WOA-039 — rules 1.2). Three metric DEFINITIONS changed
(engine rules did NOT):** (1) **Atk/Swp counts → Atk%/Swp% SHARES** of all actions taken
(attacks+swaps+marches+deploys) — deck-size-proof, so the WOA-030 16→17 card change no longer
inflates them; the raw counts stay in `logs/woa.db`, cut from print. (2) **Tie% and Drag condition to
ATTRITION endings only** — HQ endings have Drag 0 by definition and diluted the pooled Tie% by the HQ
share, so both now divide by attrition-ending count, not every battle. (3) **Reserves at end conditions
to HQ endings only** and is typically small-n (HQ endings are a minority) — it prints `(n=N)` and is
greyed/excluded from the verdict when slice-n < 240 fleet-wide (SPEC §8). Bands re-measured on the
**standard setup — hard-vs-hard, n=60/map=360, Core Six, deck `cavsplit17-raid-paid`, 2026-07-18**
(`logs/reports/balance/1.2/2026-07-18-1712-hard-vs-hard-n60.md`). The pre-1.2 pooled reading trails as
a `_Superseded (pre-WOA-039, pooled/counts):_` note per item.

## Quick reference — report line → target band

Condensed lookup for reading a balance report side-by-side: every number the report prints, the
range that reads "good", and where the full criterion (detail + Lever) lives. Rows follow the
report's own order. **The criterion below is the SOT** — if this table and a criterion disagree, the
criterion wins and this table gets fixed. All bands are targets (tune me).

| Report line / column                  | Good range                                                                | Rubric item     |
| ------------------------------------- | ------------------------------------------------------------------------- | --------------- |
| **Per-map table**                     |                                                                           |                 |
| Red%                                  | 45–55 (marginal to 40–60; 62/38 = SIDE-BIASED)                            | Map §1          |
| 1st%                                  | 45–55 (marginal to 40–60)                                                 | Map §2          |
| HQ%                                   | 10–40 (≤8 attrition-only, ≥55 rushable)                                   | Map §3          |
| Turns                                 | comfortably under the play cap (2× deck size, 34 today — 17-card ADOPTED) | Game §2         |
| VPdiff                                | no band — context only                                                    | —               |
| Atk% / Swp%                           | share of all actions; near baseline (~19% / ~16%); ±30% move = regression | Game §1         |
| 0kill%                                | ≤5 — **hard floor**                                                       | NS2             |
| Tie%                                  | ≤18 (attrition endings) — **hard floor**                                  | NS5 / Map §6    |
| Drag                                  | ≤3.0 (attrition endings)                                                  | Best map        |
| Swings                                | ≥2.0                                                                      | Best map        |
| Balance                               | 0 = ideal, lower = better (ranking, not a band)                           | Best map        |
| **Overall lines**                     |                                                                           |                 |
| red / first mover                     | 45–55%                                                                    | NS4             |
| HQ captures                           | 10–40%                                                                    | Map §3          |
| Behaviour: attack%/swap%, % fielded   | share of all actions; near baseline (~19% / ~16%); ±30% = regression      | Game §1         |
| Reserves at end (red/blue)            | HQ endings only; small-n (n<240 greyed, shows (n=N)); near dated baseline | Game §1         |
| tie-goes-to-2nd decided               | ≤18% of attrition endings — **hard floor**                                | NS5             |
| first blood won                       | 55–70% (higher = snowbally)                                               | NS2             |
| more-hexes side won                   | ≥70%                                                                      | NS2 / Map §5    |
| Pacing: Drag / Swings                 | ≤3.0 (attrition) / ≥2.0                                                   | Best map        |
| **Card table**                        |                                                                           |                 |
| Simple%                               | <40 good, 40–60 marginal, >60 failing                                     | Card 3          |
| Noop%                                 | ~0; >2% investigate — **hard floor ≈0**                                   | NS3 / Card 2    |
| 1stSight% / AvgSeen                   | no band — **diagnostic of the AI** (>70 with AvgSeen ~1 = watchlist only) | Card 4–5, ⚠ box |
| **Matchup report**                    |                                                                           |                 |
| skill premium                         | adjacent tiers ≥60%, two apart ≥75%                                       | NS1             |

## North stars (what "good" means for this game)

The five headline items — grade any rules / content / AI change against these first.

1. **Skill over luck.**
   Goal: a stronger player wins more; the game rewards decisions over draws.
   Evidence: `balance.js matchup` skill premium (the stronger AI's win rate against a weaker one).
   Baseline (**AI tiers, n=96/map = 576 battles/pairing, Core Six, 2026-07-18, deck
   `cavsplit17-raid-paid` — ADOPTED WOA-030**, `game/balance.js matchup 96 <a> <b>`): normal>easy
   69%, hard>easy 76%, hard>normal 56% (thin — within noise at n=96), sanity (self vs self) 46%
   (thin — within noise at n=96).
   Score: adjacent tiers ≥60%, two tiers apart ≥75% (tune me).
   Lever: AI tier separation — `AI_PRESETS` breadth / replySamples / noise in `game/engine/05-ai.js`
   (widen the gap when a premium reads low). A *low* premium can also mean the rules/content leave
   too little room for skill — that's a design read, not a single knob.
   _Superseded (default deck, pre-WOA-030, Core Six, 2026-07-16): normal>easy 69%, hard>easy 73%,
   hard>normal 56% (thin), sanity 50%. Pre-1.1 June (7-map) — normal>easy 70%, hard>easy 83%,
   hard>normal 54%, sanity 44%._
2. **Decisive games.**
   Goal: fights happen, kills matter, holding ground matters.
   Evidence: the `0kill%` column + the "first blood won" and "more-hexes side won" Decisiveness
   lines. Baseline (**hard-vs-hard, n=60/map = 360, Core Six, 2026-07-16, deck
   `cavsplit17-raid-paid` — ADOPTED WOA-030, 2026-07-18**): zero-kill 2%, first-blood→win 66%,
   control-tracks-win 93%. Normal-vs-normal, same date/deck, n=40/map = 240 (the T2-probe read):
   zero-kill 4%, first-blood→win 64%, control 86%. **0-kill n≥100 confirmation (WOA-030,
   2026-07-18, normal-vs-normal, n=100/map = 600, Core Six, same deck):** zero-kill **2%** — the
   probe's 1→4% drift was thin-n noise, not a real regression; settles well inside the ≤5% hard
   floor.
   Score: zero-kill ≤5%; first-blood 55–70% (higher = snowbally); control ≥70% (tune me).
   Lever: zero-kill → the attrition-projection weight in `evalState` + the deck's attack-card supply
   (`game/engine/05-ai.js`, `content/decks/`); first-blood snowball → combat/advance rules
   (`game/engine/03-rules.js`); control-tracks-win is mostly diagnostic (does ground *deserve* to
   matter) — its knob is map geometry (`content/maps/`).
   _Superseded (default deck, pre-WOA-030, hard-vs-hard, Core Six, 2026-07-16): zero-kill 1%,
   first-blood→win 63%, control-tracks-win 93%. Pre-1.1 June — zero-kill ~4%, first-blood→win 62%,
   control-tracks-win 79%._
3. **No dead turns.**
   Goal: a player always feels they can act.
   Evidence: the per-card **Noop%** column (plays that resolved zero actions) — printed on the
   `report-model.js` / dashboard card table (restored July 2026; new multi-step cards are where
   dead turns reappear); raw counts in the accumulator / `logs/woa.db`. Baseline: ≈0 across the deck
   (**hard, Core Six**; turn-1 dead turns 9%→0 after round 6).
   Score: ~0; any card above 2% gets investigated (tune me). **Hard floor** (see §Temperature).
   Lever: the deck's step-budget vs piece stock (`content/decks/` — oversubscribed deploy/trench
   steps are where the noop tail appears) + the `noopPenalty` weight & `mustPlayStep` rule
   (`game/engine/05-ai.js`, `03-rules.js`).
4. **Balanced start.**
   Goal: neither seat nor colour wins the battle before it starts.
   Evidence: the overall "first mover" line + per-map Red%/1st% columns. Baseline (**hard-vs-hard,
   n=60/map = 360, Core Six, 2026-07-16, deck `cavsplit17-raid-paid` — ADOPTED WOA-030,
   2026-07-18**): first mover 47% overall (red 49%). Normal-vs-normal, same date/deck, **n=40/map =
   240**: first mover 45% (red 50%).
   Score: 45–55% overall and per map (tune me).
   Lever: the `starting:true` opener card (see §`starting: true` — it moves first-mover% directly)
   + per-map geometry & HQ/colour placement (`content/maps/`).
   _Superseded (default deck, pre-WOA-030, Core Six, 2026-07-16): hard first mover 45% (second player
   55%); normal first mover 48%. Pre-1.1 June — first mover 46% at normal; ~56% second-player win at
   hard._
5. **Tie-rule not deciding too much.**
   Goal: tie-goes-to-2nd should break ties, not decide games.
   Evidence: the "tie-goes-to-2nd decided N%" Decisiveness line (an attrition win where both sides
   have EQUAL field scores, awarded to whoever moved second) — **as a share of ATTRITION endings
   (rules 1.2, WOA-039)**, since HQ endings can't tie on field score and only diluted the pooled
   read. Baseline: **13% of attrition endings (hard-vs-hard, n=60/map = 360, Core Six, 2026-07-18,
   deck `cavsplit17-raid-paid`)**. (Normal-vs-normal not re-measured at 1.2.)
   Score: ≤18% of attrition endings — currently MET; treat as a guardrail to hold, not a lever to
   pull. **Hard floor** (see §Temperature). The floor moved 15→18 only because the denominator
   changed (attrition-only ≈ pooled ÷ the ~0.83 attrition share); the real-world stringency is the
   same.
   Lever: the deck's attack-card supply (`content/decks/` — deleting hoarded attack cards drove it
   up) + the trench tie-survival rules (`game/engine/03-rules.js`).
   _Superseded (pre-WOA-039, POOLED over all battles, ≤15% floor): 11% hard (Core Six, 2026-07-16,
   `cavsplit17-raid-paid`); default deck pre-WOA-030 hard 9% / normal 10%; prior 1.1 read 10% (n=60,
   7-map pool, pre-WOA-020). The 0.x-era "~25–26%, biggest open lever" predates the 1.1 trench
   tie-survival rules (WOA-010) that brought it down._

> **Two different "ties" — don't conflate them.** The **attrition tiebreak** ("tie-goes-to-2nd") is
> north star 5: an attrition win where both sides have EQUAL field scores, awarded to whoever moved
> second. The **combat tie** (`game/engine/03-rules.js`) is a separate rule about equal
> attack/defence strength in a single strike — that's what the 1.1 trench tie-survival change
> touched. A suggestion aimed at one will not move the other; say which you mean.

## Temperature — how much metric movement a candidate may spend (Bill, 2026-07-12)

The north stars above are **ranges, and every one of them currently passes.** Graded strictly, that
makes them a ratchet: the only adoptable change is one that improves nothing and breaks nothing, so
the loop gets pinned at a local maximum. (Measured, loop v2 iter2: `cavsplit-17` improved Drag,
Swings, attacks, units-fielded, Red% and killed an auto-play, and was *rejected* for putting
first-mover 3 points under the band.) **Temperature is how much regression the loop is allowed to
buy improvement with.** State the temperature in the analysis; it is a dial, not a default.

| T | Rule | Use when |
|---|---|---|
| **T0 — strict** | Adopt only if **no** north star leaves its band. | Shipping to `default`; protecting a release. |
| **T1 — explore** *(loop default)* | Adopt if **≥3 metrics improve** and **≤1** leaves its band by **≤1 band-width**. Name the trade in the report. | Iterating. Escaping a local maximum. |
| **T2 — hot** | Any excursion allowed **except the hard floors**, to map the design space. Nothing ships from T2 without a T0/T1 re-measure. | Deliberate exploration — "what if the deck-size ceiling weren't there?" (the WOA-029 probe that led to the 17-card ADOPT below) |

**Hard floors — these never relax at any temperature.** Each is a measured cascade, not a preference:
- **Tie-goes-to-2nd ≤ 18% of attrition endings** (rules 1.2, WOA-039 — was ≤15% pooled; the
  denominator changed, not the stringency) — deleting hoarded attack cards drove it up and *produced*
  the swap-dance stalemate.
- **Zero-kill ≤ 5%** and **Noop ≈ 0%** — dead battles and dead turns are the anti-degeneracy guarantees.
- **Printed deploy steps ≥ stock** per unit type — there is **no deploy fallback** in the house rules, so
  a stranded unit can never reach the board (measured: infantry steps 7→5 sent Drag 2.3→3.6, attacks −20%).

> **Structural constraints are candidates for the temperature dial too.** The **16-card deck** is a
> *physical-board* guardrail, not a code one. Iter2 measured its cost directly: the cavalry split is
> clean at 17 cards and only becomes expensive when a 16th-card cut has to fund it. Before rejecting a
> change for breaching a guardrail, check whether the *guardrail* is the thing under test.
>
> **ADOPTED (2026-07-18, WOA-030 — `D.D:seventeen-card-adopt`).** The ceiling is relaxed to **17 for
> `cavsplit17-raid-paid`** specifically (flipped `active:true`, `default` flipped `active:false`) —
> **16 stays the default guardrail for every other deck**, including `default.js` itself. A future
> deck proposal is still graded against 16 unless it re-earns the same T2-probe-then-adopt path.

### Search-side policy (WOA-029)

The ACCEPTANCE face (T0/T1/T2 above) sets how much a candidate may *spend*; this SEARCH face sets
when the loop may *reach for a bigger step* and which walls it may move to take it.

**Local-maximum signal — when the loop is pinned.** The loop sits at a local maximum when a standard
review-reports analysis shows **both**: (a) a **T0 all-pass scoreboard** — every north star +
Game-level guard in-band on both AI tiers; and (b) **zero adoptable candidates** in the iteration —
nothing clears even T1 (no change bought ≥3 improvements for ≤1 in-band excursion). Both are read
straight off the analysis; the worked example is
`logs/reports/analysis/1.1/2026-07-16-1.1-analysis.md` (T0, all-pass, "None rise to an actionable
suggestion at T0"). That state is a ratchet, not success (section intro). It **licenses** raising
temperature: re-grade the iteration at **T1**; if T1 is also dry, that licenses a **declared T2
probe** — named in the analysis, exactly one dial-able constraint under test, hard floors still binding.

**Dial-able constraints (ranked) vs hard floors.** A T2 probe relaxes exactly one structural
guardrail, smallest / best-understood blast radius first:
1. **16-card deck ceiling** — a pure physical-board guardrail (no code depends on it) with a measured
   cost on file (iter2: the cav split is clean at 17, expensive only when a 16th-card cut funds it).
   +1 card is the smallest escape step. *(Probed under this policy — WOA-029: `cavsplit17-raid-paid`
   at 17 cards, analysis `2026-07-16-1.1-analysis-cavsplit17-T2probe.md`. **ADOPTED WOA-030,
   2026-07-18** — see the ADOPTED note above; 16 remains the ceiling for every other deck.)*
2. **Piece stocks** (7 inf / 2 cav / 1 art / 3 trench) — physical too, but a stock change *cascades*:
   it moves the deploy-step floor (≥ stock) and the WOA-017 test ceiling (≤ stock) together, and
   shifts attrition field-score math. Bigger radius → second.
3. **Deploy-step counts** — not an independent dial: the ≥/≤ stock pin couples them to (2); move only
   in lockstep with a stock change, never alone.

The **hard floors** listed in §Temperature above never relax at any temperature — they are not on
this dial (the deploy-step *floor* included; only the structural *ceiling* of item 1 is dial-able).

**Re-measure-to-ship.** Nothing adopted at T1/T2 ships to `default` without a **T0/T1 re-measure on
the standard setup** (hard n=60 + normal n=40, Core Six). A relaxed guardrail that ships **becomes
the new documented guardrail** — the constraint change is recorded here and in [[Goals]]
physical-limitations, atomically with the ship; a guardrail is never moved silently.

## `starting: true` — the guaranteed-opener lever (WOA-021, 2026-07-15)

The `starting: true` flag (the card guaranteed into the opening hand) is a **live balance lever, not a
neutral default** — treat it as a deliberate tuning knob. Measured (loop v2, the `cavsplit17-tempo`
slot, **hard, n≈per-slot, 2026-07-15**): making Conscription the guaranteed opener moved **first-mover
42 → 40%**, **HQ captures 17 → 10%**, and **battle length +1.8 turns** — one flag, three metrics. How
to read it: a stronger / more committal opener pushes first-mover% **down** and lengthens battles (it
hands the first mover a play the second mover answers); a cheaper / defensive opener does the reverse.
So when **first-mover% or HQ%** drifts, check whether the `starting` card is the cause *before*
reaching for the temperature dial or other levers — and when tuning first-mover balance deliberately,
the opener is one of the knobs.
**Lever + where it lives:** the `starting:true` card in the active deck (`content/decks/` — the
adopted deck is `cavsplit17-raid-paid.js` as of WOA-030, 2026-07-18; still `deploy_inf_start`, same
as the superseded `default.js`; exactly one card carries the flag, enforced by `deckProblems`).

## Card rubric

> **⚠ Read this before grading criteria 4 and 5.** `1stSight%` and `AvgSeen` are **readouts of the AI's
> internals, not properties of the card** (measured, loop v2 iter1–2):
> - **`1stSight%` ≈ the immediate eval delta of playing the card.** `unitOnBoard: 22` vs
>   `unitReserve: 16` (`engine/05-ai.js`) means every deploy step crosses a free 6-point gap, times the
>   unit's value (inf 3 / cav 4 / art 5). That one number rank-orders the whole deploy family's 1stSight
>   (cav ×2 = +48 → 79%; art = +30 → 69%; inf = +18 → 18%). `aiPlanTurn` has **no hand lookahead** — it
>   cannot hold a card for a better moment, only fail to pick it.
> - **`AvgSeen` ≈ `CARD_KEEP`** for action cards. The deep-hoard tail is exactly the two highest
>   burn-reluctance values (`mass_assault: 9` → 7.07; `attack_plus1: 8` → 10.85). A high AvgSeen means
>   the AI thinks the card is **precious**, not dead. Attack +1 is hoarded because `+1` is the deck's
>   only button that turns a mutual-destruction tie into a clean kill.
> - **Therefore "auto-play" cannot be fixed by card design — it relocates.** Splitting Deploy Cavalry
>   (1stSight 79→22) simply promoted Deploy Artillery into the vacated slot (69→**77**). The reflex band
>   belongs to whoever has the top eval delta. This is an **AI lever**, not a card lever.
>
> Grade cards on criteria 1–3 (decision / no-ops / Simple%) and on the **game-level** north stars. Treat
> 4 and 5 as *diagnostics of the AI*, never as design targets. The one population that behaves differently
> is the LLM (AvgSeen 1.8–3.1 on the same cards the hard AI hoards at 4–6) — the feels-match is the only
> human-proxy instrument available.

Evidence source for all numbers: the **card report** at the bottom of `node game/balance.js 60`
(columns: Simple% / 1stSight% / AvgSeen / plays) or a saved report from `dev/balance-report.js` /
the Balance Dashboard (`game/report-model.js` — same columns plus **Noop%**, which IS printed there
but NOT in the `balance.js` terminal table). **Win%** is no longer printed anywhere (dropped July
2026, WOA-019 — at n=700 every card read 49-52% against the ±8 rubric threshold, so it wasn't
earning its column); it's still computed in `cardRows()` and recorded per-battle in `logs/woa.db` if
a specific card's Win% is ever needed.

1. **Adds a decision.**
   Goal: the card offers a choice the rest of the deck doesn't already offer — a new line of
   play, not a stat-tweaked duplicate.
   Evidence: qualitative — playtest judgment; compare `steps` against the existing deck — the
   adopted deck is `game/content/decks/cavsplit17-raid-paid.js` as of WOA-030, 2026-07-18
   (vocabulary in `card-cheatsheet.md`).
   Score: good = you can name the situation where you'd pick THIS card; failing = it's strictly
   a re-skin of an existing card's decision.
   Lever: the card's `steps` design in the active deck (`content/decks/`).
2. **Not a dead card — no-ops.**
   Goal: the card never burns a turn doing nothing.
   Evidence: the card's Noop% column (play resolved zero actions).
   Score: good ~0%; marginal 1–2%; failing >2% — a dead turn generator (tune me). This is the
   north-star-3 metric applied per card.
   Lever: the deck's step-budget vs piece stock (`content/decks/`). **Deck-budget corollary (July
   2026, measured):** grade the DECK's step budget, not just the card — sum the deck's printed
   deploy steps per unit type (and trench steps) against reserve stock (7 inf / 2 cav / 1 art / 3
   trenches). Oversubscription doesn't show on the new card; it shows as noop on the PURE
   deploy/trench cards drawn after the stock is spent (iter2 deck: 9 infantry steps vs 7 stock →
   Deploy Infantry 28% / Airdrop 26% noop). Keep printed steps within ~stock+1 per type, or accept
   and measure the dead-tail.
3. **Printed action worth printing — Simple%.**
   Goal: the printed steps beat the house-rule fallback (basic attack/reposition) often enough
   to exist.
   Evidence: Simple% (resolved as a basic action instead of the printed one). Known bias: the
   AI burns its LEAST precious card per `CARD_KEEP`, so low-keep cards read inflated.
   Score: good <40%; marginal 40–60%; failing >60% — the printed text is decoration (tune me).
   Lever: the printed step's power/mod and the card's `CARD_KEEP` value (`content/decks/`, plus
   `CARD_KEEP` in `game/engine/05-ai.js` for the burn-order bias).
4. **Not auto-play — 1stSight% + AvgSeen.**
   Goal: playing it should be a decision, not a reflex.
   Evidence: 1stSight% (played the first time it was ever in hand) read together with AvgSeen.
   Score: 1stSight% >70 with AvgSeen near 1 = overpowered watchlist (tune me) — always good on
   sight. Watchlist, not verdict: confirm with a with/without-the-card matchup or judgment.
   Lever: none — diagnostic (an AI readout, not a card property; see the ⚠ box). The only knob is
   the AI's eval deltas (`unitOnBoard`/`unitReserve`) + `CARD_KEEP` in `engine/05-ai.js`, and it
   *relocates* the reflex band rather than removing it — so a high 1stSight is rarely fixable by
   editing the card.
5. **Not over-situational — AvgSeen.**
   Goal: situational cards should pay off when their moment comes, not rot in hand.
   Evidence: AvgSeen (hand appearances before it got played).
   Score: good ≤2; marginal 2–2.5; >2.5 = hoarded (tune me) — ask whether the payoff moment is
   fun (qualitative) or whether the card is just weak.
   Lever: none — diagnostic (AvgSeen ≈ `CARD_KEEP`, an AI readout). **Hoarding can be functional
   (July 2026, measured):** hoarded attack cards are the deck's late-game kill supply — deleting
   them raised tie-decided monotonically 11→15→20% and produced the swap-dance signature. Before
   condemning a card on AvgSeen, check fleet Tie% and Atk/Swp, and cross-check the LLM population
   (hard-AI AvgSeen 4–6 is its family norm for ALL action cards; LLMs played the same cards eagerly
   at 1.8–3.1). If the payoff is genuinely weak/unfun, the content lever is the card's `steps`
   (`content/decks/`) — not AvgSeen itself.
6. **Win% — deprioritized; pull from the DB if genuinely needed.**
   Goal: sanity check for correlation with winning.
   Evidence: Win% (share of plays that were by the eventual winner) — **dropped from the printed
   card report** (WOA-019, July 2026): at n=700 every card read 49-52% against the ±8 threshold
   below, so it wasn't earning its column. Still computed in `cardRows()` and recorded per-battle in
   `logs/woa.db` — query it there if one card's Win% is specifically in question.
   Score: only deviations beyond ~±8 at n≥60 mean anything (tune me); never grade a card on
   Win% alone.
   Lever: none — diagnostic (a correlation sanity check, not a design target).

## Map rubric

Evidence source: the per-map row in `node game/balance.js 60` plus the Behaviour/Decisiveness
lines with a name filter (`node game/balance.js 60 <mapname>` makes the overall lines
that map's numbers). n=40–60 per map minimum before trusting a read.
**Map numbers are deck-relative (July 2026, measured):** a deck change moves map reads (illustration:
Causeway Red 54→62, Long March HQ 8→2 between deck slots at n=100). Compare maps only against peers
measured with the SAME deck, and re-grade the roster after any deck change.
**All shared lever:** every map criterion turns the same knob — that map's geometry (terrain sides,
HQ & colour placement, HQ spacing) in `content/maps/<slug>.js`. Per-criterion lever lines below name
the *aspect* of geometry each one implies.

1. **Side balance.**
   Goal: neither colour wins on map geometry.
   Evidence: Red%/Blue% columns (the report stamps SIDE-BIASED at 62/38).
   Score: good 45–55; marginal 40–60; failing outside (tune me).
   Lever: terrain sides + HQ/colour placement (`content/maps/`).
   Live reads (**hard-vs-hard, n=60/map, Core Six, 2026-07-16, deck `cavsplit17-raid-paid` —
   ADOPTED WOA-030, 2026-07-18**): no Core Six map trips the 62/38 SIDE-BIASED stamp; the most
   side-leaning is The Narrows at 45% Red (marginal). Per-map side reads drift with every deck/run —
   read the live report rather than trusting a pinned example here.
   _Superseded (default deck, pre-WOA-030, same setup — the 1418 report): most side-leaning were
   Long March and Saber Ridge at 57% Red (marginal)._
2. **Mover balance.**
   Goal: going first (or second) isn't the map's real victory condition.
   Evidence: 1st%/2nd% columns (stamped at 62/38).
   Score: good 45–55; marginal 40–60; failing outside (tune me).
   Lever: HQ spacing + lane geometry (`content/maps/`).
   Live reads (**hard-vs-hard, n=60/map, Core Six, 2026-07-16, deck `cavsplit17-raid-paid` —
   ADOPTED WOA-030, 2026-07-18**): the mover-strong maps are **Long March 35% 1st** (attrition-only)
   and **The Narrows 38% 1st**. The hard AI carries a global ~53% second-player lean (first-mover 47%
   overall this run), so grade each map against its peers at the same difficulty, not against 50.
   _Superseded (default deck, pre-WOA-030, same setup): Long March 30% 1st, The Narrows 37% 1st,
   first-mover 45% overall (~55% second-player lean)._
3. **HQ-vs-attrition mix.**
   Goal: both win paths live — the HQ is threatenable but not rushable.
   Evidence: HQ% column (report notes: ≤8 = attrition-only, ≥55 = HQ-rushable). Overall baseline:
   HQ captures 17% (**hard-vs-hard, n=60/map, Core Six, 2026-07-16, deck `cavsplit17-raid-paid` —
   ADOPTED WOA-030, 2026-07-18**) / 24% (**normal, n=40/map, same date/deck**); attrition the rest.
   Score: good ~10–40; marginal 8–10 or 40–55; failing at the note thresholds (tune me).
   Lever: HQ spacing (`content/maps/`) — close HQs raise HQ%, distant ones force attrition.
   _Superseded (default deck, pre-WOA-030, same setup): HQ captures 23% hard / 25% normal._
4. **Distance-4 compactness.**
   Goal: HQs close enough that the HQ path stays real — the dist-4 maps are the healthiest.
   Evidence: hex distance between the two HQs, counted on the map def / in the editor
   (metric TBD in balance.js — today: count it by hand).
   Score: good ~4; marginal 5; ≥6 predicts an attrition-only HQ% — confirm against item 3
   rather than failing on distance alone (tune me).
   Lever: HQ placement (`content/maps/`).
5. **Board control tracks winning.**
   Goal: holding ground on THIS map matters, not just on average.
   Evidence: "side holding more hexes won" Decisiveness line, per map via name filter.
   Baseline (**Core Six, 2026-07-16, deck `cavsplit17-raid-paid` — ADOPTED WOA-030, 2026-07-18**):
   hard-vs-hard 93%, normal 86%.
   Score: good ≥70; marginal 60–70; failing near 50 (tune me) — ground is decorative there.
   Lever: mostly diagnostic — whether ground *should* matter here; the knob (if a map reads near
   50) is its geometry (`content/maps/`), e.g. chokepoints that make holding hexes decisive.
   _Superseded (default deck, pre-WOA-030): 93% overall (hard-vs-hard & normal, same date)._
6. **Tie-rule share.**
   Goal: the map doesn't funnel battles into equal-field-score stand-offs.
   Evidence: "tie-goes-to-2nd decided" line, per map via name filter — **as a share of attrition
   endings (rules 1.2, WOA-039)**. Baseline 13% of attrition endings overall (**hard-vs-hard,
   n=60/map, Core Six, 2026-07-18, deck `cavsplit17-raid-paid`**). Per-map spread this run: most
   maps 6–17%, The Narrows the outlier at 26% (its hourglass produces symmetric grinds — highest
   Drag 3.4 + Swap% 22 too).
   Score: at or below the game-level target (≤18% of attrition endings, tune me); a map far above
   the fleet average is producing symmetric grinds — look at its terrain and HQ spacing.
   Lever: terrain + HQ spacing (`content/maps/`) — symmetric grinds come from too-distant HQs and
   defensible terrain on both sides.
   _Superseded (pre-WOA-039, POOLED over all battles, ≤15% target): 11% hard (Core Six, 2026-07-16,
   `cavsplit17-raid-paid`); default deck pre-WOA-030 hard 9% / normal 10%._

### "Best map" — the ideal-range score (SOT, WOA-007)

**This table is the definition of "best map."** `balanceScore` in `game/report-model.js` implements
it (one implementation per fact — CLI `BEST_MAP:`, dashboard, tuner all read that function); if this
table and the code disagree, this table wins and the code gets fixed. Score = the weighted distance
each metric sits **outside** its ideal range (0 inside), summed. **Lower = better; 0 = ideal on
every axis.** All endpoints and weights are tunable targets, Bill's to adjust (decided 2026-07-10).

| Metric                       | Evidence (per-map aggregate) | Ideal range | Weight per unit outside                       |
| ---------------------------- | ---------------------------- | ----------- | --------------------------------------------- |
| Red%                         | `redWins/done`                       | 45–55       | 1.0 /pt                                       |
| 1st%                         | `firstWins/done`                     | 45–55       | 1.0 /pt                                       |
| HQ%                          | `hqWins/done`                        | 10–40       | 0.5 /pt                                       |
| 0kill%                       | `zeroKill/done`                      | 0–5         | 0.6 /pt                                       |
| Tie-decided%                 | `tiebreak/attritionEndings`          | 0–18        | 0.3 /pt                                       |
| Drag (kill-less end turns)   | `attritionKillTail/attritionEndings` | 0–3.0       | 4 /turn                                       |
| Swings (lead changes/battle) | `leadChanges/done`                   | ≥2.0        | 6 /swing short                                |
| Control-tracks-win%          | `controlWins/controlGames`           | ≥70         | 0.5 /pt short (skipped when no control games) |

**Lever:** this table is the scoring *fold*, not a separate criterion set — each metric's lever is
named in the North stars / Map rubric above (Red/1st/HQ/Tie → map geometry `content/maps/`; 0kill →
the AI attrition-projection weight `engine/05-ai.js`; Drag/Swings → deck & AI pacing). Tune an
endpoint/weight here only to change what "best" *means*, not to fix a map.

**Round-4 ruling reversed (2026-07-10, Bill):** attrition-only maps ARE now penalized — HQ% below 10
costs points, because both win paths should live on every map. The old score's open-ended swing
*reward* is gone too: swings at or above 2.0 score clean, they no longer buy back fairness failures.

## Unit rubric

Units live in the active unit-set (`content/units/<slug>.js`, WOA-011) or, with no active variant,
the `maps.js` → `"units"` block. Current table: infantry atk1/def1/sup1/vp1 ×7, cavalry 3/0/0/vp2 ×2,
artillery 0/0/2/vp3 ×1. balance.js has no per-unit columns today, so this rubric leans on the stats
table and judgment more than the others.

1. **Role distinctness.**
   Goal: each unit has a job no other unit does better — infantry the line, cavalry the killer,
   artillery the force multiplier — visible in atk/def/sup and in play.
   Evidence: qualitative — playtest judgment, read against the maps.js stats table
   (metric TBD — per-unit deploy/attack/death counts don't exist in balance.js).
   Score: good = each unit is somebody's right answer in a real board state; failing = one unit
   is always the deploy of choice regardless of situation.
   Lever: the unit's atk/def/sup/vp stats (`content/units/` active variant, else the maps.js
   `"units"` block).
2. **Field-score contribution.**
   Goal: the 1/2/3 vp ladder tracks real battlefield value, since surviving-unit field score IS
   the attrition victory condition — a unit priced above its worth is a liability to deploy.
   Evidence: indirect — the VPdiff column (avg field-score gap at battle end) and the "% of units
   ever fielded" Behaviour line move when pricing is off; the direct per-unit read is (metric TBD —
   today: judgment).
   Score: good = every unit type still gets fielded (fielded share stays near its Behaviour-line
   baseline — 86% normal / 90% hard, Core Six, 2026-07-16, per Game-level §1) and vp cost feels
   earned in play; failing = a unit is systematically left in reserve because deploying it is bad
   attrition maths (tune me).
   Lever: the unit's vp pricing (`content/units/`).
3. **Strict domination check.**
   Goal: no unit is worse-or-equal to another on every axis (atk, def, sup, and vp risked) with
   nothing in exchange.
   Evidence: read the maps.js stats table directly — this is arithmetic, not simulation.
   Score: pass/fail — any strictly dominated unit fails and gets a stat or cost change before
   further grading. Currently pass: each unit tops one axis.
   Lever: the unit's stats (`content/units/`).

## Game-level rubric

The five north stars above are the headline items — grade any rules change against them first.
These are the additional regression guards:

1. **Behaviour health.**
   Goal: the AIs (and by proxy the incentive structure) fight rather than shuffle.
   Evidence: the Behaviour line — **attack% & swap% as a SHARE of all actions taken**
   (attacks+swaps+marches+deploys; rules 1.2, WOA-039 — deck-size-proof where the raw counts were
   not), % of units ever fielded; per-side reserve-held-at-end (WOA-016) for hoarding, now **over HQ
   endings only** (an HQ rush ends before a side commits reserves — the read is meaningful only on
   that slice, and it's typically small-n). Baseline (**hard-vs-hard, n=60/map = 360, Core Six,
   2026-07-18, deck `cavsplit17-raid-paid`**): **19% attacks, 16% swaps** of all actions, 94%
   fielded; reserves at the HQ capture red 33% / blue 31% (n=61 HQ endings — small-n, treat as
   directional). Normal-vs-normal not re-measured at 1.2.
   Score: readings near baseline = good; a sharp move (~±30%+) in any of them after a change is a
   regression **even if win rates look fine** (tune me). Low attack% + high swap% is the round-6
   swap-dance signature.
   Lever: the AI anti-degeneracy weights — `noopPenalty` / `antiShuffle` / the attrition projection
   in `game/engine/05-ai.js` (don't zero them in a preset without re-measuring these lines) + the
   active deck's attack supply (`content/decks/`).
   _Superseded (pre-WOA-039 — raw COUNTS/battle, reserves POOLED over all battles): hard 6.7 attacks
   / 5.8 swaps / 94% fielded, reserves red 6% / blue 6% (Core Six, 2026-07-16, `cavsplit17-raid-paid`);
   normal 7.2 attacks / 4.2 swaps / 90% fielded, reserves red 10% / blue 10%. Default deck pre-WOA-030:
   normal 6.8 / 4.3 / 86% fielded; hard 6.3 / 5.4 / 90% fielded. Pre-WOA-020 (7-map) 1.1 figure 6.1
   attacks / 5.7 swaps / 88% fielded — **⚠ flagged for Bill: that number was actually produced by a
   12-map hard-vs-hard sweep despite its "normal" label**. Pre-1.1 V0 signature: attacks↔swaps
   inverted from the ~5/~7 reading._
2. **Pacing.**
   Goal: battles resolve before the deck does the resolving; the **ADOPTED 17-card deck** (WOA-030,
   2026-07-18) caps a battle at **34 plays** (16-card `default.js`, superseded, capped at 32).
   Evidence: Turns column, read with HQ%. Baseline (**hard-vs-hard, n=60/map = 360, Core Six,
   2026-07-16, deck `cavsplit17-raid-paid`**): avg 31.9 turns. Normal-vs-normal, same date/deck,
   n=40/map = 240: avg 30.2 turns.
   Score: good = comfortably under the 34-play cap with a live HQ threat; failing = battles
   routinely run to deck-out on maps that also read attrition-only (tune me).
   Lever: deck size (`content/decks/`) sets the cap; per-map HQ threat (`content/maps/`) sets
   whether battles end before it.
3. **Deck as attrition clock.**
   Goal: total card count (sum of `count` in the active deck — `content/decks/cavsplit17-raid-paid.js`,
   17 cards as of WOA-030, 2026-07-18; `default.js` superseded at 16) keeps the attrition endgame
   meaningful — changing deck size moves every pacing and tie-rule number above.
   Evidence: qualitative — playtest judgment, then re-run the full report after any count change.
   Score: good = attrition endings feel like the climax of positioning, not a timeout (tune me).
   Lever: total card count in the active deck (`content/decks/`) — the master dial behind
   pacing (§2) and the tie-rule north star.

## How to run the numbers

All commands below run against the ACTIVE map-set with no flag needed — today that's **Core Six**
(mapset id `core7`, 6 maps). Pass `--mapset <id>` to target a different pool. Record every figure
with its setup label (AI tier, n, mapset, date) per the intro rule.

```
node game/test.js                 # legality first — always green before measuring
node game/balance.js 60           # full report: per-map rows, Behaviour/Decisiveness, card report
node game/balance.js 60 hard      # same with the Field Marshal (behaviour differs; grade like-for-like)
node game/balance.js 40 narrows   # one map's numbers — the overall lines become that map's lines
node game/balance.js matchup 96   # skill premium (the luck-o-meter), 96 battles per pairing
node dev/balance-report.js 60 hard hard --parallel --once   # saved, apples-to-apples standard sweep
```

Sample-size honesty: n=24 (the default) is a sniff test; grade at n≥40 per map and n≥96 per
matchup pairing, and remember hard>normal was within noise even at 96. When a number and this
doc disagree with how the game feels at the table, the table wins — bring it to Bill.
