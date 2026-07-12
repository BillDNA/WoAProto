#onboarding #human-instructions
# Grading rubrics — north stars + what to measure

Reference doc for grading cards, maps, units, and the game overall. This is what the
create-card / create-map / run-tournament skills grade against, and what an "is this change
good?" conversation with Bill leans on. It is a written reasoning aid, **not a scoring engine**
and not a CI gate.

Every rubric item has three parts (Bill's shape):
- **Goal** — what the artifact should do.
- **Evidence** — the exact `balance.js` metric that measures it and where it prints, or
  "qualitative — playtest judgment" when no metric exists. Never grade on vibes when a number
  is available; never invent a number when one isn't.
- **Score meaning** — what a good / marginal / failing reading looks like. All thresholds are
  **tunable targets, Bill's to adjust** — written as "target: X (tune me)", never hardcoded gates.

Baselines below were measured June 2026, after the round-6 AI fixes and the surviving-units
attrition rule. Re-measure before grading against them (commands in the footer).

## North stars (what "good" means for this game)

1. **Skill over luck.** A stronger player should win more.
   Metric: `balance.js matchup` skill premium.
   Baseline: normal>easy 70%, hard>easy 83%, hard>normal 54% (thin, within noise at n=96), sanity 44%.
   Target: adjacent tiers ≥60%, two tiers apart ≥75% (tune me).
2. **Decisive games.** Fights happen, kills matter, holding ground matters.
   Metrics: `0kill%` column, "first blood won" and "side holding more hexes won" Decisiveness lines.
   Baseline: zero-kill ~4%, first-blood→win 62%, control-tracks-win 79%.
   Targets: zero-kill ≤5%; first-blood 55–70% (higher = snowbally); control ≥70% (tune me).
3. **No dead turns.** A player always feels they can act.
   Metric: per-card no-op share — plays that resolved zero actions. Printed as the card
   table's **Noop%** column (restored July 2026, rules 1.0 — new multi-step cards are where
   dead turns reappear); raw counts stay in the accumulator / `logs/woa.db`.
   Baseline: ≈0 across the deck (hard turn-1 dead turns 9%→0 after round 6).
   Target: ~0; any card above 2% gets investigated (tune me).
4. **Balanced start.** Neither seat nor colour wins the battle before it starts.
   Metrics: overall "first mover" line + per-map Red%/1st% columns.
   Baseline: first mover 46% overall at normal; at hard the second player still wins ~56%.
   Target: 45–55% overall and per map (tune me).
5. **Tie-rule not deciding too much.** Tie-goes-to-2nd should break ties, not decide games.
   Metric: "tie-goes-to-2nd decided N%" Decisiveness line (attrition wins with EQUAL field scores).
   Baseline: **10% (rules 1.1, n60)** — in target. The old "~25–26%, biggest open lever" is a 0.x-era
   number; the 1.1 trench tie-survival rules (WOA-010) brought it to 10%. Cite the live number.
   Target: ≤15% — currently MET, so treat this as a guardrail to hold, not a lever to pull.

> **Two different "ties" — don't conflate them.** The **attrition tiebreak** ("tie-goes-to-2nd") is
> this metric: an attrition win where both sides have EQUAL field scores, awarded to whoever moved
> second. The **combat tie** (`game/engine/03-rules.js`) is a separate rule about equal attack/defence
> strength in a single strike — that's what the 1.1 trench tie-survival change touched. A suggestion
> aimed at one will not move the other; say which you mean.

## Temperature — how much metric movement a candidate may spend (Bill, 2026-07-12)

The north stars above are **ranges, and every one of them currently passes.** Graded strictly, that makes
them a ratchet: the only adoptable change is one that improves nothing and breaks nothing, so the loop
gets pinned at a local maximum. (Measured, loop v2 iter2: `cavsplit-17` improved Drag, Swings, attacks,
units-fielded, Red% and killed an auto-play, and was *rejected* for putting first-mover 3 points under
the band.) **Temperature is how much regression the loop is allowed to buy improvement with.** State the
temperature in the analysis; it is a dial, not a default.

