# War of Attrition — battle on "The Cockpit" (seed 4321)

- rules version: **1.0** · transport: persistent session per side
- red: **haiku** (effort: low) · blue: **normal**
- 2026-07-07T06:07:04.985Z
- Result: **Blue** wins by hq after 6 turns
- Fallbacks (LLM reply unusable → engine chose): 0 of 11 decisions
- Transport: red 10 session / 0 cold calls · blue 0 session / 0 cold · tokens in/out 100/14106

## Battle 1 — Blue by hq (T6)

### Decisions
- T1 red — card: "Deploy Infantry" — _Turn 1 with no units on the board—deploy Infantry first to establish presence and gain versatile defense+support before building towards attacks._
- T1 red — step-deploy: Deploy Infantry at B2 — _Deploy at B2 to stake claim toward the board's center (C-row is widest) rather than staying on the edges._
- T2 blue — card: "Deploy Cavalry"
- T3 red — card: "Entrench" — _Deploy another Infantry to reach 2 VP and set up mutual support, while the trench denies Blue's support in future fights; Careful Maneuvers' -1 penalty only yields a tie (net zero gain)._
- T3 red — step-deploy: Deploy Infantry at C3 — _Deploy at C3 (the forest hex) to set up a winning attack on D3 next turn—forest terrain grants +1 attack bonus, making my 1 attack beat their 0 defense._
- T3 red — step-trench: Dig a trench at B2 covering edges SE+E — _Dig at B2 covering SE+E edges to block support from Blue's Cavalry approaching from the east/southeast direction._
- T4 blue — card: "Airdrop"
- T5 red — card: "Reckless Maneuvers" — _Reckless Maneuvers attacks Cavalry at D3 from C3 (1 attack + 1 forest bonus = 2, beats 0 defense), then repositions my B2 Infantry to press advantage—kills a 2-VP unit and gains tempo._
- T5 red — step-attack: Attack: Infantry at C3 strikes enemy Cavalry at D3 — power 2 vs 1: defender destroyed — _Attack the Cavalry at D3 (2 VP value) rather than the Infantry at A2 (1 VP)—higher-priority target and leaves Blue at 3 VP instead of 4._
- T5 red — step-reposition: March Infantry from D3 to E2 — _March D3 Infantry to E2 to threaten Blue's HQ at E3 next turn—one hex away from instant capture, forcing Blue to respond defensively._
- T6 blue — card: "Reckless Maneuvers"

### Battle notes
- **red**: I had momentum—killed a Cavalry and threatened Blue's HQ with my E2 Infantry—but fatally overextended; my HQ at A1 was vulnerable to Blue's Infantry at A2, which tied the attack and won because Blue moves second. Tempo is deceptive when you're not watching your own back.

### Campaign journal
- T1 Battle 1 — "The Cockpit". Red moves first.
- T1 Red plays "Deploy Infantry".
- T1 Red deploys Infantry at B2.
- T2 Blue plays "Deploy Cavalry".
- T2 Blue deploys Cavalry at D3.
- T2 Blue deploys Cavalry at D4.
- T3 Red plays "Entrench".
- T3 Red deploys Infantry at C3.
- T3 Red digs a trench at B2.
- T4 Blue plays "Airdrop".
- T4 Blue deploys Infantry at A2.
- T5 Red plays "Reckless Maneuvers".
- T5 Red Infantry attacks Blue Cavalry at D3 (2 vs 1): defender destroyed, attacker advances.
- T5 Red marches Infantry from D3 to E2.
- T6 Blue plays "Reckless Maneuvers".
- T6 Blue Infantry attacks Red HQ at A1 (1 vs 1): a tie — both units destroyed.
- T6 Blue wins the battle by capturing the headquarters!

## Felt-notes

### red (haiku)

**Strong:** Forest terrain bonuses (+1 attack) felt decisively good and rewarded positioning. The Cavalry as a high-attack-zero-defense unit created meaningful tactical moments—I *wanted* to hunt them.

**Weak:** My B2 trench never saw combat; Blue avoided that flank. Trenches felt like insurance I didn't need once the fight moved east.

**Luck-driven:** Blue's Airdrop placing Infantry at A2 (right beside my HQ) felt arbitrary—I had no way to predict or block it. The final tie on my HQ came down to one support point; margins were razor-thin.

**Suggested change:** Give defending HQs +1 base defense (so 1 instead of 0), or let units defending the HQ add their support even if in trenched hexes. Right now the HQ feels like a fragile objective, not a fortress—it should feel like capturing it costs something significant.

#reports #battle #v1-0
