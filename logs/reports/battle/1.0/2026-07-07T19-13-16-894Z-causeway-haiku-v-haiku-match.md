# War of Attrition — first-to-3 match on "Causeway" (seed 1234)

- rules version: **1.0** · transport: persistent session per side
- red: **haiku** (effort: low) · blue: **haiku** (effort: low)
- 2026-07-07T19:13:16.894Z
- Result: **Red** wins the match **3-1** over 4 battles
- Rush-luck check: the game-1 winner (red) ALSO won the match — first-to-3 did not change the outcome this time.
- Fallbacks (LLM reply unusable → engine chose): 2 of 89 decisions
- Transport: red 51 session / 0 cold calls · blue 48 session / 0 cold · tokens in/out 1000/96894

## Battle 1 — Red by hq (T15)

### Decisions
- T1 red — card: "Entrench" — _Deploy first unit and secure a trench early for defensive value._
- T1 red — step-deploy: Deploy Infantry at B3 — _Mountain terrain at B3 provides defensive advantage, and it's centrally positioned for the trench I'm about to build._
- T1 red — step-trench: Dig a trench at B3 covering edges SE+E — _Trench at B3 covering SE+E denies attacker support from the central approach (C3), complementing the mountain's NW+W defense._
- T2 blue — card: "Conscription" — _Conscription deploys 2 Infantry for immediate force parity, optimizing VP-per-card efficiency against Red's 1 deployed unit._
- T2 blue — step-deploy: Deploy Infantry at E3 — _E3 anchors northern perimeter, enabling aggressive forward push toward Red in step 2._
- T2 blue — step-deploy: Deploy Infantry at D2 — _D2 advances diagonally toward Red's position; coordinates with E3 for mutual support and forward pressure._
- T3 red — card: "Airdrop" — _Down 1 VP on board; Airdrop's unrestricted placement lets me establish a second unit and catch up in presence._
- T3 red — step-deploy: Deploy Infantry at C2 — _C2 threatens Blue's Infantry at D2 while securing central position to catch up in board presence._
- T4 blue — card: "Attack +1" — _Attack +1 on C2 Infantry wins decisively (2 attack + card bonus vs 1 defense), building 2-1 VP lead._
- T4 blue — step-attack: Attack: Infantry at D2 strikes enemy Infantry at C2 — power 2 vs 1: defender destroyed — _Power 2 defeats defense 1 decisively; eliminates Red's deployed Infantry._
- T5 red — card: "Naval Barrage" — _Naval Barrage then attack Blue's Infantry at C2; my B3 + HQ support (2 vs 1) should win, taking the central position._
- T5 red — step-barrage: Barrage: destroy the trench at B3 — _(fallback: choice failed)_  `(fallback)`
- T6 blue — card: "Attack +1" — _Attack +1 on B3 wins decisively (2 power vs 1 defense); eliminates Red's last unit, securing 2-0 VP victory._
- T7 red — card: "Conscription" — _Down 1 VP with limited cards left; Conscription deploys 2 Infantry to reach parity with Blue's 2 units._
- T7 red — step-deploy: Deploy Infantry at C4 — _C4 advances into the center, builds presence in contested territory, and supports future threats against Blue._
- T7 red — step-deploy: Deploy Infantry at C3 — _C3 takes the center hex; paired with C4, it threatens Blue's C2 and gives me control of the board's strategic core._
- T8 blue — card: "Deploy Artillery" — _Deploy Artillery adds 3 VP (leading 5-3); provides support for future attacks and attrition dominance._
- T8 blue — step-deploy: Deploy Artillery at C1 — _Deploy Artillery at C1 to support C2's immediate attack on Red's C3; provides +2 support for overwhelming advantage._
- T9 red — card: "Ordered Withdraw" — _Attack C3 Infantry vs C1 Artillery (1 vs 1 tie); Ordered Withdraw lets me survive while destroying Blue's 3 VP, swinging board control massively._
- T9 red — step-attack: Attack: Infantry at C3 strikes enemy Infantry at C2 — power 1 vs 3: your attacker is DESTROYED — _(fallback: choice failed)_  `(fallback)`
- T10 blue — card: "Mass Assault" — _Mass Assault destroys C4 with support, then ties with B3; eliminates Red's last units for 4-0 VP victory._
- T11 red — card: "Deploy Cavalry" — _Down 3 VP with 5 turns left; Deploy Cavalry to build units (attack 3) and create multi-direction threats against Blue's C1-C2 cluster._
- T11 red — step-deploy: Deploy Cavalry at C3 — _C3 puts Cavalry adjacent to Blue's C2, threatening their defended position with high attack value._
- T11 red — step-deploy: Deploy Cavalry at D3 — _D3 clusters with C3 Cavalry and advances toward Blue's HQ, creating multi-threat pressure in the center._
- T12 blue — card: "Deploy Cavalry" — _Deploy Cavalry builds 9-6 VP lead with high attack power; secures attrition advantage before deck depletion._
- T12 blue — step-deploy: Deploy Cavalry at D4 — _D4 positions Cavalry adjacent to Red's D3 Cavalry, threatening counterattack while defending E3._
- T12 blue — step-deploy: Deploy Cavalry at D2 — _D2 centralizes Cavalry with mountain terrain defense; supports C2 and threatens Red's C3/C4._
- T13 red — card: "Deploy Artillery" — _Deploy Artillery to close VP gap (6→9) and provide +2 support to my Cavalry attackers; Artillery turns my adjacent units into devastating threats._
- T13 red — step-deploy: Deploy Artillery at B2 — _B2 supports my C3 Cavalry, enabling a 5 vs 3 attack on Blue's C2 (C3 attack 3 + B2 support 2 vs C2 defense 1 + C1 support 2)._
- T14 blue — card: "Entrench" — _Entrench adds 1 VP (leading 10-9) and fortifies with trench; card advantage (10 vs 8 remaining) ensures attrition win._
- T14 blue — step-deploy: Deploy Infantry at B1 — _Deploy Infantry at B1 to threaten Red's B2/B3 and establish western fortification._
- T14 blue — step-trench: Dig a trench at C2 covering edges E+NE — _Trench at C2 covering E+NE edges blocks support from Red's C3 and D3 Cavalry; protects most-threatened unit._
- T15 red — card: "Reckless Maneuvers" — _Attack with D3 Cavalry vs D2 Cavalry (3 vs 0), win decisively, then reposition to maintain momentum with ~4 turns left._
- T15 red — step-attack: Attack: Cavalry at D3 strikes the enemy HQ at E2 — power 3 vs 1: you CAPTURE THE HQ AND WIN — _D3 Cavalry attacks Blue's HQ at E2; I win 3 vs 1, capture it, and WIN THE BATTLE immediately._