| T | Rule | Use when |
|---|---|---|
| **T0 — strict** | Adopt only if **no** north star leaves its band. | Shipping to `default`; protecting a release. |
| **T1 — explore** *(loop default)* | Adopt if **≥3 metrics improve** and **≤1** leaves its band by **≤1 band-width**. Name the trade in the report. | Iterating. Escaping a local maximum. |
| **T2 — hot** | Any excursion allowed **except the hard floors**, to map the design space. Nothing ships from T2 without a T0/T1 re-measure. | Deliberate exploration — "what if the 16-card ceiling weren't there?" |

**Hard floors — these never relax at any temperature.** Each is a measured cascade, not a preference:
- **Tie-goes-to-2nd ≤ 15%** — deleting hoarded attack cards drove it 11→15→20% and *produced* the
  swap-dance stalemate.
- **Zero-kill ≤ 5%** and **Noop ≈ 0%** — dead battles and dead turns are the anti-degeneracy guarantees.
- **Printed deploy steps ≥ stock** per unit type — there is **no deploy fallback** in the house rules, so
  a stranded unit can never reach the board (measured: infantry steps 7→5 sent Drag 2.3→3.6, attacks −20%).

> **Structural constraints are candidates for the temperature dial too.** The **16-card deck** is a
> *physical-board* guardrail, not a code one. Iter2 measured its cost directly: the cavalry split is
> clean at 17 cards and only becomes expensive when a 16th-card cut has to fund it. Before rejecting a
> change for breaching a guardrail, check whether the *guardrail* is the thing under test.

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
(columns: Win% / Simple% / 1stSight% / AvgSeen / plays; per-card no-op counts stay in the
data — the accumulator JSON and `logs/woa.db` — no longer a printed column).

1. **Adds a decision.**
   Goal: the card offers a choice the rest of the deck doesn't already offer — a new line of
   play, not a stat-tweaked duplicate.
   Evidence: qualitative — playtest judgment; compare `steps` against the existing deck in
   `game/content/decks/default.js` (vocabulary in `card-cheatsheet.md`).
   Score: good = you can name the situation where you'd pick THIS card; failing = it's strictly
   a re-skin of an existing card's decision.
2. **Not a dead card — no-ops.**
   Goal: the card never burns a turn doing nothing.
   Evidence: the card's Noop% column (play resolved zero actions).
   Score: good ~0%; marginal 1–2%; failing >2% — a dead turn generator (tune me). This is the
   north-star-3 metric applied per card.
   **Deck-budget corollary (July 2026, measured):** grade the DECK's step budget, not just the
   card — sum the deck's printed deploy steps per unit type (and trench steps) against reserve
   stock (7 inf / 2 cav / 1 art / 3 trenches). Oversubscription doesn't show on the new card;
   it shows as noop on the PURE deploy/trench cards drawn after the stock is spent
   (iter2 deck: 9 infantry steps vs 7 stock → Deploy Infantry 28% / Airdrop 26% noop). Keep
   printed steps within ~stock+1 per type, or accept and measure the dead-tail.
3. **Printed action worth printing — Simple%.**
   Goal: the printed steps beat the house-rule fallback (basic attack/reposition) often enough
   to exist.
   Evidence: Simple% (resolved as a basic action instead of the printed one). Known bias: the
   AI burns its LEAST precious card per `CARD_KEEP`, so low-keep cards read inflated.
   Score: good <40%; marginal 40–60%; failing >60% — the printed text is decoration (tune me).
4. **Not auto-play — 1stSight% + AvgSeen.**
   Goal: playing it should be a decision, not a reflex.
   Evidence: 1stSight% (played the first time it was ever in hand) read together with AvgSeen.
   Score: 1stSight% >70 with AvgSeen near 1 = overpowered watchlist (tune me) — always good on
   sight. Watchlist, not verdict: confirm with a with/without-the-card matchup or judgment.
5. **Not over-situational — AvgSeen.**
   Goal: situational cards should pay off when their moment comes, not rot in hand.
   Evidence: AvgSeen (hand appearances before it got played).
   Score: good ≤2; marginal 2–2.5; >2.5 = hoarded (tune me) — ask whether the payoff moment is
   fun (qualitative) or whether the card is just weak.
   **Hoarding can be functional (July 2026, measured):** hoarded attack cards are the deck's
   late-game kill supply — deleting them raised tie-decided monotonically 11→15→20% and produced
   the swap-dance signature. Before condemning a card on AvgSeen, check fleet Tie% and Atk/Swp;
   also cross-check the LLM population (hard-AI AvgSeen 4–6 is its family norm for ALL action
   cards, and LLMs played the same cards eagerly at AvgSeen 1.8–3.1).
