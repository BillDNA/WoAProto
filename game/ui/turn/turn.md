# The turn

One turn being taken: the hand it is chosen from, the prompt for the step in
front of you, the journal of turns already taken, and the AI's turn when a seat
is not human.

## The base

Everything that advances a turn is a `uiAction` (`turn.js`), and each one is a
room of `actions/`. An action declares the engine call and, optionally, what to
animate; the base does the rest — catch a rejection, drop the selection,
repaint, persist, push over the wire, and hand the next turn to the seat.

Nothing outside `actions/` may call `E.applyStep`, `E.playCard` or `E.concede`.

`turnKept()` is the part of that which is not the turn ending — repaint, persist,
tell the peer. Taking a turn back is a change to the state, not the end of a
turn, so it keeps rather than settles.

## Adding a way to advance a turn

1. A file in `actions/`, one `uiAction({id, run})`. `run` is the engine call and
   nothing else.
2. Add `fx` if it should animate, `overDelay` if it can end the skirmish on an
   animation, `quiet` if a rejection is not the player's mistake, `onReject` if
   the room has its own answer to a refusal, `settle:false` if it is one move of
   several the room is walking.
3. Schedule it in `game/load-order.js` and wire the control that fires it.

## The rooms

| file | is |
| --- | --- |
| `turn.js` | the door and the action base |
| `actions/card.js` | playing a card, and the modal that asks how |
| `actions/step.js` | resolving one step of a played card |
| `actions/concede.js` | giving up the skirmish |
| `actions/ai.js` | the AI's card and step, and the timer that walks them |
| `hand.js` | the hand, and a card's short form |
| `prompt.js` | what the current step wants, and its buttons |
| `journal.js` | the record of turns taken, on screen and as text |
| `glossary.js` | every card, and what each side has spent |

A card's abbreviation is `abbr` in `content/cards/`, not a table here: a new card
is either explicitly abbreviated or predictably initialled.
