---
summary: What makes a War of Attrition screen *read* — a surface a player parses at a glance, whose eye lands on the decision, where nothing draws attention it hasn't earned.
applies-to: any rendered screen or primitive in the browser rig (`game/`) — an existing surface under review or a proposed change to one. Read a surface in the state a player actually meets it, and read a variant against the base primitive it extends.
---
# UI rubric

Whether a surface *exists* and is *wired* is a mechanical red (`dev/smoke.js`);
whether it *matches its target* is the blind Phase-1 look (`dev/ui-review.js`);
whether a variant *extends* the base primitive in code rather than forking it is a
mechanical red (`game/test.js`). Those are gates and settle before this doc opens. This rubric asks the one thing
a passing gate cannot: given that it renders, works, and matches the mock — does
it **read**? That is a matter of taste, so this is an aim, not a bounce: every
axis produces a **finding** — where the surface sits now and the change that
would move it toward the goal — never a pass, a fail, a score, or a band.

## Goals

* ==**you know it at a glance**== — a player meeting the screen cold can say what state they're in and what it's asking of them, before reading a single label.
* ==**the eye lands on the decision**== — the surface guides attention to what matters this turn; the loudest thing is the thing that matters most.
* ==**nothing draws the eye it hasn't earned**== — every element that pulls attention pays for the pull; chrome and decoration never compete with signal.

## Axes of evaluation

### Per surface

1. ==**Name it in one breath.**== Meet the screen in the state a player meets it and say, in one sentence, what it is and what it wants from you. If the sentence needs a label read aloud to write, or two graders write different sentences, the surface isn't orienting anyone yet. The finding names the element that should carry the sentence and what it would take for the layout alone to say it.
2. ==**Where does the eye go first, and is that right?**== Look once and mark where attention lands. Then name the decision the player actually owes this turn. If those are the same place, the hierarchy is working; if the eye lands on chrome, a static readout, or nothing in particular, it isn't. The finding names what currently wins the eye and the one thing that should — the change in weight, size, or position that would trade them.
3. ==**Read it, don't decode it.**== Take the text and icons a player must actually consume and ask whether they're consumed or deciphered — the contrast, the size, the spacing, the crowding. A surface that makes a player lean in to parse a number they need every turn is costing them attention it never priced. The finding names the element that resists reading and the direction — more contrast, more room, more size — that would let it be read at a glance.
4. ==**Take the loud thing away and see who mourns.**== Leave axis 2's winner aside — it has earned first place — and look at the *rest*: the element that pulls the next-most attention for the least decision, a heavy border, a saturated fill, an animation, a texture in the periphery. Imagine it quieted; if no read gets worse, it was drawing the eye on credit. The finding names the freeloading element and whether the fix is to quiet it or to give the attention it holds to something that has earned it.

### Across the set

5. ==**A variant should read as its base, wearing a hat.**== That a variant *extends* the base in code is the mechanical red's job; whether it *reads* as the same role is this one's — a surface can be clean code and still wear its marking as a disguise. Set it beside the base primitive and its sibling variants: a player should read it as *the same role, marked* — not as a stranger they must learn from scratch, and not so faintly marked its difference never shows. The finding names where the variant reads as new when it is a variant, or as identical when its difference should show, and the perceptual change — weight, colour, the marking itself — that would set the read-distance right.