### Battle notes
- **red**: I stumbled early with miscalculations on support values, fell behind on board VP, but recovered by building concentrated threats (Cavalry + Artillery clusters). Finding the direct HQ attack from D3 felt like discovering the board's winning geometry—I'd been focused on unit trades when the faster path was staring at the map the whole time.
- **blue**: I controlled the attrition game well (reached 10-9 VP) but completely missed defending my HQ at E2—I was so focused on VP advantage that I failed to recognize Red had a clear attack path. This is a sharp reminder that in War of Attrition, HQ capture is an instant win condition and should always be defended first, especially when I had the card and VP advantage to safely consolidate.

### Campaign journal
- T1 Battle 1 — "Causeway". Red moves first.
- T1 Red plays "Entrench".
- T1 Red deploys Infantry at B3.
- T1 Red digs a trench at B3.
- T2 Blue plays "Conscription".
- T2 Blue deploys Infantry at E3.
- T2 Blue deploys Infantry at D2.
- T3 Red plays "Airdrop".
- T3 Red deploys Infantry at C2.
- T4 Blue plays "Attack +1".
- T4 Blue Infantry attacks Red Infantry at C2 (2 vs 1): defender destroyed, attacker advances.
- T5 Red plays "Naval Barrage".
- T5 Red's naval barrage obliterates a trench at B3.
- T6 Blue plays "Attack +1".
- T6 Blue finds no opening — the order is spent to no effect.
- T7 Red plays "Conscription".
- T7 Red deploys Infantry at C4.
- T7 Red deploys Infantry at C3.
- T8 Blue plays "Deploy Artillery".
- T8 Blue deploys Artillery at C1.
- T9 Red plays "Ordered Withdraw".
- T9 Red Infantry attacks Blue Infantry at C2 (1 vs 3): attack repelled, attacker destroyed.
- T10 Blue plays "Mass Assault".
- T10 Blue finds no opening — the order is spent to no effect.
- T11 Red plays "Deploy Cavalry".
- T11 Red deploys Cavalry at C3.
- T11 Red deploys Cavalry at D3.
- T12 Blue plays "Deploy Cavalry".
- T12 Blue deploys Cavalry at D4.
- T12 Blue deploys Cavalry at D2.
- T13 Red plays "Deploy Artillery".
- T13 Red deploys Artillery at B2.
- T14 Blue plays "Entrench".
- T14 Blue deploys Infantry at B1.
- T14 Blue digs a trench at C2.
- T15 Red plays "Reckless Maneuvers".
- T15 Red Cavalry attacks Blue HQ at E2 (3 vs 1): defender destroyed, attacker advances.
- T15 Red wins the battle by capturing the headquarters!

