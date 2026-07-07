---
name: create-card
description: Propose new War of Attrition cards that add a decision the deck doesn't already offer, graded against the card rubric, in the exact deck-editor data shape. Use when asked to "design a card", "add a card", or "what card is the deck missing".
---

# create-card

Read the deck, find the missing decision, propose cards Bill can drop straight
into the Deck Editor. **Proposals only — never edit the `content/decks/` files
or custom-deck.js.**

## Read first

- `game/content/decks/default.js` — the active deck's card list (and
  `game/maps.js` `"units"` for legal deploy targets).
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
   card-rubric self-grade (predicted dead-turn risk, Simple% risk, is it
   always-good-on-sight?).
3. State the swap: which copies leave the 16 to make room, and why.
4. Tell Bill how to test: import via Deck Editor (or hand-edit
   `content/decks/default.js`), then
   `node game/test.js` + a Balance Dashboard run; watch the new card's Simple% /
   1stSight% columns.
5. **Offer art (only if Bill approves the card first).** If the `dig-mcp` MCP
   server is connected, ask Bill whether he wants generated card art. Only on a
   yes: `list_checkpoints`, then `generate_images` with a prompt in the game's
   art direction (steampunk Napoleonic field journal — parchment, brass, earthy
   tones; a hero shot of the card's subject, no text/UI chrome). Tell Bill the
   art is looked up by id, so the file goes to `game/art/<id>.jpg` (run
   `dev/optimize-art.ps1` on the raw render first). If dig-mcp isn't connected,
   say so and skip — the card renders clean as text-only. Never generate art for
   a card Bill hasn't approved, and never place files without showing him first.

## Gotchas

- Multi-step cards are the interesting design space (steps run in order,
  each skippable) — but every extra step raises the dead-turn (never-useful) risk.
- A negative `mod` (Careful Maneuvers uses -1) is a real cost lever.
- Don't propose bigger-than-16 pools or per-side decks — post-V0 vision.
