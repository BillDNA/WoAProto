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
One battlefield — a hex layout with terrain and the two HQ start positions. Drawn from the active **Mapset** ([game](docs/context/game.md)).
_Avoid_: Board, level, battlefield, Map Card.

**Card**:
A one-shot order played from the hand and then spent; any Card may instead be spent as a basic Attack or Reposition. Defined once in the **Catalog** ([game](docs/context/game.md)), priced in **army-points** ([balance](docs/context/balance.md)), rendered by the one card face ([ui](docs/context/ui.md)).
_Avoid_: Order (a Card *is* the order; "order an attack" is the verb).

**Deck**:
A side's set of Cards for a Skirmish. Stored as refs (`{id, count, starting?}`) into the Catalog — a Deck names cards, it does not define them. Built under a shared army-points **Points cap** ([balance](docs/context/balance.md)).

## Category files

| Concern | File | Covers |
| --- | --- | --- |
| **Game** | [`docs/context/game.md`](docs/context/game.md) | the board, pieces, actions, endings, scoring, sides & AI — how the game plays |
| **UI** | [`docs/context/ui.md`](docs/context/ui.md) | rendering primitives, the card face, screens |
| **Engine** | [`docs/context/engine.md`](docs/context/engine.md) | rules version, traces, `balanceMap`, the golden-diff, determinism |
| **Test** | [`docs/context/test.md`](docs/context/test.md) | invariant vs pin, the test-writer, falsifiers, the smoke gate |
| **Balance** | [`docs/context/balance.md`](docs/context/balance.md) | metrics, the balance loop, army-points, tolerances, feels |
