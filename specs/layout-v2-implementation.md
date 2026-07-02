# Layout v2 — implementation spec (2A + topbar scoreboard)

**Status:** ready to build. Supersedes the *design direction* in `layout-design-pass.md` (keep that as the
brief; this is the coded plan that came out of the design pass). Visual reference:
`Layout Directions.dc.html` (the mockup this was signed off from — turns 1–4).

**What this is:** a CSS reflow of `game/index.html` plus three small, surgical JS touches
(`renderBoard`, `renderMat`, `renderTop`). **No engine/rules changes. No new files, fonts, or libs.**
`game/` stays zero-dependency and zippable. `SAVE_V` is **not** bumped (state shape unchanged).

**Identity is fixed** — reuse existing tokens only: `--brass`/`--brass-dark`, `--parch`/`--parch2`/`--parch3`,
`--ink`/`--ink-soft`, `--red`/`--red-dark`, `--blue`/`--blue-dark`, `--copper`, `--felt`, and the small-caps
Georgia display face. Do not restyle cards, mats, hexes, or the FX layer — move and size them.

---

## 0. The decisions (from the design pass)

- **Layout: 2A — "both rosters left, journal owns the right."** Both player mats stack in the left rail;
  the centre column owns board + prompt + hand; the right column is the Campaign Journal, full height, as
  the signature bound-book element. Reads left→right as *commander mats · map · dispatch book*.
- **Board is bounded by its hex geometry** (`aspect-ratio` from the SVG `viewBox`) so the parchment hugs the
  diamond — kills the empty gutters on tall/diamond maps. This is the highest-leverage fix.
- **Journal is glance-readable:** entries group by turn; the **last two turns render in full** (play line +
  indented sub-steps), older turns **collapse to just the "plays X" line** with a `+N ›` affordance that
  expands on click.
- **Mats never scroll.** They **compact** (drop the spent-orders track) before the rail would ever scroll,
  and **fold into a drawer** before compacting past readability.
- **Topbar becomes a scoreboard (variant 4B):** battle name + YOU chip on the left; centre = campaign pips
  (first-to-3) flanking a **You↔Opp VP tug-bar** where **solid = VP on the board now** and **hatched = the
  ceiling if every reserve deploys without a further loss**, seam = projected front; controls right.
- **On-demand panels float over the map as hamburgers**, not topbar text buttons.

---

## 1. Three-column shell (2A)

Current markup already has `#main > #leftcol.sidecol / #centercol / #rightcol.sidecol`. Change the DOM so
**both mats live in `#leftcol`** and **`#rightcol` holds only the journal**:

```html
<div id="main">
  <div class="sidecol" id="leftcol">
    <div class="mat parchment blue" id="matBlue"></div>
    <div class="mat-divider"><span>&#9670; your command &#9670;</span></div>
    <div class="mat parchment red"  id="matRed"></div>
  </div>
  <div id="centercol">
    <div id="boardwrap"><svg id="board" ...></svg></div>
    <div id="promptbar"></div>
    <div id="hand"></div>
  </div>
  <div class="sidecol" id="rightcol">
    <div id="log" class="journal-feed"></div>   <!-- journal only; no mat here now -->
  </div>
</div>
```

Opponent mat on **top**, your mat on the **bottom next to the hand** (swap by side at render: if
`p===APP.mySide` it goes in the lower slot). In hotseat, order red-top/blue-bottom (no "you").

CSS:

```css
#main{flex:1 1 auto; display:flex; width:100%; overflow:hidden; min-height:0;}
#leftcol{ flex:0 0 248px; display:flex; flex-direction:column; gap:8px; margin:10px 6px 10px 10px; min-height:0; }
#centercol{ flex:1 1 auto; display:flex; flex-direction:column; min-width:0; min-height:0; }
#rightcol{ flex:0 0 clamp(300px, 26vw, 420px); display:flex; flex-direction:column; margin:10px 10px 10px 6px; min-height:0; }

/* the seam between the two mats */
.mat-divider{ display:flex; align-items:center; gap:8px; padding:1px 6px; flex:0 0 auto; }
.mat-divider::before, .mat-divider::after{ content:""; flex:1; height:1px; }
.mat-divider::before{ background:linear-gradient(90deg,transparent,var(--brass-dark)); }
.mat-divider::after{  background:linear-gradient(90deg,var(--brass-dark),transparent); }
.mat-divider span{ font-variant:small-caps; letter-spacing:1.5px; font-size:9.5px; color:var(--brass-dark); white-space:nowrap; }
```

