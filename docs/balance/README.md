# Balance — the runnable sanity checks

The Monte-Carlo side of grading: the target bands, guards, and policy that a
balance report is read against. No LLM, no taste — this is the math. The
subjective-fun side lives in `docs/rubrics/`.

Two neighbours, one fact each:
- **`best-map-score.md`** — the "best map" ideal-range score, the SOT for the
  metric bands (`report-model.js` folds over it).
- **`docs/balance-baselines.md`** — the current *measured* healthy figures (the
  baselines to protect) and the rules-1.2 metric-redefinition warning. The
  numbers below are **targets** (what good looks like); the live readings that
  currently sit inside them are recorded there, not restated here.

All bands are targets (tune me). Every figure cited anywhere carries its setup —
**(AI tier, n, mapset, date)**; a number missing any of the four is unciteable.

## Quick reference — report line → target band

Read a report side-by-side. The full criterion (goal + lever) is in the rubric or
section named. **The criterion is the SOT** — if this table disagrees with it, the
criterion wins and this table gets fixed.

| Report line / column | Good range | Full criterion |
| --- | --- | --- |
| Red% | 45–55 (marginal to 40–60; 62/38 = SIDE-BIASED) | best-map-score |
| 1st% | 45–55 (marginal to 40–60) | best-map-score |
| HQ% | 10–40 (≤8 attrition-only, ≥55 rushable) | best-map-score |
| Turns | comfortably under the play cap (2× deck size) | Pacing |
| Atk% / Swp% | share of all actions; near baseline; ±30% move = regression | Behaviour |
| 0kill% | ≤5 — **hard floor** | North star 2 |
| Tie% | ≤18 (attrition endings) — **hard floor** | North star 5 |
| Drag | ≤3.0 (attrition endings) | best-map-score |
| Swings | ≥2.0 | best-map-score |
| Balance | 0 = ideal, lower = better (ranking, not a band) | best-map-score |
| first blood won | 55–70% (higher = snowbally) | North star 2 |
| more-hexes side won | ≥70% | North star 2 |
| Simple% | <40 good, 40–60 marginal, >60 failing | card evidence |
| Noop% | ~0; >2% investigate — **hard floor ≈0** | North star 3 |
| 1stSight% / AvgSeen | no band — **diagnostic of the AI** | card evidence |
| Pts / Resid | `⚠` at \|Resid\| ≥ `MISPRICE_RESID_PTS`, `-` under `MISPRICE_MIN_HQPLAYS` — **soft flag, never a gate** (ADR-0002); arithmetic in `docs/report-model.md` | card-rubric §4 |
| skill premium | adjacent tiers ≥60%, two apart ≥75% | North star 1 |

**Small-n rule:** a conditioned metric (Tie%/Drag over attrition endings;
Control%/First-blood over their sub-populations; Reserves over HQ endings) prints
its slice-n and is greyed / excluded from the verdict when that slice is small
(< 240 fleet-wide). Don't grade a thin slice.

## North stars — what "good" means

The five headline targets; grade any rules/content/AI change against these first.
Goal + target + lever below; the current measured readings are in
`docs/balance-baselines.md`.

1. **Skill over luck.** A stronger player wins more. Evidence: the `matchup` skill
   premium. Target: adjacent tiers ≥60%, two apart ≥75%. Lever: AI tier
   separation (`game/engine/05-ai.js`). A low premium can also mean the design
   leaves too little room for skill.
2. **Decisive games.** Fights happen, kills and ground matter. Evidence: 0kill%,
   first-blood→win, control-tracks-win. Target: 0kill ≤5% (**hard floor**);
   first-blood 55–70% (higher = snowbally); control ≥70%. Lever: attrition
   projection + attack-card supply; combat/advance rules; map geometry.
3. **No dead turns.** A player can always act. Evidence: per-card Noop%. Target:
   ≈0; any card >2% gets investigated (**hard floor ≈0**). Lever: deck step-budget
   vs piece stock; the AI's noop penalty / must-play-step rule.
4. **Balanced start.** Neither seat nor colour wins before the battle starts.
   Evidence: first-mover line + per-map Red%/1st%. Target: 45–55% overall and per
   map. Lever: the `starting:true` opener card (see below) + per-map geometry.
5. **Tie-rule not deciding too much.** Tie-goes-to-2nd breaks ties, doesn't decide
   games. Evidence: the tie-decided line, **as a share of attrition endings**
   (rules 1.2). Target: ≤18% of attrition endings (**hard floor**); a guardrail to
   hold, not a lever to pull. Lever: attack-card supply + trench tie-survival rules.

> **Two different "ties" — don't conflate them.** The **attrition tiebreak**
> (north star 5) is an attrition win where both sides have EQUAL field scores,
> awarded to whoever moved second. The **combat tie** (equal attack/defence in a
> single strike) is a separate rule. A change aimed at one won't move the other —
> say which you mean.

## Game-level guards

Additional regression guards beyond the north stars.

