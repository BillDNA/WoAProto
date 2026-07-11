# Rule-change suggestions from the 1.0 final report (WOA-009)

A ranked menu of rule changes for the **1.1** bump (WOA-010), grounded in the 1.0 balance-loop
final report (`2026-07-09-1.0-balance-loop-final.md`, "For Bill — rules-territory" list) and the
metric targets in `Goals.md` (`improve-balance-numbers`). **No code was changed** — this is the doc
Bill picks from. Each entry names the metric it should move, the mechanism, the expected
direction/size, the risks/interactions, and an exact verification recipe from the
[[standard-runs-runbook]].

The centrepiece — **Bill's "trench grants survival in ties"** idea (B.6.1) — gets its own worked
section with two concrete mechanic variants and the attack-and-survive-card interaction played out
for each.

---

## First: two different "ties" — don't conflate them

Every suggestion below touches one of **two distinct tie concepts**. Keeping them separate is the
whole game:

| | **Combat tie** | **Attrition tiebreak ("tie-goes-to-2nd")** |
|---|---|---|
| What | A single attack resolves with `attackerPower == defenderPower` | A whole *battle* ends with **equal field scores** and is awarded to whoever moved **second** |
| Code | `03-rules.js:207` `outcome='tie'`; `:252-260` default = **both units destroyed**, `tieSpare` = attacker survives | `README.md:109` "Tie goes to whoever moved second"; `I.fieldScore` on battle end |
| Metric | feeds attacks/swaps, zero-kill, board-clearing | the **"tie-goes-to-2nd decided N%"** Decisiveness line (rubric north-star 5) |
| Baseline | tie destroys both by default | ~25% fleet baseline (rubric); **11%** on the 1.0 default deck; 20% under iter3 |

Bill's trench idea is about the **combat tie** (make a trenched defender survive an even fight).
Several suggestions *also* reach the **attrition tiebreak** because surviving units change field
scores — the linkage is called out per entry.

> **Baseline note on the ~26% figure.** The protected "tie-goes-to-2nd ~26%" anchor is the *0.x-era*
> number; the 1.0 search overhaul reset it. The current 1.0 default deck reads **11%** (final report
> table), iter3 read **20%**. The lever is real (11↔20% measured by deck composition alone) but the
> live 1.0 value is already inside the rubric's ≤15% target on the default deck — so tiebreak changes
> below are about *robustness across content*, not rescuing a broken number.

### Target-metric legend (from `Goals.md` + `grading-rubrics.md`)

| Metric | Instrument (printed) | Current 1.0 (default deck) | Target |
|---|---|---|---|
| Dead turns | per-card **Noop%** column | ~0 | ~0; any card >2% investigated |
| Swings (back-and-forth) | **first-blood→win %**, **control-tracks-win %** (proxies) | fb→win 62%, control 79% | fb→win 55–70%, control ≥70% |
| Turn distribution | HQ% vs attrition split; turn count | HQ 20% | a *mix*, not all-rush or all-attrition |
| Zero-kill | **0kill%** column | 1% | ≤5% (rubric); ≤2% (Goals) |
| Tie-goes-to-2nd | **"tie-goes-to-2nd decided"** line | 11% | ≤15% |

**Instrument gap (flag for all suggestions):** "swings" and "end-game drag / dead turns *late in a
battle*" have **no direct printed metric** — Noop% catches a *card* that does nothing, not a *board*
that has gone quiet. The final report already names the fix: a **turn-bucketed attack histogram per
deck** (its "best candidate for the next instrument"). Any suggestion whose headline metric is
"more swings" or "less end-game drag" should be verified on the *proxies* below **and** flagged as a
motivation for building that histogram (overlaps WOA-007's range-scoring work — don't block on it).

---

## The verification pattern (applies to every entry)

These are **rules changes**, so per the runbook's comparison rule #2 a real adoption bumps
`Engine.VERSION` and starts a fresh `logs/reports/*/1.1/` folder — numbers across versions are not
byte-comparable. For *evaluating a candidate before adoption* the honest recipe is:

