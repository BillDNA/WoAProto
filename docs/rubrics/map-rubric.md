---
summary: What makes a good War of Attrition Map — a battlefield whose geometry hands neither colour nor seat the win, keeps both roads to victory open, and gives the middle a reason to be fought over.
applies-to: any Map in the active Mapset (`content/maps/`) — an existing Map under review or a proposed new one. Read Maps only against peers measured with the same Deck.
---
# Map rubric

A Map is one battlefield — a hex layout with terrain and the two HQ start
positions. Its whole vocabulary is geometry: terrain sides, HQ spacing, and where
Control can reach. This rubric judges the one thing the balance sweep can't:
whether that geometry makes a *fight worth having*. Whether the numbers sit in
band is the sweep's job (`docs/balance/best-map-score.md`); a metric appears
here only as evidence for something a grader saw on the board.

## Goals

* ==**the map decides nothing the players should**== — neither Red/Blue nor first/second mover wins on geometry alone.
* ==**both roads open**== — the HQ is threatenable but not rushable, so HQ capture and Attrition are both live win paths.
* ==**ground is worth holding**== — the side that controls more of *this* board is the side that tends to win it.

## Axes of evaluation

1. ==**Terrain is a fight, not a favour.**== Walk the board as each colour. Does a feature help only one of them — a Mountain that shields one HQ's approach, a Forest that faces one way, a River that cuts one side's Control and not the other's? Name the hex and what its mirror would be; that's the fix. A lopsided Red% is a reason to go look, not the finding.
2. ==**The opening is a move, not the verdict.**== Play the first two turns from both seats. If the first mover's opening claims ground the second seat can't answer at the same price — a choke reached one hex sooner, the only good Deploy edge — name that ground and what would put the second seat's reply within reach. A first-mover edge a card can swing is fine; one only geometry explains (1st%) is the map's to fix.
3. ==**The road is lined by someone's terrain.**== Trace the shortest capture path from each HQ and say *whose* terrain shapes it — Mountain hands the road to the defender, Forest to the attacker, open hexes to whoever moves first. The finding says which lever moves it: spacing (a road too long turns every battle into Attrition, and the equal-Field-score tiebreaks and long kill tails — Tie%, Drag — follow) or the terrain on the approach (open to the door and it's a race, Mountain at the door and it's a wall). HQ% says which side of the line the map fell on, not why.
4. ==**The middle is a prize, not scenery.**== Point at the hex a player would fight over — one whose Control opens a Deploy, carries Support across, or shortens the road. If there isn't one, holding more of this board decides nothing (Control% on *this* Map, not the roster mean) and both sides sit on their own defensible line with no reason to leave it. The fix is a feature that makes the ground between the HQs pay.
5. ==**No two maps are the same battle.**== Across the Mapset, does the plan that wins one map win another? A roster where the same opening beats every board is one map wearing several names, and an extreme corner (attrition-only, seat-skewed) is a *shape* only if the roster needs that shape — otherwise it's a defect the sweep will keep penalising. The finding names which corner is missing or duplicated; that, not a new tune of an existing map, is what `create-map` should fill.
