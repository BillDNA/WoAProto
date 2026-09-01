---
name: woa-implement
description: Implement a WoA ticket like mattpocock implement, but with fresh graders and a real completion gate — a fresh test-writer subagent (never the implementer) writes the red-at-base falsifiers and prunes pins first; the implementer drives red→green with ZERO test-editing power; UI tickets run dev/ui-review.js instead of the biased inline review; and a completion step opens the PR, pushes a shots-branch, and emits the callout block. Use when asked to "implement", "woa-implement", or to build a ready-for-agent ticket with teeth.
disable-model-invocation: true
---

# woa-implement

The WoA wrapper over mattpocock **`implement`**. It sits **beside** that skill, never forks
it: everything about refreshing the base, opening a worktree, driving red→green with `/tdd`,
and committing is `implement`'s job and is restated below only because a
`disable-model-invocation` skill can't be called programmatically. The **only** thing this
wrapper adds is the three joints `implement` leaves loose (`docs/adr/0004-build-chain-teeth.md`
§2):

1. **Test-writer first** — a *fresh* subagent (never the implementer) writes the failing
   tests, confirms each acceptance criterion's falsifier is **red at the base commit**, and
   prunes superseded **pins** — before the implementer starts.
2. **Implementer has zero test-editing power** — it drives red→green only; a blocking test it
   did not anticipate is **escalated** back to a re-spawned test-writer, never edited, never
   escalated to Bill mid-flow.
3. **A real completion gate** — for UI tickets, `dev/ui-review.js` replaces the biased inline
   `code-review`; then the completion step opens the PR, pushes screenshots to a shots-branch
   (never committed), and emits the PR-template callout block.

**This wrapper carries no enforcement of its own.** The teeth live in the suite the chain
already runs — `node game/test.js` and `node dev/smoke.js` on every commit (bare `/implement`
included), plus `node dev/ui-review.js` for the fidelity gate — per ADR-0004. Bare
`/implement` still hits every suite red; it only loses the test-writer ordering, the fresh
review, and the callout. **Do not move any gate into this skill; "put the teeth in the
wrappers" is a rejected alternative in the ADR** (a wrapper is skippable; the suite is not).
All this skill does is *sequence* the fresh graders around the reds that already have a home.

Read `docs/context/test.md` (gate vs judgment vs escape valve; invariant vs pin) and, for a
UI ticket, `docs/context/ui.md` before you start — every "gate", "escalation", "pin", and
"invariant" here means exactly what those files carve.

## Process

Follow mattpocock `implement`'s frame unchanged — **refresh the base from disk**
(`git checkout main && git pull`, then `graphify update .`), **open a worktree**, then at the
end **run the full suite** and **commit**. The four steps below replace `implement`'s middle
("use /tdd, then /code-review yourself"). The ticket plus the spec it links is the whole
brief; a fresh implementer never needs the design conversation.

### Step 1 — Fresh test-writer subagent (never the implementer)

Spawn a **fresh subagent** whose sole job is to write the tests. It must be a different
session from the one that will implement — the author≠grader separation pointed at tests
(the content-loop doctrine). Its charter, verbatim in the subagent prompt:

- **Write one falsifier per acceptance-criterion *criterion***, in the criterion's home
  (`dev/smoke.js` for existence/interaction, `game/test.js` for logic/invariant,
  `dev/ui-review.js` review-spec for fidelity). A ticket's **goals** carry no falsifier —
  they are read by the review as rubric axes, not tested.
- **Confirm each falsifier is RED at the base commit.** Run it and paste the failing output.
  A falsifier that is green at base graded nothing — send it back to be rewritten, do not
  proceed. (This is the whole point: a weak AC is satisfied at 80%; a red-at-base falsifier
  cannot be.)
- **A transport-bearing falsifier must be integrated** — its asserted outcome comes from the
  real transport or a **faithful deterministic stand-in** (a pixel-aware fake that consumes
  the real capture *bytes*), never a stub that short-circuits the seam. Pair it with a
  committed live `*.smoke.js` run pasted on the PR (the `dev/ui-review.smoke.js` pattern).
