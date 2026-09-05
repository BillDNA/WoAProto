# The session

What survives an interruption, and who is at the controls.

## The two bases

**`seat.js`** — a seat is one of the four modes (`ai`, `hotseat`, `net`,
`watch`), plus `none` for a menu with nothing being played; each is a room of
`seats/`, answering every question that follows from being in it: is my
input live, whose hand do I see, which side do I drive, which side is "you",
which is an AI, what the screen says while I wait, what happens when a turn
begins, whether a save is written, whether a change goes over the wire, whether
this seat may concede, whether the hand is gated behind a hand-off, and what a
finished skirmish records for a side.

Nothing outside this house reads `APP.mode`.

**`store.js`** — every record this browser keeps between visits, with its key,
its version, and what happens to an older one. Each is a room of `stores/`,
holding its record together with the code that reads it. A record with a version is stored
in an envelope and a stale one is discarded on read; `migrate` accepts an older
spelling. The battalion override has no version because
`game/applied-battalion.js` reads it before the app loads.

## Adding a mode, or a stored record

A mode is one file in `seats/`, a `uiSeat` — every field is required, so a new
mode cannot half-answer. A record is one file in `stores/`, a `uiStore` plus
whatever reads it. Both are scheduled in `game/load-order.js`.

## The rooms

| file | is |
| --- | --- |
| `session.js` | the door: taking a seat, the next skirmish, giving it up |
| `seat.js` | the seat base — the thirteen questions |
| `seats/none.js` | the menu, with nothing being played |
| `seats/ai.js` | you against the enemy general |
| `seats/hotseat.js` | two humans on one device, and the hand-off gate |
| `seats/net.js` | two humans over a wire |
| `seats/watch.js` | two AIs, nobody playing |
| `store.js` | the stored-record base — key, version, what happens to an older one |
| `stores/save.js` | the skirmish save and its resume |
| `stores/dev.js` | whether this browser shows the dev surfaces |
| `stores/battalions.js` | the five named Battalion Editor slots |
| `stores/battalion.js` | the battalion this browser plays, stored bare |
| `snapshot.js` | the turn a player can take back |
| `net.js` | the LAN room's browser half |

The LAN room's wire half is `game/server/room/room.js`: whole-state JSON both
ways, a push that must be exactly the next sequence number, a poll that returns
when the sequence moves.

## State that must survive the wire

Anything added to a skirmish state stays JSON-serializable and self-contained —
`battle.maps` carries full map defs so a joiner needs nothing local.
