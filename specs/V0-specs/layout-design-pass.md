#spec
# Layout design pass — handoff to `frontend-design`

**This is a design brief, not a coded spec.** Hand it to the `frontend-design` skill. The visual
*identity* is already strong and stays; this is a **composition / space** problem, not a palette or
type problem.

## Subject, audience, job

- **Subject:** a digital table for Bill's physical board game *War of Attrition* — a steampunk-
  Napoleonic campaign fought on a hex map, narrated by a field journal.
- **Audience:** Bill (playtesting + balance iteration) and anyone he shares the browser build with.
- **The page's one job:** let a player read the board, read what just happened (the journal), and
  choose a card — at a glance, on one screen, no scrolling.

## The problem (diagnosed from the current build)

Re-capture it yourself:
`chrome --headless --disable-gpu --window-size=1920,1080 --virtual-time-budget=5000 --screenshot=layout.png "file:///.../game/index.html?autostart=ai"`
(classic `--headless`; the roster is random, so run it twice to see a tall/diamond map *and* a wide
one — the bug only shows on the tall ones).

1. **The board wastes its width.** `#board` is `width:100%` of the centre column with the hex SVG
   centred at its natural size. On tall/diamond maps the parchment sheet stretches full-width while
   the hex diamond fills only ~40% of it — acres of empty parchment either side. Wide maps happen to
   fill it; the board is sized by its **container, not its hex geometry**. This is the dominant
   eyesore and the root of the "squashed" feeling — the board hogs horizontal space it doesn't use,
   starving everything on the rails.
2. **The Campaign Journal is exiled to a thin rail** (~230px, far right, under the Blue mat), mostly
   empty at game start. It is the *most on-theme thing in the whole design* — a bound field journal —
   rendered as the least important. This is Bill's "still seems a little squashed to the side."
3. **Dead space + drift.** The left rail is empty below the Red mat; the prompt + hand float at the
   bottom centre, disconnected from the mats and journal.

## Constraints — must not break (these are load-bearing, not preferences)

- **One file, zero dependencies.** Everything is CSS in `game/index.html`. No framework, no build,
  no fonts/libs added — `game/` must stay zippable (standing goal). This is a CSS reflow.
- **Keep the established identity.** Steampunk-Napoleonic field journal: parchment / brass / earthy,
  felt-green table behind, no modern chrome. Existing tokens stay — `--brass`/`--brass-dark`,
  `--parch`/`--parch2`/`--parch3`, `--ink-soft`, `--red`/`--blue` (+`-dark`), `--copper`, the small-
  caps display face. Don't restyle the cards, mats, or hexes; move and size them.
- **Responsive invariants (Rounds 4–5) survive.** `1fr auto 1fr` topbar that stacks below 720px;
  menu shrinks (not scrolls) on short screens; the inline journal → topbar **Journal** overlay
  (`syncJournalOverlay`) below 580px height / 860px width; `min-height:0` chain so nothing clips.
- **The journal can never be clipped** (the whole reason Round 5 gave it a full-height column) —
  whatever you do, it must still run to a hard bottom with its own `overflow-y:auto`.
- **FX layer is untouchable** (`playFX`/slide/pop/ring): pure flourish, must survive a full re-render.
  Don't entangle layout changes with it.
- Bump `SAVE_V` only if state shape changes (it won't for pure CSS).

## Design direction (recommended — spend the boldness in one place)

**Thesis: the Campaign Journal is the hero.** It's the artifact that *is* the concept. Promote it
from a scrollbar to a real bound-journal broadsheet, and make everything else quiet and disciplined
around it.

- **Board fits its hexes (the quiet, high-leverage fix).** Bound `#board` by the hex SVG's own
  aspect ratio (derive from its `viewBox`, or a `max-width` per board so a diamond can't stretch),
  centred on its parchment. Kills the gutters, frees real width. This one change does most of the
  work.
- **Give the freed width to the journal, not back to the board.** Asymmetric rails are *correct*
  here — a commander's desk isn't symmetric: the map sits centre, the dispatch journal is a bound
  book to the right. Left rail stays a compact status mat; right rail widens to a readable journal
  (~320–360px) with a bound-page treatment (the `.journal-feed` gradient already gestures at it —
  push it: a spine, a hairline margin rule, dated entries as log lines).
- **Discipline everywhere else:** mats stay compact (don't grow the slots), prompt + hand stay a
  centred bottom band under the board. Cut, don't add.

Wireframe (recommended):
```
┌──────────────────────── topbar (unchanged) ─────────────────────────┐
├────────┬──────────────────────────────────┬────────────────────────┤
│ RED    │   board, sized to its hex bbox    │  BLUE mat (compact)    │
│ mat    │   (parchment hugs the hexes,      │  ┌──────────────────┐  │
│(compact│    centred — no dead gutters)      │  │  CAMPAIGN        │  │
│ rail)  │                                    │  │  JOURNAL         │  │
│        │                                    │  │  — the hero —    │  │
│        ├── prompt ──────────────────────────┤  │  wide bound page │  │
│        │  [card] [card] [card] [card]       │  │  to window bottom│  │
└────────┴──────────────────────────────────┴──└──────────────────┘──┘
```

**Signature element:** the journal-as-bound-book. That's the one memorable thing; keep the risk
there and leave the rest restrained.

## Alternatives to weigh (don't just take A)

- **B — bottom desk-drawer.** Board spans the top; prompt + hand + a full-width horizontal journal
  ticker share a bottom band. Gives the journal width but risks the Round-5 clipping problem — only
  if you can keep it unclippable.
- **C — symmetric wider rails.** Split the freed width evenly; both mats + journal get more room.
  Safer, less bold, doesn't make the journal a hero. The fallback if asymmetry looks off in practice.

## Definition of done

- No empty parchment gutters on the tall/diamond maps (re-run the screenshot on a diamond map).
- The journal reads as a deliberate, readable panel — not a sliver.
- Nothing clips at 1440×900 and 1920×1080; the Round 4/5 breakpoints still behave (spot-check a
  short screen and a narrow one).
- `node dev/smoke.js` still passes (UI harness). Identity unchanged — a screenshot should still
  read as the same game, just composed on purpose.

---
skipped: new color/type identity (already strong — don't touch), animated layout transitions,
a redesigned card/mat/hex — this pass is board-sizing + journal promotion, nothing more.
