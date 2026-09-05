# Terrain

Mountain, forest, river, trench.

## Where things are

| | |
| --- | --- |
| what a type does | `forest.js`, `mountain.js`, `river.js`, `trench.js` |
| what they share | `terrain.js` |
| every tunable number | `terrain-config.js` |
| tests | `terrain.test.js` |
| how a type is drawn | `game/ui/board/terrain/` — one `*-mark.js` per type |

## Adding a type

1. A file here, calling `defineTerrain`.
2. A row in `terrain-config.js` — at minimum `pieces`, or no map may use it.
3. A file in `game/ui/board/terrain/`, calling `defineTerrainMark`.
4. Both paths in `game/load-order.js`.

Nothing else. Combat, support, deploy, barrage, map validation, the editor's
paint cycle and stock panel, the commander terrain gate and the dashboard's
cross-cuts all read the registry and name no type. `dev/db.js` adds the maps
column on next open.

## Two things that look wrong and aren't

**Trenches are stored apart.** Map terrain is authored into
`st.board.terrainEdges`; trenches are dug at runtime into `st.pieces.trenches`.
`terrainAt` reads both. Unifying the storage breaks `barrage` and
`edgeFreeForTrench`.

**Two trench rules live in `03-rules.js`, not in `trench.js`.** A trenched
defending border spares the defender on a tie and stops a tie taking a trenched
HQ. Those are about the fight, not the border, so they sit with combat.

## Not the same thing as commander effects

`03a-commander-effects.js` is a sibling. Terrain sits on a side and answers a
fixed set of questions. An effect primitive is a verb a *source* grants, and
terrain is one such source — a trait names a terrain and this house answers.

A map point-of-interest granting a combat effect from a hex is an effect
primitive with a new source, not a terrain type: it is held, not crossed.
