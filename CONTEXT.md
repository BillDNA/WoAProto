# War of Attrition — context map

The domain language of War of Attrition — a two-player hex-and-card wargame, originally a physical board-game prototype, now a browser rig for rapid balance iteration on the way to a Steam roguelite deck-builder.

This root file is the **map**, read for alignment. It holds two things and nothing else:

1. **Cross-cutting anchors** — the handful of terms that surface across every concern (a **Skirmish** is a game concept *and* an engine row *and* a test fixture *and* the atom the balance layer folds). Each anchor is defined **once, here**; the concern files elaborate its facets without redefining it.
2. **Category files** — the full vocabulary, split by concern under `docs/context/` and disclosed when you work that area.

Like every glossary here it holds **no tunable values and no rules resolution**: unit stats, terrain bonuses, deck sizes, win thresholds, and combat outcomes change as the game is balanced, so they live in the content, the code, the rule book, and `docs/balance-baselines.md` — never here. One term, one canonical home; if a definition would drift when you retune the game, it has been left out on purpose.

## Cross-cutting anchors

*(The big ones — defined once here, faceted in the concern files.)*

**Skirmish**:
One fight on a single Map, played to a victor. The atomic unit of play and the thing every report logs. Its persisted per-fight record is the **Skirmish fact** ([balance](docs/context/balance.md)).
_Avoid_: Round, match.

**Battle**:
A best-of contest across Skirmishes — first to a set number of Skirmish wins takes the Battle.
_Avoid_: Game, match, series.

**Campaign**:
The larger roguelite arc across Battles — the deck-building, Commander, progression layer. The nebulous destination, not yet in code.
_Avoid_: Run, meta, mode.

**Map**:
One battlefield — a hex layout with terrain and the two HQ start positions. Drawn from the active **Mapset**.
_Avoid_: Board, level, battlefield, Map Card.

**Card**:
A one-shot order played from the hand and then spent; any Card may instead be spent as a basic Attack or Reposition. Defined once in the **Catalog**, priced in **army-points** ([balance](docs/context/balance.md)), rendered by the one card face ([ui](docs/context/ui.md)).
_Avoid_: Order (a Card *is* the order; "order an attack" is the verb).

**Deck**:
A side's set of Cards for a Skirmish. Stored as refs (`{id, count, starting?}`) into the Catalog — a Deck names cards, it does not define them. Built under a shared army-points **Points cap** ([balance](docs/context/balance.md)).

## Category files

| Concern | File | Covers |
| --- | --- | --- |
| **Game** | [`docs/context/game.md`](docs/context/game.md) | pieces, actions, terrain, endings, scoring — how the game plays *(carve pending)* |
| **UI** | [`docs/context/ui.md`](docs/context/ui.md) | rendering primitives, the card face, screens *(carve pending)* |
| **Engine** | [`docs/context/engine.md`](docs/context/engine.md) | rules version, traces, `balanceMap`, the golden-diff, determinism *(carve pending)* |
| **Test** | [`docs/context/test.md`](docs/context/test.md) | invariant vs pin, the test-writer, falsifiers, the smoke gate *(carve pending)* |
| **Balance** | [`docs/context/balance.md`](docs/context/balance.md) | metrics, the balance loop, army-points, tolerances, feels — **carved** |

---

*The vocabulary below is still inline, **pending carve to `docs/context/game.md`**. It is the game-domain glossary minus the anchors above (which have graduated to the map). Left here so no term loses its home mid-migration.*

## The board

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

**Catalog**:
The single definition site for every Card (`game/content/cards/`, one file per card). A Card is defined once, in the Catalog; Decks, the draft pool, tournaments, and the deck editor all resolve cards from it by id. The Catalog is wider than any one Deck — a card can exist to be drafted before it ships in a playable Deck.
_Avoid_: "card database" / "card pool" for the definition site (the **pool** is a Catalog-derived draft view, not a second store).

## Endings & scoring

**First mover**:
The side taking the first turn of a Skirmish. Named because a first-mover win-rate skew is a core balance signal.

**Red / Blue**:
The two sides. A side win-rate skew (independent of first mover) is a balance signal.

**HQ capture**:
Ending a Skirmish by successfully attacking into the enemy HQ.

**Attrition**:
The Skirmish ending reached when a side can no longer draw a Card; decided by Field score.

**Field score**:
The standing of a side at Attrition, from its surviving on-board units. Reserve counts nothing.
_Avoid_: VP, points, victory points.

## Sides & AI

**AI personality**:
A named heuristic weight-set that gives the bot a *character* — a playstyle that is fun to beat and fun to lose to — rather than maximal strength. A personality is one row of data. Distinct from a Commander trait. "Fun to play against" is two tests it must pass, graded in `docs/rubrics/personality-rubric.md`: **Stronghold** — is it a distinct, in-theme character? — and **Punch-Out** — is it a legible, learnable puzzle you can read and beat on purpose?
_Avoid_: Difficulty (a personality is a style, not a strength tier), Bot.

**Commander trait**:
A run-layer ability that *bends the rules* for a side (a guaranteed opening Card, altered stocks, a rules exception). Belongs to the Campaign layer, not yet in code. Distinct from an AI personality — a rule-bender, not a playstyle — though a Commander's theme may guide the personality of the AI that pilots it.
_Avoid_: Perk, buff.
