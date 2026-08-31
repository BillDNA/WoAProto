# Balance vocabulary

The vocabulary for judging and iterating a *build* — the metrics, the loop, and the
army-points machinery. Concepts, not the numbers they currently sit at (those live in
the content, the code, the rule book, and `docs/balance-baselines.md`).

The cross-cutting anchors this vocabulary leans on — **Skirmish**, **Card**, **Deck**,
**Map** — are defined once in the root [`CONTEXT.md`](../../CONTEXT.md) map; this file
covers their *balance* facets (a Card's army-points, a Skirmish's per-row fact) without
redefining them.

## Balance & measurement

*(The project's vocabulary for judging a build — concepts, not the numbers they currently sit at.)*

**Balance loop**:
The iterate cycle: run AI (and LLM) play over the active Mapset, fold the per-Skirmish results into aggregate metrics, grade them, adjust content, repeat.

**Rules era**:
A regime of rules-plus-AI-strength treated as internally comparable; data across eras is not apples-to-apples.
_Avoid_: Version (reserve for the era's number).

**Baselines to protect**:
The healthy metric values for the current era; a sharp move away signals a regression even when win rates look fine.

**Drag**:
Trailing kill-less turns before a Skirmish ends — the "circling without resolving" signal.

**Swings**:
Lead changes within a Skirmish — the "back-and-forth" signal.

**No-op**:
A played Card that resolved zero actions — a dead turn.

**Skirmish fact**:
The flat record of everything the balance layer reads off one finished Skirmish
— winner, win type, field scores, kill-tail, tiebreak, hexes held, reserves
left, action counts. Derived in exactly one place (the engine's `skirmishFacts`),
whether from a live end-state or a persisted row, so the live fold and the
stored-data fold can never disagree.
_Avoid_: battle fact, per-battle row (a row is the persisted form of the fact).

**Balance sweep**:
An on-demand run asking "is this *content* balanced?" — distinct from the every-commit test sweep asking "does the *code* still function." The two never merge (ADR-0003): balance is a property of the build, function a property of the code.
_Avoid_: Test (the test sweep is the functional gate; the balance sweep is the balance oracle).

## Content iteration & army-points

*(The vocabulary for growing content without losing balance — concepts, not the weights they currently sit at.)*

**Army-points**:
A Card's *capability cost*, and a Deck's total value as the sum over its Cards. A descriptive yardstick Decks are built under — not a prediction of win-rate; measured balance always overrules it (ADR-0002). Computed additively from a Card's steps via a single weight table, never stored per Card, so a Card that does more counts for more.
_Avoid_: Cost (a step has a cost; the Card's total is its army-points), Power level.

**Points cap**:
The shared army-points budget every Deck is built under. Two Decks at the same cap are "matched" in capability, which is what lets a Skirmish be asymmetric yet fair.

**Tolerance**:
The balance band for a content-iteration loop — per scored metric (Red%, Drag, Swings, …), how far a candidate may drift from baseline and still be kept. It **shapes and flags, it never rejects** (#162 §4.2): a Red%/1st% drift is a *loud flag on the numbers*, not a bounce to empty. A loop's Tolerance is a named profile assigning each metric a Grace class (`game/content/tolerances.js`); the three global T0/T1/T2 are *uniform* Tolerances (all-`hold` / all-`nudge` / all-`bold`).
_Avoid_: calling a Tolerance a "temperature" or a "gate" — it is neither that scalar knob (below) nor a reject.

**Grace class**:
How much slack a single Tolerance (or a Step) is granted for one iteration loop: `hold` (baseline band, strict — the held/cold knobs), `nudge` (small grace), `bold` (large grace), `bypass` (band not enforced — don't-care this loop). Ranges are *per-Tolerance*: a `nudge` on Red% is a different width than a `nudge` on Drag.

**Step**:
The input-side facet of an iteration (a.k.a. *exploration*) — how far a candidate Deck jumps from the loop's **incumbent** (the previously-*adopted* Deck; the opening fixture at iteration 0), measured in *army-points re-allocated*, classed `nudge`/`bold` with its own points range. A bold Step can still land in-band; Grace governs when it doesn't. The incumbent *is* the reference — there is no separate "champion" pointer (it would differ only under uphill-accept annealing, out of scope; the loop is a hill-climb). Army-points price cards, so Step is a **card/deck-loop** measure; map-loop (hex) and AI-loop (weight) distance are a different metric. The parent `id` is persisted as a `woa.db` column (the single source; #95). _Was_ "Exploration temperature."

**Temperature**:
**Author boldness** — the input-side knob handed to the Author subagent: how far from proven patterns it may stray when it proposes content (safe reskin ↔ novel mechanic). Higher → weirder candidates reach playtest. A **plain scalar passthrough**, set at Plan time and carried straight into the Author's prompt; it gates nothing, folds into no report, and is not the balance band (#162 §4.2). Distinct from a **Tolerance** (the balance band, above) and from the grading-pass regression tier (`docs/balance/README.md` §Temperature, the dashboard T0/T1/T2 dial) — that tier is a reviewer's dial for how much regression to accept when grading, not this authoring knob.
_Avoid_: using "temperature" for the balance band (that is a Tolerance) or for the grading regression tier (name that the grading tier / T0-T2) — reserve the bare word for author boldness.

**Mispricing residual**:
The gap between a Card's *measured* win-contribution and its *army-points* cost. A large gap flags an over- or under-priced Card — the anti-slop signal. Advisory only, because of the Timing blind spot.

**Timing blind spot**:
The balance scorer's known inability to value a Card whose worth is in *when* it is held or played (e.g. a saved attack buff). Such a Card can read as weak or mispriced without being either. Same class of gap as the AI eval not seeing reserve-hoarding.

**Card dominance**:
A game-theory reading of a Card against its alternatives: *Dominant* (worth playing whenever available), *Weakly dominated* (never strictly better than another option), or *Strictly dominated* (always a worse choice than something else). What a calibration pass is really trying to classify — a Deck of dominant-vs-dominated Cards is a Deck of non-decisions.
_Avoid_: Strength, tier (dominance is relative to the alternatives, not an absolute power level).

**Decline signal**:
How often a Card sat *in hand and was passed over* — the observable that separates a Strictly-dominated Card from one that was simply never drawn. Read *per game-phase*, because a phase-appropriate hold (a late-game buff idle early) is not dominance. The measurement the Timing blind spot was waiting on.
_Avoid_: Skip rate (a played Card can still No-op; decline is about not playing at all).

**Capability class**:
The set of Cards sharing a single army-points *lever* (one step type, one unit tier, the attack-mod, a flag). The unit at which a *shared* weight is tuned — one lever, one class, one candidate weight-move. A Card joins its classes by *realized* contribution, not printed cost, because resolution may skip a Card's actions.
_Avoid_: Card type, archetype (a class is a pricing-lever grouping, not a theme).

**Feels loop**:
The qualitative LLM read on a build — "were the decisions interesting, or a reflex?" — run as a sanity check alongside the crunchable balance metrics. Balance is numbers, feels are not, and a mathematically balanced game is not automatically a fun one; so the feels read can veto a change the numbers endorse, but never feeds the metric math.
_Avoid_: Fun score (it is a judgment, not a number on the balance ledger).

**Blind-spot flag**:
A free-prose observation from the Feels loop that the tooling itself is missing something — either the heuristic AI can't *see* a consideration a strong player would weigh (a missing eval *input*, not just a re-weighting of the existing knobs), or a balance *number* you'd want to judge the match by is absent. Deliberately unstructured to catch unknown-unknowns; accumulates across an overnight loop into the review-reports analysis artifact for a human morning-review, who gates every one (a new AI eval term or balance metric is human-implemented code, never auto-wired). The anti-bloat test is a goal — *reject a proposed knob that's just a wrapper/combination of existing knobs* — stated with a couple of examples, never an enumerated checklist (enumerating it would train future sessions to answer the list and miss the unknown-unknowns).
