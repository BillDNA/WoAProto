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

Three modules, one implementation of each primitive, many callers:

- **hex/hex-screen.js** — where a hex and its faces sit on screen, at any scale.
  The screen dialect of the hex house (`game/engine/hex/hex.md`).
- **board-primitives.js** (`BOARD` palette) — the hex board: tiles, terrain,
  trenches, HQs, unit tokens, attack pills, highlights, thumbnails, previews.
- **chart-primitives.js** (`CHART` palette) — the dashboard: svg frames, marks,
  axes, hover layer, and the shared band-board rows.
- **ui-primitives.js** — screen chrome shared outside the two canvases (swatches,
  sortable headers, the confirm dialog).

---

## Board foundation

Where a hex sits (the hex house's screen dialect) + the single element factory
every board primitive builds on.

**hexXY**:
Pixel centre of a hex key, at board scale `S`.
_Home_: `game/ui/hex/hex-screen.js` — `function hexXY`

**hexCornerAngles**:
The two corner-angle degrees bounding a hex face direction.
_Home_: `game/ui/hex/hex-screen.js` — `function hexCornerAngles`

**hexCornerPt**:
A hex corner point, from centre + angle + radius.
_Home_: `game/ui/hex/hex-screen.js` — `function hexCornerPt`

**hexPoints**:
The six-corner `points` string for a hex polygon at a given radius.
_Home_: `game/ui/hex/hex-screen.js` — `function hexPoints`

**hexEdgePts**:
The two endpoints of an inset hex face — the base line terrain, trench, and barrage all share.
_Home_: `game/ui/hex/hex-screen.js` — `function hexEdgePts`

**svgEl**:
The one `createElementNS` in the UI — the SVG element factory board primitives append with.
_Home_: `game/ui/board-primitives.js` — `svgEl`

**viewBoxFor**:
The `viewBox` that frames a list of hexes.
_Home_: `game/ui/board-primitives.js` — `viewBoxFor`

## Board primitives

**bpBeginBoard**:
Reset a board `<svg>` to an empty draw group.
_Home_: `game/ui/board-primitives.js` — `bpBeginBoard`

**bpHexPoly**:
A bare hex polygon (the tile fill/stroke shape).
_Home_: `game/ui/board-primitives.js` — `bpHexPoly`

**bpCoordLabel**:
The small hex-coordinate label.
_Home_: `game/ui/board-primitives.js` — `bpCoordLabel`

**bpHexTile**:
A full board hex tile — polygon plus its coordinate label.
_Home_: `game/ui/board-primitives.js` — `bpHexTile`

**bpTerrainStroke**:
The bare coloured terrain edge line (no glyph) — the editor's own paint stroke.
_Home_: `game/ui/board/terrain/terrain-marks.js` — `bpTerrainStroke`

**bpTerrainEdge**:
A hex-owned terrain side drawn inset, with its terrain glyph.
_Home_: `game/ui/board/terrain/terrain-marks.js` — `bpTerrainEdge`

**bpTrenchLine**:
A dug trench segment on one hex edge.
_Home_: `game/ui/board/terrain/trench-mark.js` — `bpTrenchLine`

**bpHQMarker**:
The HQ mark (ring + star) at an explicit centre.
_Home_: `game/ui/board-primitives.js` — `bpHQMarker`

**bpHQ**:
The HQ mark placed on a hex key.
_Home_: `game/ui/board-primitives.js` — `bpHQ`

**bpUnitToken**:
A unit token (circle + chit + type glyph) at an explicit centre — shared by the live board and the manual diagram.
_Home_: `game/ui/board-primitives.js` — `bpUnitToken`

**bpUnit**:
The live-board unit — a `bpUnitToken` in its own hover group.
_Home_: `game/ui/board-primitives.js` — `bpUnit`

**bpPieceGlyph**:
The standalone mini piece glyph (its own `<svg>` string) — the mats twin of `bpUnitToken`.
_Home_: `game/ui/board-primitives.js` — `bpPieceGlyph`

**bpAttackLayer**:
The hover-only attack-math group.
_Home_: `game/ui/board-primitives.js` — `bpAttackLayer`

**bpAttackPill**:
One attack-math pill on the hover layer.
_Home_: `game/ui/board-primitives.js` — `bpAttackPill`

**bpHighlight**:
A hex-fill highlight polygon (caller attaches the click).
_Home_: `game/ui/board-primitives.js` — `bpHighlight`

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

**bpEdgeHitLine**:
The invisible fat hit-line over a hex edge (editor click target).
_Home_: `game/ui/board-primitives.js` — `bpEdgeHitLine`

**bpGhostHex**:
A ghost hex outline (the editor's add-hex affordance).
_Home_: `game/ui/board-primitives.js` — `bpGhostHex`

**bpThumbHex**:
A hex polygon at thumbnail scale.
_Home_: `game/ui/board-primitives.js` — `bpThumbHex`

**bpThumbTerrain**:
A terrain edge at thumbnail scale.
_Home_: `game/ui/board-primitives.js` — `bpThumbTerrain`

**bpThumbHQ**:
An HQ mark at thumbnail scale.
_Home_: `game/ui/board-primitives.js` — `bpThumbHQ`

**previewSVG**:
A whole map preview thumbnail from a map def.
_Home_: `game/ui/board-primitives.js` — `previewSVG`

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
