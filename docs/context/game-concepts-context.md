# Game concepts

Would this be in the rule book? The fight itself, and everything two people playing on a table would have to agree on before they could finish a game.

This names things; it does not enumerate them. The cards, maps, battalions and commanders that exist are `ls content/`, and the numbers they currently sit at are the content and the config.

## The shape of a contest

**Skirmish**:
One fight on a single Map, played to a victor.
_Avoid_: Round, match.
_Home_: `game/engine/04-skirmish.js` — `newSkirmish`

**Battle**:
A best-of contest across Skirmishes.
_Avoid_: Game, match, series.
_Home_: `game/engine/04-skirmish.js` — `newBattle`

**Match target**:
The number of Skirmish wins that takes a Battle.
_Home_: `game/engine/00-config.js` — `matchTarget`

**Campaign**:
The roguelite arc across Battles, where deck-building and progression live.
_Avoid_: Run, meta, mode.
_Home_: none yet — Campaign layer, not in code.

**Muster**:
Choosing a Commander and a Battalion for a side before a Battle starts.
_Home_: `game/engine/01-core.js` — `resolveCommander`

**First mover**:
The side taking the first turn of a Skirmish.
_Home_: `game/engine/04-skirmish.js` — `firstPlayer`

**Red / Blue**:
The two sides.
_Home_: `game/engine/01-core.js` — `other(p)`

## The board

**Map**:
One battlefield: a hex layout with terrain and the two HQ start positions.
_Avoid_: Board, level, battlefield, Map Card.
_Home_: `game/content/maps/causeway.js` — `"name"`

**Mapset**:
A named list of Maps that one Skirmish's Map is drawn from.
_Avoid_: Map-set, map pool, roster.
_Home_: `game/engine/01-core.js` — `activeMaps`

**Map library**:
Every Map on disk, as distinct from the Mapset currently drawn from.
_Home_: `game/engine/01-core.js` — `MAPS`

**Hex**:
One cell of the board; a piece occupies at most one.
_Home_: `game/engine/02-board.js` — `key(q, r)`

**Board shape**:
The outline of hexes a Map is cut from, either a named family or an outline the Map carries itself.
_Home_: `game/engine/02-board.js` — `shapeDef`

**Terrain**:
A feature sitting on a hex or on one of its borders.
_Home_: `game/engine/board/terrain/terrain.js` — `defineTerrain`

**Mountain**:
The terrain that favours whoever is defending across it.
_Home_: `game/engine/board/terrain/mountain.js` — `mountain`

**Forest**:
The terrain that favours whoever is attacking across it.
_Home_: `game/engine/board/terrain/forest.js` — `forest`

**River**:
The border terrain that movement and attacks cross but Control does not.
_Home_: `game/engine/board/terrain/river.js` — `river`

**Directional terrain**:
That a border feature helps one side or the other depending on which way it is crossed.
_Home_: `docs/reference/engine-model.md` — `hex-owned and directional`

**Control**:
The reach within which a side may Deploy.
_Home_: `game/engine/03-rules.js` — `deployTargets`

**Skirmish hex**:
The hex holding the defending unit while a combat is resolved.
_Home_: `game/engine/03-rules.js` — `resolveAttack`

## Pieces

**Unit**:
A mobile combat piece.
_Avoid_: Token.
_Home_: `game/maps.js` — `"units"`

**Infantry**:
The common line Unit.
_Home_: `game/maps.js` — `"infantry"`

**Cavalry**:
The fragile, hard-hitting Unit.
_Home_: `game/maps.js` — `"cavalry"`

**Artillery**:
The supporting Unit.
_Home_: `game/maps.js` — `"artillery"`

**Unit-set**:
An authored stat block that replaces the default Units wholesale.
_Home_: `game/engine/01-core.js` — `content/units/*.js`

**Bounty**:
What the enemy scores for destroying a given Unit.
_Avoid_: worth (the field name), points.
_Home_: `game/engine/03-rules.js` — `I.UNITS[du.type].worth`

**Stock**:
How many pieces of a kind exist to be placed at all.
_Home_: `game/engine/board/terrain/terrain-config.js` — `pieces`

**Piece total**:
The fixed number of pieces a side's Units must sum to.
_Home_: `game/engine/00-config.js` — `pieceTotal`

**HQ (Headquarters)**:
A side's home piece, and the one whose capture ends a Skirmish.
_Avoid_: Base.
_Home_: `game/engine/03-rules.js` — `isHQ`

**Through-HQ**:
That a piece may cross an HQ hex without stopping on it.
_Home_: `game/engine/03-rules.js` — `isHQ`

**Trench**:
A structure covering hex edges, serving whichever side holds the hex.
_Avoid_: Fortification.
_Home_: `game/engine/board/terrain/trench.js` — `trench`

**Reserve**:
Pieces a side owns but has not placed.
_Home_: `game/engine/04-skirmish.js` — `copyReserves`

## Taking a turn

**Turn**:
One side's go: draw to hand, then play exactly one Card.
_Home_: `game/engine/04-skirmish.js` — `turnNumber`