**Rule of hierarchy** (governs every breakpoint below): the **board and hand are primary** (the only things
you click; the only saturated highlights/FX) and never yield space. Mats and journal are **reference** and
yield first. `#centercol` is the only `flex:1` track; the rails are fixed/clamped. Surplus width goes to the
board, never the journal (that's what the `clamp(...,420px)` cap enforces).

---

## 2. Board fits its hexes (the gutter fix)

`viewBoxFor()` already returns the hex bounding box. Drive `#board`'s `aspect-ratio` from it so the
parchment sheet is exactly the diamond's proportions, centred on `#boardwrap`.

`renderBoard()` (≈ line 790), right after `svg.setAttribute('viewBox', viewBoxFor(E.hexes()))`:

```js
var vb = svg.getAttribute('viewBox').split(' ');
svg.style.setProperty('--board-ar', (parseFloat(vb[2]) / parseFloat(vb[3])).toFixed(4));
```

CSS (replaces the `width:100%; height:100%; max-height:calc(100vh - 230px)` block):

```css
#boardwrap{ flex:1 1 auto; display:flex; align-items:center; justify-content:center; min-width:0; min-height:0; padding:8px 4px; position:relative; }
#board{
  height:100%; width:auto;
  aspect-ratio: var(--board-ar, 1.4);
  max-width:100%; max-height:100%;
  /* keep existing bg (board.jpg), border-radius, box-shadow */
}
```

Result: a tall/diamond map no longer stretches full-width — the sheet hugs the hexes and the freed width is
already spent by the rails in §1. Re-check on a diamond map (roster is random; the bug only showed on tall
ones).

---

## 3. Left rail — mats that never scroll

Two mats + divider must always fit `#leftcol`. Enforce a **compaction ladder**, never a scrollbar:

1. **Full** (roomy): mat shows rows + Orders-left + **spent-orders track** + VP (today's `renderMat`).
2. **Compact** (short rail): **drop the spent-orders track** (`.spentlbl` + `.spent`). This is the least-
   glanced info; the full track is always reachable via the Cards glossary.
3. **Drawer** (super-narrow, §6): the whole left rail folds behind a floating **Rosters** hamburger.

Implementation: give `renderMat(p)` a compact flag (or add `body.compact-mats` toggled by a height media
query / ResizeObserver) that omits the `.spentlbl`/`.spent` block. Add:

```css
#leftcol{ overflow:hidden; }              /* never a scrollbar */
@media (max-height: 820px){ .mat .spentlbl, .mat .spent{ display:none; } }  /* compact */
```

Keep slots/rows at their current size — do **not** shrink the roster read.

---

## 4. Journal — bound-book broadsheet, grouped + collapsible

### 4.1 Chrome (CSS on `.journal-feed` / a wrapping `#log`)
Push the existing dark leather panel into a bound book. Add, inside the journal container:
- **Header plate** (brass gradient, small-caps "Campaign Journal") pinned top.
- **Spine**: a 15px dark vertical band down the left (`linear-gradient(90deg,#17130c,#2c2617)`), a brass rivet.
- **Ruled margin**: a 1px `rgba(158,43,37,.4)` vertical rule ~34px in; turn numbers sit in that gutter.
- **Page edge**: a ~6px `repeating-linear-gradient` strip on the right suggesting stacked leaves.
- Feed scrolls: `overflow-y:auto; overflow-x:hidden; word-break:break-word;` (journal must always reach a
  hard bottom — the load-bearing Round 5 invariant).

Exact values are in `Layout Directions.dc.html` (option 2A right rail) — copy them; they use only existing tokens.

### 4.2 Grouped, collapsible entries (change in `renderLog`, ≈ line 1221)
Today the log is a flat entry list. Group consecutive entries into **turns**, where a card-play opens a turn
and its resolution steps are children:

```
turn = { tn, side, playText, steps:[...] }
```

Render rule:
- **Last two turns**: play line **+ all steps** (indented, `padding-left` a little, dotted separators).
- **Older turns**: play line only, bold, with a right-aligned muted `+N ›` (N = step count).
- `+N ›` (or the whole collapsed line) **expands that turn on click** — a UI-only toggle (e.g. a
  `Set` of expanded turn ids in `APP.ui`; no state-shape change, not saved). Newest turn stays in view
  (`scrollTop = scrollHeight`), preserving today's behaviour.
- Colour entries by side with the existing `.entry.red` / `.entry.blue` tints; keep the finale/hdr styles.

This is presentation only — the underlying log array is unchanged; you're just chunking it at render.

---

## 5. Topbar scoreboard (variant 4B)

Replace `#scorecard`'s pip-only cluster. `#topbar` keeps its `1fr auto 1fr` grid. Rebuild the centre in
`renderTop()` (≈ line 1069).

Left cell: battle name (`Battle N · <mapName>`) + a **YOU · RED/BLUE** chip in the player's side colour.
Right cell: the existing controls, consolidated (Concede · Cards · Manual · Menu).

**Centre cell — one row:**

```
[You]  [red pips ▢▢▢]  [====== VP tug-bar ======]  [blue pips ▢▢▢]  [Opp]
```

- **Campaign pips**: `m.wins.red` / `m.wins.blue` filled of 3 (first-to-3). Reuse the `.pip` token.
- **VP tug-bar** (the new mechanic). Per side, two segments growing from its end toward the centre:
  - **Solid** = VP on the board **now** = `E.fieldScore(st, side)`.
  - **Hatched** = **potential ceiling** = current + VP of every undeployed reserve, i.e.
    `fieldScore + Σ reserves[side][type] * E.UNITS[type].vp` (infantry 1, cavalry 2, artillery 3; trenches
    score nothing).
  - A 2px cream **seam** marks where the two ceilings meet — the projected front.
  - Current VP numbers ride inside the bar at each end.

```js
function ceiling(side){
  var cur = E.fieldScore(st, side), extra = 0, res = st.reserves[side];
  Object.keys(E.UNITS).forEach(function(t){ extra += (res[t]||0) * E.UNITS[t].vp; });
  return { cur: cur, max: cur + extra };
}
var R = ceiling('red'), B = ceiling('blue');
var total = (R.max + B.max) || 1;                 // guard divide-by-zero
var pct = function(v){ return (100 * v / total).toFixed(2) + '%'; };
// segment widths, left→right:
//   red solid   = pct(R.cur)
//   red hatch   = pct(R.max - R.cur)
//   seam        = 2px
//   blue hatch  = pct(B.max - B.cur)
//   blue solid  = pct(B.cur)   (or flex:1 to absorb rounding)
```

Segment styling (existing colours; hatch = translucent `repeating-linear-gradient` of the same hue):

```css
.tug{ position:relative; height:16px; border:1px solid var(--brass-dark); border-radius:8px; overflow:hidden;
      display:flex; background:#241f14; box-shadow:inset 0 1px 2px rgba(0,0,0,.5); }
.tug .solid.red { background:var(--red); }
.tug .solid.blue{ background:var(--blue); }
.tug .hatch.red { background:repeating-linear-gradient(45deg, rgba(158,43,37,.6) 0 4px, rgba(158,43,37,.12) 4px 8px); }
.tug .hatch.blue{ background:repeating-linear-gradient(45deg, rgba(40,82,122,.6) 0 4px, rgba(40,82,122,.12) 4px 8px); }
.tug .seam{ flex:0 0 2px; background:var(--parch); }
.tug .vp{ position:absolute; top:50%; transform:translateY(-50%); font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 1px rgba(0,0,0,.6); }
```

Now the mats' `.vp` block and the topbar agree by construction (both read `E.fieldScore`). Optionally drop the
mat's numeric VP line since the bar carries it — but keeping it is harmless.

---

## 6. Responsive behaviour (maps onto Rounds 4–5)

Primary zones (board + hand) hold; reference rails degrade in a fixed order:
**journal narrows → mats compact → journal → floating hamburger → board takes the freed column → (extreme)
mats → floating hamburger, board full-bleed.**

| State | Trigger | Layout |
|---|---|---|
| **Wide** | ≥ 1280px wide, tall enough | Full 2A. `#leftcol` 248, `#rightcol` `clamp(300,26vw,420)`, board flexes. |
| **Medium** | ~1080–1280px | `#rightcol` → ~300, `#leftcol` → ~210. Board unchanged. |
| **Narrow / short** | ≤ ~960px wide **or** ≤ 580px tall | Journal leaves the rail → **floating hamburger over the board (top-right)** opening the existing `syncJournalOverlay` modal. Mats stay pinned left, **compacted** (§3), no scrollbar. Board takes the freed column. Hand shrinks; keep today's `@media (max-height)` hand/board rules. |
| **Super-narrow** | ≤ 720px wide | Both rails become **floating hamburgers over the board** — **Rosters** (top-left) and **Journal** (top-right, brass-ringed). Board full-bleed; hand a scrollable bottom band. Topbar stacks per the existing `max-width:720px` rule. |

Notes:
- **Floating hamburgers** are absolutely positioned inside `#boardwrap` (`position:relative`), `z-index` above
  the board, brass fill, three bars; the Journal one carries the brass ring. Drawers/overlays **slide over**
  the board — they never push it.
- Reuse `syncJournalOverlay` for the journal drawer (it already mirrors `#log` → `#journalBody`); build the
  Rosters drawer the same way (mirror `#leftcol` into an overlay body). `#btnJournal` logic already toggles at
  `max-height:580px`/`max-width:860px` — retune those thresholds to the table above.
- The **journal can never be clipped**: whether inline or in the overlay it keeps its own `overflow-y:auto`
  to a hard bottom (load-bearing).
- **FX layer untouched** (`capturePre`/`playFX`/slide/pop/ring) — it animates after `renderAll` and must
  survive a full re-render. Don't entangle layout with it.

---

## 7. Definition of done

- No empty parchment gutters on a tall/diamond map (re-run the headless screenshot; roster is random, run twice).
- Journal reads as a deliberate bound book; older turns collapse to one line and expand on click; newest in view.
- The two mats **never** show a scrollbar at any size — they compact, then drawer.
- Topbar tug-bar: solid = `fieldScore`, hatched extends to the reserve-inclusive ceiling, seam at the front;
  numbers match the mats.
- Nothing clips at **1440×900** and **1920×1080**; spot-check a **short** screen and a **narrow** one — the
  Round 4/5 breakpoints (topbar stack < 720w, menu shrink-not-scroll, journal overlay) still behave.
- `node dev/smoke.js` and `node game/test.js` stay green.
- A screenshot still reads as the same game — identity unchanged, composed on purpose.

---

## 8. Touch list (files & anchors in `game/index.html`)

- **CSS `<style>`**: `#main`/`#leftcol`/`#centercol`/`#rightcol`, `#boardwrap`/`#board` (aspect-ratio),
  `.mat-divider`, `.journal-feed` book chrome, `.tug*`, floating-hamburger + drawer rules, breakpoint media queries.
- **DOM**: `#main` (move `#matBlue`/`#matRed` into `#leftcol` with the divider; `#rightcol` = journal only);
  `#topbar` centre cluster.
- **`renderBoard()`** (~790): set `--board-ar` from the viewBox.
- **`renderMat(p)`** (~1040): compact flag (omit spent-orders track); mat goes to the correct upper/lower slot by side.
- **`renderTop()`** (~1069): build the 4B scoreboard (battle name + YOU chip, campaign pips, VP tug-bar via
  `ceiling()`, controls).
- **`renderLog()`** (~1221): group entries by turn; expand last two, collapse older with `+N ›` click-to-expand
  (expanded-turn set lives in `APP.ui`, not persisted).

*Out of scope (unchanged): colour/type identity, card/mat/hex art, the FX layer, engine/rules, `SAVE_V`.*
