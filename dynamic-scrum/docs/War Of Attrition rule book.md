#onboarding #game-rules
# War of Attrition — Rule Book

**Version 1.0** — the V1 data era (July 2026). Bump this whenever a rule OR AI-strength change would make playtest data incomparable.

Version history:
- **1.0 — V1.** No rules-text changes from 0.3. The AI search was overhauled (ranked shortlist instead of a random branching cap, orientation-aware trench evaluation), which shifts balance numbers enough that old baselines don't compare — hence the bump. Per-battle data collection (logs/woa.db) begins here.
- **0.3** — river revision: a river no longer blocks support — support crosses freely — but control no longer extends across a river, so you cannot deploy across one. River-deploy bug fixed.
- **0.2** — versioning begins (V0 feedback round 2): no-skip rule, same-type-swap ban arrives in round 3.

# Box Contents

* 2 player decks with 16 cards each  
* 2 player mats with 7 infantry, 2 cavalry, 1 artillery, 1 head quaters and 3 trenches.  
* 1 game board  
* 1 map deck with 12 cards  
* 18 terrain pieces — 2 length‑3 and 4 length‑2 **mountains**, 2 length‑3 and 4 length‑2 **forests**, 2 length‑3 and 4 length‑2 **rivers**.

# Game setup

	Each player gets a full deck of (16) cards, 7 infantry units, 2 cavalry units, 1 artillery units, 1 Headquarters, and 3 length 2 trenches. Shuffle and place the map cards off to the side of the board.  Select a player to go first by the manner of your choosing.    
War of Attrition is fought across various battlefields, each represented by a unique "Map Card." These cards define the layout of terrain and the starting positions for each battle. Draw the top card from the Map Deck. This card dictates the current battlefield for the battle. Set up the game board to match the hex grid and terrain features shown on the drawn Map Card.  Each player places their Headquarters unit on their designated "Red HQ" or "Blue HQ" hex as shown on the Map Card.  
	Once a victor of the battle is determined, they take the map card signifying a victory, draw the next map and the loser goes first in the next battle.  The 1st player to collect 3 victories wins the game.

# Turn Order

* Draw 4 cards  
  * In the 1st round of the game only put the deployed infantry starting card in your hand then draw only 3 cards, for a hand of 4\.  
  * If you can not draw up to a hand of 4, shuffle the discard pile.  
* Select 1 to play  
* Resolve the card (see the Card Actions section). You may always resolve any card instead as one **basic Attack** or one **basic Reposition**, with two limits:  
  * A basic **Reposition** is only allowed when you have **no** basic Attack available — you can't shuffle pieces to dodge a fight.  
  * You must resolve **at least one step** of whatever you play. If a card's steps can all act, you may not skip every one to spend the order for free; only a card that genuinely has no legal action fizzles.  
* Remove the played card from the game.  
* Discard remaining cards.   
  * Once there are 5 or less cards, draw all remaining cards during the draw phase.

# Resolving Combat

	When an attack is ordered, the outcome is determined by comparing the attacker’s power to the defender’s power.  For calculation purposes the Battle hex is the hex with the defending unit.  
 

* Attacker’s power is greater;  The defender is removed, and the attacker moves into the hex.  
* Defender’s power is greater; The attacker is removed, and the defender remains in place.  
* Tie; Both the attacking and defending units are removed.

Calculating Attacker’s Power

* Start with the attacking unit’s attack value.  
* Add support from any allied units adjacent to the battle hex — **except** support whose border into the battle hex is covered by a **trench** (that support does not arrive; a river does **not** block support).  
* If your **Headquarters** is adjacent to the battle hex, add \+1 (the HQ’s support — denied by a trench on that border, like any support).  
* If the attacker’s hex has a forest along the edge bordering the battle hex, add \+1.  
* Apply any card modifiers, if applicable.

Calculating Defender’s  Power

* Start with the defending unit’s defense value.  
* Add support from any allied units adjacent to the battle hex — the defender’s support is **never** blocked (neither trenches nor rivers stop it).  
* If the defending **Headquarters** is adjacent to the battle hex, add \+1.  
* If a mountain is present in the battle hex along the edge from which the attack is coming, add \+1

Trenches and rivers *(trenches revised July 2026 — previously \+1 defense; rivers revised 0.3 — previously blocked support)*

* A **trench** covers two edges of its hex. Attacking support may not cross a covered edge; that is all it does. It adds no defense, never blocks the attack itself, and never hinders the defender. Whoever dug it is irrelevant — a captured trench serves its new occupant.  
* A **river** sits on one border. **Support crosses it freely** for both sides, but **control does not extend across it**: you may not deploy a unit onto a hex whose only link to a hex you control crosses a river (adjacency control stops at the water). Attacks and movement still cross freely; Airdrop may land beyond it; Naval Barrage cannot remove it.

