# War of Attrition

The domain language of War of Attrition — a two-player hex-and-card wargame, originally a physical board-game prototype, now a browser rig for rapid balance iteration on the way to a Steam roguelite deck-builder.

This file is a **glossary of concepts** — what each term *is*. It deliberately holds **no tunable values and no rules resolution**: unit stats, terrain bonuses, deck sizes, win thresholds, and combat outcomes all change as the game is balanced, so they live in exactly one place — the content, the code, and the rule book — never here. If a definition below would drift when you retune the game, it has been left out on purpose.

Each term carries a `_Home_:` pointer to the one `file:line` where the concept is **law** — defined, enforced, or (for not-yet-in-code concepts) documented. The pointers are machine-checked: `node dev/check-context.js` fails if any home has moved or any retired alias regressed. When you move the code a home points at, fix the pointer in the same commit.

## Match structure

**Skirmish**:
One fight on a single Map, played to a victor. The atomic unit of play and the thing every report logs.
_Avoid_: Round, match.
_Home_: `game/engine/04-skirmish.js:51` — `newSkirmish`

**Battle**:
A best-of contest across Skirmishes — first to a set number of Skirmish wins takes the Battle.
_Avoid_: Game, match, series.
_Home_: `game/engine/04-skirmish.js:235` — `wins[winner] >= I.CONFIG.skirmish.matchTarget`

**Campaign**:
The larger roguelite arc across Battles — the deck-building, Commander, progression layer. The nebulous destination, not yet in code.
_Avoid_: Run, meta, mode.
_Home_: none yet — Campaign layer, not in code.

**First mover**:
The side taking the first turn of a Skirmish. Named because a first-mover win-rate skew is a core balance signal.
_Home_: `game/engine/04-skirmish.js:24` — `firstPlayer`

**Red / Blue**:
The two sides. A side win-rate skew (independent of first mover) is a balance signal.
_Home_: `game/engine/01-core.js:211` — `other(p)`

## The board

**Map**:
One battlefield — a hex layout with terrain and the two HQ start positions.
_Avoid_: Board, level, battlefield, Map Card.
_Home_: `game/content/maps/causeway.js:3` — `"name"`