## Battle 2 — Blue by hq (T7)

### Decisions
- T1 blue — card: "Deploy Infantry" — _Deploy Infantry adjacent to HQ to secure defense; learned from battle 1 that undefended HQ loses wars._
- T1 blue — step-deploy: Deploy Infantry at E3 — _E3 positions Infantry north of HQ on the approach toward Red; establishes defensive foundation on the advance axis._
- T2 red — card: "Entrench" — _Entrench gives both deployment + trench for early defensive value; I'm down 0-1 and need solid positioning to contest the center._
- T2 red — step-deploy: Deploy Infantry at B3 — _B3 has mountain defense; it's a defensible anchor that supports central map control and future expansion._
- T2 red — step-trench: Dig a trench at B3 covering edges SE+E — _Trench at B3 covering SE+E defends against Blue's likely eastern/center approach while protecting my anchored Infantry._
- T3 blue — card: "Entrench" — _Build 2-1 VP lead with Entrench and fortified position; avoid risky attacks since Red wins ties this battle._
- T3 blue — step-deploy: Deploy Infantry at D2 — _D2 has mountain terrain for defense and positions Infantry toward Red's B3; builds defensive core around HQ._
- T3 blue — step-trench: Dig a trench at E2 covering edges NW+W — _Trench at E2 covering NW+W blocks Red's support from B3; prioritizes HQ defense after losing battle 1 to undefended capture._
- T4 red — card: "Airdrop" — _Airdrop deploys anywhere; I can place Infantry adjacent to D2 to match Blue's 2 units and build central presence._
- T4 red — step-deploy: Deploy Infantry at C2 — _C2 is adjacent to Blue's D2, threatens their central Infantry, and builds contested center presence._
- T5 blue — card: "Conscription" — _Conscription builds 4-2 VP lead ensuring victory despite Red winning ties; HQ trench protects home._
- T5 blue — step-deploy: Deploy Infantry at C3 — _Deploy at C3 advances toward Red's C2; forest terrain supports offensive positioning against advancing threat._
- T5 blue — step-deploy: Deploy Infantry at B2 — _Deploy at B2 advances toward Red's B3 and HQ; creates west-side offensive pressure with C3._
- T6 red — card: "Deploy Artillery" — _Down 2-4 on board; deploy Artillery for +2 support to enable my Infantry to overcome Blue's defended positions next turn._
- T6 red — step-deploy: Deploy Artillery at C1 — _Artillery at C1 supports C2 Infantry attacking C3 with +2 bonus (1+2=3 attack), giving me immediate threat against Blue's central position._
- T7 blue — card: "Mass Assault" — _Mass Assault eliminates Artillery (C1) and B3 Infantry for 4-1 VP lead; decisively secures victory._
- T7 blue — step-attack: Attack: Infantry at B2 strikes the enemy HQ at A2 — power 1 vs 1: tie — you CAPTURE THE HQ AND WIN — _B2 attacks Red's HQ at A2 for instant tie-triggers-capture victory; battle ends immediately._

