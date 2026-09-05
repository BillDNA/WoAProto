#claude-orientation #testing
# Hand-off seams & the real-path gates

A **seam** is where one piece hands real data to the next: a producer writes/emits/
serializes, a consumer reads/parses/deserializes, and the contract between them can
silently drift. The seam tests cover those hand-offs — tests that drive **real data
across the actual boundary**, nothing mocked, so a red means the wiring broke. This
doc carries the running inventory; treat it as a backlog, never a certificate.

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
- `game/test/test.integration.js` — a real HQ-capture skirmish through the public engine API
  fires the `onSkirmishEnd` persistence subscription; an `__sim` clone does not; the
  delivered state lands a row through the real `dev/db.js`. Unwire proof: neuter the
  `if (!st.__sim) HOOKS.onSkirmishEnd…` dispatch in `engine/04-skirmish.js` → it reds.
- `game/test/test.seams.js` — the army-points cap as a settable, enforced limit (mechanism,
  not value).

- `dev/content-api.test.js` — drives the content-write routes over real HTTP against
  a **throwaway content dir** (`WOA_CONTENT_DIR`, copied from the real one), so the
  file-write → manifest-regen hand-off runs for real without touching committed content.
- `dev/db.test.js` — adds `factsFromRow ≡ skirmishFacts`: the live-state fold and the
  db-row fold of the same skirmish must be field-for-field equal.
- `dev/balance-parallel.test.js` — runs `balance-report.js` as a real subprocess
  (temp db) so the worker-string → parent-parse → insert pipe is driven; also pins
  that the sweep is **parallel by default** (no flag spawns workers) and byte-identical
  to `--serial` in both report and db rows.
- `dev/boot.test.js` — jsdom boots the real page: E3 (localStorage battalion override →
  ACTIVE_BATTALION) and F2 (a maps-bundle file → the lenient import parser → E.MAPS).

Only **G2** (AI hidden-hand resample honesty) is left open, and it is blocked on a
production design call (canonicalising the resample pool), not on test effort.

To make the server + pipeline driveable, small production changes (no behaviour change):
`game/server.js` guards its `.listen` behind `require.main`, exports
`listen`/`handler`/`ROUTES`/`recordSkirmish`, and `.unref`s its cleanup interval;
`dev/db.js` `open()` honours `WOA_DB_PATH`; `game/server.js` + `content/manifest-gen.js`
honour `WOA_CONTENT_DIR`.

## Seam inventory — coverage status

`REAL` = a test drives real data across the boundary. `NONE`/`MOCKED`/`ONE-SIDED` =
gap. Least-covered, most-load-bearing first.

| Seam | Boundary | Status |
|------|----------|--------|
| A1/A2 finished skirmish → `/api/recordskirmish` → db row | boot.js hook → server → dev/db.js | **REAL** — `server.test.js` (+ `test.integration.js` for the engine hook) |
| B1/B2/B3 db rows → `/api/runs`+`/api/skirmishes` (timeline join) → `envelopeFromRow` | dev/db.js → server → report-model | **REAL** — `server.test.js` feeds the real row into `envelopeFromRow` |
| D1/D2/D3 LAN create/join/push/poll + seq-conflict | ui/net.js → server rooms | **REAL** (server side) — `server.test.js`; browser producers still DOM-only |
| A6/A7 savereport/savedebug path-injection fences | server `saveUnderRepo` | **REAL** (reject side) — `server.test.js` |
| A3/A8 savemap/deletemap → content file → manifest | server → content/ → manifest-gen | **REAL** — `content-api.test.js` (temp content dir) |
| A4 savebattalion → custom-battalion.js | server → game/custom-battalion.js | **REAL** — `content-api.test.js` (snapshot+restore) |
| A5 savemapsets → destructive dir rewrite | server → content/mapsets/ | **REAL** — `content-api.test.js` (sandbox) |
| H1 `factsFromRow` ≡ `skirmishFacts` | engine live fold ↔ db-row fold | **REAL** — `db.test.js` |
| C1 `--parallel` worker slim-state → parent → db; parallel-by-default ≡ `--serial` | balance-report worker string → parent | **REAL** — `balance-parallel.test.js` (real subprocess, temp db) |
| E3 index.html battalion bootstrap → ACTIVE_BATTALION | inline bootstrap → engine snapshot | **REAL** — `boot.test.js` (jsdom, localStorage seeded) |
| F1 map.shapeDef → `@id` shape → board (LAN join/resume) | engine ↔ battle.maps serialization | **REAL** — `test.maps.js` (carved-shapeDef round-trip) |
| F2 map/battalion bundle import parser | boot.js import → libraryReplace | **REAL** — `boot.test.js` (jsdom, real onchange + File) |
| G2 AI hidden-hand resample honesty | engine sampledReplyScore | **NONE** — a clean invariant is blocked: the resample shuffles `battalions[opp].concat(hands[opp])`, and Fisher-Yates is sensitive to input order (which encodes the split), so "permute the split → same plan" reds on honest code. The honest fix (canonicalise the pool before shuffling) changes AI output → RULES_VERSION bump. Tracked, not shipped. |
| G1 stateView LLM honesty | claude-plays → prompt | **REAL** — `claude-plays.test.js` sentinel |
| H2 BANDS/balanceScore, H4 playLog→card_plays/trace | report-model / db | **REAL** — `test.reports.js`, `db.test.js` |
| E2 manifest-gen ↔ committed manifest | content dirs → manifest.js | **REAL** — `test.maps.js` staleness test |

## AC1 — mechanism, not value

Content-value pins were removed across the suite: battalion total / card points
(`test.cards.js`), map count (`test.maps.js`), the default + shock-army unit
composition/stats (`test.ai.js`), and every **absolute combat power** in
`engine/board/terrain/terrain.test.js` (`combat math`, `terrain attack table`, `multiple trenches`,
`terrain-crossing`) — those now read the live stats (`E.UNITS.*`) and assert deltas
(support adds the supporter's `sup`; terrain/HQ/card mod are flat `+1` rules
constants). Verified: mutating infantry `sup` or artillery `sup` in `maps.js` reds
**zero** tests; mutating `atk`/`def` reds only the outcome tests below.

**The residual coupling is deliberate, not a value-pin.** A handful of tests assert
combat *outcomes* — `trench tie` and `noAdvance attacks` — which depend on
a stat **relationship**, not an absolute value: a *tie* is defined by equal power
(`atk === def`), a *kill* by higher power (`cav.atk > inf.def`). Changing `atk`/`def`
so the relationship inverts removes the very phenomenon (the tie, the clean kill) the
test exercises, so those tests legitimately red — that is the rules-relationship
guardrail, distinct from pinning `attackerPower === 3`. AI-weight pins in `test.ai.js`
(`noopPenalty`, the `hard` preset) are the same shape: they guard anti-degeneracy
defaults and red only on a deliberate AI-strength change (which bumps RULES_VERSION).

## Related

[[code-architecture]] · [[workflow]]
