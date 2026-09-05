# Board

The hexes that are in play, and everything drawn on them.

| | |
| --- | --- |
| the outline, and every question that needs one | `board.js` |
| how an outline is authored | `rows-outline.js`, `hexes-outline.js` |
| the boards themselves | `game/content/maps/<slug>.js` — one file per board |
| the shape library those files pick a name from | `game/maps.js` — the `"shapes"` block |
| tests | `board.test.js` |
| how a mark is drawn | `game/ui/board/` — one `*-mark.js` per mark, and `board-marks.test.js` |
| the boards this house renders | `live-board.js` (in play), `thumb-board.js` (the library), `map-editor.js` (being authored) |
| every drawn number, one row per board | `game/ui/board/board-config.js` |
| how the marks look | `game/ui/board/board.css` |

Under this house: `hex/` (a hex as a coordinate), `terrain/` (what a border
does), `unit/` (the pieces standing on it).

## A map is a board

`content/maps/*.js` is this house's content, the way `content/units/*.js` is the
unit house's. A map file holds an outline (`shape` or `shapeDef`), where the two
HQs stand, and which sides carry terrain — board facts, all of them. There is no
map house and nothing in a map that is not the board.

## Adding an authored outline form

A def is written in one form — spans of rows, or an explicit hex set. To add a
third:

1. A file here, calling `defineOutlineForm` with `has` (does this def belong to
   me?) and `hexes` (turn it into `[[q, r], ...]`).
2. Its path in `game/load-order.js`, after `board.js`.

`board.test.js` does exactly this with a ring form and checks a map written in it
validates, plays and labels its hexes; if you need a third step, that test fails
and the missing seam is the bug.

## Adding a mark

1. A file in `game/ui/board/`, calling `defineBoardMark` with a `lifetime`
   (`standing` = part of the board, `transient` = a moment played over it) and a
   `draw`.
2. Its path in `game/load-order.js`.

## Changing how a board looks

Every number is `game/ui/board/board-config.js`, one row per board: `board` (in
play, the editor, fx), `manual`, `thumb`, `mapPane`. A row names only what that
board does differently; the rest falls through to `board`. Size is not here — a
row's name is also its row in `hex-config.js`, which is the one place a hex's
size is set, and every mark scales from it.

Colour is `board.css`, except the inks a string-built board cannot read from a
stylesheet, which are `ink` in the same config.

A transient mark is written down twice, in this one house: the fade is
`board.css`, the millisecond its node is taken away is `ms` in the config. They
have to agree.

Terrain and units keep their own rows the same way
(`ui/board/{terrain,unit}/*-config.js`), so a new board is four rows, not four
sets of literals.

## Asking about a board that is not the live one

`E.outline(nameOrMap)` hands back an outline you can ask anything of —
`outlineHexes`, `outlineLabel`, `outlineRows`, `outlineSymmetric` — without
moving the live board. Nothing outside reads a shape's fields.

## What this house does not own

Red and Blue. A mark asks `BOARD.side(owner)` and paints what comes back; no mark
here spells a colour, and `board-marks.test.js` pins that.