6. **Win% — keep, don't over-index.**
   Goal: sanity check for correlation with winning.
   Evidence: Win% (share of plays that were by the eventual winner). In an attrition game both
   sides play nearly everything, so this hugs 50 by construction.
   Score: only deviations beyond ~±8 at n≥60 mean anything (tune me); never grade a card on
   Win% alone.

## Map rubric

Evidence source: the per-map row in `node game/balance.js 60` plus the Behaviour/Decisiveness
lines with a name filter (`node game/balance.js 60 <mapname>` makes the overall lines
that map's numbers). n=40–60 per map minimum before trusting a read.
**Map numbers are deck-relative (July 2026, measured):** a deck change moves map reads
(Causeway Red 54→62, Long March HQ 8→2 between deck slots at n=100). Compare maps only
against peers measured with the SAME deck, and re-grade the roster after any deck change.

1. **Side balance.**
   Goal: neither colour wins on map geometry.
   Evidence: Red%/Blue% columns (the report stamps SIDE-BIASED at 62/38).
   Score: good 45–55; marginal 40–60; failing outside (tune me). Current failures under the new
   rules (n=40, normal): Thornfield 70/30 red, The Narrows & Saber Ridge 33/68 blue — map edits
   are Bill's call.
2. **Mover balance.**
   Goal: going first (or second) isn't the map's real victory condition.
   Evidence: 1st%/2nd% columns (stamped at 62/38).
   Score: good 45–55; marginal 40–60; failing outside (tune me). Note the hard AI carries a
   global ~56% second-player lean — grade the map against its peers at the same difficulty.
3. **HQ-vs-attrition mix.**
   Goal: both win paths live — the HQ is threatenable but not rushable.
   Evidence: HQ% column (report notes: ≤8 = attrition-only, ≥55 = HQ-rushable). Overall
   baseline: HQ captures ~20%, attrition ~80%.
   Score: good ~10–40; marginal 8–10 or 40–55; failing at the note thresholds (tune me).
4. **Distance-4 compactness.**
   Goal: HQs close enough that the HQ path stays real — the dist-4 maps are the healthiest.
   Evidence: hex distance between the two HQs, counted on the map def / in the editor
   (metric TBD in balance.js — today: count it by hand).
   Score: good ~4; marginal 5; ≥6 predicts an attrition-only HQ% — confirm against item 3
   rather than failing on distance alone (tune me).
5. **Board control tracks winning.**
   Goal: holding ground on THIS map matters, not just on average.
   Evidence: "side holding more hexes won" Decisiveness line, per map via name filter.
   Baseline 79% overall.
   Score: good ≥70; marginal 60–70; failing near 50 (tune me) — ground is decorative there.
6. **Tie-rule share.**
   Goal: the map doesn't funnel battles into equal-field-score stand-offs.
   Evidence: "tie-goes-to-2nd decided" line, per map via name filter. Baseline 10% overall (1.1).
   Score: at or below the game-level target (≤15%, tune me); a map far above the fleet average
   is producing symmetric grinds — look at its terrain and HQ spacing.

### "Best map" — the ideal-range score (SOT, WOA-007)

**This table is the definition of "best map."** `balanceScore` in `game/report-model.js` implements
it (one implementation per fact — CLI `BEST_MAP:`, dashboard, tuner all read that function); if this
table and the code disagree, this table wins and the code gets fixed. Score = the weighted distance
each metric sits **outside** its ideal range (0 inside), summed. **Lower = better; 0 = ideal on
every axis.** All endpoints and weights are tunable targets, Bill's to adjust (decided 2026-07-10).

| Metric | Evidence (per-map aggregate) | Ideal range | Weight per unit outside |
|---|---|---|---|
| Red% | `redWins/done` | 45–55 | 1.0 /pt |
| 1st% | `firstWins/done` | 45–55 | 1.0 /pt |
| HQ% | `hqWins/done` | 10–40 | 0.5 /pt |
| 0kill% | `zeroKill/done` | 0–5 | 0.6 /pt |
| Tie-decided% | `tiebreak/done` | 0–15 | 0.3 /pt |
| Drag (kill-less end turns) | `killTail/done` | 0–2.5 | 4 /turn |
| Swings (lead changes/battle) | `leadChanges/done` | ≥2.0 | 6 /swing short |
| Control-tracks-win% | `controlWins/controlGames` | ≥70 | 0.5 /pt short (skipped when no control games) |

**Round-4 ruling reversed (2026-07-10, Bill):** attrition-only maps ARE now penalized — HQ% below 10
costs points, because both win paths should live on every map. The old score's open-ended swing
*reward* is gone too: swings at or above 2.0 score clean, they no longer buy back fairness failures.

## Unit rubric

Units live in `maps.js` → `"units"`. Current table: infantry atk1/def1/sup1/vp1 ×7,
cavalry 3/0/0/vp2 ×2, artillery 0/0/2/vp3 ×1. balance.js has no per-unit columns today, so
this rubric leans on the stats table and judgment more than the others.

1. **Role distinctness.**
   Goal: each unit has a job no other unit does better — infantry the line, cavalry the killer,
   artillery the force multiplier — visible in atk/def/sup and in play.
   Evidence: qualitative — playtest judgment, read against the maps.js stats table
   (metric TBD — per-unit deploy/attack/death counts don't exist in balance.js).
   Score: good = each unit is somebody's right answer in a real board state; failing = one unit
   is always the deploy of choice regardless of situation.
2. **Field-score contribution.**
   Goal: the 1/2/3 vp ladder tracks real battlefield value, since surviving-unit field score IS
   the attrition victory condition — a unit priced above its worth is a liability to deploy.
   Evidence: indirect — VPdiff column (avg field-score gap at battle end) and the "% of units
   ever fielded" Behaviour line (88% baseline) move when pricing is off; the direct per-unit
   read is (metric TBD — today: judgment).
   Score: good = every unit type still gets fielded (fielded share stays ~88%+) and vp cost
   feels earned in play; failing = a unit is systematically left in reserve because deploying
   it is bad attrition maths (tune me).
3. **Strict domination check.**
   Goal: no unit is worse-or-equal to another on every axis (atk, def, sup, and vp risked) with
   nothing in exchange.
   Evidence: read the maps.js stats table directly — this is arithmetic, not simulation.
   Score: pass/fail — any strictly dominated unit fails and gets a stat or cost change before
   further grading. Currently pass: each unit tops one axis.

## Game-level rubric

The five north stars above are the headline items — grade any rules change against them first.
These are the additional regression guards:

1. **Behaviour health.**
   Goal: the AIs (and by proxy the incentive structure) fight rather than shuffle.
   Evidence: Behaviour line — attacks & swaps per battle, % of units ever fielded.
   Baseline (normal, n=40/map): ~5 attacks, ~7 swaps, 88% fielded.
   Score: readings near baseline = good; a sharp move in any of them after a change is a
   regression **even if win rates look fine** (tune me — "sharp" ≈ ±30%+). Low Atk + high Swp
   is the round-6 swap-dance signature.
2. **Pacing.**
   Goal: battles resolve before the deck does the resolving; the 16-card deck caps a battle at
   32 plays.
   Evidence: Turns column, read with HQ%.
   Score: good = comfortably under the cap with a live HQ threat; failing = battles routinely
   run to deck-out on maps that also read attrition-only (tune me — no numeric baseline is
   recorded; establish one on the next full run).
3. **Deck as attrition clock.**
   Goal: total card count (sum of `count` in the active deck, `game/content/decks/default.js`) keeps the attrition endgame meaningful —
   changing deck size moves every pacing and tie-rule number above.
   Evidence: qualitative — playtest judgment, then re-run the full report after any count change.
   Score: good = attrition endings feel like the climax of positioning, not a timeout (tune me).

## How to run the numbers

```
node game/test.js                 # legality first — always green before measuring
node game/balance.js 60           # full report: per-map rows, Behaviour/Decisiveness, card report
node game/balance.js 60 hard      # same with the Field Marshal (behaviour differs; grade like-for-like)
node game/balance.js 40 narrows   # one map's numbers — the overall lines become that map's lines
node game/balance.js matchup 96   # skill premium (the luck-o-meter), 96 battles per pairing
```

Sample-size honesty: n=24 (the default) is a sniff test; grade at n≥40 per map and n≥96 per
matchup pairing, and remember hard>normal was within noise even at 96. When a number and this
doc disagree with how the game feels at the table, the table wins — bring it to Bill.
