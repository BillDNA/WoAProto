#spec
# V1 — AI search pruning, weight tuning & the trench-orientation answer — first impressions & questions

Feedback Round 5, the "heuristic AI update & balance report speed" cluster:
- *"review how we do our search of valid plays (probably can do some automatic pruning to speed
  up especially the balance report) — goal speed up the simulated battles."*
- *"use this to give Claude plays a more concentrated set of options reducing the context usage
  each volley — goal reduce claude plays token usage so we can do more runs."*
- *"a review of base line weights — goal use the data we have gathered to tune the heuristic."*
- *"question on how the AI picks the orientation for trenches with these weights — not clear in
  [[ai-heuristic-model]]."*

A **thinking doc, not an implementation plan.** All four bullets touch the same code
(`enumerateChoices` / `greedyResolve` / `evalState` / `aiPlanTurn` in `engine.js`), so they
belong in one spec. Nothing here is committed. Grounded in a read of the current search code.

## First: the trench-orientation answer (Bill's direct question)

**There is no dedicated trench-orientation logic, and that is the whole story.**

- `trenchOrientations(st,h)` (engine.js:492) lists every legal `[d, d+1]` edge pair on a hex
  (skipping edges that overlap terrain/other trenches, and — since Round 2 — pairs that face
  entirely off-board so the AI can't dig a do-nothing trench).
- `enumerateChoices` (engine.js:1054) emits **one candidate per orientation**.
- `greedyResolve` (engine.js:1084) clones the board for each, scores it with `evalState`, and
  keeps the highest. Orientation is chosen **exactly like every other step** — by which resulting
  board scores best. There is no "which way should this face" heuristic.

The catch, and why it read as unclear: **`trenchHome` (default 6) is orientation-blind.** It
rewards "a trench near my HQ" no matter which way it faces. Trenches are *attacker-support denial*
now, so the only thing that makes one facing better than another is a **second-order effect**: a
trench that denies a real enemy attacker's support changes `threatKill` / `threatTie` / `fsDiff`,
and *that* delta is what tips one orientation over another. **When no live threat crosses either
candidate border, every orientation scores identically and the choice is an arbitrary tie-break**
(first in enumeration order). That's the "not clear" — orientation is purely emergent, and often
undetermined.

→ **Proposed fix (Bill's call):** add an orientation-aware term — reward a trench whose *denied*
border actually sits on a current or one-step-likely enemy attack lane (we already compute enemy
threats in `evalState`; reuse that set). That turns "dig near HQ, face wherever" into "dig where it
actually blocks an attack." Alternatively, leave it emergent and just **document** the above in
[[ai-heuristic-model]] so it stops being a mystery. Either way [[ai-heuristic-model]] gets this
explanation added.

## The search today, and where the time goes

Per step, `enumerateChoices` returns **all** legal options: every deploy target, every attack,
every 1-hex move **and** every swap, every trench hex × every orientation, every barrage target.
`greedyResolve` `clone()`s the state and runs `evalState` **once per option, per step**. Hard AI
then multiplies that: top-`breadth` candidates each get `sampledReplyScore`, which re-enumerates
the **opponent's** whole move set over `replySamples` sampled hands (engine.js:1112). A full hard
battle is ~1s; a 60-battle × ~13-map report is where that adds up.

**The one existing prune is dangerous.** engine.js:1079: if a step has >80 options it
**random-shuffles and slices to 80**. That means on a high-branching step the AI can *randomly
discard the best move*. Fixing this isn't just speed — it's correctness.

## Pruning ideas (concrete, ordered by safety)

1. **Replace the random 80-cap with a ranked shortlist.** Give each option a cheap static
   pre-score (attacks by `computeAttack` outcome; repositions by advance-toward-enemy-HQ /
   threat-relief; deploys by landing-hex advance; trenches by "does this border block a live
   threat") and keep the top-K. Never randomly drop the winner. **This is the single highest-value
   change** — safer *and* faster than today.
2. **Dedup transpositions.** Hash the resulting board and skip options that land on an
   already-evaluated position (common with interchangeable empty deploy targets and mirror moves).
3. **Reposition pruning — the biggest branch.** Swaps + 1-hex moves dominate option counts. Prune:
   same-type swaps that are functionally a skip (already a dead move under the Round-3 rule),
   strict retreats with no threat relief, and moves that return to a symmetric prior position.
4. **Deploy bucketing.** Empty deploy hexes at the same distance-to-enemy-HQ are near-equivalent;
   evaluate one representative per bucket, not all.
5. **Trench pruning.** Only offer orientations that block a live/near threat border plus the
   near-HQ ones (ties into the orientation fix above) — instead of hex × up-to-6 facings.

**Speed vs optimality is a dial, and the two consumers want different settings.** The *balance
lab* tolerates approximation (it wants throughput over the perfect move); *live play* wants the
AI to still feel sharp. Proposal: pruning aggressiveness is a config knob (like `breadth`), lab
runs can crank it, presets stay conservative. Re-measure the `balance.js` Behaviour + skill-premium
lines after any prune — a prune that quietly weakens the AI shows up there.

## Reuse for Claude Plays: a concentrated option list

Today claude-plays hands the LLM **every** legal move each volley (honest, but token-heavy). The
same ranked shortlist (#1 above) becomes the **top-K options** shown to the model — fewer tokens
per turn, more runs per budget. **Honesty guardrails:** it must prune *dominated* moves, never
*strategic* ones — always include every attack, any HQ-relevant move (offense or defense), and
keep K generous (~12–15) with a visible "showing top K of N legal moves" note so the model knows
the list is filtered. Over-pruning that hides a creative line is the risk; K stays generous and the
note stays honest. (This pairs with [[v1-claude-plays-and-reports]], which cuts the *other* big
token cost — re-piping the rules every volley.)

## Weight tuning from the data we have

We now have accumulated balance data + the [[design-docs/grading-rubrics|grading-rubrics]]. Rather
than hand-nudge weights, propose a **dev-only offline tuner**: define an objective from the rubrics
(minimize tie-goes-to-2nd%, keep Behaviour baselines in band, maximize skill premium), then coarse
sweep / coordinate-descent over `AI_WEIGHTS` using `balance.js` as the fitness function. Report the
weights the data wants to move (likely suspects from current signals: the `attrWin` ramp, `advance`,
and whatever most reduces the ~26% tie-decided rate) as **suggestions for Bill**, never auto-applied.
Guardrail stands: never zero `noopPenalty` / `antiShuffle` / `attrWin` without re-measuring.

## Questions for Bill

1. **Trench orientation:** add an orientation-aware term (reward blocking a real attack lane), or
   leave it emergent and just document it? (My lean: add the term — it's cheap and fixes a real
   "faces nowhere useful" gap.)
	1. yes lets do it
2. **How aggressive on pruning?** Fixing the random 80-cap → ranked shortlist is a clear win I'd do
   regardless. Beyond that: OK to make the *lab* AI approximate for a big speedup while keeping
   *presets* conservative, or keep the search exact everywhere and take a smaller speedup?
	1. probably tunable there is probably some smart searching we can do like only looking into basic resolves if no card play is found to get above some score (i kinda have no idea what the range of scores is for a play)
3. **K for the claude-plays option list?** ~12–15 with an honest "top K of N" note, always-including
   attacks + HQ moves — good, or do you want the model to always see the full list?
	1. yeah i think we give it K of N of the best ranked moves based on the heuristic score
4. **Build the offline weight-tuner as a committed `dev/` tool?** Or one-off sweep, report the
   suggestions, then delete it?
	1. 
5. **Tuning objective.** Is "drive tie-goes-to-2nd% down + hold Behaviour baselines" the right
   target, or is there a feel you want the tuner to optimize for that a metric won't capture?
	1. numbers tuning is about getting heuristic ai to play better.  the thoughts tuning is about gauging more nebulous things like pacing and tention

Answer 1–2 and I can spec the ranked-shortlist prune concretely (with a before/after `balance.js`
timing + Behaviour-line check as the acceptance test).