# Victory Conditions

## Battle Victory Conditions

* Headquarters capture  
  * Successfully attack into the opponent's headquarters.  A tie where both units get removed counts.  
* Attrition  
  * No cards are left to play  
  * Calls for a points win counting each player's **surviving units on the board**  
    * 1 vp / infantry  
    * 2 vp / calvary  
    * 3 vp / artillery  
    * Units still in reserve (never deployed) count for nothing  
  * Victor is the player with more points  
  * In the event of a tie who ever went 2nd wins  
  * *(Revised June 2026 — previously scored by defeated enemy units; board presence now decides the standstill.)*

## Game Victory Conditions

* 1st to collect 3 map cards.

# Glossary

## Action Definitions / clarifications

* Deploy / Build  
  * Take a unit or building from your player mate and place it on the board  
* Reposition (can do one of these)  
  * Move any unit into an empty adjacent hex; can move through a headquarters.  
  * Swap the position of two adjacent units **of different types** (swapping two identical units changes nothing — it is not a legal move); can swap through a headquarters.  
* Attack  
  * Select a unit on the board to attack an adjacent tile; tile must have a unit or headquarters in it for it to count as an attack.  
* In sequence   
  * The action is taken one after the other so control and adjacencies get recalculated in between actions.   
* Battle Hex  
  * The hex contains the defending unit when resolving combat.

## Card Actions 

* Deploy Infantry \- (starting Card)  
  * Count \- 1x  
  * Place an Infantry unit on the board adjacent to any controlled hex  
  * This card is guaranteed to be in your hand for the 1st turn.  
* Deploy Artillery  
  * Count \- 1x  
  * Place an Artillery unit on the board adjacent to any controlled hex  
* Deploy Infantry \- (then Build a trench)  
  * Count \- 3x  
  * Place an Infantry unit on the board adjacent to any controlled hex  
  * Place a trench building on any controlled hex.  
* Airdrop  
  * Count \- 1x   
  * Place an Infantry on **any** empty hex on the board.  
  * Never appears in your opening hand.  
* Conscription   
  * Count \- 1x  
  * Place two Infantry units on the board adjacent to any controlled hex in sequence.  
* Deploy Calvary \- (Both)  
  * Count \- 1x  
  * Place two Cavalry units on the board adjacent to any controlled hex in sequence.  
* Attack \+1  
  * Count \- 2x  
  * Order an Attack, and get \+1 support to your calculations.  
* Mass Assault \- (Attack Twice)  
  * Count \- 1x  
  * Order an Attack   
  * Then order another attack   
* Careful Maneuvers  
  * Count \- 1x  
  * Reposition a unit  
  * Then Order an attack with \-1 support to your calculations.  
* Reckless Maneuvers  
  * Count \- 1x  
  * Order an Attack   
  * Then Reposition a unit  
* Ordered Withdraw  
  * Count \- 1x  
  * Order an attack. Your attacker **never advances** into the hex, even on a win, and **survives a tie** (the defender is still destroyed; an enemy HQ still falls without you entering it).  
* Naval Barrage  
  * Count \- 1x  
  * Optionally remove **any one trench or forest anywhere on the board** (no longer restricted to hexes you control).  
  * Then order an attack — or simply attack, if you removed nothing.  
* Forced March  
  * Count \- 1x  
  * Reposition up to three times in sequence.

## Unit Types

* Infantry  
  * 1 attack, 1 defense, 1 support  
* Calvary  
  * 3 attack, 0 defense, 0 support  
* Artillery   
  * 0 attack, 0 defense, 2 support

## Building Types

* Trench *(revised July 2026)*  
  * Attacking support may not cross its two covered edges — the attacker fights without the help that would arrive over the trench line.  
  * Gives no defense, never blocks the attack itself, and never hinders the defender's support.  
  * Works the same whichever side dug it; a captured trench serves its new occupant.  
* Headquarters  
  * Gives 1 support to all adjacent hexes  
  * Has no inherent defence  
  * Units can reposition or attack through the hex containing the headquarters.

## Terrain Types

* Mountain (Grey)  
  * Will give 1 defense when attacked across.  
* Forest (Green)  
  * Will give 1 attack when attacked across.  
* River (Blue) *(new July 2026)*  
  * Sits on one border; support never crosses it, for either side.  
  * Attacks and movement cross freely; Airdrop may land beyond it; Naval Barrage cannot remove it.