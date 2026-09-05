# Board

The hexes that are in play, and everything drawn on them.

| | |
| --- | --- |
| the outline, and every question that needs one | `board.js` |
| how an outline is authored | `rows-outline.js`, `hexes-outline.js` |
| the shape library | `game/maps.js` — the `"shapes"` block |
| tests | `board.test.js` |
| how a mark is drawn | `game/ui/board/` — one `*-mark.js` per mark, and `board-marks.test.js` |
| the board in play, and the map thumbnail | `game/ui/board/live-board.js`, `thumb-board.js` |
| every drawn number, one row per board | `game/ui/board/board-config.js` |
| how the marks look | `game/ui/board/board.css` |

Under this house: `hex/` (a hex as a coordinate), `terrain/` (what a border does),
`unit/` (the pieces standing on it).

## Adding an authored outline form

A def in `maps.js` or in a map's `shapeDef` is written in one form — spans of
rows, or an explicit hex set. To add a third:

1. A file here, calling `defineOutlineForm` with `has` (does this def belong to
   me?) and `hexes` (turn it into `[[q, r], ...]`).
2. Its path in `game/load-order.js`, after `board.js`.

Nothing else. `board.test.js` does exactly this with a ring form and checks a map
written in it validates, plays and labels its hexes; if you need a third step,
that test fails and the missing seam is the bug.

## Adding a mark

1. A file in `game/ui/board/`, calling `defineBoardMark` — a `lifetime`
   (`standing` = part of the board, `transient` = a moment played over it) and a
   `draw` that takes its geometry from the hex house and its ink from `o.ink`.
2. Its path in `game/load-order.js`.

A mark reads no scale of its own: `o.s` is the size its caller is drawing at, and
`o.d` is that board's row of `board-config.js`. Add a row only for a board that
needs a *different weight*, not a different size — size is `hex-config.js`.

## Retuning a board

Every number a mark draws with is one row in `game/ui/board/board-config.js`,
named for the board it belongs to: `board` (in play, the editor, fx), `manual`
(the Field Manual's diagram), `thumb` (the map library), `mapPane` (the
dashboard's lenses). A row states only what that board does differently; the rest
falls through to `board`. Colour is `board.css`, or `ink` in that config for the
inks that reach a string-built board.

A transient mark is written down twice, in this one house: the fade is
`board.css`, the millisecond its node is taken away is `ms` in `board-config.js`.
They have to agree.

## Asking about a board that is not the live one

`E.outline(nameOrMap)` hands back an outline you can ask anything of —
`outlineHexes`, `outlineLabel`, `outlineRows`, `outlineSymmetric` — without
moving the live board. Nothing outside reads a shape's fields.
