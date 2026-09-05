# Interface

How does a human drive this? The places someone goes, what they see and do while a Skirmish is on, what has to survive between visits, and the shared ink every screen is drawn with.

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

## What you see of a Skirmish

**Board view**:
The board of the Skirmish in play, redrawn from state after every action.
_Home_: `game/ui/board.js` — `renderBoard`

**Player mat**:
One side's own furniture beside the board — its hand, reserves and stocks.
_Home_: `game/ui/skirmish.js` — `renderMat`

**Highlight**:
A hex marked as a legal choice for the Step in hand.
_Home_: `game/ui/board.js` — `renderHighlights`

**Attack preview**:
What an Attack would resolve to, shown before it is committed.
_Home_: `game/ui/board.js` — `attackPreviewsFor`

**Animation pass**:
The difference one action made, replayed as movement over the board.
_Home_: `game/ui/fx.js` — `playFX`

## Taking a turn

**Prompt**:
The line saying what the current Step is waiting for.
_Home_: `game/ui/skirmish.js` — `renderPrompt`

**Battle log**:
The running player-facing record of what has happened this Skirmish.
_Home_: `game/ui/skirmish.js` — `renderLog`

**The one action path**:
That every player action goes through one function, which applies it, replays it
and redraws.
_Home_: `game/ui/skirmish.js` — `function act`

**AI turn driver**:
The browser-side loop that makes a seated AI take its turn.
_Home_: `game/ui/skirmish.js` — `maybeAI`

## Working a Commander

**Commander panel**:
The live per-side Commander controls beside the board.
_Home_: `game/ui/commander-panel.js` — `renderCommanderPanel`

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

**App state**:
The one object holding what this browser is doing — the Skirmish in play, the
mode, which side you are, the room you are in.
_Home_: `game/ui/app.js` — `var APP`

**Save version**:
The stamp that retires saves the current code can no longer load.
_Home_: `game/ui/skirmish.js` — `SAVE_V`

**Live sync**:
The browser half of a LAN room — pushing your state and polling for theirs.
_Home_: `game/ui/net.js` — `startPolling`

**Slot**:
A numbered place in the browser holding one draft of a content kind, one of
which is active.
_Home_: `game/ui/battalion-editor.js` — `DK_SLOTS`

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

**Content editor**:
One content kind's authoring screen: pick a Slot, edit, save.
_Home_: none yet — every content kind's editor writes its own save path today.

## Reading recorded runs

**Row cache**:
The fetch-once skirmish rows every pane on a screen reads, so one visit makes one
request.
_Home_: `game/ui/net.js` — `SKIRMISH_CACHE`

**Run comparison**:
The pairing of two recorded runs that every pane renders against.
_Home_: `game/ui/screens/dashboard/dashboard.js` — `dashPickDefaultRuns`

**Band board**:
One metric's two runs read against its guard band, the compound mark a run is
judged by.
_Home_: `game/ui/chart-primitives.js` — `ovBandRowHtml`

## The drawing kit

Ink with no opinion about what it is drawing. If the thing could name whose turn it is or which run is loaded, it is not one of these.

**Board primitive**:
A builder for one mark on the game board, shared by every board that renders.
_Home_: `game/ui/board-primitives.js` — `bpHexTile`

**Chart mark**:
A builder for one mark in a chart.
_Home_: `game/ui/chart-primitives.js` — `chRect`

**Toast**:
A message that appears over whatever is on screen and leaves on its own.
_Home_: `game/ui/app.js` — `function toast`

**Screen chrome**:
A builder for shared page furniture outside the board and chart canvases.
_Home_: `game/ui/ui-primitives.js` — `uiSortableTh`

**The one escape**:
That all HTML escaping in the UI routes through a single function.
_Home_: `game/ui/ui-primitives.js` — `uiEsc`

**Raw-SVG rule**:
That a screen never builds an SVG element itself; it calls a primitive.
_Home_: `game/test/test.ui.js` — `SVG_LITERAL`
