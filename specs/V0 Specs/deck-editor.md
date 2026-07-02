# Deck editor (GUI)

In-browser deck construction, modeled on the map editor. The deck is already pure data in
`maps.js` (`WOA_BUILTIN` cards); this is a card-list editor with the same edit → validate →
export loop the map editor uses.

## The idea

A card is `{id, name, text, ...attack-step flags}`. The editor edits the card list: add / remove /
duplicate / edit. The attack-step flags are the interesting fields (all data-driven, documented in
`design-docs/card-cheatsheet.md`):
- `mod` — ± attacker power
- `tieSpare` — attacker survives ties
- `noAdvance` — attacker never enters the hex (Ordered Withdraw has both)
- plus the two engine-meaningful markers (see gotchas)

Copy the map editor's whole shape: edit in-browser, `validateMaps`-style validation, and save
through the same path maps use — the server writes `custom-maps.js` via `/api/savemaps`; do the
same for a custom deck (or extend that endpoint) so file:// users still get Export/Import.

## Grounding

- Reuse the map editor's structure in `index.html` (edit panel + validate + save/export). It is
  the closest existing thing and Bill already flagged this is "probably a lot like the map editor."
- Cards pull art **by card id** (`art/<id>.jpg|png` → text-only fallback). So a brand-new card id
  just renders as a clean text card — new cards never break rendering. No art step required.
- Keep it zero-dependency (standing goal): plain DOM, same as the map editor.

## Gotchas (engine-meaningful, validation must enforce)

- Card id **`airdrop`** and the **`starting:true`** card are meaningful to the engine — exactly
  one starting card must exist; `airdrop` is special-cased in `drawHand` (never in the opening
  hand). Validation refuses a deck that breaks either.
- Deck size is fixed today (16 per deck). Enforce it. The larger-pool / deck-building loop is
  post-V0 vision, not this — see [[specs/V0 Specs/grading-rubrics]] and the roadmap Vision note; don't build for
  it here.
- Changing a card's flags is a rules change in effect — re-run `node game/test.js` and the
  balance lab after edits; note that in the editor's save toast if easy.

---
skipped: bigger-than-16 pools, per-side asymmetric decks, deck-building draft loop — all post-V0
vision. Build the editor for the current 16-card deck first.