1. Apply the candidate on a scratch branch (no version bump yet).
2. **Recipe 2 — standard sweep**, byte-exact, fixed seeds:
   ```
   node dev/balance-report.js 60 hard hard --parallel --once
   ```
   Read as a **direction** check against the recorded 1.0 baseline sweep (not digit-equality — it's a
   rules change). Watch the protect-the-baselines list: first-mover %, Red %, tie-goes-to-2nd %,
   attacks/swaps, zero-kill %.
3. **Recipe 1 — quick pulse** for a single-map direction read while iterating:
   ```
   node game/balance.js 12 normal <map-name-filter>
   ```
4. **Recipe 4 — feel** (one match is enough per B.5.1.2), fixed seed:
   ```
   node dev/claude-plays.js --match 3 --red haiku --blue haiku --effort low --seed 1001
   ```
   Confirms the change reads to a human player and doesn't spike the fallback rate (≲5% = clean).

Per-entry recipes below name only what's *extra* (the specific map filter or metric column to stare
at); the four commands above are the frame.

---

# Ranked suggestions (strongest first)

Ranked by a blend of **signal strength** (independent LLM felt-flags across the loop), **leverage on
the `improve-balance-numbers` target metrics**, and **implementation cleanliness** (a one-branch
engine diff beats a systemic rework).

## S1 — Trench grants the defender survival in a combat tie ⭐ (Bill's B.6.1)

