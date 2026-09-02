# UI components — the primitive set

The canonical name for every UI drawing primitive, and the one `file:line` where it
is **law**. The companion to root `CONTEXT.md` (domain terms) — this file is the
*component* spine: nothing in `game/ui/` draws SVG by hand, so every tile, glyph,
chit, mark, axis, and pattern resolves to exactly one builder below. A screen calls
these; it never string-concatenates or `createElementNS`'s its own. The contract is
enforced two ways: the app-wide backstop (`game/test/test.ui.js`) reds if any screen
draws raw SVG, and the home pointers here are machine-checked by
`node dev/check-context.js` — a moved primitive fails until its pointer is fixed in
the same commit.

Three modules, one implementation of each primitive, many callers:

- **board-primitives.js** (`BOARD` palette) — the hex board: tiles, terrain,
  trenches, HQs, unit tokens, attack pills, highlights, thumbnails, previews.
- **chart-primitives.js** (`CHART` palette) — the dashboard: svg frames, marks,
  axes, hover layer, and the shared band-board rows.
- **ui-primitives.js** — screen chrome shared outside the two canvases (swatches,
  sortable headers, the confirm dialog).

---

## Board foundation

The pure geometry + the single element factory every board primitive builds on.

**hexXY**:
Pixel centre of a hex key, at board scale `S`.
_Home_: `game/ui/board-primitives.js:30` — `hexXY`

**cornerAngles**:
The two corner-angle degrees bounding a hex edge direction.
_Home_: `game/ui/board-primitives.js:35` — `cornerAngles`

**cornerPt**:
A hex corner point, from centre + angle + radius.
_Home_: `game/ui/board-primitives.js:39` — `cornerPt`

**hexPoints**:
The six-corner `points` string for a hex polygon at a given radius.
_Home_: `game/ui/board-primitives.js:43` — `hexPoints`

**svgEl**:
The one `createElementNS` in the UI — the SVG element factory board primitives append with.
_Home_: `game/ui/board-primitives.js:51` — `svgEl`

**viewBoxFor**:
The `viewBox` that frames a list of hexes.
_Home_: `game/ui/board-primitives.js:56` — `viewBoxFor`

**bpEdgePts**:
The two endpoints of an inset hex edge — the base line terrain, trench, and barrage all share.
_Home_: `game/ui/board-primitives.js:69` — `bpEdgePts`

## Board primitives

**bpBeginBoard**:
Reset a board `<svg>` to an empty draw group.
_Home_: `game/ui/board-primitives.js:105` — `bpBeginBoard`

**bpHexPoly**:
A bare hex polygon (the tile fill/stroke shape).
_Home_: `game/ui/board-primitives.js:120` — `bpHexPoly`

**bpCoordLabel**:
The small hex-coordinate label.
_Home_: `game/ui/board-primitives.js:125` — `bpCoordLabel`

**bpHexTile**:
A full board hex tile — polygon plus its coordinate label.
_Home_: `game/ui/board-primitives.js:134` — `bpHexTile`

**bpTerrainStroke**:
The bare coloured terrain edge line (no glyph) — the editor's own paint stroke.
_Home_: `game/ui/board-primitives.js:147` — `bpTerrainStroke`

**bpTerrainEdge**:
A hex-owned terrain side drawn inset, with its terrain glyph.
_Home_: `game/ui/board-primitives.js:162` — `bpTerrainEdge`

**bpTrenchLine**:
A dug trench segment on one hex edge.
_Home_: `game/ui/board-primitives.js:185` — `bpTrenchLine`

**bpHQMarker**:
The HQ mark (ring + star) at an explicit centre.
_Home_: `game/ui/board-primitives.js:197` — `bpHQMarker`

**bpHQ**:
The HQ mark placed on a hex key.
_Home_: `game/ui/board-primitives.js:215` — `bpHQ`

**bpUnitToken**:
A unit token (circle + chit + type glyph) at an explicit centre — shared by the live board and the manual diagram.
_Home_: `game/ui/board-primitives.js:221` — `bpUnitToken`

**bpUnit**:
The live-board unit — a `bpUnitToken` in its own hover group.
_Home_: `game/ui/board-primitives.js:237` — `bpUnit`

**bpPieceGlyph**:
The standalone mini piece glyph (its own `<svg>` string) — the mats twin of `bpUnitToken`.
_Home_: `game/ui/board-primitives.js:250` — `bpPieceGlyph`

**bpAttackLayer**:
The hover-only attack-math group.
_Home_: `game/ui/board-primitives.js:261` — `bpAttackLayer`

**bpAttackPill**:
One attack-math pill on the hover layer.
_Home_: `game/ui/board-primitives.js:262` — `bpAttackPill`

**bpHighlight**:
A hex-fill highlight polygon (caller attaches the click).
_Home_: `game/ui/board-primitives.js:275` — `bpHighlight`

**bpTrenchGhost**:
The dashed trench-orientation dig preview.
_Home_: `game/ui/board-primitives.js:284` — `bpTrenchGhost`

