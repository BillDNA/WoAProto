# Unit

Infantry, cavalry, artillery — the pieces a side owns and spends.

| | |
| --- | --- |
| what a type is | `infantry.js`, `cavalry.js`, `artillery.js` |
| what they share | `unit.js` |
| every tunable number | `unit-config.js`, over `maps.js`'s `"units"` block |
| tests | `unit.test.js` |
| how a type is drawn | `game/ui/unit/` — one `*-mark.js` per type, and its own `unit-marks.test.js` |
| how big a token is drawn | `game/ui/unit/unit-config.js` |
| how the token behaves as an element | `game/ui/unit/unit.css` |

## Adding a type

1. A row in `maps.js`'s `"units"` block — `name`, `atk`, `def`, `sup`, `worth`, `count`.
2. A dial pair in `unit-config.js` (`aiValue`, `deployCost`), or accept the fallbacks:
   the bounty + 2, and no deploy surcharge.
3. A file here, calling `defineUnit`.
4. A file in `game/ui/unit/`, calling `defineUnitMark`.
5. Both script paths in `game/load-order.js`.

The counts must still total `CONFIG.pieceTotal`, so a new type takes its pieces
from an existing one. `unit.test.js` does exactly this with a fourth type and
checks it comes out live everywhere. If you need more than these steps, that
test will fail and the missing seam is the bug.

## Retuning

Every number a unit answers with is one row of `Engine.CONFIG.unit`, read live —
change it and the next fight uses it, no reload of anything but the page. The
first six of a row come from `maps.js`; an active `content/units/*.js` variant
replaces that block wholly, which is how a whole alternative army is playtested
(`node dev/balance-report.js 20 hard hard --once --units shock-army`). The row
is inside `CONFIG.digest`, so a retuned run slices apart from an old one in the
database.

A variant may only restat the types that have rooms here: a stat block naming a
type with no room fails at load rather than shipping a piece nothing can draw.
