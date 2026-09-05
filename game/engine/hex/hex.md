# Hex

Pointy-top axial. A hex **is** the string `'q,r'` — state keys, map data, log lines.
Direction `d` is an index 0–5 into `DIRS` (`E NE NW W SW SE`); rotating that list
renumbers every map file. A **side** is one hex's face of a border, `'q,r>d'`; the two
hexes on a border own their faces separately, which is why terrain is stored per side
(`docs/HexClarificationDiagram.png`).

| | |
| --- | --- |
| a hex as a coordinate | `hex.js` |
| a hex as a position on screen | `game/ui/hex/hex-screen.js` |
| the size and inks each board draws at | `game/ui/hex/hex-config.js` |
| how a hex looks | `game/ui/hex/hex.css` |
| tests | `hex.test.js`, `game/ui/hex/hex-screen.test.js` |

## Changing how hexes look

Size: one row per board in `hex-config.js`; every mark on that board scales with
it. Colour: `hex.css`, imported by `style.css` — the two renderers that cannot
use the `.hex` class read the same vars back through `HEX_CONFIG.ink`.

## Six neighbours, and which of them exist

`step(hex, dir)` is the coordinate one step away, board or no board. **Which of them
exist is the board's question**, so the on-board filter and its per-shape cache are
`game/engine/02-board.js`'s (`neighbor`, `neighbors`), written over `step`. Same rule
sends `hexLabel` there: a hex's row and column need an outline, so the board works
those out and asks `gridName` here for the name they turn into.

The screen never re-parses a key or re-tables the directions; it reads `E.parseKey` and
`E.DIRS` and derives from them. A hex's identity and the meaning of a direction are
spelled once each, here.
