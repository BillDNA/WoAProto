#human-instructions #code-architecture #game-rules

# Field Manual animations — authoring guide for future sessions

How to add or edit a worked example in the Field Manual's diagram player
(V1, [[../../specs/V1-specs/v1-field-manual-animations.md|spec]]). Everything
lives in **`game/ui/manual.js`**; read that file alongside this doc.

## The pieces

| What | Where |
|---|---|
| Examples + beats + fixtures + mini renderer | `game/ui/manual.js` (`MANUAL_EXAMPLES`, `mpDef`/`mpState`/`mpResolve`, `mpDrawFrame`) |
| Static player chrome (`#manualPlayer`, `#mpBoard`, `#mpCaption`, Prev/Next) | `game/index.html`, inside `#manualOvr` — the prose below it stays the text canon |
| Styles (rings, pill, tabs, reduced-motion) | `game/style.css`, "Field Manual diagram player" block |
| All wiring (buttons, ← → keys, `?screen=manual` deep link) | `game/ui/boot.js` — functions live in manual.js, wiring statements ONLY in boot.js |

Visual vocabulary = the live battle FX (`ui/fx.js` / `ui/board.js`): **gold
ring** = attacker support that counted, **steel ring** = defender support,
**grey dashed ring** = support denied, strike arrow, `A vs D` pill. Reuse it;
don't invent new glyphs for the same concepts.

## THE RULE: engine truth, never hardcoded numbers

Every number, ring and outcome shown must be **read from the engine at render
time**, so a rules change flows into the manual automatically:

- tallies + rings → `E.supportFor(st, side, battleHex, excludeHex, attacking)`
  (`.total`, `.hexes`, `.parts`) and `E.computeAttack(st, atk)`
  (`.attackerPower/.defenderPower/.outcome`);
- aftermath frames → resolve a **fresh** fixture through the real path with
  `mpResolve(st, atk)` (synthesized attack step → `E.applyStep` →
  `resolveAttack`, incl. tie/HQ/advance handling), then read what happened
  with `mpAftermath(pre, post, atk)`;
- counterfactuals ("without the trench it would be…") → build a **second
  fixture** without the piece and read the engine again (see the
  `trench-river` scene: `denied = asupOpen.hexes − asupTr.hexes`);
- derived bonuses (forest, mountain) → subtract engine totals
  (`res.attackerPower - base - asup.total`), never `+1` literals;
- even card names come from data (`E.CARDS.filter(steps has tieSpare)`).

If you find yourself typing a rules number into a caption, stop and compute it.

## The fixture pattern

```js
var def = mpDef('my-example', [redHQ q,r], [blueHQ q,r], [ {t:'F',edges:[[q,r,d],...]} ]);
var st  = mpState(def, { '0,0':['infantry','blue'], '-1,0':['infantry','red'] },
                  { '0,0': [{dirs:[1,2], owner:'blue'}] });   // trenches optional
```

- `mpDef` builds a tiny inline map on the shared 9-hex outline `MP_HEXES`
  (labels A1–A3 / B1–B3 / C1–C3). `mpState` runs the REAL
  `E.newMatch({maps:[def], seed:7, firstPlayer:'red'})` + `E.newBattle`, then
  overwrites `st.units` / `st.trenches` with the fixture's pieces and sets
  `st.__sim = true` (never fire real-battle hooks).
- Terrain goes in the **map def** (`pieces`) so `buildTerrain` validates it;
  trenches go straight into the state. Every terrain side needs its neighbor
  hex ON the outline (`buildTerrain` throws "side off board" otherwise).
- `newBattle` needs both HQs on the board, and an HQ adjacent to the battle
  hex adds +1 support — **place HQs at distance ≥ 2 from the target unless
  the example wants them counted** (only one dist-2 corner per side exists on
  `MP_HEXES`: `[2,-1]` and `[1,1]`).
- Directions (`DIRS` in `engine/02-board.js`): 0=E 1=NE 2=NW 3=W 4=SW 5=SE.

### The board-shape trap (important)

The engine has ONE global board; `newBattle` switches it to the fixture's
shape. `renderManual()` saves the live shape and restores it in a `finally`,
so an in-progress battle is never corrupted — **keep all fixture building and
engine reads inside `scene()`**, and within a scene **build a state, read its
numbers immediately, then build the next** (reads use whatever board is
current). If you ever author a different outline than `MP_HEXES`, call
`E.setBoard(st.boardShape)` before reading that state.

## The beat schema

An example is `{ id, label, scene(), beats: [...] }` in `MANUAL_EXAMPLES`.
`scene()` builds fixtures + reads ALL engine numbers into a data bundle `d`
(rebuilt fresh on every render — cheap, keep it pure). Each beat is:

```js
{ cap:   function(d){ return 'caption HTML, numbers interpolated from d'; },
  frame: function(d){ return {
    st: d.st,                       // the state to draw (pre or post)
    atk: d.atk,                     // exposed as window.MANUAL.atk for tests
    strike: {from,to,via,color},    // arrow (via bends through an HQ)
    rings: [{hex, cls:'gold'|'steel'|'deny'}],
    glowSides: ['q,r>d'],           // halo a terrain side
    glowTrench: {hex, dirs},        // halo a trench
    ghosts: [{hex, unit}],          // fallen piece on a now-empty hex
    badges: ['q,r'],                // ✕ where a piece fell but the hex is re-occupied
    hqGhost: {hex, side},           // a captured HQ
    pill: {at:hex, text:'3 vs ?', tone:'run'|'attacker'|'tie'|'defender'} }; } }
```

Captions live in the beats, next to their frames. Voice: field-journal /
drill-sergeant — **one idea per beat**, plain words, `<b>` the load-bearing
rule words and numbers. Use running-tally pills (`'3 vs ?'`, tone `'run'`)
while building up, the outcome tone on the final tally. Rendering is fully
state-driven per beat (Prev/Next just re-render), so `prefers-reduced-motion`
is automatically correct — CSS animation is garnish only.

## Testing a new/edited example

1. `node --check game/ui/manual.js` then `node game/test.js` (must stay green).
2. `node dev/smoke.js` — the "field manual diagram player" section asserts the
   overlay, the beat counter, the rings, and **engine truth** (pill text ==
   fresh `supportFor`/`computeAttack` on `window.MANUAL.state`/`.atk`). Extend
   it if your example adds a new guarantee worth locking in.
3. Eyeball every beat headlessly (ex/beat are 1-based):
   ```
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
     --disable-gpu --window-size=1400,900 --virtual-time-budget=4000 \
     --screenshot=/tmp/beat.png \
     "file:///…/game/index.html?screen=manual&ex=3&beat=2"
   ```
   then read the PNG back and check hexes, rings, pill and caption.

## Checklist

- [ ] Fixture built via `mpDef`/`mpState`; terrain in the map def; HQs placed deliberately (adjacent = counted!); `st.__sim` set by `mpState`.
- [ ] Every number/ring/outcome read from `supportFor` / `computeAttack` / `mpResolve`+`mpAftermath` — zero hardcoded rules numbers, including in captions.
- [ ] Beats: one idea each, running tally builds beat by beat, final beat shows the resolved aftermath.
- [ ] Engine reads happen right after the state they belong to is built (board-shape trap).
- [ ] `node game/test.js` and `node dev/smoke.js` green; screenshots of each new beat verified by eye.
- [ ] No new wiring outside `ui/boot.js`; no markup beyond `#manualPlayer`'s existing chrome unless truly needed.
