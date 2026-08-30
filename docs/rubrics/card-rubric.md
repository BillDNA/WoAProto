---
summary: What makes a good War of Attrition Card — an order whose turn you remember, that argues with its hand-mates, and whose misplay you can name.
applies-to: any Card in the active Deck (`content/decks/`) — an existing card under review or a proposed new one. Read against the whole Deck it sits in, never alone.
---
# Card rubric

A Card is a one-shot order played from the hand and then spent; any Card may
instead be spent as a basic Attack or Reposition. Whether a Card is *legal*,
*live*, and *priced* is the balance sweep's job (`docs/balance/`); whether it is
**good** — worth the slot, worth the read, worth the turn — is this rubric's.
Every axis asks for a described moment of play; if a finding could be read off a
report column, it isn't a finding here.

## Goals

* ==**a card is a moment, not a modifier**== — the turn you play it is a turn you could tell someone about.
* ==**the Deck is a conversation**== — each Card sets up, answers, or competes with the others for the same turn.
* ==**you can get it wrong**== — a good Card has a misplay, and the misplay teaches.

## Axes of evaluation

1. ==**The best play is a story about the board.**== Describe the strongest turn this Card can have — what it changed, and what had to be true for it to work. If the story is "I did the basic thing, but more", the Card is a modifier wearing a name. If the story needs a position, a timing, or an opponent's mistake, it is a moment. The finding says which, and what would have to be *true of the board* for the Card to become a story.
2. ==**It contends for the turn.**== Name the Cards in the hand it fights with for *this* turn and the ones it sets up or answers. A Card that is never in contention — always played first, always last, always alongside — isn't in the conversation; it's a bye. The finding names the missing tension: what *should* it cost to play this now rather than that?
3. ==**The regret is legible.**== Describe the misplay — the state where holding it, or cashing it as a basic action, was right and the player didn't. A Card with nothing to get wrong is filler or reflex; a misplay you can't explain afterwards is noise. Either way the finding says what the player should have been able to read, and what on the Card or board hides it.
4. ==**Every printed word buys something.**== Read the order aloud. For each step, say what it does that the rest of the order — or a basic action — doesn't. The finding names the step that could go without anyone noticing, or the step only this Card can do; a Card that keeps getting cashed as a basic action usually has none of the latter.
5. ==**Winning with it feels earned.**== Describe the game it decides: does the winner feel they *played* it, and does the loser see what they should have done? A Card that wins games nobody feels they earned, or costs more than its best turn ever returns, is mispriced in the way that matters; the report's `Resid` is evidence for that description, never the verdict (measured balance overrules the price, ADR-0002).
