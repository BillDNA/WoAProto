# UI components — the primitive set

The canonical name for every UI drawing primitive, and the one `file` where it
is **law**. The companion to root `CONTEXT.md` (domain terms) — this file is the
*component* spine: nothing in `game/ui/` draws SVG by hand, so every tile, glyph,
chit, mark, axis, and pattern resolves to exactly one builder below. A screen calls
these; it never string-concatenates or `createElementNS`'s its own. The contract is
enforced two ways: the app-wide backstop (`game/test/test.ui.js`) reds if any screen
draws raw SVG, and the home pointers here are machine-checked by
`node dev/check-context.js` — each `_Home_` names a `file` + a backticked anchor
that must appear in it (no line numbers), so only a renamed or relocated primitive
fails, fixed in the same commit.

Five modules, one implementation of each primitive, many callers:

- **hex/hex-screen.js** — where a hex and its faces sit on screen, at any scale,
  with `hex/hex-config.js` holding the size each board draws at. The screen half
  of the hex house (`game/engine/board/hex/hex.md`).
- **board/** (`BOARD_CONFIG`) — the hex board: one file per mark (tiles, HQs,
  pills, highlights, rings, strikes), the frame they are drawn in, and the two
  boards the house renders itself. The screen half of the board house
  (`game/engine/board/board.md`). Terrain, units and the seat's red and blue are
  their own (`board/terrain/`, `board/unit/`, `kit/palette.js`).
- **chart-primitives.js** (`CHART` palette) — the dashboard: svg frames, marks,
  axes, hover layer, and the shared band-board rows.
- **ui-primitives.js** — screen chrome shared outside the two canvases (swatches,
  sortable headers, the confirm dialog).

---

## Board foundation

Where a hex sits (the hex house's screen dialect) + the single element factory
every board primitive builds on.

**HEX_CONFIG**:
The size each board draws hexes at, one row per board.
_Home_: `game/ui/board/hex/hex-config.js` — `var HEX_CONFIG`

**hexXY**:
Pixel centre of a hex key, at that board's scale.
_Home_: `game/ui/board/hex/hex-screen.js` — `function hexXY`

**hexCornerAngles**:
The two corner-angle degrees bounding a hex face direction.
_Home_: `game/ui/board/hex/hex-screen.js` — `function hexCornerAngles`

**hexCornerPt**:
A hex corner point, from centre + angle + radius.
_Home_: `game/ui/board/hex/hex-screen.js` — `function hexCornerPt`

**hexPoints**:
The six-corner `points` string for a hex polygon at a given radius.
_Home_: `game/ui/board/hex/hex-screen.js` — `function hexPoints`

**hexEdgePts**:
The two endpoints of an inset hex face — the base line terrain, trench, and barrage all share.
_Home_: `game/ui/board/hex/hex-screen.js` — `function hexEdgePts`

**svgEl**:
The one `createElementNS` in the UI — the SVG element factory every mark appends with.
_Home_: `game/ui/kit/svg.js` — `function svgEl`

**viewBoxFor**:
The `viewBox` that frames a list of hexes, at any board's scale.
_Home_: `game/ui/board/board-marks.js` — `function viewBoxFor`

## Board marks

**defineBoardMark**:
Registers one mark drawn on a hex board — its lifetime and its drawing.
_Home_: `game/ui/board/board-marks.js` — `function defineBoardMark`

**bpMark**:
Draws a mark into a caller-owned group, at the caller's board scale.
_Home_: `game/ui/board/board-marks.js` — `function bpMark`

**bpMarkup**:
The same marks as an SVG string, for a board that goes into `innerHTML`.
_Home_: `game/ui/board/board-marks.js` — `function bpMarkup`

**bpPlay**:
Puts a transient mark on the board and takes it away after its declared life.
_Home_: `game/ui/board/board-marks.js` — `function bpPlay`

**boardDial**:
A mark's dials on one surface — that board's row read over the live board's.
_Home_: `game/ui/board/board-marks.js` — `function boardDial`

**bpBeginBoard**:
Reset a board `<svg>` to an empty draw group.
_Home_: `game/ui/board/board-marks.js` — `function bpBeginBoard`

**bpTerrainStroke**:
The bare coloured terrain edge line (no glyph) — the editor's own paint stroke.
_Home_: `game/ui/board/terrain/terrain-marks.js` — `bpTerrainStroke`

**bpTerrainEdge**:
A hex-owned terrain side drawn inset, with its terrain glyph.
_Home_: `game/ui/board/terrain/terrain-marks.js` — `bpTerrainEdge`

**bpTrenchLine**:
A dug trench segment on one hex edge.
_Home_: `game/ui/board/terrain/trench-mark.js` — `bpTrenchLine`

**hq mark**:
The headquarters — side-coloured hex, brass ring, star; the ring and star are dials.
_Home_: `game/ui/board/hq-mark.js` — `mark: 'hq'`

**tile mark**:
The parchment hex, its dark twin worked out from the coordinate.
_Home_: `game/ui/board/tile-mark.js` — `mark: 'tile'`

**coord mark**:
The grid reference over a hex.
_Home_: `game/ui/board/coord-mark.js` — `mark: 'coord'`

**bpUnitToken**:
A unit token (disc + chit + type glyph) at an explicit centre, in the seat's colours — shared by the live board, the editor and the manual diagram.
_Home_: `game/ui/board/unit/unit-marks.js` — `bpUnitToken`

**bpUnit**:
The live-board unit — a `bpUnitToken` in its own hover group.
_Home_: `game/ui/board/unit/unit-marks.js` — `bpUnit`

**bpUnitSlot**:
The same token at the player mat's sizes, returned as markup — not a second drawing path.
_Home_: `game/ui/board/unit/unit-marks.js` — `bpUnitSlot`

**defineUnitMark**:
Registers how one unit type is drawn — its one glyph, and its dashboard colour.
_Home_: `game/ui/board/unit/unit-marks.js` — `defineUnitMark`

**bpTrenchMatGlyph**:
A trench's mat slot glyph, the terrain house's twin of `bpUnitGlyph`.
_Home_: `game/ui/board/terrain/trench-mark.js` — `bpTrenchMatGlyph`


**bpAttackLayer**:
The hover-only attack-math group the pills go on.
_Home_: `game/ui/board/board-marks.js` — `function bpAttackLayer`

**pill mark**:
One attack-math pill, coloured by who wins the fight.
_Home_: `game/ui/board/pill-mark.js` — `mark: 'pill'`

**highlight mark**:
A hex the step offers (caller attaches the click).
_Home_: `game/ui/board/highlight-mark.js` — `mark: 'highlight'`

**ring mark**:
A ring round a hex — played for a beat on the live board, held still in a diagram.
_Home_: `game/ui/board/ring-mark.js` — `mark: 'ring'`

**strike mark**:
Where a blow came from — a dashed line with an arrowhead.
_Home_: `game/ui/board/strike-mark.js` — `mark: 'strike'`

**struck mark**:
The ✕ over a piece that fell.
_Home_: `game/ui/board/struck-mark.js` — `mark: 'struck'`

**badge mark**:
The corner ✕ chip: a piece fell here and the hex is already re-occupied.
_Home_: `game/ui/board/badge-mark.js` — `mark: 'badge'`

**glow mark**:
The halo along one hex face — look here.
_Home_: `game/ui/board/glow-mark.js` — `mark: 'glow'`

**hexRing mark**:
A hex outline inside a hex, at a radius the caller's meaning sets.
_Home_: `game/ui/board/hex-ring-mark.js` — `mark: 'hexRing'`

**hexHit mark**:
The invisible pointer target over a whole hex.
_Home_: `game/ui/board/hex-hit-mark.js` — `mark: 'hexHit'`

**bpTrenchGhost**:
The dashed trench-orientation dig preview.
_Home_: `game/ui/board/terrain/trench-mark.js` — `bpTrenchGhost`

**bpTrenchKnob**:
The brass knob at a trench pair's shared corner.
_Home_: `game/ui/board/terrain/trench-mark.js` — `bpTrenchKnob`

**bpBarrageTerrain**:
The barrage mark over a terrain side, at that type's own inset.
_Home_: `game/ui/board/terrain/terrain-marks.js` — `bpBarrageTerrain`

**defineTerrainMark**:
How one terrain type is drawn — stroke, glyph ink, inset, glyph.
_Home_: `game/ui/board/terrain/terrain-marks.js` — `defineTerrainMark`

**edgeHit mark**:
The invisible fat hit-line over one hex face (the editor's paint target).
_Home_: `game/ui/board/edge-hit-mark.js` — `mark: 'edgeHit'`

**ghost mark**:
A dashed outline where a hex could go (the editor's add-hex affordance).
_Home_: `game/ui/board/ghost-mark.js` — `mark: 'ghost'`

**bpThumbTerrain**:
A terrain edge at thumbnail scale.
_Home_: `game/ui/board/terrain/terrain-marks.js` — `function bpThumbTerrain`

**previewSVG**:
A whole board from a map def, as markup — the map library's thumbnail.
_Home_: `game/ui/board/thumb-board.js` — `function previewSVG`

---

## Chart foundation

**chEsc**:
The chart HTML-escape (one escape lives in `uiEsc`).
_Home_: `game/ui/chart-primitives.js` — `chEsc`

**chDivFill**:
The divergent fill colour for a win%-minus-50 deviation.
_Home_: `game/ui/chart-primitives.js` — `chDivFill`

**chSvgOpen**:
The opening `<svg>` tag for a chart frame (viewBox / size / aria).
_Home_: `game/ui/chart-primitives.js` — `chSvgOpen`

## Chart marks

**chLine**:
A line mark.
_Home_: `game/ui/chart-primitives.js` — `chLine`

**chHatchDefs**:
A hidden `<defs>` carrying one diagonal-hatch `<pattern>`, referenced by `url(#id)`.
_Home_: `game/ui/chart-primitives.js` — `chHatchDefs`

**chPolyline**:
A polyline mark.
_Home_: `game/ui/chart-primitives.js` — `chPolyline`

**chRect**:
A rect mark.
_Home_: `game/ui/chart-primitives.js` — `chRect`

**chCircle**:
A circle mark.
_Home_: `game/ui/chart-primitives.js` — `chCircle`

**chPolygon**:
A polygon mark.
_Home_: `game/ui/chart-primitives.js` — `chPolygon`

**chText**:
A text mark.
_Home_: `game/ui/chart-primitives.js` — `chText`

**chSwatch**:
An inline colour swatch span.
_Home_: `game/ui/chart-primitives.js` — `chSwatch`

**chTipAttrs**:
The `data-tip` hover attributes for a mark (name + rows).
_Home_: `game/ui/chart-primitives.js` — `chTipAttrs`

**chCdf**:
The settle-curve CDF path from a sorted series.
_Home_: `game/ui/chart-primitives.js` — `chCdf`

**chSettleSvg**:
The two-run settle-curve chart.
_Home_: `game/ui/chart-primitives.js` — `chSettleSvg`

**chMakePlacer**:
The greedy non-overlapping label placer.
_Home_: `game/ui/chart-primitives.js` — `chMakePlacer`

**chBindHits**:
The chart hover layer — binds `.ch-hit` marks to the shared tooltip.
_Home_: `game/ui/chart-primitives.js` — `chBindHits`

**ovBandRect**:
One band rectangle of a band-board row.
_Home_: `game/ui/chart-primitives.js` — `ovBandRect`

**chDumbbell**:
An A→B dumbbell mark (two runs on one scale).
_Home_: `game/ui/chart-primitives.js` — `chDumbbell`

**ovDot**:
A run dot on a band-board row.
_Home_: `game/ui/chart-primitives.js` — `ovDot`

**ovBandRowHtml**:
A whole band-board row (bands + dots + labels), shared by the Overview and Maps panes.
_Home_: `game/ui/chart-primitives.js` — `ovBandRowHtml`

---

## Screen chrome

Shared outside the board and chart canvases.

**uiEsc**:
The one HTML-escape the whole UI routes through.
_Home_: `game/ui/ui-primitives.js` — `uiEsc`

**uiSwatch**:
A colour swatch chip.
_Home_: `game/ui/ui-primitives.js` — `uiSwatch`

**uiSortableTh**:
A sortable table header cell (active key + direction arrow).
_Home_: `game/ui/ui-primitives.js` — `uiSortableTh`

**confirmDialog**:
The shared confirm/cancel modal, one entry in the Modal registry.
_Home_: `game/ui/modals/confirm.js` — `confirmDialog`