### Battle notes
- **red**: Blue exploited the map's geometry to rush my HQ while I was still positioning Artillery—I was setting up for a drawn-out attrition fight when Blue went for the fast kill I'd just used to win battle 1. I got outpaced by their aggression and lost before my Artillery support plan materialized.
- **blue**: After losing battle 1 to an undefended HQ capture, I secured my home first and then built forward offensively—by turn 7, my B2 Infantry could reach Red's HQ at A2 and tie for an instant win. This felt like a clean learning cycle: learned the critical lesson (HQ defense + offense), applied it, and converted the setup into a decisive victory.

### Campaign journal
- T1 Battle 2 — "Causeway". Blue moves first.
- T1 Blue plays "Deploy Infantry".
- T1 Blue deploys Infantry at E3.
- T2 Red plays "Entrench".
- T2 Red deploys Infantry at B3.
- T2 Red digs a trench at B3.
- T3 Blue plays "Entrench".
- T3 Blue deploys Infantry at D2.
- T3 Blue digs a trench at E2.
- T4 Red plays "Airdrop".
- T4 Red deploys Infantry at C2.
- T5 Blue plays "Conscription".
- T5 Blue deploys Infantry at C3.
- T5 Blue deploys Infantry at B2.
- T6 Red plays "Deploy Artillery".
- T6 Red deploys Artillery at C1.
- T7 Blue plays "Mass Assault".
- T7 Blue Infantry attacks Red HQ at A2 (1 vs 1): a tie — both units destroyed.
- T7 Blue wins the battle by capturing the headquarters!

## Battle 3 — Red by hq (T9)

