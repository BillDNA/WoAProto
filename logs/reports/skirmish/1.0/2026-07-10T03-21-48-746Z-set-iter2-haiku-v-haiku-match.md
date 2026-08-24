# War of Attrition — first-to-3 match on iter2 set (12 maps) (seed 1001)

- rules version: **1.0** · transport: persistent session per side
- red: **haiku** (effort: low) · blue: **haiku** (effort: low) · deck: iter2
- 2026-07-10T03:21:48.746Z
- Result: **Blue** wins the match **2-3** over 5 battles
- Rush-luck check: the game-1 winner (blue) ALSO won the match — first-to-3 did not change the outcome this time.
- Fallbacks (LLM reply unusable → engine chose): 4 of 240 decisions
- Transport: red 124 session / 0 cold calls · blue 128 session / 0 cold · tokens in/out 2520/256183

## Battle 1 — "The Ford" — Blue by attrition (T33)

### Decisions
- T1 red — card: "Deploy Cavalry" — _Two cavalry per card is high tempo; aggressive early positioning forces Blue to react and establishes control of forward hexes._
- T1 red — step-deploy: Deploy Cavalry at B1 — _B1 is forward yet defensible, leaves maximum adjacent hexes open for the second cavalry placement, and establishes a tempo advantage toward the center._
- T1 red — step-deploy: Deploy Cavalry at C2 — _C2 positions the second cavalry centrally, spreads control across both B and C columns, and creates a strong forward projection toward enemy territory._
- T2 blue — card: "Deploy Cavalry" — _Cavalry provide high attack efficiency and 2 units for 1 card; deploying them closes the VP gap (currently 0-4) and builds attacking potential quickly._
- T2 blue — step-deploy: Deploy Cavalry at D4 — _D4 is the leftmost adjacent position, building a chain toward Red's forces for a path to attack._
- T2 blue — step-deploy: Deploy Cavalry at D3 — _D3 is adjacent to Red cavalry at C2, enabling a direct attack next turn that will eliminate it (cavalry 3 attack vs 0 defense)._
- T3 red — card: "Shock Troops" — _Deploy infantry adjacent to C2 cavalry, then attack Blue's D3 cavalry with support—trade 1 VP deploy for 2 VP kill, seizing tempo._
- T3 red — step-deploy: Deploy Infantry at C1 — _C1 positions infantry to support my C2 cavalry's attack; gives 4 total attack power (3+1 support) to kill Blue's D3 cavalry._
- T4 blue — card: "Storm and Hold" — _Storm and Hold attacks C2 with +1 bonus (4 attack vs 0 defense cavalry), kills it to go ahead on VP, then builds a trench for defense._
- T4 blue — step-trench: Dig a trench at E3 covering edges NE+NW — _Dig a trench at E3 on NE+NW edges to defend my HQ against Red's attacks from the north by blocking attacker support._
- T5 red — card: "Shock Troops" — _Deploy infantry support and kill Blue's second cavalry—push VP lead to 7-4 before Blue deploys defensive infantry._
- T5 red — step-deploy: Deploy Infantry at D1 — _D1 positions infantry to support my C2 cavalry's attack on Blue's D3 cavalry—combined 4 attack power wins cleanly._
- T6 blue — card: "Shock Troops" — _Deploy Infantry at C3 to attack Cavalry at C2 (with Infantry C1 support = tie, both destroyed), reducing Red from 6 to 4 VP and reaching parity._
- T6 blue — step-deploy: Deploy Infantry at C3 — _Deploy at C3 to attack Red Cavalry at C2 (adjacent), resulting in a 1v1 tie that destroys both and reaches VP parity._
- T6 blue — step-attack: Skip this step — _Skip the attack to preserve my Infantry; the attack fails (1 vs 2 power) and I've already completed the deploy step._
- T7 red — card: "Storm and Hold" — _Attack with +1 support to kill Blue's D4 cavalry cleanly (4+1=5 vs 0 defense), then build trench for defensive resilience._
- T7 red — step-attack: Attack: Cavalry at C2 strikes enemy Infantry at C3 — power 4 vs 1: defender destroyed — _C2 cavalry + D1 support + card bonus = 5 attack kills C3 infantry (1 defense); advance cavalry forward, cut Blue's cavalry support._
- T7 red — step-trench: Dig a trench at C3 covering edges NE+NW — _Trench at C3 covering NE+NW denies Blue cavalry support when attacking my forward cavalry; solidifies the front._
- T8 blue — card: "Naval Barrage" — _Remove Red's trench at C3, then attack C3 with D3 cavalry (3 attack vs 1 defense from C1 support), eliminate Red cavalry, advance to C3, and reach VP parity._
- T8 blue — step-barrage: Skip this step — _My attack on C3 succeeds without removal (3 vs 0 power); skipping preserves my forest at D3 for +1 bonus on future attacks._
- T8 blue — step-attack: Attack: Cavalry at D3 strikes enemy Cavalry at C3 — power 4 vs 0: defender destroyed — _Cavalry at D3 destroys C3 cavalry (4 attack from forest +1 bonus vs 0 defense), advances to C3, and reaches VP parity._
- T9 red — card: "Deploy Infantry" — _Deploy infantry adjacent to B1 cavalry to build support infrastructure; enables 4-power attack next turn (cavalry 3 + support 1)._
- T9 red — step-deploy: Deploy Infantry at B2 — _B2 positions infantry directly adjacent to B1 cavalry; enables 4-power attack (cavalry 3 + support 1) on Blue's C3 cavalry next turn._
- T10 blue — card: "Careful Maneuvers" — _Move C3 cavalry to B3, then attack B2 infantry (2 attack with -1 penalty vs 1 defense), eliminate the threat to C3, and reach VP parity._
- T10 blue — step-reposition: March Cavalry from C3 to B3 — _Move C3 cavalry to B3 to position for immediate attack on adjacent B2 infantry._
- T10 blue — step-attack: Attack: Cavalry at B3 strikes enemy Infantry at B2 — power 2 vs 2: tie — BOTH destroyed — _Accept the tie (2 vs 2); both B2 infantry and B3 cavalry destroyed, reaching VP parity at 4-4, and I win the attrition tiebreaker if cards run out._
- T11 red — card: "Deploy Artillery" — _Deploy artillery adjacent to B1 cavalry; enables 5-power attack (cavalry 3 + artillery 2) to finish Blue's D4 cavalry decisively._
- T11 red — step-deploy: Deploy Artillery at B2 — _B2 places artillery directly adjacent to B1 cavalry; combines 3 attack + 2 support for 5-power attack on Blue's D4._
- T12 blue — card: "Deploy Artillery" — _Deploy Artillery adjacent to D4 to add 3 VP (closing gap from 2→5) and provide support value 2 for future coordinated attacks._
- T12 blue — step-deploy: Deploy Artillery at D3 — _Deploy at D3 adjacent to D4 cavalry to provide support value for coordinated attacks on nearby Red Infantry._
- T13 red — card: "Reckless Maneuvers" — _Attack with B1 cavalry + B2 artillery (5 power) to eliminate Blue's D4 cavalry; then reposition to press the advantage._
- T13 red — step-reposition: March Artillery from B2 to C3 — _Move artillery to C3 (forward, deep position); next turn enables cavalry + artillery combo attacks with overwhelming support._
- T14 blue — card: "Shock Troops" — _Deploy Infantry at C4, then attack Red Artillery at C3 (attack 1+2 support vs 0 defense), eliminate it, add 1 VP, take 6-4 lead._
- T14 blue — step-deploy: Deploy Infantry at C4 — _Deploy at C4 adjacent to D3 Artillery and D4 Cavalry to set up attack on C3._
- T14 blue — step-attack: Attack: Artillery at D3 strikes enemy Artillery at C3 — power 2 vs 0: defender destroyed — _Artillery D3 destroys C3 (2 power with forest bonus vs 0), advances to C3, maintains support value 2 for D4 cavalry's future attacks._
- T15 red — card: "Entrench" — _Deploy infantry and build defensive trench; stabilize after losses and rebuild position before endgame with 9 cards remaining._
- T15 red — step-deploy: Deploy Infantry at B2 — _Deploy at B2 to support B1 cavalry; enables attacks on Blue's C3/C4 positions with 4-power (cavalry 3 + support 1)._
- T15 red — step-trench: Dig a trench at B1 covering edges NE+NW — _Trench at B1 (NE+NW edges) protects cavalry from Blue's D4 cavalry attacks; denies support from primary threat vector._
- T16 blue — card: "Conscription" — _Deploy 2 Infantry to reach 8 VP (3-point lead over Red's 5), then win on attrition with 9 cards left vs Red's 8 remaining._
- T16 blue — step-deploy: Deploy Infantry at D3 — _Deploy at D3 to reinforce my cluster of units (Artillery C3, Infantry C4, Cavalry D4) and build coordinated strength._
- T16 blue — step-deploy: Deploy Infantry at D2 — _Deploy at D2 to complete the D-column cluster (D2-D3-D4); with 8 VP vs Red's 5 and equal cards left, I win on attrition as second-mover._
- T17 red — card: "Conscription" — _Deploy 2 infantry via Conscription; closes VP gap to 7-8 and builds attack support for endgame with 8 cards left._
- T17 red — step-deploy: Deploy Infantry at B3 — _B3 places infantry adjacent to B1 cavalry; enables 4-power attacks (cavalry 3 + support 1) on Blue's D3/D2 infantry or D4 cavalry._
- T17 red — step-deploy: Deploy Infantry at E1 — _E1 places infantry aggressively toward enemy HQ area; threatens Blue's position and builds endgame pressure with 7 cards remaining._
- T18 blue — card: "Deploy Infantry" — _Deploy Infantry to reach 9 VP (2-point lead over Red's 7); with 8 cards vs Red's 7 remaining, I win on attrition as second-mover._
- T18 blue — step-deploy: Deploy Infantry at B4 — _Deploy at B4 adjacent to Red B3 Infantry; this creates an attack threat (B4 Infantry + C3/C4 support = 4 vs 2 power) for next turn._
- T19 red — card: "Careful Maneuvers" — _Reposition cavalry and attack B4 infantry with -1 malus (4 power vs 1 defense); eliminate Blue's counter-unit and close 2-VP gap._
- T19 red — step-reposition: March Cavalry from B1 to C2 — _March cavalry to C2; positions it adjacent to C1 infantry and C3 artillery for follow-up attack (3 power with support vs 0 defense)._
- T19 red — step-attack: Skip this step — _All available attacks are losing trades (cavalry destroyed or tied against stronger units); skip to preserve cavalry for better future engagements._
- T20 blue — card: "Entrench" — _Deploy Infantry to reach 10 VP (3-point lead); with 7 cards vs Red's 6 remaining, attrition victory is secured with the second-mover tiebreaker._
- T20 blue — step-deploy: Deploy Infantry at E2 — _Deploy at E2 near HQ to consolidate defensive position; with 6 cards each and 9-7 lead, endgame victory comes from holding territory._
- T20 blue — step-trench: Dig a trench at E3 covering edges W+SW — _Dig trench at E3 (HQ) covering W+SW to block western attacks; endgame security is critical with 6 cards each and 10-7 VP lead._
- T21 red — card: "Entrench" — _Deploy infantry and build trench for defense; adds 1 VP and persistent obstacle; conserves units in endgame with 6 cards remaining (down 3 VP)._
- T21 red — step-deploy: Deploy Infantry at B1 — _Deploy at B1 adjacent to cavalry C2; supports potential late-game cavalry attacks; best offensive positioning._
- T21 red — step-trench: Dig a trench at B1 covering edges W+SW — _Trench at B1 (W+SW edges) defends newly deployed infantry and cavalry C2; blocks Blue's support from primary attack direction._
- T22 blue — card: "Entrench" — _Deploy final Infantry + build trench to reach 11 VP (3-point lead); with 6 cards vs Red's 5 remaining, attrition victory is secured._
- T22 blue — step-deploy: Deploy Infantry at C5 — _Deploy at C5 to consolidate with C4/D4 cluster; equal cards and 10-8 lead guarantee attrition victory on second-mover tiebreaker._
- T22 blue — step-trench: Dig a trench at E2 covering edges NW+W — _Dig trench at E2 (near HQ) covering NW+W to block Red's northwestern attacks from C2 Cavalry and spread units; endgame victory is mathematically secured._
- T23 red — card: "Forced March" — _Reposition cavalry and infantry to surround Blue's C3 artillery; set up overwhelming 5-power attack (cavalry 3 + dual support) next turn._
- T23 red — step-reposition: Swap Cavalry at C2 with Infantry at B1 — _Swap cavalry into B1 (defended by trench); positions for attack on adjacent B4 infantry next turn; consolidates position._
- T23 red — step-reposition: Skip this step — _Skip; cavalry at B1 already positioned adjacent to B4 for direct attack; preserve final reposition for late-game flexibility._
- T23 red — step-reposition: Skip this step — _Skip final reposition; cavalry B1 positioned for B4 attack; end Forced March with clear tactical setup._
- T24 blue — card: "Forced March" — _Consolidate with 3 repositions; with 4 Red cards remaining, 11-8 VP lead, and second-mover tie break, attrition victory is mathematically locked._
- T24 blue — step-reposition: Swap Artillery at C3 with Infantry at D2 — _Swap C3 Artillery with D2 Infantry to move high-value Artillery to safer position; consolidate for endgame with equal 4 cards remaining._
- T24 blue — step-reposition: Skip this step — _Skip step 2; attrition victory is mathematically assured with 4 cards each and 11-8 VP lead—conserve repositions for endgame._
- T24 blue — step-reposition: Skip this step — _Victory is mathematically assured; 4 cards each, 11-8 VP lead, second-mover tiebreaker guarantees win on attrition—avoid unnecessary risks._
- T25 red — card: "Airdrop" as basic attack — _Basic Attack: cavalry B1 + B2 infantry support (4 power) kills B4 infantry (1 defense); gain 1 VP to 9-11, maximize final turns._
- T25 red — step-attack: Attack: Infantry at E1 strikes enemy Artillery at D2 — power 3 vs 3: tie — BOTH destroyed — _TIE (3 vs 3): sacrifice E1 infantry (1 VP) to kill D2 artillery (3 VP); excellent trade closes gap to 7-8 (down 1 VP only)._
- T26 blue — card: "Sappers" — _Remove forest at B2 to reduce Red's attack capability; with 4 cards vs Red's 3 remaining, attrition victory is assured despite 1 VP margin._
- T26 blue — step-barrage: Barrage: burn away the forest at B2 — _Remove forest at B2 to reduce Red's attack capability; with 3 cards each, endgame is tight—weaken Red's offense to secure 8-7 lead._
- T27 red — card: "Naval Barrage" — _Remove C3 trench (denies enemy support), attack C3 infantry (3 power vs 1 defense); gain 1 VP to 8-8 (tied) with 2 cards remaining._
- T27 red — step-barrage: Barrage: destroy the trench at C3 — _Remove C3 trench (denies my attacker support on NE+NW); enables full-strength attack on C3 infantry next step._
- T27 red — step-attack: Attack: Infantry at B3 strikes enemy Infantry at C3 — power 3 vs 3: tie — BOTH destroyed — _TIE (3 vs 3) with B3 infantry sacrifices least-valuable front unit while preserving B2 (supports cavalry) and C2 (center); mutual neutral trade._
- T28 blue — card: "Airdrop" as basic reposition — _Reposition to preserve units; with 7-6 VP lead and Red having only 2 cards left, avoid risky attacks and coast to attrition victory._
- T28 blue — step-reposition: March Infantry from E2 to D2 — _March E2 Infantry to D2 to consolidate center position; with 2 cards each and 7-6 lead, hold for attrition victory._
- T29 red — card: "Sappers" as basic attack — _Attack B4 infantry with cavalry B1 + B2 support (4 vs 1); gain 1 VP to 7-6 (break tie and edge toward victory before deck-out)._
- T29 red — step-attack: Attack: Infantry at D1 strikes enemy Infantry at D2 — power 2 vs 2: tie — BOTH destroyed — _TIE (2 vs 2) eliminates Blue's D2 infantry; mutual trade holds position as game approaches end (1 vs 2 cards remaining)._
- T30 blue — card: "Reckless Maneuvers" as basic reposition — _Reposition to preserve units with 6-5 lead; Red has 1 card left, Blue has 2—attrition victory is mathematically secured._
- T30 blue — step-reposition: March Cavalry from D4 to E2 — _(fallback: choice failed)_  `(fallback)`
- T31 red — card: "Entrench" as basic attack — _Final card: attack B4 infantry with cavalry B1 + support (4 vs 1); gain 1 VP to 6-6 (tie score despite losing tiebreaker); maximize endgame._
- T32 blue — card: "Entrench" as basic reposition — _Red is out of cards (0 remaining); play final card with basic reposition to trigger attrition victory with 6-5 VP lead and second-mover tiebreaker._
- T32 blue — step-reposition: March Infantry from C4 to B3 — _(fallback: choice failed)_  `(fallback)`

### Battle notes
- **red**: Aggressive cavalry opening escalated into tight attrition where I clawed back from 3 VP down to a 6-6 tie through smart trades—especially killing the 3 VP artillery for just 1 VP infantry—but ultimately lost to Blue's second-move tiebreaker. Close game, clear edge to whoever moves second in a deck-out tie.
- **blue**: Aggressive early trading worked well (Storm and Hold, Naval Barrage), but a surprise artillery loss mid-battle forced me to rebuild and play conservatively through the endgame. The second-mover tiebreaker proved decisive in the final turns when Red ran out of cards first while I held a slim 6-5 VP advantage.

### Campaign journal
- T1 Battle 1 — "The Ford". Red moves first.
- T1 Red plays "Deploy Cavalry".
- T1 Red deploys Cavalry at B1.
- T1 Red deploys Cavalry at C2.
- T2 Blue plays "Deploy Cavalry".
- T2 Blue deploys Cavalry at D4.
- T2 Blue deploys Cavalry at D3.
- T3 Red plays "Shock Troops".
- T3 Red deploys Infantry at C1.
- T4 Blue plays "Storm and Hold".
- T4 Blue digs a trench at E3.
- T5 Red plays "Shock Troops".
- T5 Red deploys Infantry at D1.
- T6 Blue plays "Shock Troops".
- T6 Blue deploys Infantry at C3.
- T7 Red plays "Storm and Hold".
- T7 Red Cavalry attacks Blue Infantry at C3 (4 vs 1): defender destroyed, attacker advances.
- T7 Red digs a trench at C3.
- T8 Blue plays "Naval Barrage".
- T8 Blue Cavalry attacks Red Cavalry at C3 (4 vs 0): defender destroyed, attacker advances.
- T9 Red plays "Deploy Infantry".
- T9 Red deploys Infantry at B2.
- T10 Blue plays "Careful Maneuvers".
- T10 Blue marches Cavalry from C3 to B3.
- T10 Blue Cavalry attacks Red Infantry at B2 (2 vs 2): a tie — both units destroyed.
- T11 Red plays "Deploy Artillery".
- T11 Red deploys Artillery at B2.
- T12 Blue plays "Deploy Artillery".
- T12 Blue deploys Artillery at D3.
- T13 Red plays "Reckless Maneuvers".
- T13 Red marches Artillery from B2 to C3.
- T14 Blue plays "Shock Troops".
- T14 Blue deploys Infantry at C4.
- T14 Blue Artillery attacks Red Artillery at C3 (2 vs 0): defender destroyed, attacker advances.
- T15 Red plays "Entrench".
- T15 Red deploys Infantry at B2.
- T15 Red digs a trench at B1.
- T16 Blue plays "Conscription".
- T16 Blue deploys Infantry at D3.
- T16 Blue deploys Infantry at D2.
- T17 Red plays "Conscription".
- T17 Red deploys Infantry at B3.
- T17 Red deploys Infantry at E1.
- T18 Blue plays "Deploy Infantry".
- T18 Blue deploys Infantry at B4.
- T19 Red plays "Careful Maneuvers".
- T19 Red marches Cavalry from B1 to C2.
- T20 Blue plays "Entrench".
- T20 Blue deploys Infantry at E2.
- T20 Blue digs a trench at E3 — the hex is now double-trenched.
- T21 Red plays "Entrench".
- T21 Red deploys Infantry at B1.
- T21 Red digs a trench at B1 — the hex is now double-trenched.
- T22 Blue plays "Entrench".
- T22 Blue deploys Infantry at C5.
- T22 Blue digs a trench at E2.
- T23 Red plays "Forced March".
- T23 Red swaps the units at C2 and B1.
- T24 Blue plays "Forced March".
- T24 Blue swaps the units at C3 and D2.
- T25 Red plays "Airdrop" as a direct attack order.
- T25 Red Infantry attacks Blue Artillery at D2 (3 vs 3): a tie — both units destroyed.
- T26 Blue plays "Sappers".
- T26 Blue's naval barrage burns away the forest at B2.
- T27 Red plays "Naval Barrage".
- T27 Red's naval barrage obliterates a trench at C3.
- T27 Red Infantry attacks Blue Infantry at C3 (3 vs 3): a tie — both units destroyed.
- T28 Blue plays "Airdrop" as a simple maneuver.
- T28 Blue marches Infantry from E2 to D2.
- T29 Red plays "Sappers" as a direct attack order.
- T29 Red Infantry attacks Blue Infantry at D2 (2 vs 2): a tie — both units destroyed.
- T30 Blue plays "Reckless Maneuvers" as a simple maneuver.
- T30 Blue marches Cavalry from D4 to E2.
- T31 Red plays "Entrench" as a direct attack order.
- T31 Red finds no opening — the order is spent to no effect.
- T32 Blue plays "Entrench" as a simple maneuver.
- T32 Blue marches Infantry from C4 to B3.
- T33 Blue wins the battle by attrition (5 VP vs 6 VP of surviving units).

## Battle 2 — "Causeway" — Red by hq (T9)

### Decisions
- T1 red — card: "Conscription" — _Conscription deploys 2 units per card (efficient); infantry provide support value; builds foundation before committing to cavalry/artillery tempo._
- T1 red — step-deploy: Deploy Infantry at B3 — _B3 deploys forward with mountain terrain (defensive bonus); aggressive opening stakes territory toward center and enemy._
- T1 red — step-deploy: Deploy Infantry at B2 — _B2 pairs with B3 infantry for mutual 1-support adjacency; creates defensive anchor near HQ controlling left flank._
- T2 blue — card: "Entrench" — _Deploy Infantry + build trench for immediate defensive foundation; more efficient than Deploy Infantry alone and establishes foothold against Red's 2-0 lead._
- T2 blue — step-deploy: Deploy Infantry at D3 — _Deploy at D3 to build chain toward Red's B3 position for future attacks; forward positioning establishes aggressive early presence._
- T2 blue — step-trench: Dig a trench at D3 covering edges NW+W — _Build trench at D3 covering NW+W edges to defend forward Infantry against Red's northwestern attacks from B3._
- T3 red — card: "Deploy Artillery" — _Deploy artillery adjacent to B2/B3 infantry; provides 2-support value (highest in game) and transforms position into dominant attackers while maintaining lead._
- T3 red — step-deploy: Deploy Artillery at C3 — _C3 positions artillery adjacent to B3 infantry; central forest location provides 2-support for coordinated attacks and dominates the board center._
- T4 blue — card: "Shock Troops" — _Deploy Infantry at C4, then attack C3 Artillery (1+1 support vs 0+2 defense = tie); eliminate Red's high-threat Artillery for favorable 3-for-1 VP trade._
- T4 blue — step-deploy: Deploy Infantry at D2 — _Deploy at D2 adjacent to C3; this positions new Infantry to attack C3 Artillery immediately with D3 support for tie._
- T4 blue — step-attack: Attack: Infantry at D3 strikes enemy Artillery at C3 — power 2 vs 2: tie — BOTH destroyed — _D3 Infantry attacks C3 for tie (2 vs 2); eliminates Red's 3 VP Artillery for 1 VP—favorable trade reducing Red to 2 VP._
- T5 red — card: "Deploy Cavalry" — _Deploy 2 cavalry (3 attack each, 2 VP each) to establish overwhelming offensive presence; with infantry support, cavalry dominate Blue's D2 infantry._
- T5 red — step-deploy: Deploy Cavalry at C3 — _C3 positions first cavalry centrally adjacent to B3 infantry; sets up coordinated multi-unit attack on D2 infantry._
- T5 red — step-deploy: Deploy Cavalry at C2 — _C2 positions second cavalry adjacent to B3 infantry; creates coordinated attack group (2 cavalry, 2 infantry) for overwhelming assault on D2._
- T6 blue — card: "Deploy Cavalry" — _Deploy 2 Cavalry for efficient 4 VP gain; Red already spent Deploy Cavalry so no more Cavalry threats—closes gap to 5-6 VP._
- T6 blue — step-deploy: Deploy Cavalry at D3 — _Deploy at D3 adjacent to Red's C3 Cavalry; positions first Cavalry for immediate threat and maximizes engagement potential._
- T6 blue — step-deploy: Deploy Cavalry at E3 — _Deploy at E3 adjacent to D3 Cavalry to form coordinated unit cluster; reaches 5 VP (nearly tied at 5-6)._
- T7 red — card: "Storm and Hold" — _Storm and Hold: attack with +1 support (cavalry + infantry + bonus = 5 power vs D2 infantry 2 defense); win decisively, then build trench for defense._
- T7 red — step-attack: Attack: Cavalry at C3 strikes enemy Cavalry at D3 — power 5 vs 2: defender destroyed — _Attack D3 cavalry (2 VP gain) not D2 infantry (1 VP gain); 5 vs 2 power wins decisively; jump to 8-3 (5 VP ahead) swinging momentum heavily._
- T7 red — step-trench: Dig a trench at D3 covering edges SW+SE — _Trench at D3 (SW+SE edges) complements existing NW+W coverage; fortifies advanced cavalry position against Blue's E3 cavalry; consolidate 6-3 lead._
- T8 blue — card: "Conscription" — _Deploy 2 Infantry to close VP gap to 5-6; with 13 cards vs Red's 12, builds toward endgame while recovering from D3 Cavalry loss._
- T8 blue — step-deploy: Deploy Infantry at C3 — _Deploy at C3 adjacent to Red's D3 Cavalry and near forest terrain; builds offensive position with +1 attack bonuses._
- T8 blue — step-deploy: Deploy Infantry at C4 — _Deploy at C4 adjacent to C3 Infantry to form tight cluster; creates coordinated attack force against Red's D3 Cavalry with terrain bonuses._
- T9 red — card: "Naval Barrage" — _Naval Barrage: remove C3 forest (denies Blue terrain bonus), attack C3 infantry to eliminate support unit and gain VP lead with 12 cards left._
- T9 red — step-barrage: Barrage: burn away the forest at C3 — _Burn C3 forest; removes Blue's terrain bonus (attack and defense); clean up battlefield for attack step without complications._
- T9 red — step-attack: Attack: Cavalry at D3 strikes the enemy HQ at E2 — power 3 vs 1: you CAPTURE THE HQ AND WIN — _INSTANT WIN: Cavalry D3 attacks Blue HQ at E2 (3 vs 1 defense); capturing enemy HQ wins battle 2 immediately—match tied 1-1._

### Battle notes
- **red**: Aggressive cavalry deployment paid off immediately—I controlled the board tempo, pushed a cavalry into D3, and when Naval Barrage opened a clear line to the enemy HQ, I took the instant win in just 9 turns. Much sharper than battle 1's grinding attrition; this was decisive and efficient.
- **blue**: I started too far behind (0-2 VP) and spent the battle trying to catch up through unit deployment, but lost focus on defending my HQ—Red exploited my scattered positioning to capture it before I could consolidate. Match is now tied 1-1 heading into Battle 3.

### Campaign journal
- T1 Battle 2 — "Causeway". Red moves first.
- T1 Red plays "Conscription".
- T1 Red deploys Infantry at B3.
- T1 Red deploys Infantry at B2.
- T2 Blue plays "Entrench".
- T2 Blue deploys Infantry at D3.
- T2 Blue digs a trench at D3.
- T3 Red plays "Deploy Artillery".
- T3 Red deploys Artillery at C3.
- T4 Blue plays "Shock Troops".
- T4 Blue deploys Infantry at D2.
- T4 Blue Infantry attacks Red Artillery at C3 (2 vs 2): a tie — both units destroyed.
- T5 Red plays "Deploy Cavalry".
- T5 Red deploys Cavalry at C3.
- T5 Red deploys Cavalry at C2.
- T6 Blue plays "Deploy Cavalry".
- T6 Blue deploys Cavalry at D3.
- T6 Blue deploys Cavalry at E3.
- T7 Red plays "Storm and Hold".
- T7 Red Cavalry attacks Blue Cavalry at D3 (5 vs 2): defender destroyed, attacker advances.
- T7 Red digs a trench at D3 — the hex is now double-trenched.
- T8 Blue plays "Conscription".
- T8 Blue deploys Infantry at C3.
- T8 Blue deploys Infantry at C4.
- T9 Red plays "Naval Barrage".
- T9 Red's naval barrage burns away the forest at C3.
- T9 Red Cavalry attacks Blue HQ at E2 (3 vs 1): defender destroyed, attacker advances.
- T9 Red wins the battle by capturing the headquarters!

## Battle 3 — "The Narrows" — Blue by hq (T7)

### Decisions
- T1 blue — card: "Deploy Cavalry" — _Deploy 2 Cavalry for efficient 4 VP opening; moving first gives board control advantage before Red deploys._
- T1 blue — step-deploy: Deploy Cavalry at D3 — _Deploy at D3 on same row as Red's HQ; establishes forward presence and aggressive early positioning._
- T1 blue — step-deploy: Deploy Cavalry at D4 — _Deploy at D4 adjacent to D3 forms coordinated cavalry pair; creates strong forward position before Red can respond._
- T2 red — card: "Entrench" — _Entrench: deploy infantry + build trench early to establish fortified defensive position against Blue's 2 cavalry; exploit tie-break advantage as second mover._
- T2 red — step-deploy: Deploy Infantry at B3 — _B3 establishes central defensive position closer to Blue's D3/D4 cavalry threat; positions infantry for coordinated trench defense._
- T2 red — step-trench: Dig a trench at B3 covering edges E+NE — _Trench at B3 (E+NE edges) denies Blue cavalry support from exact attack vectors (D3/D4 cavalry to the east); maximizes defensive value._
- T3 blue — card: "Conscription" — _Deploy 2 Infantry to extend 4-1 lead to 6-1; positions Infantry to support cavalry attacks on Red's B3 or advance toward Red's HQ._
- T3 blue — step-deploy: Deploy Infantry at C2 — _Deploy at C2 adjacent to Red's B3 Infantry and on Mountain terrain; positions Infantry for immediate attack threat with defense bonus._
- T3 blue — step-deploy: Deploy Infantry at B2 — _Deploy at B2 adjacent to Red's B3 Infantry; creates two-pronged attack position with C2 Infantry ready to overwhelm B3 next turn._
- T4 red — card: "Conscription" — _Deploy 2 infantry via Conscription; critical catch-up move after falling behind 1-6 VP; build army to compete with Blue's 4 units._
- T4 red — step-deploy: Deploy Infantry at B4 — _B4 pairs with B3 infantry for mutual support; advances toward Blue's B2/C2 units; builds coordinated pair for defense and counterattack._
- T4 red — step-deploy: Deploy Infantry at A4 — _A4 pairs with B4 infantry to form defensive line near HQ; consolidates coordinated infantry pair; prepare defense against Blue's cavalry threat._
- T5 blue — card: "Entrench" — _Deploy Infantry to extend 6-3 lead to 7-3; add unit + trench for defensive advantage while ahead on cards._
- T5 blue — step-deploy: Deploy Infantry at A2 — _Deploy at A2 directly adjacent to Red's A3 HQ; creates major threat and opens HQ assault paths deep in Red territory._
- T5 blue — step-trench: Dig a trench at A2 covering edges E+NE — _Defend aggressive A2 Infantry adjacent to Red's HQ; trench on E+NE edges blocks support from Red's HQ direction._
- T6 red — card: "Deploy Cavalry" — _Deploy 2 cavalry (4 VP gain) to catch up on deficit; cavalry with infantry support can overpower Blue's mixed force and threaten advanced A2 position._
- T6 red — step-deploy: Deploy Cavalry at C3 — _C3 positions cavalry forward and central toward Blue's C2 infantry; aggressive placement enables coordinated attacks with infantry._
- T6 red — step-deploy: Deploy Cavalry at A5 — _Deploy cavalry at A5 to complete 2-cavalry deployment; adds 2 VP (now 7-7 tied) and defensive cavalry anchor near HQ against Blue's A2 infantry._
- T7 blue — card: "Naval Barrage" — _Skip terrain removal, then attack C3 Cavalry with D3 (4 attack vs 2 defense from B3/B4 support); eliminate Red's threatening cavalry for 7-5 lead._
- T7 blue — step-barrage: Skip this step — _Skip barrage; proceed to attack C3 Cavalry with D3 (4 vs 2 power)—terrain removal not needed for this priority attack._
- T7 blue — step-attack: Attack: Infantry at A2 strikes the enemy HQ at A3 — power 2 vs 2: tie — you CAPTURE THE HQ AND WIN — _Infantry at A2 attacks Red's HQ (2 vs 2 tie); captures HQ instantly and wins battle—puts Blue up 2-1 in match._

### Battle notes
- **red**: Blue's aggressive cavalry + infantry push exploited the narrow map to threaten my HQ directly at A2; despite tying in VP at 7-7 and winning the attrition tiebreaker, I got tactically outmaneuvered and couldn't prevent the HQ capture. Match is now 1-2 (Blue ahead)—I need to win battle 4 decisively to force a decider.
- **blue**: Dominant performance: I moved first to seize board control with aggressive cavalry deployment, then systematically built an Infantry assault on Red's HQ, culminating in a perfectly-calculated 2v2 tie attack on turn 7 that captured the HQ instantly. Match is now 2-1 Blue—one win away from taking the series.

### Campaign journal
- T1 Battle 3 — "The Narrows". Blue moves first.
- T1 Blue plays "Deploy Cavalry".
- T1 Blue deploys Cavalry at D3.
- T1 Blue deploys Cavalry at D4.
- T2 Red plays "Entrench".
- T2 Red deploys Infantry at B3.
- T2 Red digs a trench at B3.
- T3 Blue plays "Conscription".
- T3 Blue deploys Infantry at C2.
- T3 Blue deploys Infantry at B2.
- T4 Red plays "Conscription".
- T4 Red deploys Infantry at B4.
- T4 Red deploys Infantry at A4.
- T5 Blue plays "Entrench".
- T5 Blue deploys Infantry at A2.
- T5 Blue digs a trench at A2.
- T6 Red plays "Deploy Cavalry".
- T6 Red deploys Cavalry at C3.
- T6 Red deploys Cavalry at A5.
- T7 Blue plays "Naval Barrage".
- T7 Blue Infantry attacks Red HQ at A3 (2 vs 2): a tie — both units destroyed.
- T7 Blue wins the battle by capturing the headquarters!

## Battle 4 — "The Marshes" — Red by attrition (T33)

### Decisions
- T1 red — card: "Entrench" — _Entrench: deploy infantry + build trench for efficient fortified foundation; must-win game demands aggressive setup with defensive anchor._
- T1 red — step-deploy: Deploy Infantry at C2 — _C2 positions infantry forward toward center and Blue's territory; aggressive stance for must-win game; sets up future cavalry support._
- T1 red — step-trench: Dig a trench at C2 covering edges E+NE — _Trench at C2 (E+NE edges) protects forward infantry from Blue's eastern approach; denies attacker support from likely attack directions._
- T2 blue — card: "Entrench" — _Deploy Infantry + build trench to tie VP at 1-1; Entrench is more efficient than Deploy Infantry alone and establishes early defensive position._
- T2 blue — step-deploy: Deploy Infantry at D3 — _Deploy at D3 adjacent to Red's C2 Infantry; positions for immediate threat and offensive pressure early in the battle._
- T2 blue — step-trench: Dig a trench at D3 covering edges NW+W — _Build trench at D3 covering NW+W edges to defend forward Infantry against Red's C2 support when attacking from that direction._
- T3 red — card: "Conscription" — _Deploy 2 infantry via Conscription to build army; tied 1-1 in must-win game; larger force outweighs risky early trades with trenches._
- T3 red — step-deploy: Deploy Infantry at C1 — _C1 pairs with C2 infantry for mutual support; creates coordinated 2-unit group for synchronized attacks and mutual defense._
- T3 red — step-deploy: Deploy Infantry at D2 — _D2 advances toward Blue's D3 infantry; creates forward-pushing line (C1-C2-D2); aggressive positioning for must-win game._
- T4 blue — card: "Entrench" — _Deploy Infantry + build trench to reach 2 VP (3-2); builds defensive position while recovering from initial deficit._
- T4 blue — step-deploy: Deploy Infantry at C4 — _Deploy at C4 adjacent to D3 Infantry; creates mutual support cluster and positions toward Red's C1/C2 Infantry._
- T4 blue — step-trench: Dig a trench at C4 covering edges NE+NW — _Build trench at C4 covering NE+NW to defend against Red's C2 Infantry support when attacking from northwest._
- T5 red — card: "Deploy Cavalry" — _Deploy 2 cavalry (4 VP gain) to jump lead to 7-2; decisive advantage in must-win game; cavalry with infantry support dominate the board._
- T5 red — step-deploy: Deploy Cavalry at C3 — _C3 positions first cavalry centrally and forward; key central position between opposing forces; maximizes offensive board control._
- T5 red — step-deploy: Deploy Cavalry at D1 — _D1 positions second cavalry adjacent to D2 infantry; creates coordinated cavalry-infantry attack unit against Blue's D3; dominates forward area._
- T6 blue — card: "Deploy Cavalry" — _Deploy 2 Cavalry to recover from 2-7 deficit to 6-7 VP; powerful units needed to contest Red's cavalry dominance._
- T6 blue — step-deploy: Deploy Cavalry at B3 — _Deploy at B3 adjacent to Red's B1 HQ; maximizes aggression and opens HQ threat paths with cavalry._
- T6 blue — step-deploy: Deploy Cavalry at A3 — _Deploy at A3 adjacent to Red's B1 HQ; creates cavalry pair with B3 for coordinated HQ assault._
- T7 red — card: "Deploy Artillery" — _Deploy artillery (2 support value) to dominate fights; counter Blue's cavalry threat to HQ; consolidate 7-6 lead with overwhelming support power._
- T7 red — step-deploy: Deploy Artillery at B2 — _B2 positions artillery adjacent to HQ to support defense against Blue's B3 cavalry; enables coordinated counterattacks with 2-support value._
- T8 blue — card: "Deploy Artillery" — _Deploy Artillery to reach 9 VP (nearly tied at 9-10); provides support for cavalry's HQ assault and balances Red's Artillery._
- T8 blue — step-deploy: Deploy Artillery at A2 — _Deploy at A2 adjacent to Red's B1 HQ and A3 Cavalry; provides crucial support value for coordinated HQ assault._
- T9 red — card: "Naval Barrage" — _Naval Barrage: remove B3 forest (denies Blue cavalry attack bonus), attack cavalry for VP gain; critical move in razor-thin 10-9 endgame._
- T9 red — step-barrage: Barrage: burn away the forest at B3 — _Burn B3 forest; removes defense/attack bonus for Blue's B3 cavalry; enables my attack on cavalry without terrain protection next step._
- T9 red — step-attack: Attack: Cavalry at C3 strikes enemy Cavalry at B3 — power 5 vs 3: defender destroyed — _C3 cavalry wins decisively (5 vs 3) against B3 cavalry; gain 2 VP to 12-9 (3 VP lead); seize control in close endgame._
- T10 blue — card: "Entrench" — _Deploy Infantry to reach 8 VP (2-point gap to Red's 10); close VP deficit while Red has fewer cards remaining._
- T10 blue — step-deploy: Deploy Infantry at A1 — _Deploy at A1 adjacent to Red's B1 HQ and A2 Artillery; reinforces HQ assault position with additional infantry unit._
- T10 blue — step-trench: Dig a trench at A1 covering edges E+NE — _Build trench at A1 covering E+NE to defend forward assault position against Red's B1 HQ counter-attacks._
- T11 red — card: "Entrench" — _Entrench: deploy infantry + build trench; consolidate 10-8 lead; defensive play preserves 2 VP advantage in close endgame (11 cards left)._
- T11 red — step-deploy: Deploy Infantry at C3 — _C3 positions infantry forward; maintains aggressive pressure between my C2 and Blue's C4 while consolidating 10-8 lead._
- T11 red — step-trench: Dig a trench at B1 covering edges NE+NW — _Trench at B1 (NE+NW edges) defends HQ against Blue's A3 cavalry approach from northwest; blocks attacker support; consolidate 11-8 lead._
- T12 blue — card: "Reckless Maneuvers" — _Attack Red's HQ with A1 Infantry (3 vs 1 power with A2 Artillery support); captures HQ and wins Battle 4 instantly._
- T12 blue — step-attack: Attack: Cavalry at A3 strikes enemy Cavalry at B3 — power 5 vs 3: defender destroyed — _A3 Cavalry destroys B3 Cavalry (5 vs 3 power with A2 support); reduces Red from 11 to 9 VP without losing Blue units._
- T12 blue — step-reposition: March Artillery from A2 to A3 — _Move A2 Artillery to A3 to reinforce HQ assault cluster; maintains proximity for future coordinated attacks on Red's B1._
- T13 red — card: "Storm and Hold" — _Storm and Hold: attack with +1 support bonus for better odds, then build trench; offense + defense in 9-8 razor-thin endgame (10 cards left)._
- T13 red — step-attack: Attack: Infantry at C3 strikes enemy Cavalry at B3 — power 4 vs 3: defender destroyed — _C3 infantry wins decisively (4 vs 3) against B3 cavalry; gain 2 VP to 10-8 (2 VP lead); seize control in endgame with 9 cards remaining._
- T13 red — step-trench: Dig a trench at B3 covering edges E+NE — _Trench at B3 (E+NE edges) defends newly conquered cavalry position against Blue's eastern approach; consolidate 9-6 lead (3 VP ahead)._
- T14 blue — card: "Shock Troops" — _Deploy Infantry and attack to reduce Red's VP; with 10 cards left to Red's 9, maximize damage in endgame before card depletion._
- T14 blue — step-deploy: Deploy Infantry at A2 — _Deploy at A2 to threaten Red's B2 Artillery or B1 HQ; builds assault cluster with A1 Infantry and A3 Artillery._
- T14 blue — step-attack: Skip this step — _Skip attack; preserve units when all engagements result in Blue losses—conserve strength for endgame with equal 9 cards remaining._
- T15 red — card: "Reckless Maneuvers" — _Reckless Maneuvers: attack to extend 9-7 lead, then reposition for defense; maintain momentum in final stretch (9 cards left)._
- T15 red — step-attack: Attack: Infantry at C2 strikes enemy Infantry at A1 through the HQ at B1 — power 3 vs 2: defender destroyed — _C2 infantry wins decisively (3 vs 2) against A1 infantry; gain 1 VP to 10-7 (3 VP lead); solidify endgame advantage._
- T15 red — step-reposition: March Artillery from B2 to C3 — _Reposition artillery to C3 (central position); consolidates support structure for endgame defense; secure 9-6 lead with 8 cards left._
- T16 blue — card: "Airdrop" — _Deploy Infantry with Airdrop to add 1 VP; preserve units for endgame with card advantage (9 vs 8) as second-mover who wins attrition ties._
- T16 blue — step-deploy: Deploy Infantry at B4 — _Deploy at B4 adjacent to Red's B1 HQ; aggressive positioning to threaten Red in endgame with equal 8 cards remaining._
- T17 red — card: "Airdrop" — _Airdrop: place infantry on any empty hex for maximum flexibility; consolidate 9-7 lead in final phase (8 cards, 4 turns left)._
- T17 red — step-deploy: Deploy Infantry at C2 — _C2 places infantry adjacent to C1 and C3 (coordinated group); consolidates support structure for final endgame (7 cards, 3-4 turns left)._
- T18 blue — card: "Conscription" — _Deploy 2 Infantry with Conscription to reach 9 VP (only 1 down from Red's 10); maximize remaining card value in critical endgame._
- T18 blue — step-deploy: Deploy Infantry at B2 — _Deploy at B2 to threaten Red's B1 HQ and positions in endgame; aggressive placement with equal 7 cards remaining._
- T18 blue — step-deploy: Deploy Infantry at E2 — _Deploy at E2 to secure HQ area defensively; with only 7 cards remaining, consolidate position over spreading thin._
- T19 red — card: "Shock Troops" — _Shock Troops: deploy infantry + attack immediately; gain VP to extend 10-9 lead in razor-thin endgame (7 cards left, 3-4 turns)._
- T19 red — step-deploy: Deploy Infantry at E1 — _Deploy at E1 (aggressive forward position); sets up Shock Troops attack step; maintain 10-9 lead in endgame._
- T19 red — step-attack: Attack: Infantry at C2 strikes enemy Infantry at B2 — power 6 vs 2: defender destroyed — _C2 infantry wins decisively (6 vs 2) against B2 infantry; gain 1 VP to 12-9 (3 VP lead); clinch Battle 4 and tie match 2-2._
- T20 blue — card: "Storm and Hold" — _Attack with +1 support using Storm and Hold; prioritize VP reduction in endgame with 6 cards vs Red's 5 remaining._
- T20 blue — step-attack: Attack: Infantry at D3 strikes enemy Artillery at C3 — power 3 vs 3: tie — BOTH destroyed — _D3 Infantry destroys C3 Artillery in a tie (3 vs 3); eliminates Red's 3 VP unit for only 1 VP loss, bringing score to 8-8 tied in final rounds._
- T21 red — card: "Shock Troops" — _Shock Troops: deploy + attack immediately; extend 8-7 lead in final 3 turns (6 cards left); secure Battle 4 victory._
- T21 red — step-deploy: Deploy Infantry at C2 — _Deploy at C2 (central position); sets up coordinated attack for Shock Troops step 2; maintain 8-7 lead (5 cards left)._
- T21 red — step-attack: Attack: Infantry at E1 strikes enemy Infantry at E2 — power 2 vs 1: defender destroyed — _E1 infantry wins decisively (2 vs 1) against E2 infantry; gain 1 VP to 10-7 (3 VP lead); clinch Battle 4 victory._
- T22 blue — card: "Shock Troops" — _Deploy Infantry and attack with Shock Troops; need to reduce Red's 3 VP advantage in final 5-6 cards remaining for each side._
- T22 blue — step-attack: Attack: Infantry at B4 strikes enemy Infantry at B3 — power 2 vs 2: tie — BOTH destroyed — _Tie destroys B3 Infantry and preserves C4 trench position adjacent to my HQ._
- T23 red — card: "Deploy Infantry" as basic attack — _Basic Attack: finish Blue decisively; 8-5 lead with 5 cards left; win Battle 4 and tie match 2-2._
- T23 red — step-attack: Attack: Infantry at A1 strikes enemy Infantry at A2 — power 2 vs 3: your attacker is DESTROYED — _(fallback: choice failed)_  `(fallback)`
- T24 blue — card: "Deploy Infantry" — _Deploy Infantry at B3 to reach parity and threaten Red's B2._
- T25 red — card: "Careful Maneuvers" — _Careful Maneuvers: reposition + attack; finish Blue decisively; 7-5 lead with 4 cards left (final 2 turns)._
- T25 red — step-reposition: March Cavalry from D1 to E1 — _Reposition cavalry to E1 (very forward); aggressive positioning for Careful Maneuvers attack step; dominate final 2 turns._
- T25 red — step-attack: Skip this step — _Skip attack step; avoid losing 1 VP; protect 7-5 lead with 3 cards left; secure Battle 4 victory._
- T26 blue — card: "Forced March" — _Reposition A2 to B3 and C4 to C3 to threaten Red's B2 and C2 for future attacks._
- T26 blue — step-reposition: March Infantry from C4 to C3 — _Move C4 to C3 to position closer to Red's C2 Infantry._
- T26 blue — step-reposition: March Infantry from A2 to B3 — _Move A2 to B3 to threaten Red's B2 Infantry._
- T26 blue — step-reposition: March Infantry from C3 to C4 — _Move C3 to C4 to avoid C2 attack and preserve attacking position at B3._
- T27 red — card: "Forced March" as basic attack — _Basic Attack: finish Blue; 7-5 lead with 3 cards left (final turns); win Battle 4 and force deciding Battle 5._
- T27 red — step-attack: Attack: Infantry at B2 strikes enemy Infantry at B3 — power 1 vs 4: your attacker is DESTROYED — _(fallback: choice failed)_  `(fallback)`
- T28 blue — card: "Naval Barrage" as basic reposition — _Reposition B3 to B2 to centralize forces and maintain pressure on Red's core._
- T28 blue — step-reposition: March Infantry from B3 to B2 — _Move B3 to B2 to centralize forces and threaten Red's core units._
- T29 red — card: "Sappers" as basic attack — _Basic Attack: final turn of Battle 4; 6-5 lead; finish Blue decisively; win Battle 4 to tie match 2-2._
- T29 red — step-attack: Attack: Infantry at C2 strikes enemy Infantry at B2 — power 2 vs 1: defender destroyed — _C2 infantry wins decisively (2 vs 1) against B2 infantry; gain 1 VP to 7-5; win Battle 4 and tie match 2-2._
- T30 blue — card: "Sappers" — _Remove D2 forest to weaken Red's attacks and build defensive trench for final turn._
- T30 blue — step-barrage: Barrage: burn away the forest at D2 — _Remove D2 forest to weaken Red's attacks in the final endgame turn._
- T31 red — card: "Entrench" as basic attack — _Basic Attack: final card of Battle 4; 6-4 lead; finish Blue decisively; win and tie match 2-2._
- T32 blue — card: "Careful Maneuvers" as basic reposition — _Reposition defensively rather than waste the last card on a losing attack._
- T32 blue — step-reposition: March Artillery from A3 to B4 — _Consolidate forces towards center as final positioning._

### Battle notes
- **red**: This was a grinding, hard-fought must-win battle where I deployed cavalry aggressively, built artillery support, and maintained a razor-thin lead (1-3 VP) through a 33-turn endgame to clinch 6-4. Match is now tied 2-2—Battle 5 will decide the first-to-3 winner.
- **blue**: The repositioning strategy with Forced March looked promising—I got B3 threatening Red's center and C4 positioned near C2—but Red's solid defense held firm and destroyed my B2 Infantry before I could capitalize, leaving me short 2 VP when both decks emptied. Despite the second-mover advantage, being unable to find a winning attack and lacking deployment options made the final attrition an uphill climb I couldn't close.

### Campaign journal
- T1 Battle 4 — "The Marshes". Red moves first.
- T1 Red plays "Entrench".
- T1 Red deploys Infantry at C2.
- T1 Red digs a trench at C2.
- T2 Blue plays "Entrench".
- T2 Blue deploys Infantry at D3.
- T2 Blue digs a trench at D3.
- T3 Red plays "Conscription".
- T3 Red deploys Infantry at C1.
- T3 Red deploys Infantry at D2.
- T4 Blue plays "Entrench".
- T4 Blue deploys Infantry at C4.
- T4 Blue digs a trench at C4.
- T5 Red plays "Deploy Cavalry".
- T5 Red deploys Cavalry at C3.
- T5 Red deploys Cavalry at D1.
- T6 Blue plays "Deploy Cavalry".
- T6 Blue deploys Cavalry at B3.
- T6 Blue deploys Cavalry at A3.
- T7 Red plays "Deploy Artillery".
- T7 Red deploys Artillery at B2.
- T8 Blue plays "Deploy Artillery".
- T8 Blue deploys Artillery at A2.
- T9 Red plays "Naval Barrage".
- T9 Red's naval barrage burns away the forest at B3.
- T9 Red Cavalry attacks Blue Cavalry at B3 (5 vs 3): defender destroyed, attacker advances.
- T10 Blue plays "Entrench".
- T10 Blue deploys Infantry at A1.
- T10 Blue digs a trench at A1.
- T11 Red plays "Entrench".
- T11 Red deploys Infantry at C3.
- T11 Red digs a trench at B1.
- T12 Blue plays "Reckless Maneuvers".
- T12 Blue Cavalry attacks Red Cavalry at B3 (5 vs 3): defender destroyed, attacker advances.
- T12 Blue marches Artillery from A2 to A3.
- T13 Red plays "Storm and Hold".
- T13 Red Infantry attacks Blue Cavalry at B3 (4 vs 3): defender destroyed, attacker advances.
- T13 Red digs a trench at B3.
- T14 Blue plays "Shock Troops".
- T14 Blue deploys Infantry at A2.
- T15 Red plays "Reckless Maneuvers".
- T15 Red Infantry attacks Blue Infantry at A1, striking through the HQ (3 vs 2): defender destroyed, attacker advances.
- T15 Red marches Artillery from B2 to C3.
- T16 Blue plays "Airdrop".
- T16 Blue deploys Infantry at B4.
- T17 Red plays "Airdrop".
- T17 Red deploys Infantry at C2.
- T18 Blue plays "Conscription".
- T18 Blue deploys Infantry at B2.
- T18 Blue deploys Infantry at E2.
- T19 Red plays "Shock Troops".
- T19 Red deploys Infantry at E1.
- T19 Red Infantry attacks Blue Infantry at B2 (6 vs 2): defender destroyed, attacker advances.
- T20 Blue plays "Storm and Hold".
- T20 Blue Infantry attacks Red Artillery at C3 (3 vs 3): a tie — both units destroyed.
- T21 Red plays "Shock Troops".
- T21 Red deploys Infantry at C2.
- T21 Red Infantry attacks Blue Infantry at E2 (2 vs 1): defender destroyed, attacker advances.
- T22 Blue plays "Shock Troops".
- T22 Blue Infantry attacks Red Infantry at B3 (2 vs 2): a tie — both units destroyed.
- T23 Red plays "Deploy Infantry" as a direct attack order.
- T23 Red Infantry attacks Blue Infantry at A2 (2 vs 3): attack repelled, attacker destroyed.
- T24 Blue plays "Deploy Infantry".
- T24 Blue finds no opening — the order is spent to no effect.
- T25 Red plays "Careful Maneuvers".
- T25 Red marches Cavalry from D1 to E1.
- T26 Blue plays "Forced March".
- T26 Blue marches Infantry from C4 to C3.
- T26 Blue marches Infantry from A2 to B3.
- T26 Blue marches Infantry from C3 to C4.
- T27 Red plays "Forced March" as a direct attack order.
- T27 Red Infantry attacks Blue Infantry at B3 (1 vs 4): attack repelled, attacker destroyed.
- T28 Blue plays "Naval Barrage" as a simple maneuver.
- T28 Blue marches Infantry from B3 to B2.
- T29 Red plays "Sappers" as a direct attack order.
- T29 Red Infantry attacks Blue Infantry at B2 (2 vs 1): defender destroyed, attacker advances.
- T30 Blue plays "Sappers".
- T30 Blue's naval barrage burns away the forest at D2.
- T31 Red plays "Entrench" as a direct attack order.
- T31 Red finds no opening — the order is spent to no effect.
- T32 Blue plays "Careful Maneuvers" as a simple maneuver.
- T32 Blue marches Artillery from A3 to B4.
- T33 Red wins the battle by attrition (6 VP vs 4 VP of surviving units).

## Battle 5 — "The Clearing" — Blue by hq (T11)

### Decisions
- T1 blue — card: "Deploy Infantry" — _Deploy Infantry adjacent to HQ to establish safe opening presence on the deciding battle._
- T1 blue — step-deploy: Deploy Infantry at C2 — _Deploy at C2 to establish central position with forest terrain support._
- T2 red — card: "Deploy Cavalry" — _Deploy 2 cavalry for aggressive opening in deciding game (2-2 match); early tempo against Blue's single infantry; I win ties._
- T2 red — step-deploy: Deploy Cavalry at C4 — _C4 positions cavalry centrally and forward; aggressive toward Blue's C2 infantry; control the center in deciding game._
- T2 red — step-deploy: Deploy Cavalry at C3 — _C3 pairs cavalry with C4 for coordinated control; threatens Blue's C2 infantry; aggressive center dominance in deciding game._
- T3 blue — card: "Storm and Hold" — _Attack C3 Cavalry with +1 bonus to destroy it and build defensive trench at C2._
- T3 blue — step-attack: Attack: Infantry at C2 strikes enemy Cavalry at C3 — power 3 vs 0: defender destroyed — _Destroy C3 Cavalry to reduce Red's advantage and control the center._
- T3 blue — step-trench: Dig a trench at C3 covering edges E+NE — _Build trench at C3 blocking E+NE edges to defend against C4 Cavalry attack._
- T4 red — card: "Naval Barrage" — _Naval Barrage: remove C3 trench (denies support), then attack Blue's infantry; eliminate defensive structure and gain VP decisively._
- T4 red — step-barrage: Barrage: destroy the trench at C3 — _Destroy C3 trench; removes Blue's defensive structure and support denial for cavalry attack next step._
- T4 red — step-attack: Attack: Cavalry at C4 strikes enemy Infantry at C3 — power 4 vs 1: defender destroyed — _Cavalry wins decisively (4 vs 1) against C3 infantry; gain 1 VP to 3-1; establish commanding lead in deciding Battle 5._
- T5 blue — card: "Conscription" — _Deploy 2 Infantry via Conscription to tie Red's VP and establish ground army._
- T5 blue — step-deploy: Deploy Infantry at C2 — _Deploy at C2 to control center and threaten Red's Cavalry at C3._
- T5 blue — step-deploy: Deploy Infantry at C1 — _Deploy at C1 to consolidate center and create connected Infantry line._
- T6 red — card: "Storm and Hold" — _Storm and Hold: attack with +1 support to break tie and gain VP, then build trench; offensive pressure + defensive consolidation._
- T6 red — step-attack: Attack: Cavalry at C3 strikes enemy Infantry at C2 — power 4 vs 3: defender destroyed — _Cavalry wins decisively (4 vs 3) against C2 infantry; gain 1 VP to 3-2; move toward victory in deciding Battle 5._
- T6 red — step-trench: Dig a trench at C2 covering edges W+SW — _Trench at C2 (W+SW edges) defends cavalry against C1 infantry attacks; deny support from immediate western threat._
- T7 blue — card: "Deploy Cavalry" — _Deploy 2 Cavalry to reach 5 VP and overwhelm Red's isolated single Cavalry._
- T7 blue — step-deploy: Deploy Cavalry at B1 — _Deploy Cavalry at B1 to support C1 Infantry and threaten Red's HQ._
- T7 blue — step-deploy: Deploy Cavalry at B2 — _Deploy at B2 to create cavalry pair and encircle Red's isolated Cavalry._
- T8 red — card: "Deploy Artillery" — _Deploy artillery (2-support value) to rebuild against Blue's cavalry advantage; critical recovery in deciding game (down 2-5)._
- T8 red — step-deploy: Deploy Artillery at C3 — _C3 positions artillery centrally to support C2 cavalry; enables coordinated attacks against Blue's cavalry advantage._
- T9 blue — card: "Forced March" as basic attack — _Burn Forced March for ordinary attack to destroy Red's high-value Cavalry or Artillery._
- T9 blue — step-attack: Attack: Cavalry at B2 strikes enemy Artillery at C3 — power 3 vs 0: defender destroyed — _Destroy Red's 3 VP Artillery at C3 to gain decisive 3 VP advantage._
- T10 red — card: "Entrench" — _Entrench: deploy infantry + build trench; rebuild army against Blue's 5 VP; defensive consolidation with 12 cards left (6 turns)._
- T10 red — step-deploy: Deploy Infantry at B2 — _B2 near HQ with forest cover; defensive position anchors cavalry support; rebuild army coherently against 5 VP deficit._
- T10 red — step-trench: Dig a trench at B2 covering edges NE+NW — _Trench at B2 (NE+NW edges) denies support from Blue's B1 cavalry; protect deployed infantry in critical endgame._
- T11 blue — card: "Careful Maneuvers" — _Deploy Infantry and attack with Shock Troops to consolidate board advantage._
- T11 blue — step-reposition: March Cavalry from C3 to B3 — _Reposition C3 Cavalry to B3 to set up attack on Red's B2 Infantry._
- T11 blue — step-attack: Attack: Cavalry at B3 strikes the enemy HQ at B4 — power 3 vs 0: you CAPTURE THE HQ AND WIN — _Capture Red's HQ at B4 to win Battle 5 and the match 3-2._

### Battle notes
- **red**: Came back from 2-5 down with solid defensive positioning at B2, but Blue's cavalry advantage proved insurmountable—the HQ capture felt like running out of time just as the position stabilized. Match goes to Blue 3-2.
- **blue**: Battle 5 was a turnaround from a shaky start—Red's early Cavalry aggression put me on my heels, but Conscription and Deploy Cavalry let me build overwhelming numbers, and then the decisive move came when I repositioned my Cavalry to B3 and spotted that Red's HQ at B4 was within striking distance. A perfect endgame setup turned the entire match: Blue wins 3-2.

### Campaign journal
- T1 Battle 5 — "The Clearing". Blue moves first.
- T1 Blue plays "Deploy Infantry".
- T1 Blue deploys Infantry at C2.
- T2 Red plays "Deploy Cavalry".
- T2 Red deploys Cavalry at C4.
- T2 Red deploys Cavalry at C3.
- T3 Blue plays "Storm and Hold".
- T3 Blue Infantry attacks Red Cavalry at C3 (3 vs 0): defender destroyed, attacker advances.
- T3 Blue digs a trench at C3.
- T4 Red plays "Naval Barrage".
- T4 Red's naval barrage obliterates a trench at C3.
- T4 Red Cavalry attacks Blue Infantry at C3 (4 vs 1): defender destroyed, attacker advances.
- T5 Blue plays "Conscription".
- T5 Blue deploys Infantry at C2.
- T5 Blue deploys Infantry at C1.
- T6 Red plays "Storm and Hold".
- T6 Red Cavalry attacks Blue Infantry at C2 (4 vs 3): defender destroyed, attacker advances.
- T6 Red digs a trench at C2.
- T7 Blue plays "Deploy Cavalry".
- T7 Blue deploys Cavalry at B1.
- T7 Blue deploys Cavalry at B2.
- T8 Red plays "Deploy Artillery".
- T8 Red deploys Artillery at C3.
- T9 Blue plays "Forced March" as a direct attack order.
- T9 Blue Cavalry attacks Red Artillery at C3 (3 vs 0): defender destroyed, attacker advances.
- T10 Red plays "Entrench".
- T10 Red deploys Infantry at B2.
- T10 Red digs a trench at B2.
- T11 Blue plays "Careful Maneuvers".
- T11 Blue marches Cavalry from C3 to B3.
- T11 Blue Cavalry attacks Red HQ at B4 (3 vs 0): defender destroyed, attacker advances.
- T11 Blue wins the battle by capturing the headquarters!

## Match felt-notes

### red (haiku)

Adaptation mattered: Battle 2 showed aggressive cavalry + support dominates; Battle 4 proved I could grind attrition and exploit the tie-break. But cavalry fragility and sudden HQ capture proved fatal. When Blue doubled cavalry, I lost trades and couldn't rebuild from VP deficits fast enough. 

**Strong:** aggressive tempo, long-game resource management. **Weak:** defending HQ against coordinated cavalry pressure, recovering from early attrition.

**Suggested change:** Make HQ capture require 2 successful attacks instead of 1—currently it's too sudden-death and punishes position trades too harshly; Blue could attrition me down, then breakthrough in one cavalry swing.

### blue (haiku)

**Match Reflection: Blue 3–Red 2**

Early aggression decisively shaped outcomes. Battle 2's defensive hesitation taught me that repositioning without deployment wastes cards—Battle 3's immediate Cavalry push exploited this lesson and won. Battles 1 and 4 showed attrition's cruelty: 2 VP deficits proved nearly insurmountable despite second-mover advantage, while Battle 5's final HQ capture proved direct threats force opponents into mistakes.

**Strong:** Aggressive early Cavalry deployment; recognizing when to shift from attrition grind to tempo attacks.

**Weak:** Relying on repositioning alone; failing to deploy units early enough in low-VP games.

**Suggested change:** Reduce Cavalry attack from 3 to 2 or cap early Cavalry deployments to one per side. Early Cavalry rushes (2×2 VP) create such dominant positions that catching up via attrition becomes nearly impossible, making the first two turns disproportionately decisive.

## Typicality vs the map baseline

_Baseline: 40 hard-AI self-play battles on "The Clearing" (rules 1.0), folded through the same aggregation as the Balance Dashboard (cached)._

| Metric | This game | Baseline | Read |
|---|--:|--:|---|
| Ending | Blue by hq | 8% HQ / 92% attrition | HQ capture is uncommon here (8%) — decisive |
| Length | T11 | ~31 avg | 65% shorter — quicker than usual |
| Winner side | Blue | red 48% | map leans blue 52% |
| Kills (units lost) | 7 | 0% zero-kill | had combat (0% of baseline games have none) |
| Attacks resolved | 5 | ~6.5 avg | about average |
| Final VP gap | 2 | ~1.9 avg | about average |

An **atypical** game — much shorter than average; ended by a rare HQ capture.

#reports #battle #v1-0
