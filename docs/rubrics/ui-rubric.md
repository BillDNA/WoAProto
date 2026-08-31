---
summary: What makes a War of Attrition screen *read* — understood at a glance, the eye led to the decision, every mark recognized rather than deciphered.
applies-to: any rendered screen or on-screen element in the browser rig (`game/`) — an existing surface under review or a proposed change. Read it on the real screen, in the state a player actually meets it, against the rest of the interface it lives in.
---
# UI rubric

A screen can render, respond, and hold every right pixel and still not *read* —
the player can't find what matters, can't take a value in without leaning in,
has to decode a mark they should have recognized. That is the question here:
not whether the interface works, but whether it is **understood**. It is a
matter of taste, and taste is judged the way a designer runs a critique, not the
way QA runs a checklist — each axis is an **observation, tied to a goal, with a
direction to move**, never a pass, a fail, a score, or a band. Set the board up
in your head and look before you read a label.

## Goals

* ==**a glance is orientation enough**== — a player meeting the screen cold knows where they are and what it wants of them, before a single label is read.
* ==**attention goes where the decision is**== — the screen leads the eye to what matters this turn instead of leaving it to hunt.
* ==**recognized, not deciphered**== — every mark is taken in by reading and recognition, never by effort spent decoding it.

## Axes of evaluation

### Per surface

1. ==**The important thing is the loud thing.**== Squint at the screen — or blur it — until only blobs of light, dark, and size survive, and watch which pull the eye, and in what order, against the order the decisions actually matter this turn. If the eye's order tracks the stakes the hierarchy is working; if everything is equally loud so nothing leads, or the wrong element wins first place, it isn't. The finding names what wins the eye against what should, and the move — more size, weight, contrast, or breathing room on the one, less on the rest — that would trade them.
2. ==**What belongs together sits together.**== Before reading a word, ask of each element which group it belongs to, and whether the spacing, the shared enclosure, and the alignment say so — a piece and its strength, a card and its cost should read as one thing, and the gaps inside a group should be smaller than the gaps around it. When a value floats equidistant between two owners, or one flat spacing dissolves every group into a single field, the eye has to reason out what the layout should have shown. The finding names the element whose grouping misreads and the change — closing the near gap, opening the far one, a common panel, an aligned edge — that binds it to where it belongs.
3. ==**Every mark pays for the ink it spends.**== Go element by element and ask of each: is this carrying information, or is it decoration — a border, a fill, a gradient, a texture, a readout that repeats what's already shown. Take a candidate away in your mind's eye; if no meaning is lost it was spending the player's attention on credit, competing for weight with the board and pieces that are the real content. The finding names the freeloading mark and whether to mute it or to hand the attention it was holding to something that earned it.
4. ==**You read it without leaning in.**== Take the text and icons a player consumes every single turn and read them at the size, contrast, and crowding they are actually met with — the faint against its ground, the small against the eye, the packed against its neighbours. A number needed each turn that makes the player lean in is charging a toll every turn; legible-enough-to-pass (a contrast floor cleared) is a floor, not the aim. The finding names the mark that resists reading and the direction past the floor — more contrast, more size, more room — that lets it be taken in at a glance.
5. ==**It costs the player nothing they have to remember.**== Point at each control and readout and have a fresh player say, from its look and label alone, what it is and what it does — no clicking, nothing recalled from another screen. An element grasped on sight rides on a convention the wider world already taught or a plain word that names its function; one that must be decoded reinvents a familiar pattern or hides behind jargon. The finding names what has to be decoded and the pattern or plainer word it should move toward so recognition replaces recall.

### Across the set

6. ==**The game speaks one language.**== Set the surface beside the rest of the interface and check that a role keeps one voice — every primary action, every heading, every stat block, the card face itself, wears the same treatment wherever it appears, and things that look alike genuinely share a role. A player should never have to learn a word the game already taught them, nor be misled by two unlike things dressed the same. The finding names the role whose treatment has drifted, or the false twin that borrows a look it hasn't earned, and the single vocabulary the surface should be pulled back onto.
