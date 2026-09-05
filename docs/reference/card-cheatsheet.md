#game-rules #human-instructions #code-architecture
# Card editing cheat sheet

Cards live once in a shared **pool**, one file per card:
`game/content/cards/<id>.js`. A **battalion** (`game/content/battalions/<slug>.js`)
references pool cards by id and sets each **count** — only `count` is
battalion-scoped; every other card property lives on the pool card (one
implementation per fact, mirroring how a mapset references maps). The Battalion
Editor's applied override is `game/custom-battalion.js`. Both card files and
battalion files are **pure JSON** inside the wrapper: double-quoted keys, no
trailing commas, no comments inside the data. Edit, save, refresh the browser.
Then:

```
node game/test/test.js      # validates the deck; points at exactly what's wrong
node dev/balance.js   # shows what your change did to win rates + the card report
```

## Pool-card fields (`content/cards/<id>.js`)

| Field      | Type   | What it does |
|------------|--------|--------------|
| `id`       | string | Unique handle across the whole pool. Used for art lookup (`game/art/<id>.jpg` or `.png`), the AI's burn priorities, the play metrics, and the battalion `cardId` reference. |
| `name`     | string | Shown on the card banner, in the journal ("Red plays …"), and the glossary. |
| `faction`  | null   | Reserved stub for future faction/commander gating — `null` today, the engine ignores it. |
| `text`     | string | Card body and glossary entry. Cosmetic only — the engine never reads it, so keep it honest when you change `steps`. |
| `starting` | bool   | `true` on an opener card: it is guaranteed in each player's opening hand (drawn as 1 + 3 random). A battalion must contain **exactly one** starting card. |
| `noOpener` | bool   | `true` = never dealt into the opening hand (what makes Airdrop an airdrop). |
| `steps`    | array  | The printed action, resolved in order. Each entry is `{ "type": ..., ...options }` — see below. |

## Battalion reference (`content/battalions/<slug>.js`)

A battalion is `{ id, name, active?, cards: [ { cardId, count }, … ] }`.

| Field    | Type   | What it does |
|----------|--------|--------------|
| `cardId` | string | The pool card's `id`. |
| `count`  | number | Copies of that card in the deck. **The sum of all counts is the deck size = total plays per skirmish** (the physical game is 16; the band is 16–17). The only battalion-scoped field. |

### Notes

- Renaming a pool `id` is safe, but you lose its art file link and its entry in
  the AI's `CARD_KEEP` table (engine/05-ai.js) until you update those too — and every
  battalion `cardId` that referenced it.

## Step types and their options

Steps resolve top to bottom. The player may **skip any step**; steps that are
impossible (no legal target) skip themselves. If a whole play resolves zero
actions, the journal says so and it's logged as a **no-op** in the card data
(the printed report dropped its Skip% column once the no-skip rule pinned it
near zero).

### `deploy` — place a unit from reserve

```json
{ "type": "deploy", "unit": "infantry" }
{ "type": "deploy", "unit": "cavalry",  "anywhere": true }
```
- `unit` (required): any type the unit house registers (`game/engine/unit/`).
- `anywhere: true`: any EMPTY hex on the board (this is what makes Airdrop an airdrop). Default: empty hex adjacent to a hex you control.
- Needs that unit in reserve, otherwise the step auto-skips.

### `trench` — dig a trench

```json
{ "type": "trench" }
```
- No options. Player picks a controlled hex, then two contiguous edges that
  don't overlap existing trenches or that hex's own terrain.
- Needs a trench in reserve (`"trenchCount"` per player, top of the file).
- What a trench DOES: enemy attacking support may not cross
  its covered edges. No defense bonus, no effect on the attack itself or on
  the defender's support; ownership irrelevant.

### `attack` — order one attack

```json
{ "type": "attack" }
{ "type": "attack", "mod": 1 }
{ "type": "attack", "tieSpare": true, "noAdvance": true }
```
- `mod`: added to the ATTACKER's total. Can be negative (Careful Maneuvers uses `-1`).
- `tieSpare: true`: on a tie the defender is destroyed but your attacker survives (normally a tie kills both). An HQ still falls to a tie.
- `noAdvance: true`: your attacker NEVER moves into the target hex, even on a clear win — it holds its ground (Ordered Withdraw). The HQ is still captured if the attack succeeds; entering isn't required.
- The flags stack freely with `mod`.

### `reposition` — move or swap one unit

```json
{ "type": "reposition" }
```
- No options. Move to an adjacent empty hex, or swap with an adjacent friendly
  unit; moving/swapping through a headquarters to its far side is allowed.
- "Up to N moves" = list the step N times (Forced March is three of these).

### `barrage` — destroy a terrain feature

```json
{ "type": "barrage" }
```
- No options. Removes ANY single trench, or ANY whole forest piece, anywhere on
  the board. Mountains are safe.

## What you canNOT do from JSON

A step type that doesn't exist (no `"heal"`, no `"draw"`, no conditional steps)
needs engine work — ask Claude to add the step type to the engine parts
(`stepOptions`/`applyStep`/`stepHasOptions` in `game/engine/`) and a test. The flags above are the
full current vocabulary:

```
deploy:     unit, anywhere
trench:     —
attack:     mod, tieSpare, noAdvance
reposition: —
barrage:    —
```

## Things to remember when tinkering

- **House rule is always on**: any card can be burned as a basic Attack or basic
  Reposition instead of its printed steps. A card with weak printed steps will
  show a high **Simple%** in the card report.
- **The AI needs no teaching** — it simulates the steps, so new combinations
  just work. Optional: add your card's id to `CARD_KEEP` in engine/05-ai.js (1–9,
  higher = more reluctant to burn it as a basic action; unlisted ids default 5).
- **Art**: drop `game/art/<id>.jpg` (or `.png`) and the card picks it up; no
  file = clean text-only card. Heavy AI renders: run `dev/optimize-art.ps1`.
- **Validate, then measure**: `node game/test/test.js` for legality,
  `node dev/balance.js 60` for what it does to the game. Watch the card report:
  Win% (correlation), Simple% (printed action not worth it), the no-op counts
  in the data (dead turns — should stay ~0), 1stSight% high + AvgSeen low
  (overpowered watchlist).

## Worked example — a new card

"Bombardment: remove a terrain feature, then attack twice at −1, standing off."

Pool card — `content/cards/bombardment.js`:

```json
{ "id": "bombardment", "name": "Bombardment", "faction": null,
  "text": "Remove any trench or forest. Then order up to two attacks with −1 support; your attackers hold their ground.",
  "steps": [{ "type": "barrage" },
            { "type": "attack", "mod": -1, "noAdvance": true },
            { "type": "attack", "mod": -1, "noAdvance": true }] }
```

Then reference it from a battalion — `{ "cardId": "bombardment", "count": 1 }` — and
take that `count` out of another card (or accept a 17-play skirmish).
