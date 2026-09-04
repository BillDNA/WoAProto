# Integration

How does one part talk to another? A concept belongs here when it names an agreed shape at a handoff — somewhere one side can change without telling the other, because the shape between them is what both hold to.

That the UI calls the engine is not a contract. `Engine.view` is.

## Engine to everything else

**Play surface**:
The read-only view of a Skirmish the engine hands out, so nothing outside it reads raw state.
_Home_: `game/engine/04-skirmish.js` — `function view`

**Engine hook**:
The observation point a finished Skirmish is announced on, so recording never reaches into the rules.
_Home_: `game/engine/04-skirmish.js` — `onSkirmishEnd`

**Seam**:
Where one piece hands real data to the next, named so it can be tested at the handoff.
_Home_: `docs/reference/testing-seams.md` — `A **seam** is`

**Rules version**:
The stamp that says which rules produced a result.
_Home_: `game/engine/01-core.js` — `RULES_VERSION`

**Legal-move list**:
The one enumeration of what a side may do, that a person and a bot both pick from.
_Home_: `game/engine/03-rules.js` — `listAttacks`

## Content to engine

**Content kind**:
The one list of the kinds of thing that can be authored.
_Home_: `game/content/kinds.js` — `module.exports`

**Content manifest**:
The generated index that puts the authored files in front of the browser before the engine runs.
_Home_: `game/server.js` — `manifest`

**Active flag**:
That exactly one authored item of a kind is live at a time.
_Home_: `game/engine/01-core.js` — `d.active`

**Applied battalion**:
The Battalion Editor's override, which beats the authored active one on load.
_Home_: `game/custom-battalion.js` — `WOA_CUSTOM_BATTALION`

**Load order**:
That the browser's script chain is hand-ordered, and load-time wiring happens in one file at the end of it.
_Home_: `game/index.html` — `boot.js`

## Across the wire

**Server route**:
One endpoint in the server's single routes table.
_Home_: `game/server.js` — `'GET /api/poll'`

**LAN room**:
Two browsers holding one Skirmish in step over the local network.
_Home_: `game/server.js` — `rooms`

**Persistence proxy**:
The route a finished Skirmish takes to become rows, which fails open when the dev tooling is absent.
_Home_: `game/server.js` — `/api/recordskirmish`

## Identity of a run

**Config home**:
One object owning a set of dials, of which the engine, AI, UI and dev-lab each have theirs.
_Home_: `game/engine/00-config.js` — `defineConfigHome`

**Config digest**:
A fingerprint of a config home's live values, changing only when a value does.
_Avoid_: Hash (a hash is the mechanism; this is the identity it yields).
_Home_: `game/engine/00-config.js` — `configDigest`

**Slice key**:
The rules version and config digest together, which say whether two results may be pooled.
_Home_: `dev/db.js` — `versions`

**Trace envelope**:
The agreed shape a report is rendered from.
_Home_: `docs/reference/report-model.md` — `Trace envelope`

**One implementation per fact**:
That any single fact is computed in exactly one place.
_Home_: `CLAUDE.md` — `one implementation per fact`
