# Unit

Infantry, cavalry, artillery — the pieces a side owns and spends.

| | |
| --- | --- |
| what a type is | `infantry.js`, `cavalry.js`, `artillery.js` |
| what they share | `unit.js` |
| every tunable number | `unit-config.js`, over `maps.js`'s `"units"` block |
| what the AI pays for one | `AI_WEIGHTS.unitValue`, installed by `unit-config.js` |
| tests | `unit.test.js` |
| how a type is drawn | `game/ui/unit/` — one `*-mark.js` per type, and its own `unit-marks.test.js` |
| how big a token is drawn | `game/ui/unit/unit-config.js` |
| how the token behaves as an element | `game/ui/unit/unit.css` |

## Adding a type

1. A row in `maps.js`'s `"units"` block — `name`, `atk`, `def`, `sup`, `worth`, `count`.
2. Its two dials in `unit-config.js` — a `deployCost` row and an `AI_WEIGHTS.unitValue`
   price — or accept the fallbacks: no deploy surcharge, and the bounty + 2.
3. A file here, calling `defineUnit`.
4. A file in `game/ui/unit/`, calling `defineUnitMark`.
5. Both script paths in `game/load-order.js`.

The counts must still total `CONFIG.pieceTotal`, so a new type takes its pieces
from an existing one. `unit.test.js` does exactly this with a fourth type and
checks it comes out live everywhere. If you need more than these steps, that
test will fail and the missing seam is the bug.

## Retuning

Every rules number a unit answers with is one row of `Engine.CONFIG.unit`, read
live — change it and the next fight uses it, no reload of anything but the page.
The first six of a row come from `maps.js`; an active `content/units/*.js` variant
replaces that block wholly, which is how a whole alternative army is playtested
(`node dev/balance-report.js 20 hard hard --once --units shock-army`). The row
is inside `CONFIG.digest`, so a retuned run slices apart from an old one in the
database. What the AI pays for a piece is deliberately outside that digest —
sweeping it is AI tuning, not a rules change, and must not make new runs
incomparable with old ones.

The stat block and the rooms have to agree, and the disagreement is checked both
ways at load. A row naming a type with no room **throws** — its pieces would be
counted by no rule and drawn by nothing. A room whose type the block does not
carry **stands down**: dropping a type is something a variant is allowed to do,
and if the drop was a typo the total-pieces guardrail catches it.
