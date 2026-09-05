# The board

Every mark drawn on a hex board — the live one, the field manual's diagram, the
map editor's canvas, the map library's thumbnails — and what a click on the live
one means.

## The two bases

**`mark.js`** is the persistent marks: what is on the board. A mark takes its
geometry from a hex key, its ink from the `BOARD` palette and its scale from the
caller, so one implementation serves every board at every size.

**`overlay.js`** is the transient marks: what just happened. `bpOverlayMark`
declares one; `bpOverlay(into, id, o)` draws it, with `s` the hex size, `ttl` a
lifetime, and `cls` a class for the stylesheet to animate. The live board draws
them for three quarters of a second and the manual draws the same marks as a
still frame.

Terrain is a house of its own inside this one (`terrain/`): a terrain type
answers five questions about a side of a hex and draws its own mark.

## Adding a mark

A persistent mark is a `bp*` builder in `mark.js`. A transient one is a
`bpOverlayMark` in `overlay.js`. Either way it derives its sizes from `s` — a
caller passes a scale, never its own copy of the drawing.

## The rooms

| file | is |
| --- | --- |
| `board.js` | the door: the live board, its highlights and its clicks |
| `mark.js` | the persistent marks, the geometry and the palette |
| `overlay.js` | the transient marks |
| `fx.js` | what one action changed, animated |
| `attack.js` | what an attack would do, hovered and confirmed |
| `mat.js` | the pieces a side is holding, beside the field |
| `thumbnail.js` | the map-library previews, as an SVG string |
| `terrain/` | mountain, forest, river and trench |

The thumbnail keeps its own emitter: it builds innerHTML, not DOM.

Nothing outside this house and the `*primitives.js` modules may build an SVG
element; `game/test/test.ui.js` scans every file under `game/ui/` for it.
