# Unit

Infantry, cavalry, artillery — the pieces a side owns and spends.

| | |
| --- | --- |
| what a type is | `infantry.js`, `cavalry.js`, `artillery.js` |
| what they share, and where the pieces are | `unit.js` |
| the numbers | `game/content/units/<slug>.js` — one file active, it IS the army |
| the door between that content and the engine | `unit-config.js` |
| tests | `unit.test.js` |
| how a type is drawn | `game/ui/board/unit/` — one `*-mark.js` per type, and `unit-marks.test.js` |
| every drawn size | `game/ui/board/unit/unit-config.js` |
| the token's motion | `game/ui/board/unit/unit.css` |

## Adding a type

1. A row in the active `content/units/*.js` — `name`, `atk`, `def`, `sup`,
   `worth`, `count`, `deployCost`. Counts must still total
   `Engine.CONFIG.pieceTotal`, so the new type takes its pieces from another.
2. A file here, calling `defineUnit`.
3. A file in `game/ui/board/unit/`, calling `defineUnitMark`.
4. Both script paths in `game/load-order.js`.

Nothing else. `unit.test.js` does exactly this with a fourth type and checks it
comes out live in combat, in the AI, in the reserve, on the board and on the mat;
if you need a fifth step, that test fails and the missing seam is the bug. What
the AI pays for a piece is derived (its bounty plus `AI_WEIGHTS.unitValueBase`),
so there is no price to add.

## Trying a whole other army

Copy `content/units/default.js`, edit it, flip `active`. Or leave it inert and
run `node dev/balance-report.js 20 hard hard --once --units <id>`.

The set and the rooms must agree, and both directions throw at load: a row with
no room is a piece nothing could draw; a room with no row stands down, because
dropping a type is something a set may do.
