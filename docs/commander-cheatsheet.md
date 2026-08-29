---
last-reviewed: 2026-08-28
---
#game-rules #human-instructions #code-architecture
# Commander editing cheat sheet

Commanders live one-per-file under `game/content/commanders/<slug>.js` and load
into `WOA_CONTENT.commanders` via the content globber (`content/kinds.js`). They
are **data-only and inert today** — the rules engine reads nothing on a commander
yet, so adding or editing one leaves the symmetric golden path untouched (wayfinder
#88). The stub reserves the shape the future gameplay (#24 abilities, #102 deck
draft) will read.

## Schema

| key | type | meaning |
|-----|------|---------|
| `id` | string | unique slug |
| `name` | string | display name |
| `side` | `'red'` \| `'blue'` \| `null` | `null` = usable by either side |
| `theme` | string | flavour axis (e.g. `'woods'`) |
| `personality` | string \| object | how it pilots — a named `aiConfig` preset **string**, or an inline `AI_WEIGHTS` override **object** (the commander holds its own weights). Difficulty (search depth) is a separate run-time dial, not stored here. |
| `deck` | string \| object | its Deck — see below |
| `abilities` | `[]` | the #24 rules-bending hook. Stays empty/inert today. |

## The `deck` key (#112)

Polymorphic, mirroring `personality`:

- **string** — a fixed-deck **pointer** into `WOA_CONTENT.decks` by id (the day-one
  default). Must resolve to a real deck.
- **object** — an **affinity recipe** for the future weighted-random drafter (#102;
  nothing drafts yet). A soft tilt — not a target shape — over three **derived**
  structural facets, so no new per-card metadata is authored. The 72-point cap
  lives on the engine, never in this data. Facets and their derived values:

  | facet | derived from | values |
  |-------|--------------|--------|
  | `unit` | `steps[].unit` | `infantry` `cavalry` `artillery` |
  | `posture` | `steps[].type` | `deploy` `attack` `trench` `reposition` `barrage` |
  | `curve` | `starting` / `noOpener` | `starting` `noOpener` |

  Each facet maps a derived value → a finite, non-negative weight.

### Examples

String pointer (`forestier.js`):

```js
{ "id": "forestier", "name": "Forestier", "side": null, "theme": "woods",
  "personality": "hard", "deck": "cavsplit17-raid-paid", "abilities": [] }
```

Affinity object (`woods-baiter.js`) — favour cavalry, defensive trench postures,
a stocked opener:

```js
"deck": {
  "unit": { "cavalry": 2, "infantry": 1 },
  "posture": { "trench": 2, "deploy": 1, "attack": 0.5 },
  "curve": { "starting": 1.5 }
}
```

The schema is pinned by `game/test.commanders.js` (`node game/test.js`).
