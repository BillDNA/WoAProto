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
- `dynamic-scrum/docs/card-cheatsheet.md` — the FULL step vocabulary. It is small on
  purpose: `deploy(unit, anywhere)`, `trench`, `attack(mod, tieSpare, noAdvance)`,
  `reposition`, `barrage`. **A card needing a step type that doesn't exist is an
  engine change — flag it as such, don't pretend the JSON works.**
- `dynamic-scrum/rubrics/grading-rubrics.md` — the card rubric (goal / evidence / score meaning).
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
   always-good-on-sight?). **One adversarial checker per candidate** — a single
   skeptic pass against the card rubric (loop v2, B.5.1.1: down from two per
   candidate; the 2-checker delta wasn't significant).
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

## Loop v2 — the 3-for-3 batch (given the current deck)

When the balance loop drives this skill (B.5.2.1, Bill 2026-07-10), the invocation
is different from a one-off "design a card": you are **handed the current deck** and
told it will lose its 3 weakest slots this iteration. Generate **one batch of 3
candidates for those 3 replacement slots, judged AS A SET against the whole deck** —
not three independent 1:1 suggest-and-replace calls. Concretely:

- Read the whole deck first; name the 3 slots leaving (dead/hoarded/auto-play cards
  from the latest card report) and what the batch must add as a *set* (spread the
  decisions — don't propose three attack buffs).
- **Deck-budget corollary is a set-level constraint:** printed deploy steps vs stock
  (`F3:2…` piece stocks; the 9-vs-7 → 26–28% Noop lesson from iter2). Sum the batch's
  deploy steps with what stays and keep it within stock, or the new cards go dead.
- Grade the batch together (each card's rubric self-grade + one adversarial checker,
  per Step 2), then state the 3-out/3-in swap as a single move that keeps the deck at
  16 and exactly one `starting:true`.
- **Seed candidate for the first batch: split Deploy Cavalry** (WOA-009 §S4 — one
  2-cav deploy card → two 1-cav deploy cards). Grounding: Deploy Cavalry holds **80%
  1stSight across all four decks** — the strongest auto-play in the game and the
  cavalry-rush engine; splitting the double-deploy halves the opening burst without
  banning cavalry. Watch the budget shift doesn't reintroduce Noop%. Ref:
  `logs/reports/analysis/1.0/2026-07-10-rule-change-suggestions.md` §S4.

## Gotchas

- Multi-step cards are the interesting design space (steps run in order,
  each skippable) — but every extra step raises the dead-turn (never-useful) risk.
- A negative `mod` (Careful Maneuvers uses -1) is a real cost lever.
- Don't propose bigger-than-16 pools or per-side decks — post-V0 vision.