### Decisions
- T1 red — card: "Conscription" — _Conscription deploys 2 Infantry immediately; I need rapid unit buildup to either rush the HQ or defend against Blue's HQ attack._
- T1 red — step-deploy: Deploy Infantry at B2 — _B2 is central and direct; I need rapid positioning toward Blue's HQ to match their aggressive play in battle 2._
- T1 red — step-deploy: Deploy Infantry at C3 — _C3 is the board center; deploying there gives me 2 units in the middle, positioned to push toward Blue's HQ aggressively._
- T2 blue — card: "Deploy Cavalry" — _Deploy Cavalry builds 4-2 VP lead and provides attack power; card advantage supports aggressive recovery from 0-2 deficit._
- T2 blue — step-deploy: Deploy Cavalry at D2 — _D2 positions Cavalry on mountain terrain for defense bonus; protects fragile unit while maintaining forward position._
- T2 blue — step-deploy: Deploy Cavalry at D3 — _D3 adjacent to D2 creates Cavalry pair for mutual support; forms strong central defensive line._
- T3 red — card: "Ordered Withdraw" — _C3 Infantry attacks Blue's Cavalry (1 vs 0 defense); I destroy a high-threat unit and win the exchange, reducing their board advantage._
- T3 red — step-attack: Attack: Infantry at C3 strikes enemy Cavalry at D2 — power 2 vs 1: defender destroyed — _Destroy D2 Cavalry (2 vs 1); removes a high-threat attacker and eliminates mountain terrain defensive advantage._
- T4 blue — card: "Deploy Artillery" — _Deploy Artillery builds 5-2 VP lead; provides support for Cavalry and secures attrition advantage with card edge._
- T4 blue — step-deploy: Deploy Artillery at D2 — _D2 adjacent to Cavalry creates mutual support; mountain terrain protects Artillery; establishes strong central axis._
- T5 red — card: "Attack +1" — _Attack +1 destroys Blue's Artillery at D2 (0 defense); I win 3 VP swing (2→3 vs 5→2) and seize board advantage._
- T5 red — step-attack: Attack: Infantry at C3 strikes enemy Artillery at D2 — power 3 vs 1: defender destroyed — _Destroy D2 Artillery (3 vs 1); ties board VP at 2-2, removes Blue's support unit, seizes momentum._
- T6 blue — card: "Attack +1" — _Attack +1 on D2 guarantees victory (4 vs 1 defense); eliminates adjacent threat and secures 2-1 VP lead._
- T6 blue — step-attack: Attack: Cavalry at D3 strikes enemy Infantry at D2 — power 5 vs 2: defender destroyed — _Direct attack D3 vs D2 eliminates Red Infantry decisively (5 vs 2); simpler path to victory._
- T7 red — card: "Deploy Cavalry" — _Deploy 2 Cavalry (attack 3 each); with endgame 6 turns left, I need aggressive units to catch up from 1-2 VP and threaten Blue's HQ._
- T7 red — step-deploy: Deploy Cavalry at C3 — _C3 is central and adjacent to D2 Cavalry; positions my Cavalry to threaten Blue's unit and advance toward the HQ._
- T7 red — step-deploy: Deploy Cavalry at D3 — _D3 clusters both Cavalry near Blue's D2; with 2 Cavalry providing mutual support (attack 3 + 3), I can overwhelming Blue and push toward the HQ._
- T8 blue — card: "Attack +1" — _Attack +1 eliminates Red's Cavalry threat to my D2 (5 vs 0 defense); prevents destruction and reduces Red to 3 VP._
- T8 blue — step-attack: Attack: Cavalry at D2 strikes enemy Cavalry at C3 — power 4 vs 1: defender destroyed — _Attack C3 destroys Cavalry and advances my unit to forest terrain; positions closer to Red's HQ for offensive pressure._
- T9 red — card: "Careful Maneuvers" — _Reposition D3 Cavalry toward E2 HQ, then attack with -1; even penalized (2 vs 0 defense), I capture the HQ and win the battle._
- T9 red — step-reposition: March Cavalry from D3 to E3 — _March D3 Cavalry to E3, adjacent to Blue's HQ at E2; next step will attack and capture the HQ._
- T9 red — step-attack: Attack: Cavalry at E3 strikes the enemy HQ at E2 — power 2 vs 0: you CAPTURE THE HQ AND WIN — _Cavalry at E3 attacks HQ at E2, wins 2 vs 0 defense, captures it immediately—BATTLE AND MATCH WON._

### Battle notes
- **red**: That battle felt like controlled aggression—I recovered from being down early by destroying Blue's high-value Artillery, then pivoted to exploit the map's geometry with my Cavalry to reach the HQ. After losing battle 2 to an HQ rush, I learned to spot and execute those paths myself, turning Blue's own tactics against them.

**Match over: Red wins 2-1.** Well fought—Blue played aggressively both times, and I had to adapt each battle to stay competitive.
- **blue**: I lost focus defending my HQ despite learning that lesson twice already—I got caught up attacking Red's Cavalry when I should have been deploying Infantry to secure E2 with a defensive perimeter. This was a painful reversal where aggressive play cost me the battle and put me down 2-1 in the series.

### Campaign journal
- T1 Battle 3 — "Causeway". Red moves first.
- T1 Red plays "Conscription".
- T1 Red deploys Infantry at B2.
- T1 Red deploys Infantry at C3.
- T2 Blue plays "Deploy Cavalry".
- T2 Blue deploys Cavalry at D2.
- T2 Blue deploys Cavalry at D3.
- T3 Red plays "Ordered Withdraw".
- T3 Red Infantry attacks Blue Cavalry at D2 (2 vs 1): defender destroyed; the attacker holds its ground.
- T4 Blue plays "Deploy Artillery".
- T4 Blue deploys Artillery at D2.
- T5 Red plays "Attack +1".
- T5 Red Infantry attacks Blue Artillery at D2 (3 vs 1): defender destroyed, attacker advances.
- T6 Blue plays "Attack +1".
- T6 Blue Cavalry attacks Red Infantry at D2 (5 vs 2): defender destroyed, attacker advances.
- T7 Red plays "Deploy Cavalry".
- T7 Red deploys Cavalry at C3.
- T7 Red deploys Cavalry at D3.
- T8 Blue plays "Attack +1".
- T8 Blue Cavalry attacks Red Cavalry at C3 (4 vs 1): defender destroyed, attacker advances.
- T9 Red plays "Careful Maneuvers".
- T9 Red marches Cavalry from D3 to E3.
- T9 Red Cavalry attacks Blue HQ at E2 (2 vs 0): defender destroyed, attacker advances.
- T9 Red wins the battle by capturing the headquarters!