**Mapset**:
A named, curated list of Maps; exactly one is *active* at a time and is the draw pool for every play mode and tool. Distinct from the **map library** — the full set of content Maps (`E.MAPS`) the sets are drawn from.
_Avoid_: Map-set, map pool, roster (for the active set — the whole collection is the *map library*, the player's pieces are the *mats*).
_Home_: `game/engine/01-core.js:102` — `activeMaps`

**Hex**:
One cell of the board; a piece occupies at most one.
_Home_: `game/engine/02-board.js:11` — `key(q, r)`

**Control**:
The reach a side may Deploy adjacent to — extends by adjacency, and is stopped by a River.
_Home_: `game/engine/03-rules.js:44` — `deployTargets`

**Terrain**:
A board feature on a hex or its border. **Mountain** favors the defender attacked across it; **Forest** favors the attacker striking across it; **River** blocks Control and Support from crossing while letting movement and attacks through.
_Home_: `game/engine/02-board.js:211` — `buildTerrain`

## Pieces

**Unit**:
A mobile combat piece. Three roles: **Infantry** (the common line piece), **Cavalry** (the fragile hard-hitting striker), **Artillery** (the support piece).
_Avoid_: Token.
_Home_: `game/maps.js:37` — `"units"`

**HQ (Headquarters)**:
A side's home piece — lends Support to its neighbours and is the piece whose capture ends a Skirmish. Pieces may pass through its hex.
_Avoid_: Base.
_Home_: `game/engine/03-rules.js:11` — `isHQ`

**Trench**:
A structure that denies attacking Support across the edges it covers — and nothing else. Serves whichever side holds its hex.
_Avoid_: Fortification.
_Home_: `game/engine/03-rules.js:172` — `borderBlocked`

**Reserve**:
Pieces a side owns but has not placed. Deploying is one-way, and reserve pieces score nothing at Attrition.
_Home_: `game/engine/04-skirmish.js:132` — `copyReserves`

## Actions

**Deploy**:
Place a piece from Reserve onto the board within Control. Called **Build** for a structure.
_Avoid_: Summon, spawn.
_Home_: `game/engine/04-skirmish.js:464` — `'deploy'`

**Attack**:
Order one unit to strike an adjacent occupied hex, resolved by comparing combat power.
_Home_: `game/engine/03-rules.js:234` — `resolveAttack`

**Support**:
What adjacent allied pieces contribute to a combat — subject to Trench and River blocking.
_Home_: `game/engine/03-rules.js:184` — `supportFor`

**Reposition**:
Reposition a unit: **Move** it to an empty adjacent hex, or **Swap** it with an adjacent unit of a different type.
_Avoid_: using "Move" for the whole action — Move is one kind of Reposition.
_Home_: `game/engine/03-rules.js:118` — `listRepositions`

**Swap**:
The Reposition that exchanges two adjacent different-type units. Its share of all actions is a balance signal.
_Home_: `game/engine/03-rules.js:128` — `!== myType`

**Card**:
A one-shot order played from the hand and then spent. Any Card may instead be spent as a basic Attack or Reposition.
_Avoid_: Order (a Card *is* the order; "order an attack" is the verb).
_Home_: `game/engine/04-skirmish.js:301` — `playCard`

**Deck**:
A side's set of Cards for a Skirmish. The in-skirmish draw pile — stays "Deck" even once the build layer becomes the Battalion.
_Home_: `game/engine/04-skirmish.js:42` — `buildDeck`

**Battalion**:
The player-facing, curated set of Cards taken into a Battle — the roguelite successor to the raw dev Deck, built from the Card catalog. The build layer: the content kind (`content/battalions/*.js`), the editor screen, and the army-points budget are all Battalion. The in-skirmish draw pile it instantiates is still the Deck.
_Avoid_: using Deck for the player's build layer (Deck is the in-skirmish draw pile). A stray build-layer "deck" in code fails `dev/check-deck-scope.js`.
_Home_: `game/engine/01-core.js:74` — `ACTIVE_BATTALION`

**Card catalog**:
The full pool of Cards a Battalion may draw from — the owned collection, distinct from the in-run *draft* that picks from it between Battles.
_Avoid_: draft (the draft is the between-Battle pick, not the pool).
_Home_: none yet — catalog layer, arrives with the content model.

## Player surface & navigation

*(The running app's screens and the dev/player seam — see the UI partition.)*

**Front door**:
The Play-first entry screen a player meets: Play (New Campaign), Continue (only with a save), Settings. Replaces the old flat menu that mixed dev tools in.
_Avoid_: main menu (it is a front door onto a run, not a flat hub).
_Home_: `game/ui/screens.js:17` — `frontdoor:`

**Run flow**:
The sequence of player screens a campaign moves through between Battles — campaign → battle → rewards → run summary — each a registry slot, built or reserved as a stub.
_Home_: `game/ui/screens.js:19` — `campaign:`

**Dev mode**:
A `localStorage` flag, off by default, that reveals dev tooling; toggled by the `` ` `` hotkey or the Settings row. The single hardening seam — a player build never sets it, and every dev surface stays hidden.
_Home_: `game/ui/screens.js:41` — `devMode`

**Dev Hub**:
The screen that roofs the standalone dev tools (Battalion Editor, Maps & Map Editor, Balance Dashboard, Watch AI-vs-AI), reachable only in Dev mode.
_Home_: `game/ui/screens.js:25` — `devhub:`

## Endings & scoring

**HQ capture**:
Ending a Skirmish by successfully attacking into the enemy HQ.
_Home_: `game/engine/03-rules.js:315` — `'hq'`

**Attrition**:
The Skirmish ending reached when a side can no longer draw a Card; decided by Field score.
_Home_: `game/engine/04-skirmish.js:211` — `endByAttrition`

**Field score**:
The standing of a side at Attrition, from its surviving on-board units. Reserve counts nothing.
_Avoid_: VP, points, victory points.
_Home_: `game/engine/04-skirmish.js:205` — `fieldScore`

## Balance & measurement

*(The project's vocabulary for judging a build — concepts, not the numbers they currently sit at.)*

**Balance loop**:
The iterate cycle: run AI (and LLM) play over the active Mapset, fold the per-Skirmish results into aggregate metrics, grade them, adjust content, repeat.
_Home_: `docs/human-instructions/standard-runs-runbook.md:63` — `balance-loop recipe`

**Rules era**:
A regime of rules-plus-AI-strength treated as internally comparable; data across eras is not apples-to-apples.
_Avoid_: Version (reserve for the era's number).
_Home_: `game/engine/01-core.js:14` — `RULES_VERSION`

**Baselines to protect**:
The healthy metric values for the current era; a sharp move away signals a regression even when win rates look fine.
_Home_: `docs/balance/balance-baselines.md:1` — `figures to protect`

**Drag**:
Trailing kill-less turns before a Skirmish ends — the "circling without resolving" signal.
_Home_: `game/report-model.js:57` — `'drag'`

**Swings**:
Lead changes within a Skirmish — the "back-and-forth" signal.
_Home_: `game/report-model.js:59` — `'swings'`

**No-op**:
A played Card that resolved zero actions — a dead turn.
_Home_: `game/engine/04-skirmish.js:544` — `noop = true`

**Decision journal**:
The per-decision event stream on `st.journal` — at each card choice, one event per Card the deciding side holds: the played Card (outcome `played`, tagged with its play mode) and every other held Card (outcome `declined`). Each event carries turn, side, mode, and card id. Capture only, additive to the journal — no play-outcome path reads it, so a throwaway refactor diff stays byte-identical. It makes pass-rate and play-timing first-class; the `card_events` fact table consumes it.
_Avoid_: play log (that's the play-only subset — declines leave no play-log row).
_Home_: `game/engine/04-skirmish.js:108` — `decisionLog`

**Held Card**:
A Card passed every turn it sits in hand and never played. Invisible in the play-only log; now traceable as a (side, card) that has `declined` decision events but no `played` one.
_Home_: `dev/db.js:82` — `card_events` (a card with declined rows but no played row)

**Skirmish fact**:
The flat record of everything the balance layer reads off one finished Skirmish
— winner, win type, field scores, kill-tail, tiebreak, hexes held, reserves
left, action counts. Derived in exactly one place (the sim layer's `skirmishFacts`),
whether from a live end-state or a persisted row, so the live fold and the
stored-data fold can never disagree.
_Avoid_: battle fact, per-battle row (a row is the persisted form of the fact).
_Home_: `game/sim.js:76` — `skirmishFacts`

**Star schema**:
The shape of the balance store (`logs/woa.db`): a few FACT tables at skirmish / decision / turn grain, surrounded by DIMENSION tables they join to. Any new balance question is a join over dimensions already present, never a new table. Dimensions are upserted from loaded content at ingest and stamped with the (rules version, Config digest) slice key, so the DB is self-contained — a terrain- or card-intrinsic question is answered in SQL without reaching into the JS content files. The fold itself is SQL: each cited metric is a named view over the schema (see `docs/adr/0004-fold-moves-to-sql.md`).
_Avoid_: bolted-flat (the retired predecessor — one wide table per grain, dimensions inlined as repeated columns).
_Home_: `dev/db.js:60` — `SCHEMA`

**Fact table**:
A table at one measured grain: `skirmishes` (one row per Skirmish — the Skirmish fact plus both battalion refs and the slice key), `card_events` (one row per card decision — a Card event), `timeline` (one row per turn's field score). Facts point at the dimensions by id and carry the (version, digest) slice key.
_Home_: `dev/db.js:68` — `skirmishes`

**Dimension table**:
A slice-stamped lookup upserted from loaded content at ingest: `maps` (computed terrain features — mountain/forest/river hex counts, hex total, shape), `cards` (intrinsics — steps, points, derived kind, opener flags), `battalions` (identity + composition), `versions` (the slice key with the human-readable dials behind the digest).
_Home_: `dev/db.js:94` — `maps`

**Card event**:
One row of the `card_events` fact table — a single card decision (played / declined / held) carrying turn, side, mode, card ref, the Skirmish's map, and the (version, Config digest) slice key. Sourced from the Decision journal; never-played Cards leave rows, so pass-rate and play-timing join cleanly (and slice-correctly) against terrain and card intrinsics.
_Avoid_: card play row (that's the played-only subset; a Card event includes declines).
_Home_: `dev/db.js:82` — `card_events`

## Content iteration & army-points

*(The vocabulary for growing content without losing balance — concepts, not the weights they currently sit at.)*

**Army-points**:
A Card's *capability cost*, and a Battalion's total value as the sum over its Cards. A descriptive yardstick Battalions are built under — not a prediction of win-rate; measured balance always overrules it (ADR-0002). Computed additively from a Card's steps via a single weight table, never stored per Card, so a Card that does more counts for more.
_Avoid_: Cost (a step has a cost; the Card's total is its army-points), Power level.
_Home_: `game/engine/01-core.js:185` — `POINTS`

**Points cap**:
The shared army-points budget every Battalion is built under. Two Battalions at the same cap are "matched" in capability, which is what lets a Skirmish be asymmetric yet fair.
_Home_: `game/engine/01-core.js:208` — `BATTALION_POINTS_CAP`

**Game config**:
The single home for a rules-facing game-setting *dial* — a tunable that is neither content nor a bare literal (points cap, the weight table, piece stocks, trench count, the map hex ceiling — anything the engine enforces). One namespace object (`Engine.CONFIG`), made by the shared `defineConfigHome` helper, owns them; the flat exports alias into it; adding a dial is a one-place edit. Its UI-tier twin (`UI_CONFIG`, same helper) owns *genuinely* UI-only guardrails — the battalion size band, which the engine never checks. The governing rule: a game value lives in either content or config, never as a dangling magic number.
_Avoid_: Setting (too broad — this is the dials, not app state), Constant.
_Home_: `game/engine/00-config.js:39` — `I.CONFIG`

**Config digest**:
A deterministic fingerprint of a config home's live dial values — order-independent, value-driven, stable across runs and platforms, changing iff a value changes. It is the slice key that tells *which dials were in force* for a batch of games (the engine digest is stamped on each skirmish row) — rules version alone can't.
_Avoid_: Hash (say config digest; a hash is the mechanism, this is the identity it yields).
_Home_: `game/engine/00-config.js:23` — `configDigest`

**defineConfigHome**:
The one helper every config home is made by: attaches the non-enumerable `digest` getter (via the one digest util; no freeze — digest tests mutate a home) and returns the dials. Its getter is a single shared function, so the seam catches a home not made here by identity. Both `Engine.CONFIG` and `UI_CONFIG` use it.
_Avoid_: Config factory, home builder (say defineConfigHome).
_Home_: `game/engine/00-config.js:32` — `defineConfigHome`

**Config bug**:
The small, read-only screen-corner overlay that stamps the live config identity (rules version + both digests) onto every screenshot, so a shot of any run carries a retrievable record of the dials behind it. Display only — editing dials stays a code/data edit.
_Avoid_: Watermark, badge.
_Home_: `game/ui/boot.js:17` — `configBug`

**Tolerance temperature**:
How far a *measured* metric may sit outside its band before a result is accepted — the existing band-widening dial (strict / explore / hot). A verdict on outputs.
_Avoid_: bare "temperature" (say which one; the two are different concepts).
_Home_: `game/report-model.js:97` — `temperature`

**Exploration temperature**:
How large a *step* content iteration takes through design space — the willingness to try a structurally different but budget-legal candidate to escape a local optimum. An input to the search, realized chiefly *through* the points cap. Distinct from Tolerance temperature.
_Home_: none yet — search-layer concept, not in code.

**Mispricing residual**:
The gap between a Card's *measured* win-contribution and its *army-points* cost. A large gap flags an over- or under-priced Card — the anti-slop signal. Advisory only, because of the Timing blind spot.
_Home_: `game/report-model.js:251` — `r.resid`

**Timing blind spot**:
The balance scorer's known inability to value a Card whose worth is in *when* it is held or played (e.g. a saved attack buff). Such a Card can read as weak or mispriced without being either. Same class of gap as the AI eval not seeing reserve-hoarding.
_Home_: `docs/rubrics/card-rubric.md:26` — `Timing blind spot`

**AI personality**:
A named heuristic weight-set that gives the bot a *character* — a playstyle that is fun to beat and fun to lose to — rather than maximal strength. A personality is one row of data. Distinct from a Commander trait.
_Avoid_: Difficulty (a personality is a style, not a strength tier), Bot.
_Home_: `game/engine/05-ai.js:115` — `AI_PRESETS`

**Commander trait**:
A run-layer ability that *bends the rules* for a side (a guaranteed opening Card, altered stocks, a rules exception). Belongs to the Campaign layer, not yet in code. Distinct from an AI personality — a rule-bender, not a playstyle — though a Commander's theme may guide the personality of the AI that pilots it.
_Avoid_: Perk, buff.
_Home_: none yet — Campaign layer, not in code.
