# UI vocabulary

Words for the browser front-end — rendering primitives, the shared card face, screens,
and how the interface is drawn. The game-domain terms it renders (**Card**, **Map**,
**Deck**) are anchors defined once in the root [`CONTEXT.md`](../../CONTEXT.md) map.

This file is the one home for UI-implementation vocabulary (carve a term here the moment
it resolves, and only here) **and** the role-keyed UI-element glossary — the canonical,
complete roster of the front-end's rendering primitives that the register-or-extend gate
(`docs/adr/0004-build-chain-teeth.md`, #194) diffs a change against.

## Terms

- **Base primitive** — a shared UI rendering atom with exactly one definition site: the
  one card face, the chart-primitive builders, the shared design-token object, the SVG
  element factory. Everything else routes *through* a base primitive rather than
  re-drawing it, so a change to the base (its background, texture, tokens) is a two-line
  edit that every variant inherits. A base primitive is detected by its **definitional
  form** — a function that returns markup, an ES class, a design-token object, or a
  `.base.modifier` CSS class — not by a hand-kept list, so the roster cannot quietly
  omit one.
- **Register-or-extend** — the rule the glossary exists to enforce. A new *variant* of an
  existing role must **extend** its base primitive (an `opts` flag and/or a modifier
  class), never fork it. A genuinely new *role* is legal but must be **registered** in the
  roster below in the same change — so "a new UI element" is a visible, approvable event,
  not a bespoke `.card` buried in the CSS. An unregistered primitive, or a fork of a role
  already served, is a RED (`node game/test.js`, via `game/ui-glossary.js`). Being forced
  to fork because the base cannot express the variant is the signal to deepen the base's
  API instead.
- **Composite** — a screen or pane renderer that *assembles* base primitives (a hand view
  that lays out card faces, a dashboard pane that draws over the chart toolkit). Composites
  are registered by role too, so the roster is a complete census, but the doctrine's fork
  concern is the base primitives they consume.
- **Existence / fidelity / readability** — the three things a UI acceptance criterion can
  claim, each with its own gate (ADR-0004): *existence* — the element is present and wired
  (a `dev/smoke.js` assert); *fidelity* — it matches its `dev/proto` **target** (a
  `dev/ui-review.js` blind compare, the gate); *readability* — it reads well (the
  `ui-rubric` in `dev/ui-review.js` Phase 2, an aim, never a bounce).

## Role-keyed UI-element glossary

Every rendering primitive the front-end defines, keyed by the **role it fills** (not by
file), naming where it lives. **Completeness is load-bearing**: if a primitive is missing
here, #194 diffs against a hole and false-passes forever — so a companion source-scan
(`game/ui-glossary.js`, run from `game/test.js`) reds if any detected primitive is
unregistered, and its exhaustiveness is itself red-at-base against a fixture of each
definitional form.

### Base primitives

| Role | Fills | Lives in |
| --- | --- | --- |
| **Card face** | the one parchment/brass card inner markup — corners, art box, name banner, body — shared by the in-game hand and every dashboard that shows a card; plus its `.card` / `.art` modifier classes (`.card.deal`, `.card.disabled`, `.art.placeholder`) | `cardFace` / `artImg` in `game/ui/app.js`; modifiers in `game/style.css` |
| **Chart-primitive builders** | the shared SVG/div chart toolkit — line, text, swatch, settle-curve CDF, band rects & dots, band-row — every dashboard pane draws over these | `ch*` / `ov*` in `game/ui/chart-primitives.js` |
| **Design tokens** | the one shared palette + style-token object (surfaces, ink, sequential/diverging ramps, band shades, tempo lanes) every chart reads | `CHART` in `game/ui/chart-primitives.js` |
| **SVG element factory** | the `createElementNS` factory that mints every board/preview SVG node | `svgEl` in `game/ui/board.js` |

### Composite renderers

Screen and pane roles that assemble the base primitives above. Each role **owns every
markup primitive in its home file** (the roster claims them all), so the census stays
complete without enumerating each renderer by name; a markup primitive that appears in a
*new* home file is unclaimed and reds.

| Role | Home |
| --- | --- |
| Dashboard | `game/ui/dashboard.js` |
| Deck editor | `game/ui/deck-editor.js` |
| Map editor | `game/ui/map-editor.js` |
| Maps screen | `game/ui/maps-screen.js` |
| Manual | `game/ui/manual.js` |
| Cards pane | `game/ui/pane-cards.js` |
| Maps pane | `game/ui/pane-maps.js` |
| Overview pane | `game/ui/pane-overview.js` |
| Units pane | `game/ui/pane-units.js` |
| Skirmish HUD | `game/ui/skirmish.js` |
| Workbench | `game/ui/workbench.js` |

### The roster the scan reads

Machine-readable source of truth for `game/ui-glossary.js`. One role per line —
`id | home | form | match` — where `form` is `fn` (function-returning-markup), `obj`
(design-token object), `class`, or `modifier`, and `match` is a regex over the
definition's name (or the `base.mod` token for a modifier). A role's regex claims a whole
family, so a sibling under an existing role extends it; a definition no role claims reds.
`bases:` names the base-primitive CSS classes whose modifiers are in scope.

Base primitives are claimed by a precise regex so each stays a distinct role (AC1);
composite renderers each own every markup primitive in their home file (`match` `.`), so
a new sibling in an existing screen *extends* that role, while a markup primitive in a new
home — or a new `class`, design-token object, or `.base.modifier` — is unclaimed and reds.

```ui-roster
bases: card art

# --- base primitives (precise — each a distinct role) ---
card-face         | game/ui/app.js              | fn       | ^(cardFace|artImg)$
card-face-mods    | game/style.css              | modifier | ^(card\.(deal|disabled)|art\.placeholder)$
chart-builders    | game/ui/chart-primitives.js | fn       | ^(ch|ov)
design-tokens     | game/ui/chart-primitives.js | obj      | ^CHART$
svg-factory       | game/ui/board.js            | fn       | ^svgEl$

# --- composite renderers (each owns its home file's markup family) ---
dashboard         | game/ui/dashboard.js        | fn       | .
deck-editor       | game/ui/deck-editor.js      | fn       | .
map-editor        | game/ui/map-editor.js       | fn       | .
maps-screen       | game/ui/maps-screen.js      | fn       | .
manual            | game/ui/manual.js           | fn       | .
cards-pane        | game/ui/pane-cards.js       | fn       | .
maps-pane         | game/ui/pane-maps.js        | fn       | .
overview-pane     | game/ui/pane-overview.js    | fn       | .
units-pane        | game/ui/pane-units.js       | fn       | .
skirmish-hud      | game/ui/skirmish.js         | fn       | .
workbench         | game/ui/workbench.js        | fn       | .
```