**Rule change.** On a combat tie, if the **attacked border of the defending hex is trenched**
(`trenchCovers(st, battleHex, dIn)` — the same edge test `borderBlocked` already uses, ownership
irrelevant per Bill's rule), the defender is **not** destroyed. Today (`03-rules.js:252-260`) a tie
kills *both* units unconditionally.

**Mechanism in play.** Trenches are currently pure support-denial — "trenches feel weak" (rules
-territory #4, 2 flags; Storm and Hold's 26% Simple under bestof quietly agrees). Tie-survival gives
a dug-in defender a *reason to exist*: an even assault on a trench line bounces instead of trading
1-for-1. Fights become positional — you have to *win* a trench, not just tie it flat.

**Target metric + expected direction/size.**
- **Swings ↑ (primary):** defenders hold ground → the board doesn't clear on mutual annihilation →
  more back-and-forth. Proxy: **control-tracks-win** should hold ≥70% and **first-blood→win** drift
  *down* toward 55–60% (more comebacks). Expect a *modest* move (a few points) — trenches are a
  minority of hexes.
- **Zero-kill ↑ risk (watch):** fewer units die per tie could nudge 0kill% up; must stay ≤5%.
- **Trenches-feel-weak:** qualitative — expect Entrench / Storm and Hold to stop reading as filler.
- **Attrition tiebreak (secondary):** more survivors → *fewer exact field-score ties* → tie-goes-to
  -2nd likely **down** slightly.

**Risks / interactions.** (a) The big one — **attack-and-survive cards**, worked in full below
(§ Trench tie-survival). (b) **HQ hexes:** if a player trenches their own HQ border, S1 stops a tie
from capturing the HQ (`:263` captures on `attacker || tie`) — that is either a feature (couples
cleanly to **S2**) or a surprise; pick the HQ behaviour explicitly. (c) **AI awareness:** the hard
AI must value a trenched defender higher or it will keep trading into trenches — check attacks/swaps
don't crater (over-cautious AI = fewer attacks).

**Verification recipe.** Frame above, plus: sweep on a **trench-heavy map** filter first
(`node game/balance.js 12 normal <trench-map>`); stare at **0kill%** (side effect) and
**attacks/swaps** (AI still fights?). Feel-match seed 1001 — read whether trench lines now shape the
LLM's plans. Compare Entrench / Storm and Hold **Noop%** and **Simple%** before/after.

## S2 — HQ captured only on a *win*, never on a tie

**Rule change.** Drop the `|| res.outcome === 'tie'` from the HQ-capture gate (`03-rules.js:263`):
a tie at the enemy HQ no longer ends the battle. (Cleanest as a standalone; also the natural HQ-only
special case of S1 if you want trench-gating instead.)

**Mechanism.** Rules-territory **#1 by signal — 4 independent LLM felt-flags** across iterations
("capture only on a win, not a tie", "+1 defense when garrisoned", "require 2 attacks"). The LLM meta
ran **64–80% HQ endings vs the AI's 16–24%** — a human-legible degeneracy the sims under-weight. A
tie-capture means an attacker who merely *matches* the HQ's defence takes the game; requiring a clean
win raises the bar and de-fangs the cavalry-rush-into-HQ line.

**Target metric + direction/size.**
- **Turn distribution ↑ (primary):** fewer cheap HQ rushes → HQ% share drops, attrition share rises,
  battles run longer → the "mix, not all-rush" goal. Expect a **noticeable** HQ% drop in the LLM
  population specifically (where rushes concentrate); smaller in hard-vs-hard sims.
- **Swings ↑:** a rush that used to end on a tie now has to be finished, giving the defender a turn to
  answer.

**Risks / interactions.** (a) Could over-nerf aggression → HQ endings too rare / stalemate creep;
watch zero-kill and battle length don't balloon. (b) Interacts with **S1** and with `tieSpare` cards
attacking an HQ — a tieSpare tie at the HQ currently captures it; under S2 it would not (attacker
survives but doesn't take the HQ). Decide S2-vs-S1 precedence at the HQ (recommend: **S2 is
unconditional at the HQ**, trench/card effects only touch unit survival, not the capture gate).

**Verification recipe.** Frame above; the **LLM feel-match is the load-bearing check here** (the flag
is LLM-sourced) — run seed 1001 and read HQ-vs-attrition split + whether rush lines dry up. In the
sweep, watch **HQ%** and battle-length; confirm attacks/swaps stay near baseline (~5/~7).

## S3 — Retune the attrition tiebreak (tie-goes-to-2nd)

**Rule change (pick one sub-variant).** The current rule: equal field score → **second mover wins**.
- **3a — Sudden-death overtime:** an equal-field-score battle plays **one extra round**; still equal
  → *then* second mover. Turns a coin-flip into one more decision.
- **3b — First-blood breaks the tie** before mover-order: equal field score → whoever drew first
  blood wins; only then fall back to second-mover. Rewards initiative over turn order.
- **3c — Leave the rule, move it by content** (the measured lever): the loop already swung it 11↔20%
  by deck composition — so *don't* touch the rule, keep the tiebreak as-is and treat tie% as a
  content KPI. (The conservative pick.)

**Mechanism.** Rules-territory **#3** (2 felt-flags + the whole iter-3 arc). "Tie goes to whoever
moved second" is an arbitrary-feeling coin-flip when field scores are dead level; the felt-notes read
it as *deciding* games rather than *breaking* ties (rubric north-star 5).

**Target metric + direction/size.** **Tie-goes-to-2nd ↓** directly (that's the metric). 3a/3b should
push the ≤15% target well clear even on high-tie content like iter3 (20%). Small blast radius —
touches only the minority of battles that reach exact parity.

**Risks / interactions.** (a) 3b makes **first-blood→win** climb (snowball) — watch it stays ≤70%.
(b) 3a lengthens a few battles (overtime) — watch mean turn count. (c) The mover-order tiebreak is
also the **first-mover% balance knob** — changing it can move first-mover% off ~46%; re-check that
baseline. (d) Least LLM signal of the top three; ranked #3 not #1 because the live default (11%) is
already in-target — this is a *robustness* change, not a fix.

**Verification recipe.** Frame above; the decisive column is **"tie-goes-to-2nd decided %"** — run
the sweep against **iter3 deck/mapset** (`--deck iter3 --mapset iter3`, the known high-tie content)
to prove the change bites where it matters, not just on the already-healthy default. Re-confirm
**first-mover%** hasn't moved off ~46.

## S4 — Split Deploy Cavalry into two single-cavalry cards

**Rule change.** Replace the one `Deploy Cavalry` (deploys **two** cav in sequence) with two separate
single-cav deploy cards. **Pure content/deck lever — no engine change** (belongs in `content/decks/`,
not the 1.1 rules bump, but listed here because it targets the same meta).

**Mechanism.** Rules-territory **#2** (2 flags: "reduce atk 3→2", "cap early deployments"). Deploy
Cavalry holds **80% 1stSight across all four decks** — the strongest auto-play watchlist item; a
double-deploy in the opening is the cavalry-rush engine. Splitting it halves the burst without
banning cavalry.

**Target metric + direction/size.** **Turn distribution ↑** (fewer turn-1/2 rushes → fewer quick HQ
endings), some **swing ↑**. Expect a **small-to-moderate** early-game smoothing.

**Risks / interactions.** (a) Deck-budget corollary — two cards where there was one changes the
deploy-step count vs stock; re-check **Noop%** doesn't reappear (the iter-2 dead-card lesson).
(b) Weakest of the rush levers on its own; pairs naturally with S2. (c) It's a *deck* change, so it
rides the content KPIs, not the rules version.

**Verification recipe.** Recipe 4 with the edited deck (`--deck <edited>`); watch Deploy Cavalry's
**1stSight / AvgSeen** drop and **HQ%** soften. Confirm no new **Noop%** from the budget shift.

## S5 — Zero-kill / end-game-drag guardrail (deck-out reshuffle)

**Rule change.** When a side **decks out** (no orders left) with the battle undecided, reshuffle the
spent pile into a fresh draw for a bounded number of extra turns, instead of grinding to an
equal-field-score attrition tie. (Rules-territory #5, 1 flag.)

**Mechanism.** Targets the **zero-kill** and **late-battle dead-turn** tail — battles that run out of
cards and coast to a tiebreak with nothing happening (end-game drag). Gives players orders to spend
in the phase where the board has gone quiet.

**Target metric + direction/size.** **Zero-kill ↓** toward the Goals ≤2%; **end-game drag ↓**.
Small — only bites the subset of long, indecisive battles (iter3's 6% zero-kill is the target
population; default's 1% barely moves).

**Risks / interactions.** (a) Biggest systemic change here (touches the deck/turn engine, not one
resolve branch) — highest implementation + regression risk; rank last for that reason. (b) Could
*lengthen* battles undesirably → watch mean turn count and that it doesn't just defer the tie.
(c) **Instrument gap bites hardest here** — "dead turns late in a battle" isn't printed; verifying
this properly wants the turn-bucketed attack histogram. Treat as **provisional pending that
instrument**.

**Verification recipe.** Recipe 2 against **iter3 deck/mapset** (its 6% zero-kill is the signal);
watch **0kill%** and mean turn count. Flag explicitly: full verification needs the attack-timing
histogram (WOA-007-adjacent instrument work).

---

# Trench tie-survival — worked mechanics (B.6.1, the AC-2 deep dive)

Bill's idea in full. The combat-tie branch today (`03-rules.js:252-260`):

```
} else { // tie
  if (atk.tieSpare) { killDefender(); }        // attacker survives, defender dies
  else { killDefender(); killAttacker(); }     // both destroyed
}
```

Two `tieSpare` **attack-and-survive cards** exist in the shipped decks — name them exactly:

| Card | Deck | Flags | Tie behaviour today |
|---|---|---|---|
| **Ordered Withdraw** | `default` | `tieSpare` + `noAdvance` | attacker survives a tie; never advances |
| **Over the Top** | `bestof` | `tieSpare` | reposition, then attack; attacker survives a tie |

(Two more carry `noAdvance` only — **Creeping Barrage** `bestof`, and Ordered Withdraw's second flag.
`noAdvance` only changes *advance-on-win*, never tie survival, so it does **not** interact with the
change below — no conflict to resolve there.)

The trigger for "defender is protected by a trench" is the existing edge test:
`trenchCovers(st, battleHex, dIn)` — the attacked border of the defending hex is trenched. Ownership
is irrelevant (Bill's standing rule: capture a trench and it protects *you*).

## Mechanic Variant A — "Trench absorbs the tie" (defender survives; attacker unaffected)

On a tie against a trenched defender, **skip `killDefender()`**. The attacker still dies as in a
normal tie (unless it has `tieSpare`). Minimal diff — one conditional in the `else` branch.

**Attack-and-survive interaction (the crux).** Attacker has `tieSpare` (Ordered Withdraw / Over the
Top) **and** defender is trenched, and the fight ties:

- **A1 — both effects apply → nobody dies (attack whiffs).** `tieSpare` spares the attacker, trench
  spares the defender. The order is spent for *zero* board change. Design read: **throwing an
  attack-and-survive card at a trench line is a wasted order** — trenches hard-counter tie-fishing.
  Clean and symmetric; my recommended default.
- **A2 — trench outranks the card.** Trench spares the defender *and* still kills the attacker (the
  card's spare is denied at a trench). Trenches become a hard wall against Over the Top / Ordered
  Withdraw. Stronger pro-defence; risks making tieSpare cards feel dead.

## Mechanic Variant B — "Trench turns a tie into a repel" (attacker loses)

On a tie against a trenched defender, treat the outcome as a **defender win**: attacker destroyed,
defender survives, **no HQ capture**. Stronger, more legible ("you can't tie your way through a
trench — you lose").

**Attack-and-survive interaction.** Because the outcome is now `defender`, `tieSpare` — which only
fires on `outcome === 'tie'` — **never triggers**: the attacker dies even with Ordered Withdraw /
Over the Top. So under B, the survive-cards are the natural place to carve the exception:

- **B1 — trench beats everything.** Even a tieSpare attacker loses its unit into a trench. Maximal
  trench strength; makes trenched lines genuinely fearsome but can feel punishing.
- **B2 — tieSpare downgrades the repel to a mutual-survive** (recommended under B). A tieSpare card
  attacking a trench ties *safely*: neither unit dies (the card buys back the attacker's survival,
  the trench keeps the defender). This makes **Over the Top / Ordered Withdraw the only way to
  probe a trench without losing your unit** — thematically perfect (*going over the top* is literally
  assaulting a trench). Turns those cards into premium trench-tools instead of dead cards.

## HQ overlap (both variants)

If the trenched hex is an **HQ**, tie-survival also gates HQ capture (a tie no longer takes a trenched
HQ). This is **S1 ∩ S2**. Decide once: either (i) let trench-tie-survival gate HQ capture too (couples
the levers — a player can *fortify* their HQ against tie-rushes), or (ii) make **S2 unconditional at
the HQ** and keep trench effects to unit survival only (cleaner separation). Recommendation: **(ii)** —
adopt S2 as the blanket HQ rule and let S1 govern only unit-vs-unit ties, so the two levers stay
independently tunable.

## Recommended trench pairing

**Variant A / choice A1** (whiff) + **S2** (HQ win-only) is the cleanest, lowest-regression package:
one conditional in the tie branch, one deleted clause in the HQ gate, `tieSpare` cards keep working
and gain a clear identity (wasted vs a trench). **Variant B / B2** is the higher-drama option if
playtests say trenches still feel weak after A.

---

# Suggested adoption sets (for the WOA-010 pick)

Three coherent bundles — Bill picks one (or mixes). Each is sized so WOA-010 can bump 1.1 atomically
with its test-pin updates.

| Set              | Contents                                                                         | Character                                                                                                  | Blast radius                                                                 |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Conservative** | **S2** (HQ win-only) + **S3c** (tiebreak by content, no rule change)             | One deleted clause; addresses the #1-signal flag; lets content carry tie%                                  | Smallest — one-line engine diff, no new state                                |
| **Moderate** ⭐   | **S1 Variant A/A1** + **S2** (S2 unconditional at HQ)                            | Bill's trench idea in its cleanest form + the top-signal HQ fix; trenches gain identity, rushes get harder | One tie-branch conditional + one HQ-gate edit; `tieSpare` cards keep working |
| **Aggressive**   | **S1 Variant B/B2** + **S2** + **S3a** (overtime) + **S4** (split cavalry, deck) | Trenches become a wall Over-the-Top must breach, rushes nerfed twice, tiebreak de-coin-flipped             | Largest — multiple systems; needs the full protect-the-baselines re-anchor   |

**My recommendation: Moderate.** It delivers Bill's explicitly-requested B.6.1 trench idea, folds in
the highest-signal external flag (S2), stays a *two-hunk* engine diff, and keeps the two shipped
`tieSpare` cards meaningful (they whiff into trenches — a real decision, not a nerf). S5 and the
attack-timing histogram are deferred to a later loop once the instrument exists.

Whatever the pick: WOA-010 bumps `Engine.VERSION` → 1.1, updates test pins atomically, re-measures the
protect-the-baselines list (first-mover ~46, Red ~52, tie-goes-to-2nd, skill premium, attacks/swaps),
and records the new 1.1 baseline sweep.

#reports #analysis #v1-0