**bpTrenchKnob**:
The brass knob at a trench pair's shared corner.
_Home_: `game/ui/board-primitives.js:293` — `bpTrenchKnob`

**bpBarrageTrench**:
The barrage mark over a trenched edge.
_Home_: `game/ui/board-primitives.js:301` — `bpBarrageTrench`

**bpBarrageForestEdge**:
The barrage mark over a forest edge.
_Home_: `game/ui/board-primitives.js:309` — `bpBarrageForestEdge`

**bpEdgeHitLine**:
The invisible fat hit-line over a hex edge (editor click target).
_Home_: `game/ui/board-primitives.js:320` — `bpEdgeHitLine`

**bpGhostHex**:
A ghost hex outline (the editor's add-hex affordance).
_Home_: `game/ui/board-primitives.js:328` — `bpGhostHex`

**bpThumbHex**:
A hex polygon at thumbnail scale.
_Home_: `game/ui/board-primitives.js:343` — `bpThumbHex`

**bpThumbTerrain**:
A terrain edge at thumbnail scale.
_Home_: `game/ui/board-primitives.js:346` — `bpThumbTerrain`

**bpThumbHQ**:
An HQ mark at thumbnail scale.
_Home_: `game/ui/board-primitives.js:350` — `bpThumbHQ`

**previewSVG**:
A whole map preview thumbnail from a map def.
_Home_: `game/ui/board-primitives.js:354` — `previewSVG`

---

## Chart foundation

**chEsc**:
The chart HTML-escape (one escape lives in `uiEsc`).
_Home_: `game/ui/chart-primitives.js:49` — `chEsc`

**chDivFill**:
The divergent fill colour for a win%-minus-50 deviation.
_Home_: `game/ui/chart-primitives.js:50` — `chDivFill`

**chSvgOpen**:
The opening `<svg>` tag for a chart frame (viewBox / size / aria).
_Home_: `game/ui/chart-primitives.js:60` — `chSvgOpen`

## Chart marks

**chLine**:
A line mark.
_Home_: `game/ui/chart-primitives.js:72` — `chLine`

**chHatchDefs**:
A hidden `<defs>` carrying one diagonal-hatch `<pattern>`, referenced by `url(#id)`.
_Home_: `game/ui/chart-primitives.js:79` — `chHatchDefs`

**chPolyline**:
A polyline mark.
_Home_: `game/ui/chart-primitives.js:86` — `chPolyline`

**chRect**:
A rect mark.
_Home_: `game/ui/chart-primitives.js:92` — `chRect`

**chCircle**:
A circle mark.
_Home_: `game/ui/chart-primitives.js:100` — `chCircle`

**chPolygon**:
A polygon mark.
_Home_: `game/ui/chart-primitives.js:108` — `chPolygon`

**chText**:
A text mark.
_Home_: `game/ui/chart-primitives.js:114` — `chText`

**chSwatch**:
An inline colour swatch span.
_Home_: `game/ui/chart-primitives.js:121` — `chSwatch`

**chTipAttrs**:
The `data-tip` hover attributes for a mark (name + rows).
_Home_: `game/ui/chart-primitives.js:122` — `chTipAttrs`

**chCdf**:
The settle-curve CDF path from a sorted series.
_Home_: `game/ui/chart-primitives.js:131` — `chCdf`

**chSettleSvg**:
The two-run settle-curve chart.
_Home_: `game/ui/chart-primitives.js:140` — `chSettleSvg`

**chMakePlacer**:
The greedy non-overlapping label placer.
_Home_: `game/ui/chart-primitives.js:152` — `chMakePlacer`

**chBindHits**:
The chart hover layer — binds `.ch-hit` marks to the shared tooltip.
_Home_: `game/ui/chart-primitives.js:191` — `chBindHits`

**ovBandRect**:
One band rectangle of a band-board row.
_Home_: `game/ui/chart-primitives.js:247` — `ovBandRect`

**chDumbbell**:
An A→B dumbbell mark (two runs on one scale).
_Home_: `game/ui/chart-primitives.js:259` — `chDumbbell`

**ovDot**:
A run dot on a band-board row.
_Home_: `game/ui/chart-primitives.js:270` — `ovDot`

**ovBandRowHtml**:
A whole band-board row (bands + dots + labels), shared by the Overview and Maps panes.
_Home_: `game/ui/chart-primitives.js:291` — `ovBandRowHtml`

---

## Screen chrome

Shared outside the board and chart canvases.

**uiEsc**:
The one HTML-escape the whole UI routes through.
_Home_: `game/ui/ui-primitives.js:16` — `uiEsc`

**uiSwatch**:
A colour swatch chip.
_Home_: `game/ui/ui-primitives.js:23` — `uiSwatch`

**uiSortableTh**:
A sortable table header cell (active key + direction arrow).
_Home_: `game/ui/ui-primitives.js:31` — `uiSortableTh`

**confirmDialog**:
The shared confirm/cancel modal.
_Home_: `game/ui/ui-primitives.js:41` — `confirmDialog`
