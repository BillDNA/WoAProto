# The board

The grid a skirmish is fought on, the outline it is fought inside, what a side
of a hex does to a fight, and every mark drawn on any of it.

One concept, a half on each street — `game/engine/board/` describes the board,
`game/ui/board/` draws it — each half with its own base, the same way terrain
is split. This file is the prose for both.

## The engine half

| file | is |
| --- | --- |
| `board.js` | the door: the grid — where a hex is, its neighbours, distance, edges and sides — and where a map's authored terrain lands on it |
| `shape.js` | the SHAPE base: the hex list, the containment set, the grid labels players read, and whether the outline is point-symmetric |
| `shapes/` | one room per authored outline form |
| `terrain/` | one room per terrain type, over its own base |

**The shape.** An outline is authored in one of several forms and each form is a
room answering one question — which hexes am I? `rows.js` is contiguous row
spans, the compact form every built-in board uses; `hexes.js` is an explicit hex
set, the honest form for an irregular outline and what the shape editor writes.
Everything else a shape owes the game is written once in the base. A def no room
recognises is a load-time throw.

Adding a form is one file: `defineShapeForm({id, has, hexes})`, and
`game/load-order.js` schedules it before `board.js`, which opens the house by
building the authored shapes once every room has registered.

## The screen half

| file | is |
| --- | --- |
| `board.js` | the door: the live board, its highlights and its clicks |
| `mark.js` | the MARK base and its two lifetimes |
| `marks/` | one room per mark |
| `board-config.js` | the hex size, the radii and weights marks derive from, the palette |
| `geometry.js` | where a hex is on screen, and the frame marks are drawn into |
| `fx.js` | what one action changed, animated |
| `attack.js` | what an attack would do, hovered and confirmed |
| `mat.js` | the pieces a side is holding, beside the field |
| `thumbnail.js` | the map-library previews, as an SVG string |
| `terrain/` | one room per terrain type's mark |

**The mark.** A mark takes its geometry from a hex key, its ink from
`board-config.js` and its scale from the caller, so the live board, the field
manual's diagram, the map editor and the thumbnails draw one implementation of
each at four sizes. `bpMark({id, lifetime, draw})` declares one and
`bpDraw(into, id, o)` draws it.

**Lifetime** is the room's own answer, and the two are not the same act:

- **kept** — what is on the board: a tile, a unit, an HQ, a highlight. It draws
  its own element into the caller's layer and hands it back, because the caller
  wires the clicks and the next full repaint is what clears it.
- **transient** — what just happened on it: a strike, a support ring, a number
  pill, a fallen unit. The base wraps it, marks it click-through, and `o.ttl`
  takes it away again.

Adding a mark is one file in `marks/`, scheduled in `game/load-order.js`. It
derives every size from `s`; a caller passes a scale, never its own copy of the
drawing.

Two marks emit an SVG **string** rather than DOM and so are not rooms: the mat's
piece glyph and the library thumbnail. A string is not an element.

Nothing outside this house and the `*primitives.js` modules may build an SVG
element; `game/test/test.ui.js` walks every file under `game/ui/` for it.
