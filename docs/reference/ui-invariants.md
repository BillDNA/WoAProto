#claude-orientation #ui-invariants
# UI invariants — the browser app

*What the browser UI guarantees, and the constraints a UI change must not break. The UI is classic scripts under `game/ui/` with no wrappers — top-level names attach to `window`; `boot.js` loads last and owns every load-time statement. The engine is truth; the UI never encodes a rule. Component vocabulary is [[context-ui-components]]; start in [[code-architecture]].*

## State & sync

- **Multiplayer is whole-state JSON push/poll.** Anything added to state must stay JSON-serializable and self-contained (e.g. `battle.maps` carries full map defs so the joiner needs nothing local).
- **Local saves are versioned** (`SAVE_V` in `ui/app.js`). Bump it whenever old saved states would break (board removed, trench arrays, state shape changed) — resume then silently clears instead of crashing.
- **Modes**: `'ai'` | `'hotseat'` | `'net'` | `'watch'` (AI plays both sides; `maybeAI` re-arms at turn end). The Rematch button on skirmish-over restarts a single-map match in the current mode (local modes only).

## Board & mats

- **The board is bounded by its hex geometry.** `renderBoard` sets `--board-ar` from the SVG viewBox; `#board{height:100%; width:auto; aspect-ratio:var(--board-ar)}` so tall/diamond maps do not stretch full-width. Do not reintroduce `width:100%`.
- **Player mats render one slot per physical piece** (solid = reserve, dashed = fielded, ✕ = lost — needs trench `owner`) plus a 16-chip spent-orders track per side. Enemy card attrition must be visible at a glance.
- **Board FX layer** (`capturePre`/`playFX` + slide/pop/ghost/ring/`fxStrike` helpers) is pure flourish wired through `act()` and the AI driver — it must never touch rules and must survive a full board re-render (it animates after `renderAll` using from/to info captured before `applyStep`). Attacks draw a strike arrow (bending through the HQ on via-attacks) plus rings on every supporter that actually counted (`capturePre` reads `E.supportFor(...).hexes` — engine truth including trench/river blocking; gold = attacker's, steel = defender's).
- **Hover attack preview**: hovering your unit overlays `A vs D` pills on every hittable hex via `showAttackHints`/`attackPreviewsFor`, using `E.computeAttack` so the numbers can never disagree with resolution; hover-only by design.
- **One-action trenches**: after picking the hex, each legal orientation is a brass corner knob (hover previews its two edges, one click digs).

## Maps & editor

- **The map library is `E.MAPS`** (the content files). Saving a map in the editor updates `E.MAPS` in place (`libraryReplace`) and POSTs `/api/savemap`; deleting POSTs `/api/deletemap` + `libraryRemove`. The match pool is the active mapset (`E.activeMaps()` / `E.MAPSETS`, edited in the maps screen's Mapsets panel — up to 5 named sets, one active — saved via `/api/savemapsets`). Export downloads the whole library as `maps-bundle.json`; Import writes each map back through `/api/savemap`. Editing/deleting/set-saving needs the local server; a double-clicked `file://` can play and edit sets for the session but not persist them.
- The editor paints terrain per side (click inside a hex near its border); its shape dropdown builds itself from `E.SHAPES`; Mirror applies the shape's rot180; saving groups same-type corner-sharing sides of one hex into pieces, splitting long same-hex runs into physical 2s/3s (`splitRun`).

## Layout & responsive ladder

- **Game layout is three full-height columns.** `.sidecol#leftcol` holds both mats (opponent top, your mat bottom next to the hand; hotseat/watch = red top/blue bottom; ordered via flex `order` in `renderTop`, `.mat-divider` seam between); `#centercol` holds boardwrap + promptbar + hand; `.sidecol#rightcol` is the Campaign Journal only — full height, bound-book chrome. Rule of hierarchy: board + hand are primary and never yield; rails are reference and degrade first; surplus width goes to the board (`#rightcol` capped at `clamp(300px,26vw,420px)`).
- **Journal groups by turn** (`renderLog`): a card play opens a `.jturn` (steps nested in `.steps`); the last two turns render open, older ones collapse to the play line with a `+N ›` affordance (`.toggler`, expand state in `APP.ui.expanded` — UI-only, never saved). The overlay mirror (`syncJournalOverlay` → `#journalBody`) strips `.jhead` and re-wires expand via a delegated click handler.
- **Topbar scoreboard**: left cell `#skirmishTitle` = `Skirmish N · "map"` + `YOU · SIDE` chip (ai/net only); centre `#scorecard` = red pips | `#tug` field-score tug-bar | blue pips. Tug-bar: solid = `fieldScore` now, hatched = ceiling if every reserve deploys, cream seam = projected front — mats and topbar agree by construction (both read `fieldScore`).
- **Responsive ladder** (mats never scroll — `#leftcol{overflow:hidden}`): ≤1280px rails slim; ≤820px tall mats compact; ≤960px wide or ≤580px tall the journal rail hides and a floating hamburger (`#fabJournal`) opens `#journalOvr`; ≤720px the left rail hides too and `#fabRosters` mirrors `#leftcol` into `#rostersOvr` (`syncRostersOverlay`), board full-bleed, topbar stacks.
- **Responsive menu**: the menu shrinks to fit short screens via `max-height` queries (shrink, don't scroll; `#menu` keeps `overflow-y:auto` only as a last resort), and the plaque title's font is width-clamped (`clamp(14px,4.4vw,29px)`) with `min-width:0`/`overflow:hidden` so the one-line title can't blow the panel past 92vw.

## Concede, deep links, art

- **Concede**: `#btnConcede` in the topbar (hidden in watch mode / skirmish-over) — confirm dialog via `confirmOvr`, works in ai/hotseat/net (pushes state). `renderPrompt` shows a brass hint when `concedeAdvised` fires for the live player; `maybeAI` checks it first and concedes outright.
- `index.html?autostart=ai` deep-links straight into a skirmish (screenshots, quick testing).
- **Art pipeline**: `game/art/<card-id>.jpg|png` looked up by card id (`artImg` with an onerror fallback chain, `ART_STATE` cache; no art = clean text-only card). `title.png` / `table.jpg` / `board.jpg` dress menu, body, and board via CSS with graceful absence. Raw AI renders are heavy: `dev/optimize-art.ps1` trims alpha margins, resizes, and jpgs (originals swept to gitignored `dev/art-originals/`).

## Related

[[code-architecture]] · [[engine-model]] · [[context-ui-components]] · [[report-model]]