- **Prune superseded pins** — freely, as routine work, **atomically with a `RULES_VERSION`
  bump** (in `game/engine/01-core.js`, with the manifest regenerated:
  `node dev/gen-test-manifest.js`). The default label is **pin**; the test-writer owns pin
  moves because it has no implementation to protect. See [Invariant vs pin](#invariant-vs-pin).
- **Never edit an invariant to make room** — an invariant change is Bill's by exception,
  surfaced in the PR callout, not decided here. If a criterion seems to require changing an
  invariant, stop and flag it for the callout; do not change it.

The test-writer commits the reds (and any pin-prune + `RULES_VERSION` bump) before the
implementer touches anything.

### Step 2 — Implementer (zero test-editing power)

Spawn (or continue as) the implementer with a hard constraint stated in its charter:

> You may **not** edit, delete, `.skip`, or otherwise disable any test. Your job is to make
> the red falsifiers green by changing product code only.

- Drive **red→green** ticket by ticket. Run the focused suites as you go
  (`node game/test.js`, `node dev/smoke.js`) and the full suite once at the end.
- **A blocking test you did not anticipate is escalated, never edited.** If a test blocks you
  and you believe it is a superseded **pin** (or encodes a genuine upstream gap), **escalate
  it back to a re-spawned test-writer** — which owns pin pruning and the `RULES_VERSION`
  bump. This **keeps the red**: it only reassigns *who* clears it, never *whether* it must
  clear (`docs/context/test.md`, escape valve). You do not edit it, and you do not take it to
  Bill mid-flow.
- If the blocking test is an **invariant**, that is a Bill-by-exception decision — surface it
  for the PR callout; do not change the invariant to get green.

The escalation is the load-bearing hard branch: the person who builds cannot rationalize a
test away, and the person who prunes has no implementation to protect.

### Step 3 — Fresh review

- **UI ticket → `dev/ui-review.js`, not the inline `code-review`.** Write the review-spec
  JSON (`{ ticket, acs, before, after, target }`; see `dev/proto/fixtures/ui-review/` and the
  `dev/ui-review.js` header) and run `node dev/ui-review.js <spec.json>`. Phase 1 is the
  **gate**: a blind describer sees *only* before/after (never the ticket) and the comparator
  bounces on any **target** element or acceptance criterion the after-render omits — non-zero
  exit stops here. Phase 2 is the **aim**: a `ui-rubric` read over after+target and the
  ticket's **goals** ("do we approach each?") — findings only, **never** affecting the exit
  code. The gate is *"the review ran against the target and emitted a verdict"*, not *"the
  review said yes"*.
- **Non-UI ticket → `/code-review`** as vanilla `implement` prescribes, plus the same *"do we
  approach the ticket's goals?"* read over its **goals** (an aim, never a bounce). A ticket's
  goals are assessed even when they cannot be a red.

### Step 4 — Completion (the step vanilla `implement` lacks)

1. **Push screenshots to a shots-branch, never committed to the tree.** `dev/ui-review.js`
   stages them to `refs/heads/pr-shots/<ticket>` via git plumbing (screenshots-are-proof-not-committed).
2. **Open the PR.** Commit the work to the branch and open the PR with the GitHub plugin.
3. **Emit the callout block** from `.github/pull_request_template.md`, every field filled
   (`none`/`n/a` are valid) and every `<!-- FILL: … -->` sentinel replaced — a leftover
   sentinel or a dropped field reds `dev/pr-lint.test.js`. The callout is the
   **by-exception dashboard**: new UI primitives + roles, invariants changed, pins pruned,
   `RULES_VERSION` bump, and the `dev/ui-review.js` result + shots link. This is where Bill
   approves the few real decisions — an invariant change, a new primitive — **by exception**,
   never mid-flow.

## Invariant vs pin

The **label decides the bucket** — the implementer judges neither (`docs/context/test.md`).

- **Pin** — this era's specific output (mat-slot counts, golden aggregates). Movable by the
  **test-writer** as routine work, **atomically with a `RULES_VERSION` bump** (the deletion
  guard in `game/test.invariants.js` reds on a pin deleted/`.skip`-ed without one). Default:
  a bare `test(...)` is a pin.
- **Invariant** — a property that must hold every rules era (determinism, GUI==CLI parity,
  legal-move generation, terminal state). Sacred. Changing one is **approved by Bill by
  exception through the PR callout — never a mid-flow gate**. Declared with `invariant(...)`
  and enumerated in `game/test-registry.js`.

Moving a pin is not test-erosion; changing an invariant is a loud, surfaced act. This is why
the human is never a mid-flow gate and never the "are you sure?" question.

## Do not

- Do not let the **implementer** edit, delete, `.skip`, or disable any test — a blocking test
  escalates to a re-spawned test-writer (pin) or the callout (invariant). Both **keep the
  red**; neither is an escape valve.
- Do not have the **implementer** also write the falsifiers — the test-writer is a fresh
  session that never implements, so it cannot write tests it can trivially pass.
- Do not escalate a blocking test **to Bill mid-flow** — an invariant change waits for the PR
  callout (by exception); a pin move is routine test-writer work.
- Do not move a pin without a `RULES_VERSION` bump, and do not change an invariant without a
  callout entry.
- Do not put a gate or exit code in this skill — teeth live in the suite (ADR-0004 rejected
  "teeth in the wrappers").
- Do not run the inline `code-review` **in place of** `dev/ui-review.js` on a UI ticket — the
  same-session review is biased toward its own solution; the fresh blind review is the point.
- Do not open a PR without the filled callout block — an un-declared bespoke element is a lie
  the `dev/pr-lint.test.js` red already prevents.
- Do not fork or edit the mattpocock `implement` skill; this wrapper restates its flow and
  replaces only the middle (test-writer ordering, fresh review, completion).

## How this is proven

This skill is an agent procedure, not code, so it is **proven by dogfood** — implementing a
real downstream ticket through it — not unit-tested. A dogfood that only walks the happy path
proves nothing: it must exercise the **hard branches**. A genuine run implements a real
downstream **UI** ticket (so `dev/ui-review.js` + the shots-branch push + the callout
completion all actually fire) **and** drives the **escalation-keeps-red** path at least once
(a blocking test the implementer did not anticipate → re-spawned test-writer prunes it →
implementer never edits it). A non-UI dogfood, or one where no escalation ever fired, does
not prove the teeth — it skipped them. See `EXAMPLE.md` for the recorded run.
