---
last-reviewed: 2026-09-01 (WoAProto#222)
---
#claude-orientation #testing
# Seam-test tracer & the integration gate

The verification pattern the later refactors reuse (WoAProto#222). Three rules, one
ledger. When you refactor, copy the pattern; don't re-derive it.

## The pattern

- **Assert the mechanism, never the value.** A test pins *that a limit can be set and
  is enforced*, not *that the limit is 3*. Changing a game-content number (a card's
  atk/count/steps, a deck's composition, a map's layout) must red **zero** tests — a
  red there means the test pinned a value; fix the test, not the number. Build fixtures
  *relative* to the live limit (`E.DECK_POINTS_CAP`), or from synthetic inputs, so the
  boundary tracks the code.
- **Test the seam alone.** A seam gets its own file/test so a red **localises** to that
  seam, not the whole project.
- **The integration gate drives the real entry point, nothing mocked.** Green must stop
  meaning "80% wired". The gate plays through the public API to a real finish and
  asserts the wiring; deliberately unwiring the feature reds it.

## Where it lives

- `game/test.seams.js` — the isolated seam: the **army-points cap** as a settable,
  enforced limit (`E.deckPoints` vs `E.DECK_POINTS_CAP`), asserted by mechanism only.
- `game/test.integration.js` — the real-path **persistence** gate: a genuine HQ-capture
  skirmish driven through the public engine API fires the `onSkirmishEnd` subscription
  with a persistable state, an `__sim` look-ahead clone does **not**, and the delivered
  state lands a row through the real `dev/db.js`. Unwire proof: neuter the
  `if (!st.__sim) HOOKS.onSkirmishEnd…` dispatch in `engine/04-skirmish.js` and it reds.
- Whole-suite property (no single file): changing an in-bounds content number reds no
  test — verified by mutating a card's attack `mod` and running `node game/test.js`.

## What the suite still misses (incomplete by default)

Treat this as a to-do, not a certificate. Known gaps as of WoAProto#222:

- **The server HTTP proxy leg** (`/api/recordskirmish` → `dev/db.js`) is covered only by
  a manual live smoke (spawn the server, POST a finished state, read the row back), not
  the committed gate — `game/server.js` calls `.listen` at top level with no
  `require.main` guard and no env DB path, so an in-process test can't require it. Closing
  this cleanly needs a `require.main` guard + a `WOA_DB_PATH` override on `db.open()`.
- **The browser DOM → server POST** is not asserted end to end: `dev/smoke.js` stubs
  `window.fetch`, so `boot.js`'s recordskirmish hook fires against a fake, not a server.
- **LAN room sync** (`/api/create` / `join` / `push` / `poll`) has no integration test.
- **Only HQ capture** is driven through the integration gate; concession and attrition
  finishes have unit coverage but are not exercised through the wired persistence path.

## Value-pins that REMAIN by design

Not every literal is a bug. These red only on a **rules/strength** change, which bumps
`RULES_VERSION` (project doctrine) — the golden-diff is *meant* to catch them, so they
are version-gated guardrails, not AC1 violations:

- unit composition & stats (`7/2/1`, infantry `atk 1`, artillery `worth 3`) — `test.ai.js`
- AI anti-degeneracy weights (`noopPenalty`, `antiShuffle`) and the `hard` preset — `test.ai.js`
- classic board geometry (24 hexes, 4-5-6-5-4 rows) — the fixed physical board — `test.geometry.js`
- physical-piece stocks (terrain R2/R3, the 16-17 deck band, the 10-piece total) — enforced *limits*, tested as enforcement
- the active-mapset id (`core7`) — a structural pin, not a number — `test.ai.js`

## Related

[[code-architecture]] · [[workflow]]
