# The terrain house

Mountain, forest, river and trench. `terrain.js` is the base; every other file
here is one type. To learn how a terrain works, open its file — that file holds
every answer it gives.

## What a room declares

A terrain type is a **hex-owned directional side**. Every type answers the same
five questions and no type answers any other:

| question | meaning |
| --- | --- |
| `attack` | power added when this hex's occupant attacks **out** across the side |
| `defense` | power added when this hex is attacked **across** the side |
| `blocksSupport` | denies **attacker** support across the border |
| `blocksDeploy` | denies deploy-control extension across the border |
| `barrageable` | the naval guns may remove it |

Plus the physical model, which is the base's and identical for all of them: 2–3
contiguous sides inside one hex (`PIECE_LENGTHS`, `pieceProblem`,
`splitPieceRun`), a per-length stock cap (`stockCap`), a stroke colour and a
glyph ink.

`attack` and `defense` are functions so a room reads its dial
(`Engine.CONFIG.combat.terrain.<letter>`) at call time; a type that swings no
power returns 0 and has no config row.

## Adding a fifth type

Write one file here, `defineTerrain({...})` in it, and add it to
`game/load-order.js`. It is then live in combat, support, deploy, barrage, the
map editor's paint cycle, stock panel and instructions, the commander terrain
gate, the dashboard's cross-cut buckets, and the `dev/db.js` maps dimension
(whose table gains a column on the next open) — none of which name a terrain
type.

Three things are not derived and are the new room's own:

- `Engine.CONFIG.terrainStock` rows (`<letter>2` / `<letter>3`) — without them
  the type has no physical piece of any size, so `validateMaps` rejects every
  map using it.
- a `combat.terrain` row, if it swings attack or defence power.
- a glyph in `BP_TERRAIN_GLYPH` (`game/ui/board-primitives.js`), if it draws a
  mark on its side rather than a bare stroke.

## Storage is deliberately not unified

A trench is a true sibling on the combat and support axis and a non-sibling on
storage. Authored map terrain lives in `st.board.terrainEdges` keyed by
`sideKey`; a trench is placed at runtime from a per-side reserve and lives in
`st.pieces.trenches`. A room declares which it uses (`storage`) and the base
dispatches in `terrainAt`. Collapsing the two would break `barrage` and
`edgeFreeForTrench`.

Two trench rules key on the **fight** rather than the border — a trenched
defending border spares the defender on a tie, and stops a tie capturing a
trenched HQ — so they live with combat in `game/engine/03-rules.js`.

## Not the same abstraction as commander effect primitives

`game/engine/03a-commander-effects.js` is a **sibling**, not this house. A
terrain type is a thing that sits on a side and answers a fixed five questions.
An effect primitive (`combatMod`, `drawMod`) is a verb some *source* grants,
and the vocabulary is deliberately source-agnostic. Terrain is one such source:
a commander trait gates on terrain by name and the house answers
(`terrainNamed`).

A map point-of-interest granting a combat effect from a hex is an effect
primitive with a new source, not a terrain room — it is held, not crossed, and
would answer none of the five questions.
