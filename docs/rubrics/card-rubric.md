---
summary: What makes a good War of Attrition Card — a played order that adds a real decision, never a dead turn, worth more than the basic-action fallback.
applies-to: any Card in the active Deck (`content/decks/`) — an existing card under review or a proposed new one.
---
# Card rubric

A Card is a one-shot order played from the hand and then spent; any Card may
instead be spent as a basic Attack or Reposition. This rubric judges whether a
Card *earns its slot in the Deck*. It grades taste — the numeric health checks
(Noop%, Simple%, 1stSight%, AvgSeen and their bands) live in `docs/balance/`;
read them for evidence, decide here.

## Goals

* ==**a card is a choice, not a stat**== — it opens a line of play the rest of the Deck doesn't already offer.
* ==**every draw can be played**== — no Card should burn a turn resolving to nothing.
* ==**the printed order beats the fallback**== — if a Card almost always resolves as a basic Attack or Reposition, its text is decoration.

## Axes of evaluation

1. **Does it add a decision?** Can you name the board state where you'd reach for *this* Card over everything else in the Deck? A Card that is a stat-tweaked re-skin of a decision already on offer fails this — there's no new line of play, only a duplicate.
2. **Can it ever do nothing?** Is there a hand or board where playing the Card resolves zero actions — a No-op? Watch the whole Deck's step budget, not just the Card: a deploy or trench Card is dead once its piece stock is spent, so oversubscribing steps against stock is where dead turns hide.
3. **Is the printed order worth printing?** Do the printed steps beat the house-rule fallback often enough to justify existing? If the AI (or a player) keeps cashing the Card as a plain basic action, the printed text isn't paying its way.
4. **Is playing it a decision or a reflex?** Is the Card either always played the instant it's drawn, or always hoarded and never spent? Both are worth a look — but read them as *diagnostics of the evaluator, not verdicts on the Card*: a reflex "always play" or a deep hoard usually reflects the AI's eval weights, not the card design, and editing the Card tends to relocate the reflex rather than remove it. Confirm a real problem in play (or against the LLM population) before condemning the Card, and check whether the hoard is functional — a hoarded attack Card can be the Deck's late-game kill supply.

## Related runnable checks (`docs/balance/`)

No-op rate, Simple%, 1stSight%/AvgSeen and their bands are the evidence for axes
2–4; grade the reading, not the number.
