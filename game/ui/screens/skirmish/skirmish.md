# The skirmish screen

The place a battle is fought. Three full-height columns: both mats on the left
(opponent top, yours at the bottom beside the hand), board and prompt and hand
in the middle, the journal on the right.

## The base

A `uiRegion` says which element it owns, which household paints it, and — for a
rail a small screen cannot afford — which modal it mirrors into. `regionsPaint`
repaints in declaration order; `regionsSync` refreshes whichever mirrors are
open. A mirror copies the rail's markup, drops what the modal already provides,
and puts back the handlers `innerHTML` dropped.

The screen paints its regions; it does not know how any of them is drawn. The
turn draws the hand, the prompt and the journal; the board draws the board and
the mats; the session decides whose they are.

## The rooms

| file | is |
| --- | --- |
| `skirmish.js` | the door: the region list and the repaint |
| `region.js` | the region base |
| `topbar.js` | who is up, the campaign score, the field-score tug bar |
| `debug.js` | this exact state, saved for a bug report |

## Layout rules

- Board and hand are primary and never yield; the rails are reference and
  degrade first. Surplus width goes to the board.
- The board is bounded by its hex geometry: `renderBoard` sets `--board-ar` from
  the viewBox so a tall map does not stretch. Never give `#board` `width:100%`.
- Mats never scroll (`#leftcol{overflow:hidden}`). Below 960px wide or 580px
  tall the journal rail hides behind `#fabJournal`; below 720px the left rail
  hides behind `#fabRosters` and the board goes full-bleed.
- The tug bar and the mats both read `fieldScore`, so they agree by
  construction: solid is the score now, hatched the ceiling if every reserve
  deploys, the cream seam the projected front.
