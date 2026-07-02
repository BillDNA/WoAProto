---
name: create-card
description: Propose new War of Attrition cards that add a decision the deck doesn't already offer, graded against the card rubric, in the exact deck-editor data shape. Use when asked to "design a card", "add a card", or "what card is the deck missing".
---

# create-card

Read the deck, find the missing decision, propose cards Bill can drop straight
into the Deck Editor. **Proposals only — never edit maps.js or custom-deck.js.**

## Read first

- `game/maps.js` — the current `"cards"` list (and `"units"` for legal deploy targets).
- `design-docs/card-cheatsheet.md` — the FULL step vocabulary. It is small on
  purpose: `deploy(unit, anywhere)`, `trench`, `attack(mod, tieSpare, noAdvance)`,
  `reposition`, `barrage`. **A card needing a step type that doesn't exist is an
  engine change — flag it as such, don't pretend the JSON works.**
- `design-docs/grading-rubrics.md` — the card rubric (goal / evidence / score meaning).
- Latest card report (`node game/balance.js 40` or Bill's Balance Dashboard) —
  where the current deck is weak (dead cards, hoarded cards, auto-plays).

## Shape of a proposal (the deck-editor data shape, verbatim)

```json
{ "id": "snake_case_id", "name": "Name", "count": 1,
  "text": "What the player reads.",
  "steps": [{ "type": "attack", "mod": 1 }] }
```

Rules the Deck Editor enforces (match them or the proposal is dead on arrival):
16 total copies per deck (so say which existing card's copies to cut), exactly
one `starting:true` card at count 1 (never propose a second), unique ids,
known step types/flags/units only. `airdrop` as an id is engine-special
(kept out of opening hands). Art is by id — `game/art/<id>.jpg` optional,
text-only renders clean.

## Steps

1. Map the deck's existing decisions (deploy tempo, attack buffs, mobility,
   denial). Name the gap you're filling — "another attack card" is not a gap.
2. Draft 2–4 candidates. For each: the JSON, the decision it adds, and a
   card-rubric self-grade (predicted Skip% risk, Simple% risk, is it
   always-good-on-sight?).
3. State the swap: which copies leave the 16 to make room, and why.
4. Tell Bill how to test: import via Deck Editor (or hand-edit maps.js), then
   `node game/test.js` + a Balance Dashboard run; watch the new card's Skip% /
   1stSight% columns.

## Gotchas

- Multi-step cards are the interesting design space (steps run in order,
  each skippable) — but every extra step raises the Skip%-never-useful risk.
- A negative `mod` (Careful Maneuvers uses -1) is a real cost lever.
- Don't propose bigger-than-16 pools or per-side decks — post-V0 vision.
