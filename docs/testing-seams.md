---
last-reviewed: 2026-09-01 (WoAProto#222)
---
#claude-orientation #testing
# Hand-off seams & the real-path gates

A **seam** is where one piece hands real data to the next: a producer writes/emits/
serializes, a consumer reads/parses/deserializes, and the contract between them can
silently drift. WoAProto#222's job is to add the missing tests for those hand-offs —
tests that drive **real data across the actual boundary**, nothing mocked, so a red
means the wiring broke. This doc carries the running inventory; treat it as a backlog,
never a certificate.

## The pattern

- **Drive the real path, nothing mocked.** Green must stop meaning "80% wired". A gate
  plays real data through the actual entry point (real HTTP, a real skirmish, the real
  db) and reds when a feature is unwired.
- **Assert the mechanism, never the value.** A test pins *that a limit is enforced*, not
  *that the limit is 3*; changing an in-bounds game-content number must red **zero**
  tests. Build fixtures relative to the live limit, or from synthetic inputs.
- **Test a seam alone where you can**, so a red localises to that seam.

## Where the gates live

- `dev/server.test.js` — boots the **real `game/server.js`** on an ephemeral port
  (`server.listen(0)`, persistence pointed at a temp db via `WOA_DB_PATH`) and drives
  the `/api/*` surface over real HTTP.
- `game/test.integration.js` — a real HQ-capture skirmish through the public engine API
  fires the `onSkirmishEnd` persistence subscription; an `__sim` clone does not; the
  delivered state lands a row through the real `dev/db.js`. Unwire proof: neuter the
  `if (!st.__sim) HOOKS.onSkirmishEnd…` dispatch in `engine/04-skirmish.js` → it reds.
- `game/test.seams.js` — the army-points cap as a settable, enforced limit (mechanism,
  not value).

To make the server driveable, two small production changes (not behaviour changes):
`game/server.js` guards its `.listen` behind `require.main` and exports
`listen`/`handler`/`ROUTES`/`recordSkirmish`; `dev/db.js` `open()` honours `WOA_DB_PATH`.

## Seam inventory — coverage status

`REAL` = a test drives real data across the boundary. `NONE`/`MOCKED`/`ONE-SIDED` =
gap. Least-covered, most-load-bearing first.

| Seam | Boundary | Status |
|------|----------|--------|
| A1/A2 finished skirmish → `/api/recordskirmish` → db row | boot.js hook → server → dev/db.js | **REAL** — `server.test.js` (+ `test.integration.js` for the engine hook) |
| B1/B2/B3 db rows → `/api/runs`+`/api/skirmishes` (timeline join) → `envelopeFromRow` | dev/db.js → server → report-model | **REAL** — `server.test.js` feeds the real row into `envelopeFromRow` |
| D1/D2/D3 LAN create/join/push/poll + seq-conflict | ui/net.js → server rooms | **REAL** (server side) — `server.test.js`; browser producers still DOM-only |
| A6/A7 savereport/savedebug path-injection fences | server `saveUnderRepo` | **REAL** (reject side) — `server.test.js` |
| A3/A8 savemap/deletemap → content file → manifest | server → content/ → manifest-gen | **NONE** — needs a temp content-dir sandbox (server + manifest-gen path override) |
| A4 savedeck → custom-deck.js | server → game/custom-deck.js | **NONE** — self-restoring (save then null) once content-dir is overridable |
| A5 savemapsets → destructive dir rewrite | server → content/mapsets/ | **NONE** — destructive; needs the sandbox before it's safe to drive |
| C1 `--parallel` worker slim-state → parent → db | balance-report worker string → parent | **ONE-SIDED** — `slimSkirmishState` round-trip pinned; the driver/worker string is not |
| E3 index.html deck bootstrap → ACTIVE_DECK | inline bootstrap → engine snapshot | **NONE** — localStorage-wins precedence runs only in the page |
| F1 map.shapeDef → `@id` shape → board (LAN join/resume) | engine ↔ battle.maps serialization | **ONE-SIDED** — built-ins exercised; no carved-shapeDef round-trip through a join |
| F2 map/deck bundle import parser | boot.js import → libraryReplace | **NONE** — lenient parser is pure node logic |
| G2 AI hidden-hand resample honesty | engine sampledReplyScore | **NONE** — no "cannot peek at the true hidden order" assertion (the AI analog of G1) |
| H1 `factsFromRow` ≡ `skirmishFacts` | engine live fold ↔ db-row fold | **NONE** — the identity that keeps the DB read path from drifting is unasserted |
| G1 stateView LLM honesty | claude-plays → prompt | **REAL** — `claude-plays.test.js` sentinel |
| H2 BANDS/balanceScore, H4 playLog→card_plays/trace | report-model / db | **REAL** — `test.reports.js`, `db.test.js` |
| E2 manifest-gen ↔ committed manifest | content dirs → manifest.js | **REAL** — `test.maps.js` staleness test |

## AC1 — value-pins that still red on a content edit

`test.cards.js`/`test.maps.js` had their content-value pins removed (deck total, card
points, map count). **But AC1 is not fully met:** changing a unit stat (e.g. infantry
`atk` in `maps.js`) still reds `combat math`, `terrain attack table`, and
`unit composition & values` in `test.terrain.js`/`test.ai.js` — those pin exact combat
powers/stats. Converting them to mechanism (support contributes, terrain contributes,
higher total wins, tie kills both) is open work at the combat-resolver seam
(`computeAttack`/`supportFor`). AI-weight pins are the same shape.

## Related

[[code-architecture]] · [[workflow]]