## Battle 4 — Red by hq (T6)

### Decisions
- T1 blue — card: "Entrench" — _Entrench establishes HQ defense from turn 1 with Infantry + trench; applies critical lesson from losses in battles 1 and 3._
- T1 blue — step-deploy: Deploy Infantry at E3 — _E3 positions Infantry north of HQ on the approach toward Red; establishes defensive foundation on the advance axis._
- T1 blue — step-trench: Dig a trench at E2 covering edges NW+W — _Trench at E2 covering NW+W blocks Red's attack support from northwest; defends HQ directly from Red's main threat axis._
- T2 red — card: "Deploy Cavalry" — _Deploy Cavalry early to build rapid mobility toward Blue's HQ; I'm 1 win from closing the match—aggression worked in battle 3._
- T2 red — step-deploy: Deploy Cavalry at B2 — _B2 is central and direct toward Blue's HQ; optimal starting position for Cavalry to push eastward quickly._
- T2 red — step-deploy: Deploy Cavalry at C3 — _C3 clusters Cavalry and controls the board center; paired with B2, I have 2 units positioned to push toward Blue's HQ._
- T3 blue — card: "Deploy Cavalry" — _Deploy Cavalry builds 5-4 VP lead; overcomes 1-4 deficit and takes attrition advantage despite Red winning ties._
- T3 blue — step-deploy: Deploy Cavalry at D2 — _Deploy Cavalry at D2 positions on mountain terrain for defense; creates coordinated axis with E3 Infantry against Red's Cavalry._
- T3 blue — step-deploy: Deploy Cavalry at D3 — _Deploy Cavalry at D3 adjacent to D2; creates Cavalry pair for mutual support and strong central defensive line._
- T4 red — card: "Attack +1" — _Attack +1 with C3 Cavalry (4 vs 3 defense); destroy one of Blue's Cavalry, swing to 4-2 board advantage, and build momentum._
- T4 red — step-attack: Attack: Cavalry at C3 strikes enemy Cavalry at D3 — power 5 vs 2: defender destroyed — _Destroy D3 Cavalry (5 vs 2); advance my Cavalry deeper eastward toward Blue's HQ for follow-up attacks._
- T5 blue — card: "Conscription" — _Conscription builds 5-4 VP lead with Infantry for HQ defense; creates safer attrition position with Red winning ties._
- T5 blue — step-deploy: Deploy Infantry at C3 — _Deploy Infantry at C3 advances forward with forest terrain; creates offensive pressure toward Red's HQ and units._
- T5 blue — step-deploy: Deploy Infantry at B3 — _Deploy Infantry at B3 with mountain terrain; advances toward Red's HQ for offensive pressure and direct threat._
- T6 red — card: "Mass Assault" — _Mass Assault: D3 Cavalry destroys E3 Infantry (3 vs 1), advances into E3, then attacks E2 HQ for instant match victory._
- T6 red — step-attack: Attack: Cavalry at D3 strikes the enemy HQ at E2 — power 3 vs 1: you CAPTURE THE HQ AND WIN — _D3 Cavalry attacks E2 HQ directly (3 vs 1), captures it immediately—BATTLE AND MATCH WON._

### Battle notes
- **red**: That was surgical aggression—I deployed Cavalry immediately for map control, destroyed Blue's D3 unit to consolidate my eastern push, and then spotted the direct HQ attack from D3 in turn 6. Blue's Conscription deployment came too late; by then I already had momentum and the geometry locked down.

