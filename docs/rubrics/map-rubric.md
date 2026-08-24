---
summary: What makes a good War of Attrition Map — a battlefield where neither seat nor colour is the victory condition, both win paths stay live, and holding ground matters.
applies-to: any Map in the active Mapset (`content/maps/`) — an existing Map under review or a proposed new one. Read Maps only against peers measured with the same Deck.
---
# Map rubric

A Map is one battlefield — a hex layout with terrain and the two HQ start
positions. This rubric judges whether a Map is a *fair and decisive place to
fight*. It grades taste; the per-map bands and the "best map" ideal-range score
(the runnable definition of a healthy Map) live in `docs/balance/`.

The one lever behind every axis below is the Map's geometry — terrain sides, HQ
and colour placement, HQ spacing. Each axis just names the aspect of geometry it
leans on.

## Goals

* ==**the map decides nothing the players should**== — neither Red/Blue nor first/second mover wins on geometry alone.
* ==**both roads open**== — the HQ is threatenable but not rushable, so HQ capture and Attrition are both live win paths.
* ==**ground is worth holding**== — the side that controls more of *this* board is the side that tends to win it.

## Axes of evaluation

1. **Does a side win on geometry?** Does one colour take the Map materially more than the other, with nothing but terrain sides and HQ placement to explain it?
2. **Does the seat win the fight?** Is going first (or second) the Map's real victory condition, rather than a small edge?
3. **Do both win paths live?** Can the HQ realistically be threatened without being trivially rushable — so battles resolve by capture *and* by Attrition, not overwhelmingly one?
4. **Are the HQs close enough to keep the HQ path real?** Are the two HQs spaced so the capture road stays reachable, rather than so distant that every battle collapses into Attrition? Confirm against axis 3 rather than judging on raw distance alone.
5. **Does control track winning here?** On *this* Map — not on the roster average — does holding more hexes actually predict the win? If ground is decorative here, the geometry gives players nothing to fight over.
6. **Does the Map funnel battles into stand-offs?** Does its terrain and HQ spacing push an outsized share of endings into equal-field-score attrition tiebreaks — the symmetric-grind signature of too-distant HQs and defensible terrain on both sides?

## Related runnable checks (`docs/balance/`)

Red%/1st%/HQ%/Tie% per-map bands and the "best map" ideal-range score are the
evidence for axes 1–3 and 6; grade the reading against peers on the same Deck.
