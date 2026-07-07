#spec
# V1 — Field Manual: animated, human-readable rule explanations — first impressions & questions

Feedback Round 5 → V1: *"UI update to field manual to have animation explanations of the rules
(especially around support and ties) — make it more human readable."*

A **thinking doc, not an implementation plan.** Nothing here is committed.

## What the Field Manual is today

`#manualOvr` in `index.html` (~line 700): a parchment overlay of dense prose — Object, Your Turn,
Units, Combat, Terrain & Buildings, Control. It's **accurate but a wall of text**, and the two
things Bill called out — **support** and **ties** — are exactly the fiddly bits buried in the
thickest paragraph:

> *"Attacker: unit's attack + support of your other units adjacent… (+1 if HQ adjacent) + forest…
> Attacker support does not arrive across a trenched border… Higher total wins… Tie: both
> destroyed."*

That's four interacting rules in two sentences. Prose is the wrong medium for "who counts as
support and why does this attack tie" — it's a **spatial, step-by-step** thing. It wants to be
*shown*.

## The core insight: the battle already animates all of this

We do **not** need to invent an animation language. The live FX layer already teaches these exact
concepts every time a real attack resolves (`capturePre`/`playFX`, `fxStrike`, ring/slide/pop/ghost
helpers, engine.js `computeAttack`/`supportFor`):

- **strike arrows** on every attack (bending through the HQ on via-attacks),
- **supporter rings on every unit that actually counted** — **gold = attacker's support, steel =
  defender's** — read straight from `E.supportFor(...).hexes` (engine truth, incl. trench/river
  blocking),
- **hover attack pills** (`A vs D`) computed by `E.computeAttack` so the number can never disagree
  with resolution.

**The Field Manual should reuse that same vocabulary.** The huge payoff: **what you learn in the
manual is literally what you see in battle** — same gold/steel rings, same arrows, same pills. The
manual becomes the tutorial for the game's own visual language, not a separate diagram set that can
drift from it.

## The proposal: a "diagram player" of worked examples

Replace each dense rules paragraph with a **small animated worked example** — a fixed mini-board
(a handful of SVG hexes, reusing renderBoard's hex drawing) running a **scripted timeline** of
steps, with a plain-language caption synced to each beat, and Replay / Step controls.

Because each example is built from a **real constructed engine state** and animated by the **real
`computeAttack`/`supportFor`**, the numbers and rings are guaranteed correct — the same guardrail
that keeps the hover pills honest. A rules change automatically flows into the manual; nothing to
hand-redraw.

### The animations, in priority order (Bill named the first two)

1. **Support — the headline.** Blue infantry attacks a hex. Beat by beat: base attack appears →
   each adjacent friendly unit lights a **gold ring** and the tally ticks +1 → adjacent HQ adds +1
   → forest edge adds +1 → the defender's **steel rings** light for *their* support → the `A vs D`
   pill lands → resolve. Caption per beat in plain words ("Two friendly units sit next to the
   target — each lends +1").
2. **Ties — the other headline.** A worked example engineered to tie: tallies land equal → **both
   units fall** → and crucially, **the attacker does NOT advance** into the hex. Then two riders:
   an **HQ tie** (capturing the HQ on a tie still *wins* the battle) and a **`tieSpare` card**
   (Ordered Withdraw — attacker survives the tie). Ties are where players get surprised; show all
   three cases.
3. **Trench vs river (the support asymmetry).** Same attack twice: once the attacker's support
   crosses a **trenched** border and is **denied** (ring greys out, tally drops); once across a
   **river** and **crosses freely** (Round-3 semantics — the thing everyone gets backwards). Side
   by side makes the asymmetry obvious.
4. **Directional terrain.** Forest lights its gold +1 only when its hex attacks **out** across the
   covered edge; mountain lights steel +1 only when its hex is **attacked** across the covered edge;
   neither fires the other direction. The perennial confusion, shown as "same forest, two
   directions, only one lights."
5. **Through-HQ.** A unit adjacent to an HQ moves/attacks **through** it to the far side; the strike
   arrow bends through the HQ hex (exactly the live via-attack bend).
6. **Control & deploy.** Controlled hexes glow; a legal deploy target pulses; a would-be target
   **across a river** is crossed out (control doesn't extend over water).

### Human-readability, not just motion

- **Progressive reveal + synced captions** — one idea per beat, plain language, no rules-ese dump.
- **Replay / Step (Next/Prev)** so a reader can sit on the tie frame and study it.
- **`prefers-reduced-motion`** → render the final annotated frame + caption instead of animating.
- Keep the parchment/brass aesthetic; keep it **zero-dep** (SVG + CSS + JS in `index.html`, no
  library, no GIF/video), file://-runnable.

## Where it lives

Upgrade `#manualOvr` **in place** (stays in `index.html`, zero-dep). README stays the **text
canon** (markdown can't animate); the in-game manual becomes the **animated illustration of it**.
Open question whether this graduates from an overlay to a proper menu **"Academy / Basic Training"**
screen (room for a guided first-run walkthrough later — adjacent to the roguelite onboarding need).

## Questions for Bill

1. **Which animations first?** You named **support + ties** (#1/#2). Of the rest — trench-vs-river
   (#3), directional terrain (#4), through-HQ (#5), control/deploy (#6) — which round out the first
   pass? (My lean: #1 #2 #3, since support/trench/river are the tightly-coupled confusing cluster.)
	1. let's do 1,2,3 but also lets make a Claude onboarding doc so we can make more or edit if necessary 
2. **Build on the live FX engine** (my strong lean — reuse rings/arrows/pills + real
   `computeAttack`, so the manual and battle teach the same language and can't drift) — or
   hand-author bespoke SVG per rule (more art control, but a second thing to maintain that can
   disagree with the rules)?
	1. yeah lean on the life fx 
3. **Interaction level:** (a) auto-play loop, (b) step-through with Next/Prev (my lean — best for
   studying ties), or (c) an interactive sandbox where *you* place a unit and watch support resolve
   live (most teaching value, most work — could be a fast-follow)?
	1. b
4. **Overlay or a menu "Academy" screen?** In-place upgrade of the Field Manual overlay (smaller,
   ships sooner) vs a dedicated tutorial screen (room to grow into first-run onboarding)?
	1. in place upgrade; we will do the tutorial much later.
5. **Static stills for the README / rule book?** Should the diagram player also export annotated
   final-frame PNGs so the markdown docs get matching pictures, or keep animation in-game only?
	1. not need to export static pngs, we can do that later if needed.
6. **First-run nudge?** Auto-open the support/ties animations the first time someone plays (a
   "Basic Training" prompt), or leave the manual purely on-demand?
	1. not needed.

Answer 1–3 and I can spec the diagram-player format (the scripted-timeline shape + how it
constructs the example states from the engine) and build the support + ties animations first as the
proof of concept.
