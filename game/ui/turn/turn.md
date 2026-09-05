# The turn

One turn being taken: the hand it is chosen from, the prompt for the step in
front of you, the journal of turns already taken, and the AI's turn when a seat
is not human.

## The base

Everything that advances a turn is a `uiAction` (`turn.js`). An action declares
the engine call and, optionally, what to animate; the base does the rest — catch
a rejection, drop the selection, repaint, persist, push over the wire, and hand
the next turn to the seat. There are four: `card`, `step`, `concede`, and the AI
driver's own walk through a planned turn.

Nothing else may call `E.applyStep`, `E.playCard` or `E.concede` from the UI.

## Adding a way to advance a turn

1. `uiAction({id, run})` in `turn.js`. `run` is the engine call and nothing else.
2. Add `fx` if it should animate, `overDelay` if it can end the skirmish on an
   animation, `quiet` if a rejection is not the player's mistake.
3. Wire the control that fires it.

## The rooms

| file | is |
| --- | --- |
| `turn.js` | the door and the action base |
| `hand.js` | the hand, and a card's short form |
| `prompt.js` | what the current step wants, and its buttons |
| `journal.js` | the record of turns taken, on screen and as text |
| `glossary.js` | every card, and what each side has spent |
| `ai-turn.js` | the AI's turn, walked on a timer |

A card's abbreviation is `abbr` in `content/cards/`, not a table here: a new card
is either explicitly abbreviated or predictably initialled.