- **Behaviour health.** Attack% and Swap% as a **share of all actions**
  (attacks+swaps+marches+deploys), plus % of units ever fielded and per-side
  reserves-held-at-end (over HQ endings only, typically small-n). Target: near
  baseline; a sharp move (~±30%+) after a change is a regression even if win rates
  look fine. Low attack% + high swap% is the swap-dance signature. Lever: the AI
  anti-degeneracy weights + the deck's attack supply.
- **Pacing.** Battles resolve before the deck does. Evidence: Turns, read with
  HQ%. Target: comfortably under the play cap (2× deck size) with a live HQ
  threat; failing = routinely running to deck-out on attrition-only maps. Lever:
  deck size (cap) + per-map HQ threat.
- **Deck as attrition clock.** Total card count keeps the attrition endgame
  meaningful; it's the master dial behind pacing and the tie-rule. Evidence:
  qualitative, then re-run the full report after any count change.

## Unit strict-domination check (arithmetic — pass/fail)

Read straight off the unit stats table; no simulation. **A Unit fails if it is
worse-or-equal to another Unit on every axis** — attack, defence, support, and
Field-score cost risked — **with nothing offered in exchange.** Any strictly
dominated Unit gets a stat or cost change before the `docs/rubrics/unit-rubric.md`
taste axes apply. Pass condition: each Unit tops at least one axis.

## Policy — temperature, search, and the starting lever

### Temperature (how much regression a candidate may buy improvement with)

State the temperature in every analysis; it's a dial, not a default.

| T | Rule | Use when |
| --- | --- | --- |
| **T0 — strict** | Adopt only if **no** target leaves its band. | Shipping to `default`; protecting a release. |
| **T1 — explore** *(loop default)* | Adopt if **≥3 metrics improve** and **≤1** leaves its band by **≤1 band-width**. Name the trade. | Iterating; escaping a local maximum. |
| **T2 — hot** | Any excursion allowed **except the hard floors**, to map the design space. Nothing ships from T2 without a T0/T1 re-measure. | Deliberate exploration of a structural guardrail. |

**Hard floors — never relax at any temperature.** Each is a measured cascade:
- **Tie-goes-to-2nd ≤ 18% of attrition endings** — deleting hoarded attack cards drove it up and produced the swap-dance stalemate.
- **Zero-kill ≤ 5%** and **Noop ≈ 0%** — dead battles and dead turns are the anti-degeneracy guarantees.
- **Printed deploy steps ≥ stock** per unit type — there is no deploy fallback, so a stranded unit can never reach the board.

### Search side — when to reach for a bigger step

The loop sits at a **local maximum** when a standard analysis shows both (a) a T0
all-pass scoreboard and (b) zero adoptable candidates (nothing clears even T1).
That is a ratchet, not success — it licenses raising temperature: re-grade at T1;
if T1 is also dry, that licenses a **declared T2 probe** — named in the analysis,
exactly one dial-able constraint under test, hard floors still binding.

**Dial-able structural constraints (smallest blast radius first):**
1. **Deck-size ceiling** — a pure physical-board guardrail (no code depends on it); +1 card is the smallest escape step.
2. **Piece stocks** — physical too, but a stock change cascades (it moves the deploy-step floor and the test ceiling together, and shifts attrition math). Bigger radius.
3. **Deploy-step counts** — not an independent dial; the ≥/≤ stock pin couples them to stocks. Move only in lockstep with a stock change.

The hard floors above are **not** on this dial (the deploy-step *floor* included;
only a structural *ceiling* is dial-able). **Re-measure to ship:** nothing adopted
at T1/T2 ships to `default` without a T0/T1 re-measure on the standard setup. A
relaxed guardrail that ships **becomes the new documented guardrail**, recorded
atomically with the ship — a guardrail is never moved silently.

### The `starting:true` opener lever

The Card guaranteed into the opening hand is a **live balance lever, not a neutral
default.** A stronger / more committal opener pushes first-mover% **down** and
lengthens battles (it hands the first mover a play the second answers); a cheaper /
defensive opener does the reverse. So when **first-mover% or HQ%** drifts, check
whether the `starting` card is the cause *before* reaching for the temperature dial
or other levers. Exactly one card carries the flag (enforced by `deckProblems`); it
lives in the active deck (`content/decks/`).

## How to run the numbers

All commands run against the ACTIVE mapset with no flag needed; pass
`--mapset <id>` to target a different pool. Record every figure with its setup
label (AI tier, n, mapset, date).

```
node game/test.js                                          # legality first — always green before measuring
node game/balance.js 60                                    # full report: per-map rows, Behaviour/Decisiveness, card report
node game/balance.js 60 hard                               # same at the Field Marshal tier (behaviour differs; grade like-for-like)
node game/balance.js 40 narrows                            # one map's numbers — the overall lines become that map's
node game/balance.js matchup 96                            # skill premium (the luck-o-meter), 96 battles per pairing
node dev/balance-report.js 60 hard hard --parallel --once  # saved, apples-to-apples standard sweep
```

Sample-size honesty: n=24 is a sniff test; grade at n≥40 per map and n≥96 per
matchup pairing, and remember hard>normal was within noise even at 96. When a
number and this doc disagree with how the game feels at the table, the table wins —
bring it to Bill.
