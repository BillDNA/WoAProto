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
* ==**flow**== — each state shows how it changed and where it leads, carrying the player to the next decision without a stop to think.
* ==**never lost**== — however crowded the frame, the player can always find where they are and what matters now; nothing makes them hunt or drown.

## Axes of evaluation

### Per surface

1. ==**The eye is led.**== Squint the screen down to blobs of light and dark — what pulls your eye first? Is it the decision this turn, or a secondary reading that merely sits there outranking the live choice? Weight, size, and space should rank the frame so attention lands where the turn is decided; when everything shouts equally nothing leads, and the player is left to search a crowded field.

2. ==**What belongs together sits together.**== Before you read a word, can you tell which marks are one group and which are apart — a piece and its strength, a card and its cost? Do the gaps inside a group read tighter than the gaps around it? Proximity, a shared panel, and a common edge should do the grouping for the player, or the frame dissolves into one undifferentiated field they have to sort by hand.

3. ==**Every mark earns its ink.**== Go element by element — is this carrying information, or is it decoration? Take it away in your mind's eye: was any meaning lost? Content should out-weigh its chrome; borders, fills, and readouts that repeat what's already shown are clutter that buries what matters, and the move is to mute them or spend their weight on something that earned it.

4. ==**You read it without leaning in.**== Read the values a player consumes every turn at the size, contrast, and crowding they are really met with — do you take them in, or lean in to parse them? A mark you can't read at real size is its own way of drowning; a cleared contrast floor is the minimum, never the aim, and the move is more contrast, size, or room until it is taken in at a glance.

5. ==**The change shows itself.**== When the player acts, can they *read* what just changed — the piece that fell, the turn that passed — without hunting for it? And does the new state put the next decision in front of them rather than leaving them to re-find their place? A readable interface carries the player forward on a change it makes legible; one that redraws in silence makes them re-derive the state from scratch every turn.

### Across the set

6. ==**You've met this before.**== Point at any control or readout — can a fresh player name what it is and does from a convention the world already taught or a plain word on its face? And set it beside its kin elsewhere: does the same role wear the same clothes on every screen, or has a twin borrowed a costume it hasn't earned? A tongue the player learns once — recognizable on sight and never contradicted — lets new screens be read without translation; a cryptic control or a drifted role sends them back to decode it.
