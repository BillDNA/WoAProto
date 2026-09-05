# Terrain

Mountain, forest, river, trench.

| | |
| --- | --- |
| what a type does | `forest.js`, `mountain.js`, `river.js`, `trench.js` |
| what they share, and where the dug pieces are | `terrain.js` |
| every rules dial | `terrain-config.js`, over `maps.js`'s `"terrain"` block |
| tests | `terrain.test.js` |
| how a type is drawn | `game/ui/board/terrain/` — one `*-mark.js` per type, and `terrain-marks.test.js` |
| every drawn size | `game/ui/board/terrain/terrain-config.js` |
| what colour each type is | `game/ui/board/terrain/terrain.css` |

## Adding a type

1. A file here, calling `defineTerrain`.
2. A row in `terrain-config.js` — at minimum `pieces`, or no map may use it.
3. A file in `game/ui/board/terrain/`, calling `defineTerrainMark`.
4. Its colours: a var per colour in `terrain.css`, named by the mark. Marks
   never spell a hex.
5. Both script paths in `game/load-order.js`.

`terrain.test.js` does exactly this with a fifth type and checks it comes out
live everywhere. If you need more than these steps, that test will fail and
the missing seam is the bug.
