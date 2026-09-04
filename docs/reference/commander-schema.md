# Commander schema — the rendering contract

The shape the Commander UI panel (`game/ui/commander-panel.js`, drawn inside
`renderMat`) reads. A Commander loaded onto a side renders as a compact identity
header plus one chip per trait; whoever supplies Commanders — the sample fixture
here, or a later content/selection slice — builds them to this shape so the panel
renders them unchanged.

## Commander

```js
{
  id,            // stable slug
  name,          // shown in the panel header
  story,         // reserved narrative/flavor — not rendered as prose
  traits: [ Trait, … ],   // design budget: ≥1 strength, ≥1 weakness, max 3 per shipped Commander
  weights        // AI weight-override — not read by the panel
}
```

## Trait

```js
{
  primitive,     // effect vocabulary: combatMod | drawMod | redraw | tieSteal | …  (source-agnostic)
  source,        // passive | cooldown | charge     — picks the chip icon
  gate,          // { turns:N } for cooldown · { perBattle:N } for charge · absent for passive
  timing,        // active (on-turn button) | armed (pre-arm toggle) · absent for passive
  role,          // strength | weakness              — rendering accent (default: strength)
  name,          // short chip label
  text,          // full explanation for the tooltip
  …              // primitive params (terrain, when, delta, phase, …)
}
```

## What the panel resolves

Fields added by this slice so a trait renders without guesswork; a producer
supplies them, and the panel falls back where it can:

- **`role`** — `weakness` gives the chip its exposed accent; anything else reads
  as a strength. The trait budget's required weakness is marked with this.
- **`name` / `text`** — the chip label and the tooltip body. When `text` is
  absent the panel builds a description from `primitive` + its params, so an
  un-annotated trait still reads; `name` falls back to the primitive.
- **icon by `source`** — passive / cooldown / charge each get a distinct glyph.
- **pips** — a `cooldown` trait shows `gate.turns` pips (filled = turns still to
  wait); a `charge` trait shows `gate.perBattle` pips (filled = charges in hand).
- **control by `timing`** — `active` → an on-turn ability button; `armed` → a
  pre-arm toggle; a passive → no control. Keyed on `timing`, not `source`, so a
  cooldown or a charge can carry either control.

## Runtime state (supplied, not authored)

The panel renders live trait state from a per-side runtime (`commanderFor`),
separate from the authored Commander:

```js
{ cd,        // cooldown turns remaining (0 = ready)
  charges,   // charges left
  armed }    // pre-armed reactive is live
```

This slice owns the runtime in the UI so the components are drivable against the
sample fixture. `commanderFor` is the seam: a later slice repoints it at
engine-sourced trait state without changing the components above it.
