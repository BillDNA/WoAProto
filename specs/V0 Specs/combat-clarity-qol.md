# Combat clarity + quality-of-life

A cluster of small UI wins that make combat legible. All UI-only — none touch rules. The board FX
layer already exists (`capturePre`/`playFX` + slide/pop/ghost/ring helpers, wired through `act()`
and the AI driver) and must stay **rules-free and re-render-proof** (it animates AFTER `renderAll`
from from/to info captured before `applyStep`) — extend it, don't bend that invariant.

## Trench placement in one action

Placing a trench is currently fiddlier than it should be. Make it a **single action** and rework
the preview so the orientation choice reads clearly (trenches are `{dirs:[d,d+1], owner}` and
`trenchOrientations` already filters legal placements — surface those as the pick, resolve in one
step).

## Hover unit → preview attack scores

On hover over a unit, show the **basic-attack math** on each adjacent hex it could hit: attacker
(atk + support + adjacent-own-HQ + own forest side + card mod) vs defender (def + support +
adjacent-own-HQ + own mountain side + trench), higher wins / tie kills both. The engine already
computes exactly this for the AI — reuse that combat calc, render the totals as small overlays.
Bill flagged it "might be clutter" — make it hover-only / toggleable.

## Animate the attack source + supporters

Show **where an attack comes from and who supports it**, especially **through-HQ** (units adjacent
to a HQ can strike the far side using the HQ hex as the crossing hex — confusing today). Extend the
FX layer: a directional cue from attacker → battle hex and a highlight on each contributing
supporter. Pure flourish; must survive a full board re-render and never touch resolution.

## Layout design pass → moved out

The board/mats/hand/log layout pass is its own brief now: **[[layout-design-pass]]** — a written
handoff to the `frontend-design` skill (board wastes width on tall maps; journal is exiled to a
thin rail). Not part of this QoL spec.

## Grounding

- Reuse the AI's combat calc for the hover preview so the numbers can never disagree with what
  actually resolves.
- Run `node dev/smoke.js` after these (UI changes) and verify small-screen layouts per the Round 4
  responsive notes.

---
skipped: full attack replay/scrubbing, permanent always-on score overlays — hover + toggle first;
add more only if playtesters still can't read a fight.
