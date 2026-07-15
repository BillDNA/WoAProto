# Parking Lot — Constraint temperature (escaping local maxima)

**Status:** partly captured, needs development · captured 2026-07-15 · graduates to a spec (loop tooling) when the escape mechanism is defined

> "If the constraints are too tight in the balance loop, [we] can't make big enough steps to move out of a local maximum of the search space."
> — Bill, 2026-07-15

**This is already half-captured — in `grading-rubrics.md` §Temperature (Bill, 2026-07-12), not on the board**, which is why it was hard to find. That section defines a **grading dial** (T0 strict / T1 explore / T2 hot) — *"how much regression the loop is allowed to buy improvement with"* — names the local-maximum problem outright (*"graded strictly … the loop gets pinned at a local maximum"*), and already flags structural constraints (the 16-card deck) as *"candidates for the temperature dial too."*

## The gap this note holds

The captured version is **acceptance tolerance** — a dial you *state in the analysis* when judging a finished candidate. Bill's framing is the **search-exploration** face of the same knob, and it isn't developed:

- **Local-maximum detection.** How does the loop *know* it's stuck (every north star passing, nothing adoptable) and should raise temperature — instead of a human noticing after the fact?
- **Constraint relaxation as an active move, not a footnote.** Deliberately loosen a *structural* guardrail (16-card ceiling, piece stock, deploy-step counts) to take a big enough step to jump basins — then re-measure at T0/T1 to decide what actually ships. Which constraints are dial-able vs. the hard floors (Tie ≤15, 0-kill ≤5, deploy-steps ≥ stock) that never relax?
- **Automation.** Manual dial, or something the overnight autonomous loop drives itself? (Ties straight to the trustworthy-loop roadmap flag.)

## The live example that motivates it

`cavsplit17-raid-paid` (loop v2) — a **17-card** deck that beat baseline on Drag *and* Swings but breaches the 16-card guardrail. Adopting it *is* a temperature decision: relax the ceiling to keep a change that escaped a local max. **The pending 17-card-deck adopt/reject call belongs to this note** — decide it once the temperature policy is defined, not before.

## When it graduates

When the escape mechanism is concrete enough to spec: a local-max signal, a ranked list of dial-able constraints, and a re-measure-to-ship rule. Then it's loop tooling under the trustworthy-loop / actionable-data milestones. See `brainstorming` when ready.

## Related
Extends `grading-rubrics.md` §Temperature · [[Roadmap]] · [[Goals]] physical-limitations · [[Goals]] improve-balance-numbers

#parking-lot #project-direction #balance