**Flow phase**:
Which part of a turn is live — choosing a card, resolving a step, or the Skirmish being over.
_Home_: `game/engine/04-skirmish.js` — `'choose-card'`

**Hand**:
The Cards a side is holding and may choose between.
_Home_: `game/engine/04-skirmish.js` — `hands`

**Deck**:
A side's draw pile for one Skirmish.
_Home_: `game/engine/04-skirmish.js` — `buildDeck`

**Card**:
A one-shot order played from the hand and then spent.
_Avoid_: Order (a Card is the order; "order an attack" is the verb).
_Home_: `game/engine/04-skirmish.js` — `playCard`

**Step**:
One printed action inside a Card: the atom a Card resolves into and army-points are priced from.
_Home_: `game/engine/00-config.js` — `step:`

**Play mode**:
Whether a Card was played for its printed Steps or spent as a plain Attack or Reposition.
_Home_: `game/engine/04-skirmish.js` — `mode`

**Opener**:
A Card flagged to start in the opening hand, or barred from it.
_Home_: `game/engine/01-core.js` — `starting`

**Card pool**:
The one place every Card is defined; a Battalion references Cards out of it by id.
_Avoid_: Card catalog (the pool is the shipped name).
_Home_: `game/engine/01-core.js` — `byId`

**Battalion**:
The curated set of Cards a side takes into a Battle.
_Avoid_: using Deck for the build layer — a Deck is the in-Skirmish draw pile.
_Home_: `game/engine/01-core.js` — `ACTIVE_BATTALION`

**No-op**:
A played Card that resolved nothing.
_Home_: `game/engine/04-skirmish.js` — `noop = true`

**Step cap**:
The ceiling on Steps drained from one Card, so a turn always terminates.
_Home_: `game/engine/00-config.js` — `stepsPerTurn`

## Acting

**Deploy**:
Placing a piece from Reserve onto the board within Control.
_Avoid_: Summon, spawn.
_Home_: `game/engine/04-skirmish.js` — `'deploy'`

**Build**:
Deploy, for a structure rather than a Unit.
_Home_: `game/engine/04-skirmish.js` — `'trench'`

**Attack**:
Ordering one Unit to strike an adjacent occupied hex.
_Home_: `game/engine/03-rules.js` — `resolveAttack`

**Support**:
What adjacent allied pieces contribute to a combat.
_Home_: `game/engine/03-rules.js` — `supportFor`

**Barrage**:
A strike that clears a terrain or trench piece rather than a Unit.
_Home_: `game/engine/04-skirmish.js` — `'barrage'`

**Reposition**:
Moving a Unit to an empty adjacent hex, or Swapping it with an adjacent one.
_Avoid_: using "Move" for the whole action — Move is one kind of Reposition.
_Home_: `game/engine/03-rules.js` — `listRepositions`

**Swap**:
The Reposition that exchanges two adjacent Units of different types.
_Home_: `game/engine/03-rules.js` — `!== myType`

## Ending it

**HQ capture**:
Ending a Skirmish by attacking successfully into the enemy HQ.
_Home_: `game/engine/03-rules.js` — `'hq'`

**Attrition**:
The ending reached when a side can no longer draw a Card.
_Home_: `game/engine/04-skirmish.js` — `endByAttrition`

**Field score**:
A side's standing at Attrition, from its surviving on-board Units.
_Avoid_: VP, points, victory points.
_Home_: `game/engine/04-skirmish.js` — `fieldScore`

**Tiebreak**:
How an Attrition ending is settled when Field scores are level.
_Home_: `game/engine/04-skirmish.js` — `endByAttrition`

**Concession**:
A side giving up, ending the Skirmish without a capture or a score.
_Home_: `game/engine/04-skirmish.js` — `function concede`

## Commanders

**Commander**:
A pick a side makes before mustering that bends its rules.
_Home_: `game/engine/01-core.js` — `resolveCommander`

**Commander trait**:
One ability a Commander carries, either a strength or a weakness.
_Avoid_: Perk, buff.
_Home_: `game/content/commanders/fortress.js` — `traits`

**Effect primitive**:
The fixed, source-agnostic vocabulary a trait compiles down to.
_Avoid_: Effect (too broad), rule-bender (that is the trait).
_Home_: `game/engine/03a-commander-effects.js` — `commanderCombat`

## Budget

**Army-points**:
A Card's capability cost, and a Battalion's total as the sum over its Cards.
_Avoid_: Cost (a Step has a cost; the Card's total is its army-points), Power level.
_Home_: `game/engine/00-config.js` — `points`

**Points cap**:
The shared army-points budget every Battalion is built under.
_Home_: `game/engine/00-config.js` — `pointsCap`

**Game config**:
The single home for a rules-facing dial that is neither content nor a bare literal.
_Avoid_: Setting (too broad), Constant.
_Home_: `game/engine/00-config.js` — `I.CONFIG`

## Where the rules are written

**Rule book**:
The written rules of the physical game this descends from.
_Home_: `docs/War Of Attrition rule book.md` — `# War of Attrition`

**House rule**:
A ruling made where the rule book was silent.
_Home_: `game/README.md` — `House rule`
