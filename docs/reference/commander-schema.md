# Commander schema

The shape a Commander is authored, selected, applied, and rendered against. A
Commander is a content kind (`content/commanders/*.js`, resolved by
`Engine.resolveCommander` the way a battalion is) that a player picks for their
side before mustering; the enemy seat carries one too. The UI panel
(`game/ui/commander-panel.js`, drawn inside `renderMat`) renders it as a compact
identity header plus one chip per trait.

## Selection → application → render

- **Select** — the picker (before the battalion builder) sets a per-side
  `commanders: {red, blue}` selection (each `null`/`'none'`/id), carried
  `newBattle` → `newSkirmish` exactly as `battalions` is; `newSkirmish` seats
  the resolved records on `st.commanders`.
- **Apply** — traits compile to source-agnostic effect primitives applied at the
  built-in modifier sites: `combatMod` at combat resolution
  (`computeAttack`), `drawMod` at the draw hook (`drawHand`). The AI plays them
  for free — its eval scores through `computeAttack` — and merges a Commander's
  inline `weights` over `AI_WEIGHTS`.
- **Render** — the panel reads the per-side runtime via `commanderFor`, seeded
  from `st.commanders` by `syncCommandersFromState` when a battle starts/resumes.

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

`commanderFor` is the seam between the panel and its source:
`syncCommandersFromState` seeds it from the engine-sourced `st.commanders` on
battle start/resume, so the panel renders the real per-side selection. The demo
fixture (`?commanders=demo`) still drives the same seam for exercising every
render path.
