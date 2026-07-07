#game-logs #human-instructions
# Round-3 data review — rules / cards / maps

**Rules version:** 0.2 (current committed code, V0 feedback round 2).
**Data:** `node game/balance.js 60` — normal AI, n=60/map × 16 maps = **960 battles**, 2026-07-03.
Skill premium: `balance.js matchup 48` (normal>easy 67%; hard pairings mid-run).
LLM logs read: the two Black Forest haiku-v-haiku games + the stale hard-vs-hard n60 report.

This is analysis + proposals for Bill to decide. Card/map proposals follow the create-card /
create-map shapes and are validated where noted.

> **Status (2026-07-03):** the **map** changes below are **APPLIED** — Thornfield, Vanguard,
> Open Mountain Pass removed; The Ford, Riverbend, Causeway added to `maps.js`; `test.js` green
> (built-in count guard 12→13). The **card** changes are still proposals. River-map balance was
> pre-checked under the *old* river rule; re-measure after the rule batch.

---

## TL;DR

The **game-level** health is the best it's been — the five north stars are green or near-green:

| North star | Metric (this run) | Target | Verdict |
|---|---|---|---|
| Skill over luck | normal>easy **67%** | ≥60 | ✅ |
| Decisive games | 0kill **2%**, first-blood **59%**, control **92%** | ≤5 / 55–70 / ≥70 | ✅ |
| No dead turns | ~0 across the deck (heuristic AI) | ~0 | ✅ (LLM caveat below) |
| Balanced start | first mover **49%**, red **50%** overall | 45–55 | ✅ |
| Tie-rule not deciding | tie→2nd **10%** | ≤15 | ✅ **(was ~25 — no longer the top lever)** |

**The problems are localized, not systemic.** It is **not the rules** — the trench/river
rework + surviving-units attrition healed the big levers (tie-rule 25→10, zero-kill ~4→2,
control 79→92). The remaining issues are **specific maps** (a third of the roster is side- or
mover-biased) and **a few cards** (one auto-play, several hoarders, two whose printed text is
decoration). Diagnosis by layer below.

---

## What's working / not — rules vs cards vs maps

### Rules — working, leave alone this round
- Attrition-by-surviving-units + trench-as-support-denial did their job: tie→2nd is down to
  10%, board control tracks winning 92%, zero-kill 2%. Don't reopen these.
- The two rule changes you already green-lit (river = support-crosses/deploy-blocked;
  ban same-type swaps) are **refinements, not fixes** — they add situational depth and close
  the swap-metric blind spot. They won't move the green numbers much; measure after.
- One genuinely mixed rule signal: **swaps still outnumber attacks on the grindy maps**
  (Vanguard 5.9 swp, Twin Gates, The Void 7.7 swp). The same-type-swap ban will bite exactly
  here — good. Watch Atk/Swp on those maps after it lands.

