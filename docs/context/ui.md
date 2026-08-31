# UI vocabulary

Shared language for the browser front-end — how we name the pieces the interface is drawn
from, so we all mean the same thing and a grep lands clean. This is a vocabulary
reference, not a catalogue: the game-domain terms the UI renders (**Card**, **Map**,
**Deck**) are anchored once in the root [`CONTEXT.md`](../../CONTEXT.md); *where the code
lives and how new code is homed* is [`code-architecture`](../code-architecture.md).

## Terms

- **Base primitive** — a shared UI rendering atom with one definition site, that
  everything else draws *through* rather than re-drawing, so a change to it (background,
  texture, tokens) is inherited by every variant. There are four: the **card face**, the
  **chart-primitive builders**, the **design-token object**, and the **SVG element
  factory** (see *Roles* below).
- **Register-or-extend** — the rule over base primitives. A new *variant* of a role must
  **extend** its base primitive (an `opts` flag and/or a modifier class), never fork it; a
  genuinely new *role* is legal but must be **registered** so "a new UI element" is a
  visible, approvable event, not a bespoke `.card` buried in the CSS. Enforced as a red,
  not a convention — the roster and the register-or-extend gate are the *authority* named
  below, not this doc.
- **Composite** — a screen or pane renderer that *assembles* base primitives (a hand view
  laying out card faces, a dashboard pane drawn over the chart toolkit). A composite
  consumes primitives; it is not one.
- **Existence / fidelity / readability** — the three things a UI acceptance criterion can
  claim, each with its own gate (`docs/adr/0004-build-chain-teeth.md`): *existence* — the
  element is present and wired (`dev/smoke.js`); *fidelity* — it matches its `dev/proto`
  **target** (`dev/ui-review.js` blind compare, the gate); *readability* — it reads well
  (the `ui-rubric`, an aim).

## Roles

The names we use for the front-end's rendering primitives. The four **base primitives**:

- **card face** — the one card inner markup (corners, art box, name banner, body), shared
  by the in-game hand and any dashboard that shows a card. Lives in `game/ui/app.js`.
- **chart builders** — the shared SVG/div chart toolkit (line, text, swatch, settle
  curve, band rows) every dashboard pane draws over. Lives in `game/ui/chart-primitives.js`.
- **design tokens** — the one shared palette / style-token object every chart reads.
  Lives in `game/ui/chart-primitives.js` (`CHART`).
- **SVG element factory** — the `createElementNS` factory that mints every board/preview
  SVG node. Lives in `game/ui/board.js` (`svgEl`).

Everything else is a **composite** named for the screen it renders — the dashboard, deck
editor, map editor, maps screen, manual, the cards / maps / overview / units panes, the
skirmish HUD, and the workbench.

## Authority

The complete, machine-checkable roster (each role → its home file, definitional form, and
matcher) is **`game/ui-glossary.js`** (`ROSTER`), enforced by `game/test.ui.js` on every
`node game/test.js`: it reds if any rendering primitive the front-end defines is
unregistered, so the roster stays a complete census for the register-or-extend gate to
diff against — and reds if this doc stops naming a registered home, so the vocabulary here
cannot drift from the code.

The **register-or-extend gate** itself is `registerOrExtend` in `game/ui-glossary.js`
(also enforced by `game/test.ui.js`): the diff case of #190's route-through-base. Given a
change, a newly-added element-factory / modifier must *extend* a registered role (an
`opts` flag or a modifier on a base primitive) or *register* a genuinely new role in this
doc that same diff; an unregistered new primitive reds, and a **fork** of an already-served
role (a second card face, a second SVG factory) reds even when a glossary entry is added.
