# Interface

How does a human drive this? The places someone goes, what has to survive between visits, and the shared ink every screen is drawn with.

The primitives are named here as kinds; the roll-call of every one that exists is `docs/reference/context-ui-components.md`.

## Places you go

**Front door**:
The entry screen a player meets before a run.
_Avoid_: main menu.
_Home_: `game/ui/screens.js` — `frontdoor:`

**Screen**:
One registered destination, either a player screen or a dev screen.
_Home_: `game/ui/screens.js` — `SCREENS`

**Run flow**:
The sequence of screens a Campaign moves through between Battles.
_Home_: `game/ui/screens.js` — `campaign:`

**Dev mode**:
An off-by-default flag that reveals the dev screens.
_Home_: `game/ui/screens.js` — `devMode`

**Dev Hub**:
The screen that roofs the dev tools.
_Home_: `game/ui/screens.js` — `devhub:`

**Field Manual**:
The in-app screen teaching the rules, with step-through diagrams.
_Home_: `game/ui/manual.js` — `Field Manual`

**Mats**:
The overlay showing the physical pieces a side is holding.
_Avoid_: roster.
_Home_: `game/ui/modals/mats.js` — `id:'mats'`

**Card art**:
The illustration looked up for a Card by its id.
_Home_: `game/ui/app.js` — `artImg`

## Staying in the game

**Save / resume**:
A Skirmish persisted mid-play and picked back up on a later visit.
_Home_: `game/ui/skirmish.js` — `saveLocal`

**Turn snapshot**:
The state kept so a player can take the current turn back.
_Home_: `game/ui/skirmish.js` — `ensureSnapshot`

**Hotseat handoff**:
Passing one device between two people between turns.
_Home_: `game/ui/skirmish.js` — `showHandoff`

## Families that share a shell

A kind is discovery plus a shared shell, so a new one of the family is a file and
a line rather than an edit in five places. The shell is the same for every family;
how one is *shown* is not, and that part belongs to the family.

**Kind**:
A family of concepts sharing one shell — a registry of what exists, validation at
registration, and a mount address derived from the entry's id.
_Home_: `game/ui/kit/kind.js` — `defineKind`

**Pane**:
One view inside a screen, reached from that screen's nav; exactly one shows at a time.
_Home_: `game/ui/screens/dashboard/panes/pane.js` — `dashPane`

**Modal**:
One overlay dialog over whatever screen is up: a title, a body, and a row of
buttons that dismiss it. Normally none is open.
_Avoid_: modal card — a Card is an order in the rule book.
_Home_: `game/ui/modals/modal.js` — `uiModal`

## The drawing kit

Ink with no opinion about what it is drawing. If the thing could name whose turn it is or which run is loaded, it is not one of these.

**Board primitive**:
A builder for one mark on the game board, shared by every board that renders.
_Home_: `game/ui/board-primitives.js` — `bpHexTile`

**Chart mark**:
A builder for one mark in a chart.
_Home_: `game/ui/chart-primitives.js` — `chRect`

**Screen chrome**:
A builder for shared page furniture outside the board and chart canvases.
_Home_: `game/ui/ui-primitives.js` — `uiSortableTh`

**The one escape**:
That all HTML escaping in the UI routes through a single function.
_Home_: `game/ui/ui-primitives.js` — `uiEsc`

**Raw-SVG rule**:
That a screen never builds an SVG element itself; it calls a primitive.
_Home_: `game/test/test.ui.js` — `SVG_LITERAL`