**Match over: Red wins 3-1.** Two HQ rushes bookended this match (battles 1 and 4), and I learned to recognize and execute them faster than Blue could build attrition defenses.
- **blue**: I lost the series 1-3. I defended my HQ with a trench from turn 1, but then abandoned the principle by advancing all my Infantry forward (C3, B3) toward Red's HQ, leaving E2 undermanned when Red struck. The irony: I learned HQ defense the hard way but then got overconfident in my forward pressure and forgot to keep units home.

### Campaign journal
- T1 Battle 4 — "Causeway". Blue moves first.
- T1 Blue plays "Entrench".
- T1 Blue deploys Infantry at E3.
- T1 Blue digs a trench at E2.
- T2 Red plays "Deploy Cavalry".
- T2 Red deploys Cavalry at B2.
- T2 Red deploys Cavalry at C3.
- T3 Blue plays "Deploy Cavalry".
- T3 Blue deploys Cavalry at D2.
- T3 Blue deploys Cavalry at D3.
- T4 Red plays "Attack +1".
- T4 Red Cavalry attacks Blue Cavalry at D3 (5 vs 2): defender destroyed, attacker advances.
- T5 Blue plays "Conscription".
- T5 Blue deploys Infantry at C3.
- T5 Blue deploys Infantry at B3.
- T6 Red plays "Mass Assault".
- T6 Red Cavalry attacks Blue HQ at E2 (3 vs 1): defender destroyed, attacker advances.
- T6 Red wins the battle by capturing the headquarters!

## Match felt-notes

### red (haiku)

**Match reflection (3-1):**

The match swung on learning to recognize and execute HQ rushes—I blundered into it in battle 1, got punished by it in battle 2, then dominated with it in battles 3-4. Early luck played a role (good card draws for Cavalry deployment), but the adaptation was real: I shifted from attrition-building (Entrench, Artillery) to velocity (pure Cavalry paths).

**Strong:** Cavalry dominance (attack 3, high mobility). Direct HQ attacks compress games to 6-9 turns. Aggressive positioning early wins the map.

**Weak:** Infantry alone are glacial. Trenches feel cosmetic (never meaningfully blocked attacks). Attrition-focused strategies lose to tempo.

**Suggested change:** Raise HQ base defense from 0 to 1, or give trenches +1 defense to the hex they're on. Right now, velocity + Cavalry beats everything; make defending viable.

### blue (haiku)

**Match reflection:**

Not luck—pattern. I learned HQ defense in battle 2 (won decisively), then repeatedly forgot it by overcommitting forward (battles 3, 4), leaving E2 undermanned. Red's HQ-capture wins exploited this behavioral pattern, not randomness.

**Strengths:** Quick tactical adaptation (battle 2 execution), VP-lead recognition, efficient unit positioning.

**Weaknesses:** Tunnel vision—tunnel vision—once attacking, I'd abandon home defense; spreading units too thin across the board.

**Suggested change:** HQ capture is currently an instant-win that's too easy to achieve. The loser just leaves E2/A2 vulnerable while fighting elsewhere. Give HQs base defense of 1, or require an attacking unit to occupy an adjacent hex for a full turn before capturing next turn. This forces attackers to commit to a siege, not just snipe an opening.

## Typicality vs the map baseline

_Baseline: 40 hard-AI self-play battles on "Causeway" (rules 1.0), folded through the same aggregation as the Balance Dashboard (cached)._

| Metric | This game | Baseline | Read |
|---|--:|--:|---|
| Ending | Red by hq | 25% HQ / 75% attrition | HQ capture, in line with the map |
| Length | T6 | ~28 avg | 78% shorter — quicker than usual |
| Winner side | Red | red 48% | map leans blue 52% |
| Kills (units lost) | 2 | 3% zero-kill | had combat (3% of baseline games have none) |
| Attacks resolved | 2 | ~6.5 avg | below baseline |
| Final VP gap | 1 | ~2.7 avg | below baseline |

An **atypical** game — much shorter than average.

#reports #battle #v1-0
