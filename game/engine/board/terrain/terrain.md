# Terrain

Mountain, forest, river, trench.

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

`terrain.test.js` does exactly this with a fifth type and checks it comes out
live everywhere. If you need more than these four steps, that test will fail and
the missing seam is the bug.