### Cards — the real card issues (from the card report)
| Signal | Cards | Reading |
|---|---|---|
| **Auto-play / overpowered watchlist** | **Deploy Cavalry** — 88% 1stSight, AvgSeen **1.13** | Played on sight almost every time. Both haiku players independently said "cavalry dominate / give cavalry 1 defense." This is really a **unit** issue (cavalry 3/0/0 is pure upside) surfacing through the card. See units note. |
| **Hoarded / situational glut** | Attack +1 AvgSeen **10.35**, Mass Assault 6.53, Ordered Withdraw 5.57, Naval Barrage 4.82, Careful Maneuvers 4.30, Forced March 4.32 | Half the deck sits in hand >4 appearances. Some is fine (finishers), but it means a lot of turns are "nothing great to play." |
| **Printed action is decoration — high Simple%** | Ordered Withdraw **32%**, Mass Assault 33%, Attack +1 27% | The fancy printed version loses to a plain attack a third of the time (see the "are they repositions?" answer — they're basic **attacks**, endgame). |
| **Redundant decision** | Careful Maneuvers ≈ Reckless Maneuvers | Two maneuver+attack cards; Careful's −1 makes its attack feeble. |

### Maps — a third of the roster is biased (the main problem)
| Map | Red% | 1st% | HQ% | Rubric failure |
|---|--:|--:|--:|---|
| **Thornfield** | **78** | 52 | 3 | side balance (worst on roster) + attrition-only |
| **Vanguard** | 53 | **17** | 5 | mover balance (worst) + Drag 5.4 (most circling) |
| **Open Mountain Pass** | 42 | 65 | **52** | decisive-games (0kill **17%**) + HQ-rushable |
| Long March | 37 | 50 | 3 | side balance + attrition-only (redundant 2nd spear) |
| Twin Gates | 48 | 35 | 3 | mover lean + attrition-only, Drag 4.8 |
| Saber Ridge | 48 | 38 | 27 | mover lean |
| Highwater | 60 | 63 | 38 | side + mover lean |

The healthy core: Frontier, Twin Woods, Killing Ground, The Cockpit, The Narrows, Black Forest
— compact/classic dist-4 maps land in the 45–55 / decisive band. **The spear and ridge shapes
(HQs far apart) are where balance goes bad.**

**Hard-AI cross-check** (`balance.js 60 hard`, n=960): overall red 50 / first-mover 47 / HQ 18 /
tie→2nd 12 / control 91 — same green picture, deeper search just captures fewer HQs. It moves two
map reads worth knowing:
- **Thornfield's bias shrinks 78/22 → 63/37 at hard** — some of it is a weaker AI being exploited,
  but it's still flagged SIDE-BIASED. Still a cut.
- **The Marshes flips 50/50 → 32/68 blue at hard.** ⚠️ The one existing river map reads
  *side-biased under strong play*. That's a direct caution for adding more river maps — validate
  the new ones **at hard**, not just normal (their rot180-symmetric terrain should protect them,
  but the river rule change makes this untested).
- Open Mountain Pass holds **17% zero-kill at hard too** — the stalemate is structural, not
  AI-weakness. Confirms the cut. Vanguard/Twin Gates/Long March stay second-mover at hard.

### Units — one flag to raise (not this round's ask, but the data says it)
Cavalry (atk3/def0/sup0/vp2) is the auto-play and both LLMs flagged it. The rubric's
"strict domination" check passes (cavalry tops attack), but "field-score contribution" is
strained — it's deployed on sight regardless of situation. **Candidate: cavalry def 0→1**
(both haiku players proposed exactly this). Flagging only; not proposing it here.

---

## Your three log questions, answered

**1. `2026-07-04T01-13-47…black-forest` (the rush) — "expected every so often, that's why first-to-3."**
Correct, nothing to fix. Red hit a Deploy-Cavalry → Attack+1 → Mass Assault curve and took the
HQ in 9 turns. In the n=960 data these rush wins are the 23% HQ-capture tail; first-to-3 is the
right shock absorber. It's a healthy example, not a bug.

**2. `2026-07-04T02-55-27…black-forest` — "what's happening with the skips?"**
Three turns resolved to **zero actions** — T8 Blue (Reckless Maneuvers), T20 Blue (Ordered
Withdraw), T31 Red (Mass Assault): "finds no opening — the order is spent to no effect." Two
causes, both present:
- **Empty-board dead hands.** After the heavy T2–T7 cavalry trades, a side is left with *no
  units on the board* holding an attack/maneuver card and *no deploy card in hand* — literally
  nothing the card (or the basic-attack/reposition fallback) can target. That's a real
  game-state, not a UI bug.
- **Low-effort LLM play.** haiku (effort:low) sometimes **burns a live card** when a better one
  existed — the heuristic AI almost never does this, because its `noopPenalty` (−80) actively
  steers away from dead turns. So this is *mostly an LLM-quality artifact*, amplified by a
  couple of genuinely dead hands.
- Both haiku players independently asked for the same fix ("cards that can't resolve return to
  hand / auto-default to a basic action"). That's a **rules idea worth a future round**, but the
  current heuristic-AI Skip% is ~0, so it's not urgent. If you want to kill it entirely: a card
  that can resolve *nothing* could be returned to hand (not burned) — but that weakens the
  attrition clock, so it needs its own measurement pass.

**3. Hard-vs-hard n60 report — "attack cards resolved simple, does that mean repositions?"**
**No — they're basic *attacks*, not repositions.** "Simple%" conflates the two house-rule
fallbacks (basic attack + basic reposition), and **basic reposition is refused whenever a basic
attack is legal**, so a "simple" resolution of an attack card is a plain single attack ~all the
time. What's actually happening: the AI only ever burns its *single least-precious card* as a
basic action, and **late game** (tiny hands, positions locked) that plain attack often beats a
card's fancy printed version — so Ordered Withdraw / Mass Assault / Attack+1 rack up Simple% from
being the last card burned as an ordinary attack. **Fix for the ambiguity:** split the card
report's `Simple%` into `Atk%` and `Repo%` so this question is readable straight from the data.
(Small balance.js change — queued for the tooling batch.)

---

## Cards — 3 to cut, 3 to add (create-card shape; deck stays 16)

**Theme of the swap:** the deck leans passive (two maneuver cards, a withdraw, a triple-march).
Cut the passive/redundant/decorative ones; add a *build*, a *terrain-control*, and a *committal
attack* — all pushing toward "always something active to do," which also answers the
dead-hand felt-notes.

### Cut
| Cut | Copies | Data issue it addresses |
|---|--:|---|
| **Forced March** (reposition×3) | 1 | The circling card — T21 marched a unit in a literal circle (B3→A3→B4→B3). It's the Drag/shuffle enabler and runs against your "reduce infantry-for-infantry swaps" goal. |
| **Careful Maneuvers** (reposition, attack −1) | 1 | Redundant with Reckless Maneuvers; the −1 makes its attack feeble; hoarded (AvgSeen 4.30). Fails "adds a distinct decision." |
| **Ordered Withdraw** (attack, tieSpare+noAdvance) | 1 | 32% Simple — its printed stand-off loses to a plain attack a third of the time. *Most debatable cut* (it's the only tieSpare/noAdvance card — a unique defensive identity). Alternative: instead drop **Attack +1** from 2→1 copy (AvgSeen 10.35 = over-hoarded). Your call. |

### Add
```json
{ "id": "dig_in", "name": "Dig In", "count": 1,
  "text": "Build a trench on any controlled hex. Then build another trench on any controlled hex.",
  "steps": [{ "type": "trench" }, { "type": "trench" }] }
```
- **Decision added:** a body-free *fortify* turn — spend 2 of your 3 trenches to wall a lane or
  an HQ approach in one order. The deck can only dig today by *also* deploying (Entrench) or
  *also* attacking (Naval Barrage). This is the defender's card.
- **Issue addressed:** cavalry / HQ-rush dominance. Trenches deny attacker support, so a dug-in
  line blunts supported cavalry strikes and the Open-Mountain-Pass-style HQ rush. Gives the
  *turtle* archetype a real tool.
- **Self-grade:** dead-turn risk low (2 legal targets whenever you hold ground + trenches;
  auto-skips otherwise). Not auto-play — you dig when threatened, so expect mid AvgSeen. Suggest
  CARD_KEEP ≈ 6.

```json
{ "id": "sappers_work", "name": "Sapper's Work", "count": 1,
  "text": "Remove any trench or forest on the board (optional). Then build a trench on any controlled hex.",
  "steps": [{ "type": "barrage" }, { "type": "trench" }] }
```
- **Decision added:** terrain swing — erase an enemy forest/trench **and** plant your own in one
  order. Barrage is a one-card mechanic today (only Naval Barrage); this makes denial a real
  sub-theme and gives a clean counter to the new *Dig In* walls and to forest-heavy maps
  (Twin Woods, Black Forest).
- **Issue addressed:** forest-dependency + trench walls; keeps board-state contestable.
- **Self-grade:** distinct decision ✅. Small no-op risk only if there's no terrain to hit *and*
  no trench in reserve — rare. CARD_KEEP ≈ 5.

```json
{ "id": "storm_line", "name": "Storm the Line", "count": 1,
  "text": "Place an Infantry unit adjacent to any controlled hex. Then order an attack.",
  "steps": [{ "type": "deploy", "unit": "infantry" }, { "type": "attack" }] }
```
- **Decision added:** commit a fresh body precisely to enable a kill *this* turn — the deck has
  deploy cards and attack cards but nothing that deploys *then* strikes.
- **Issue addressed:** (a) the dead-empty-board hands from log #2 — this card is live whenever
  you have a reserve **or** a unit; (b) the "no comeback angle" felt-note — a losing player can
  rebuild-and-punch; (c) your standing "more attacking" goal (raises Atk).
- **Self-grade:** dead-turn risk low; not a re-skin (no deploy+attack exists). CARD_KEEP ≈ 5.

**Test:** import via the Deck Editor (or hand-edit `maps.js` `cards`), then `node game/test.js`
(legality) + a Balance Dashboard / `node game/balance.js 60` run. Watch the new cards' Simple% /
1stSight% / AvgSeen and confirm Atk/Swp don't regress. Offer to add art (by id) only if you
approve the cards first.

---

## Maps — 3 to cut, 3 to add (create-map shape; all validated)

### Cut (three distinct rubric failures)
- **Thornfield** — side balance fail, **78/22 red**. Ridge geometry gives red the terrain.
- **Vanguard** — mover balance fail, **17/83** second-mover, worst Drag (5.4 kill-less turns).
  Spear HQs sit 6 apart → attrition-only march.
- **Open Mountain Pass** — decisive-games fail, **17% zero-kill** stalemates + **52% HQ** rush,
  1st-mover 65. The mountain wall funnels into either a turn-8 rush or a stand-off. (Custom map,
  easy to drop.)

*(Close 4th: **Long March** — 37/63, attrition-only, and a redundant 2nd spear map. Cutting both
spears would retire the dist-6 geometry that produces these failures. Optional — flagging.)*

### Add — all dist-4, side-balanced by construction (rot180-symmetric terrain), and they
actually **use the new river rule** (support crosses, deploy can't). Only The Marshes uses rivers
today. **All three pass `validateMaps` → `[]`.** Pre-check numbers below are n=40 normal under
**current** rules — the river borders shift once the new rule lands, so treat river behaviour as
"to be measured," but the non-river geometry reads healthy already.

```json
{ "name": "The Ford", "shape": "compact", "redHQ": [0,-2], "blueHQ": [0,2],
  "pieces": [{"t":"R","edges":[[1,-1,4],[1,-1,5]]},{"t":"R","edges":[[-1,1,1],[-1,1,2]]},
             {"t":"R","edges":[[1,0,2],[1,0,3]]},{"t":"R","edges":[[-1,0,5],[-1,0,0]]},
             {"t":"F","edges":[[0,-1,4],[0,-1,5]]},{"t":"F","edges":[[0,1,1],[0,1,2]]},
             {"t":"M","edges":[[1,-1,2],[1,-1,3]]},{"t":"M","edges":[[-1,1,5],[-1,1,0]]}] }
```
Rivers arc each side of a central crossing, so armies must **march** the middle (can't leapfrog
with a deploy) while support still reaches over. **Pre-check:** Red 50 / 1st 65 / HQ 30 / Atk 7.0
/ 0kill 3 / tie 3 — balanced + decisive; 1st-mover 65 wants a look after the river rule lands.

```json
{ "name": "Riverbend", "shape": "classic", "redHQ": [0,-2], "blueHQ": [0,2],
  "pieces": [{"t":"R","edges":[[0,-1,4],[0,-1,5]]},{"t":"R","edges":[[0,1,1],[0,1,2]]},
             {"t":"R","edges":[[-1,0,5],[-1,0,0]]},{"t":"R","edges":[[1,0,2],[1,0,3]]},
             {"t":"F","edges":[[1,-1,3],[1,-1,4]]},{"t":"F","edges":[[-1,1,0],[-1,1,1]]},
             {"t":"M","edges":[[-2,0,0],[-2,0,1]]},{"t":"M","edges":[[2,0,3],[2,0,4]]}] }
```
A river bends across the board; forests give reach, the river denies a cheap deploy flank.
**Pre-check:** Red 53 / 1st 38 / HQ 38 / 0kill 5 / tie 18 — balanced side, healthy HQ mix; tie 18
and 2nd-mover 38 are the watch-items.

```json
{ "name": "Causeway", "shape": "compact", "redHQ": [1,-2], "blueHQ": [-1,2],
  "pieces": [{"t":"R","edges":[[2,-1,3],[2,-1,4]]},{"t":"R","edges":[[-2,1,0],[-2,1,1]]},
             {"t":"R","edges":[[0,-1,3],[0,-1,4]]},{"t":"R","edges":[[0,1,0],[0,1,1]]},
             {"t":"F","edges":[[0,0,1],[0,0,2]]},{"t":"F","edges":[[0,0,4],[0,0,5]]},
             {"t":"M","edges":[[1,-1,2],[1,-1,3]]},{"t":"M","edges":[[-1,1,5],[-1,1,0]]}] }
```
Twin rivers wall the flanks and force a central causeway fight; a forest crown on the middle hex
rewards holding it. **Pre-check:** Red 58 / 1st 58 / HQ 28 / 0kill 3 / tie 0 — decisive, slight
red+1st lean to watch.

**Test:** paste into the editor (or Import), then the map tile's Balance button /
`node game/balance.js 40 <name>` — **re-run after the river rule change** since the river borders
are the whole point, and **check at `hard` too**: The Marshes reads 50/50 at normal but 32/68 at
hard, so river maps need the deeper-search pass before you trust a side-balance number.

---

## Suggested tooling follow-ups this surfaced (for the later batches)
- Split card-report **Simple% → Atk% / Repo%** (makes question #3 readable).
- **Stamp the rules version** into balance reports + claude-plays logs (this doc hand-stamps 0.2;
  automate it).
- Consider the **cavalry def 0→1** experiment (unit-level; both LLMs asked).
- Consider **dead-hand return-to-hand** as its own measured rule round (LLM felt-notes).
