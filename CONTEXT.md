# War of Attrition

The domain language of War of Attrition — a two-player hex-and-card wargame, originally a physical board-game prototype, now a browser rig for rapid balance iteration on the way to a Steam roguelite deck-builder.

This file is a **glossary of concepts** — what each term *is*. It deliberately holds **no tunable values and no rules resolution**: unit stats, terrain bonuses, deck sizes, win thresholds, and combat outcomes all change as the game is balanced, so they live in exactly one place — the content, the code, and the rule book — never here. If a definition below would drift when you retune the game, it has been left out on purpose.

## Match structure

**Skirmish**:
One fight on a single Map, played to a victor. The atomic unit of play and the thing every report logs.
_Avoid_: Round, match.

**Battle**:
A best-of contest across Skirmishes — first to a set number of Skirmish wins takes the Battle.
_Avoid_: Game, match, series.

**Campaign**:
The larger roguelite arc across Battles — the deck-building, Commander, progression layer. The nebulous destination, not yet in code.
_Avoid_: Run, meta, mode.

**First mover**:
The side taking the first turn of a Skirmish. Named because a first-mover win-rate skew is a core balance signal.

**Red / Blue**:
The two sides. A side win-rate skew (independent of first mover) is a balance signal.

## The board

**Map**:
One battlefield — a hex layout with terrain and the two HQ start positions.
_Avoid_: Board, level, battlefield, Map Card.

**Mapset**:
A named roster of Maps; exactly one is *active* at a time and is the draw pool for every play mode and tool.
_Avoid_: Map-set, map pool, roster.

**Hex**:
One cell of the board; a piece occupies at most one.

**Control**:
The reach a side may Deploy adjacent to — extends by adjacency, and is stopped by a River.

**Terrain**:
A board feature on a hex or its border. **Mountain** favors the defender attacked across it; **Forest** favors the attacker striking across it; **River** blocks Control and Support from crossing while letting movement and attacks through.

## Pieces

**Unit**:
A mobile combat piece. Three roles: **Infantry** (the common line piece), **Cavalry** (the fragile hard-hitting striker), **Artillery** (the support piece).
_Avoid_: Token.

**HQ (Headquarters)**:
A side's home piece — lends Support to its neighbours and is the piece whose capture ends a Skirmish. Pieces may pass through its hex.
_Avoid_: Base.

**Trench**:
A structure that denies attacking Support across the edges it covers — and nothing else. Serves whichever side holds its hex.
_Avoid_: Fortification.

**Reserve**:
Pieces a side owns but has not placed. Deploying is one-way, and reserve pieces score nothing at Attrition.

## Actions

**Deploy**:
Place a piece from Reserve onto the board within Control. Called **Build** for a structure.
_Avoid_: Summon, spawn.

**Attack**:
Order one unit to strike an adjacent occupied hex, resolved by comparing combat power.

**Support**:
What adjacent allied pieces contribute to a combat — subject to Trench and River blocking.

**Reposition**:
Reposition a unit: **Move** it to an empty adjacent hex, or **Swap** it with an adjacent unit of a different type.
_Avoid_: using "Move" for the whole action — Move is one kind of Reposition.

**Swap**:
The Reposition that exchanges two adjacent different-type units. Its share of all actions is a balance signal.

**Card**:
A one-shot order played from the hand and then spent. Any Card may instead be spent as a basic Attack or Reposition.
_Avoid_: Order (a Card *is* the order; "order an attack" is the verb).

**Deck**:
A side's set of Cards for a Skirmish.

## Endings & scoring

**HQ capture**:
Ending a Skirmish by successfully attacking into the enemy HQ.

**Attrition**:
The Skirmish ending reached when a side can no longer draw a Card; decided by Field score.

**Field score**:
The standing of a side at Attrition, from its surviving on-board units. Reserve counts nothing.
_Avoid_: VP, points, victory points.

## Balance & measurement

*(The project's vocabulary for judging a build — concepts, not the numbers they currently sit at.)*

**Balance loop**:
The iterate cycle: run AI (and LLM) play over the active Mapset, fold the per-Skirmish results into aggregate metrics, grade them, adjust content, repeat.

**Rules era**:
A regime of rules-plus-AI-strength treated as internally comparable; data across eras is not apples-to-apples.
_Avoid_: Version (reserve for the era's number).

**Baselines to protect**:
The healthy metric values for the current era; a sharp move away signals a regression even when win rates look fine.

**Drag**:
Trailing kill-less turns before a Skirmish ends — the "circling without resolving" signal.

**Swings**:
Lead changes within a Skirmish — the "back-and-forth" signal.

**No-op**:
A played Card that resolved zero actions — a dead turn.
