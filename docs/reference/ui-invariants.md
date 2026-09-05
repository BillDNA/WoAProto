#claude-orientation #ui-invariants
# UI invariants — the browser app

*What the browser UI guarantees outside the households that document themselves. The UI is classic scripts under `game/ui/` with no wrappers — top-level names attach to `window`; `boot.js` loads last and owns every load-time statement. The engine is truth; the UI never encodes a rule. Start in [[code-architecture]].*

*The skirmish screen's guarantees live with the code: `game/ui/turn/turn.md`, `game/engine/board/board.md`, `game/ui/session/session.md`, `game/ui/screens/skirmish/skirmish.md`.*

## Maps & editor

- **The map library is `E.MAPS`** (the content files). Saving a map in the editor updates `E.MAPS` in place (`libraryReplace`) and POSTs `/api/savemap`; deleting POSTs `/api/deletemap` + `libraryRemove`. The match pool is the active mapset (`E.activeMaps()` / `E.MAPSETS`, edited in the maps screen's Mapsets panel — up to 5 named sets, one active — saved via `/api/savemapsets`). Export downloads the whole library as `maps-bundle.json`; Import writes each map back through `/api/savemap`. Editing, deleting and set-saving need the local server.
- The editor paints terrain per side (click inside a hex near its border); its shape dropdown builds itself from `E.SHAPES`; Mirror applies the shape's rot180; saving groups same-type corner-sharing sides of one hex into pieces, splitting long same-hex runs into the physical lengths the box holds (`Engine.splitPieceRun`). Its paint cycle, stock panel and instructions are all written from the terrain registry (`Engine.mapTerrainTypes`), so a new terrain type appears in the editor without an edit here.

## Front door, deep links, art

- **Responsive menu**: the menu shrinks to fit short screens via `max-height` queries (shrink, don't scroll; `#menu` keeps `overflow-y:auto` only as a last resort), and the plaque title's font is width-clamped (`clamp(14px,4.4vw,29px)`) with `min-width:0`/`overflow:hidden` so the one-line title can't blow the panel past 92vw.
- `index.html?autostart=ai` deep-links straight into a skirmish; `?screen=<id>` opens a screen, arming dev mode first for a dev one (screenshots, quick testing).
- **Art pipeline**: `game/art/<card-id>.jpg|png` looked up by card id (`artImg` with an onerror fallback chain, `ART_STATE` cache; no art = clean text-only card). `title.png` / `table.jpg` / `board.jpg` dress menu, body, and board via CSS with graceful absence. Raw AI renders are heavy: `dev/optimize-art.ps1` trims alpha margins, resizes, and jpgs (originals swept to gitignored `dev/art-originals/`).

## Related

[[code-architecture]] · [[engine-model]] · [[report-model]]
