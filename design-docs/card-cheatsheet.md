# Card editing cheat sheet

Everything here lives in `game/maps.js` → `"cards": [...]`. It is **pure JSON**:
double-quoted keys, no trailing commas, no comments inside the data. Edit, save,
refresh the browser. Then:

```
node game/test.js      # validates the deck; points at exactly what's wrong
node game/balance.js   # shows what your change did to win rates + the card report
```

## Card fields

| Field      | Type   | What it does |
|------------|--------|--------------|
| `id`       | string | Unique handle. Used for art lookup (`game/art/<id>.jpg` or `.png`), the AI's burn priorities, and the play metrics. Two ids are special — see below. |
| `name`     | string | Shown on the card banner, in the journal ("Red plays …"), and the glossary. |
| `count`    | number | Copies in the deck. **The sum of all counts is the deck size = your total plays per battle** (the physical game is 16). Changing it moves the attrition clock. |
| `text`     | string | Card body and glossary entry. Cosmetic only — the engine never reads it, so keep it honest when you change `steps`. |
| `starting` | bool   | `true` on exactly ONE card: it is guaranteed in each player's opening hand (drawn as 1 + 3 random). |
| `steps`    | array  | The printed action, resolved in order. Each entry is `{ "type": ..., ...options }` — see below. |

### Special ids the engine knows by name

- `"airdrop"` — never dealt into an opening hand (house rule).
- The `"starting": true` card's id — guaranteed first-hand card.
- Renaming any OTHER id is safe, but you lose its art file link and its entry in
  the AI's `CARD_KEEP` table (engine.js) until you update those too.

## Step types and their options

Steps resolve top to bottom. The player may **skip any step**; steps that are
impossible (no legal target) skip themselves. If a whole play resolves zero
actions, the journal says so and it counts in the card report's **Skip%**.

### `deploy` — place a unit from reserve

```json
{ "type": "deploy", "unit": "infantry" }
{ "type": "deploy", "unit": "cavalry",  "anywhere": true }
```
- `unit` (required): any key from the `"units"` block — `infantry`, `cavalry`, `artillery` (or a new type you add there).
- `anywhere: true`: any EMPTY hex on the board (this is what makes Airdrop an airdrop). Default: empty hex adjacent to a hex you control.
- Needs that unit in reserve, otherwise the step auto-skips.

### `trench` — dig a trench

```json
{ "type": "trench" }
```
- No options. Player picks a controlled hex, then two contiguous edges that
  don't overlap existing trenches or that hex's own terrain.
- Needs a trench in reserve (`"trenchCount"` per player, top of the file).

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
  the board (June 2026 ruling). Mountains are safe.

## What you canNOT do from JSON

A step type that doesn't exist (no `"heal"`, no `"draw"`, no conditional steps)
needs engine work — ask Claude to add the step type to `engine.js`
(`stepOptions`/`applyStep`/`stepHasOptions`) and a test. The flags above are the
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
  just work. Optional: add your card's id to `CARD_KEEP` in engine.js (1–9,
  higher = more reluctant to burn it as a basic action; unlisted ids default 5).
- **Art**: drop `game/art/<id>.jpg` (or `.png`) and the card picks it up; no
  file = clean text-only card. Heavy AI renders: run `dev/optimize-art.ps1`.
- **Validate, then measure**: `node game/test.js` for legality,
  `node game/balance.js 60` for what it does to the game. Watch the card report:
  Win% (correlation), Simple% (printed action not worth it), Skip% (dead turns —
  should stay ~0), 1stSight% high + AvgSeen low (overpowered watchlist).

## Worked example — a new card

"Bombardment: remove a terrain feature, then attack twice at −1, standing off."

```json
{ "id": "bombardment", "name": "Bombardment", "count": 1,
  "text": "Remove any trench or forest. Then order up to two attacks with −1 support; your attackers hold their ground.",
  "steps": [{ "type": "barrage" },
            { "type": "attack", "mod": -1, "noAdvance": true },
            { "type": "attack", "mod": -1, "noAdvance": true }] }
```

Remember to take its `count` out of another card (or accept a 17-play battle).
