---
summary: What makes a good War of Attrition Card — a played order that adds a real decision, never a dead turn, worth more than the basic-action fallback.
applies-to: any Card in the active Deck (`content/decks/`) — an existing card under review or a proposed new one. Read against the whole Deck it sits in, never alone.
---
# Card rubric

A Card is a one-shot order played from the hand and then spent; any Card may
instead be spent as a basic Attack or Reposition. This rubric judges whether a
Card *earns its slot in the Deck* — a matter of taste. The per-Card health
numbers (Noop%, Simple%, 1stSight%/AvgSeen, Pts/Resid and their bands) belong to
`docs/balance/`; cite one only as evidence for a finding made here.

## Goals

* ==**a card is a choice, not a stat**== — it opens a line of play the rest of the Deck doesn't already offer.
* ==**every draw can be played**== — no Card should burn a turn resolving to nothing.
* ==**the printed order beats the fallback**== — if a Card almost always resolves as a basic Attack or Reposition, its text is decoration.

## Axes of evaluation

1. ==**The board state names the card.**== Describe the position where a player reaches for *this* Card and nothing else in the Deck would do. If the best you can say is "whenever" (it's good in every position), or "the same place as *that* card, a little bigger" (a stat-twin), the Card hasn't found its moment. The fix is to move its *when* — change the condition or shape of the order — not its numbers; bigger numbers make a better stat, not a new choice.
2. ==**Dead turns hide in the Deck, not the text.**== A Card that reads playable can still resolve to nothing once the Deck around it has spent what it needs — a deploy or trench order with no stock left, a move with nothing to move. Trace each printed step to the resource it consumes and ask what has already drained it by the turn this Card is usually drawn. A dead turn found here names the oversubscribed step (Noop% is the evidence); the repair is fewer steps of that kind across the Deck, or a step that always has something to do.
3. ==**The text is the reason it gets played.**== Watch what a competent player (or the AI) actually does with the Card in hand. If it keeps getting cashed as a basic Attack or Reposition (Simple% is the evidence), the printed order is losing to the fallback — usually because it offers *more of the same* rather than something the fallback can't do. Say which positions the fallback wins; the fix is to give the printed order a thing basic actions can't reach (a position, a tempo, a target), not a bigger payload.
4. ==**Reflex and hoard indict the evaluator first.**== A Card played the instant it's drawn, or held to deck-out, is a finding about *whoever is choosing* before it is a finding about the Card (1stSight%/AvgSeen are the evidence). Editing the Card to break a reflex usually relocates it. Confirm the pattern is a real problem in play — and check whether a hoard is functional (a held attack Card can be the Deck's late kill supply) — before proposing any card change; when the evaluator is at fault, point at its weights, not the Card.
5. ==**The price is a claim to test against play.**== A Card's cost says what it should be worth; the finding describes what it is worth at the table — what it wins, when, and against what. The balance report's per-Card `Resid` is soft evidence for that description, never the verdict (its confounds and band are `docs/balance/`'s to state; measured balance overrules the price, ADR-0002). A `⚠` earns a watch-list entry with the play-pattern that explains it; a price change needs the play-pattern to be wrong.
