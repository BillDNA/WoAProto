---
summary: What makes a War of Attrition screen *read* — written in one language, flowing from each state to the next, never lost in its own sea of information.
applies-to: any rendered screen or on-screen element in the browser rig (`game/`) — an existing surface under review or a proposed change. Read it on the real screen, in the state a player actually meets it, against the rest of the interface it lives in.
---
# UI rubric

A screen can render every right pixel and still not *read*. This rubric asks the
one thing no test can: is the interface **understood** — written in one language,
carrying the player from each state to the next without a stop to think, never
lost in its own sea of information? That is a matter of taste, judged the way a
designer runs a critique, not the way QA runs a checklist: each axis is a
question you put to the screen and answer with an **observation and a direction
to move**, never a pass, a fail, a score, or a band. Set the board up in your
head and look before you read a label.

## Goals

* ==**one language**== — the whole interface is written in a single visual vocabulary; a player never re-learns a word the game already taught.
* ==**flow**== — each state hands the player to the next; what to do, and where it leads, is legible without a stop to think.
* ==**never lost**== — in a sea of information the player always knows where they are and what matters now; nothing makes them hunt or drown.

## Axes of evaluation

### Per surface

1. ==**The eye is led.**== Squint the screen down to blobs of light and dark — what pulls your eye first? Is it the decision this turn, or a secondary reading that merely sits there outranking the live choice? Weight, size, and space should rank the screen so attention lands where the turn is decided; when everything shouts equally nothing leads, and the player is left to search.

2. ==**What belongs together sits together.**== Before you read a word, can you tell which marks are one group and which are apart — a piece and its strength, a card and its cost? Do the gaps inside a group read tighter than the gaps around it? Proximity, a shared panel, and a common edge should do the grouping for the player, or the layout dissolves into one undifferentiated field they have to sort by hand.

3. ==**Every mark earns its ink.**== Go element by element — is this carrying information, or is it decoration? Take it away in your mind's eye: was any meaning lost? Content should out-weigh its chrome; borders, fills, and readouts that repeat what's already shown are the sea the player drowns in, and the move is to mute them or spend their weight on something that earned it.

4. ==**You read it without leaning in.**== Read the values a player consumes every turn at the size, contrast, and crowding they are really met with — do you take them in, or lean in to parse them? A cleared contrast floor is the minimum, never the aim; a number you have to squint at each turn charges a toll each turn.

5. ==**Each state hands you to the next.**== When the player acts, does the screen show what changed and put the next decision in front of them? Can they always tell, without hunting, what just happened and what the game now waits on? A readable interface carries the player forward on the change; one that redraws in silence makes them re-orient from scratch every turn.

### Across the set

6. ==**The whole game speaks one tongue.**== Can a fresh player name a control from its look and label alone — and does that same role wear the same clothes everywhere it appears? Do things that look alike truly share a role, or does a twin borrow a costume it hasn't earned? A vocabulary learned once and never contradicted lets new screens be read on sight; a role that has drifted, or a pattern reinvented where a known one would serve, sends the player back to decode it.
