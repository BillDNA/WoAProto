# Parking Lot — Map points of interest

**Status:** noodling · captured 2026-07-15 · graduates to a spec when a POI earns its rules complexity

> "Other points of interest on the map like capture points or ammo dumps — just noodle on that."
> — Bill, 2026-07-15

Maps today are terrain + HQs + deployment. This note collects **interactive map features** that add a spatial decision the current maps don't offer — the map equivalent of what create-card does for the deck.

## Candidates to noodle
- **Capture points** — hold-a-hex-for-value; a positional objective competing with the HQ-attrition goal. Could feed the tie-break problem (a non-attrition way to decide close battles).
- **Ammo dumps / supply** — a hex that refreshes a resource (attack cards? piece stock? deploy steps?); a reason to push toward a point.
- Others: chokepoint bonuses, high-ground, destructible terrain, reinforcement hexes.

## Open questions
- Does a POI change the **win condition** (capture-to-win) or just the **economy** (resource on a hex)?
- Fit with the map data shape — is a POI a one-file `content/maps/` diff (content-as-data goal) or does it need engine rules? Check the seam before adding.
- Measurability: a new objective type is a new metric — does the balance loop *see* whether it distributes turns / reduces drag the way we hope?

## When it graduates
When one POI type has clear rules and a measurable balance hypothesis. Likely rides in with a card/map content milestone. See `create-map` / `brainstorming` when ready.

## Related
[[Goals]] content-as-data · [[Goals]] improve-balance-numbers · [[Roadmap]] · create-map skill

#parking-lot #project-direction
