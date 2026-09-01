# ADR-0004 — Teeth for the build chain: red-at-base ACs, fresh graders, enforcement in the suite

Status: Accepted (2026-08-31)

## Context

We build on the mattpocock skill chain `grill-with-docs → to-spec → to-tickets →
implement → code-review`. In practice the chain lets an implementer session ship
~80% of a ticket — the logic lands, the polish and the human-facing wiring are
punted — and then *self-certify* the ticket done: it ticks the acceptance-criteria
boxes, opens the PR, and only admits the AC is unmet when asked directly afterward.
The one thing that reliably surfaces the gap today is a human asking "are you sure
you're done?", which is not feedback — it is an unautomated gate made of a person.

The failure is not missing rubrics, prototypes, or abstractions — most of that
exists. The failure is that **prose is advisory to an agent; only a RED stops it.**
Three joints of the chain are left loose, and each skill's own docs admit it:

- **`to-tickets` writes ACs that grade nothing.** Its template is a bare
  `- [ ] Criterion`, with no falsifiability requirement, so a criterion can be
  true at the base commit or merely restate the request. Its docs prescribe the
  fix ("name the observation that would show it false, confirm it fails at the
  commit the implementer starts from") but file it as an advisory by-hand check —
  which gets skipped. This is the **source** of the 80% problem: a weak AC is
  satisfied at 80%, and no downstream gate can demand what the AC never did.
- **`implement` has no completion gate and reviews itself.** Its docs state it
  "has no completion step… does not tick the boxes", and that its inline
  `code-review` is "biased toward its own solution", conceding a fresh-session
  review is better. It also commits straight to a branch (no PR mode) and its
  "pre-agreed seams" — where durable tests would be pinned — are "the skill's
  weakest joint."
- **The functional suite is the only thing that actually reds**, and it is not
  wired to the UI claims. `node game/test.js` + `node dev/smoke.js` run on every
  commit regardless of what any doc says, but UI acceptance is guarded only by a
  prose "attach a screenshot to the PR" rule that no agent consumes, and against
  before/after images the implementer produced itself — so "after" always reads
  as progress. There is no comparison against the *target*.

There is a symmetric, opposite failure on the same axis. Where a UI AC is
*under*-enforced (advisory prose, skipped), a stale test is *over*-enforced: the
agent treats an old behavior-pin as sacred, and contorts or abandons the new
feature to keep it green rather than updating the test. Root cause of both: the
agent **cannot distinguish a test that encodes a contract it must honor from a
test that pins the old behavior it was sent to replace** — so it under-trusts the
ticket and over-trusts the test, backwards in both directions.

An audit of the existing suite refined this: it is ~88–90% system-invariant and
deliberately derives expectations from active content, so the fear that "the tests
just check content exists" is mostly false. The real, bounded fragility is that a
dozen rules tests borrow *live* game-content ids as their test fixtures, so
developing content breaks mechanic tests spuriously.

## Decision

Keep the mattpocock chain and add teeth in three places, under one principle:

> **Move enforcement out of prose and into the always-run suite. A gate is a RED
> in `game/test.js` / `dev/smoke.js` / `dev/ui-review.js`, not a sentence in a
> doc. Skills sequence the work; the suite enforces it; the human judges the few
> real decisions by exception, never mid-flow.**

Enforcement therefore lives **project-side**, where `implement`'s existing
"run the full suite at the end" beat already triggers it — so even bare
`/implement` hits the reds. Two thin WoA **wrapper skills** add only the
orchestration the plugin openly lacks; they carry no enforcement of their own.

### 1. `woa-to-tickets` — every acceptance criterion ships red-at-base

Make the advisory falsifiability check mandatory and structured. A WoA AC is:

- **Claim** — the behavior, from the user's perspective.
- **Falsifier** — the single observation that shows it false, which *must* fail at
  the commit the implementer starts from. Exactly one kind:
  - *existence* → a `dev/smoke.js` assert (element present and wired)
  - *interaction* → `dev/smoke.js` drives the real click/key and asserts the outcome
  - *fidelity* → `dev/ui-review.js` blind-describe against a named **target**
  - *logic/invariant* → a `game/test.js` assert
- **Target** (fidelity ACs only) — the `dev/proto/<x>.html` mock that is the
  completion oracle.

The wrapper **rejects** an AC with no falsifier, one that restates the request,
and a fidelity AC with no existing target. Binding fidelity to a *target* (not a
checklist) is what defeats the 80%: the missing polish is caught as "blind-describe
does not match the target", without anyone enumerating the polish item-by-item
(enumeration is how you write create/update/move and silently drop delete). The
`dev/proto` mock is the design *answer* the ticket must build a surface to match.

**The transport under a falsifier must be real.** The four kinds classify *what*
the falsifier observes; they do not by themselves force the *transport* beneath it
to be real, and a criterion satisfied only by a fake or injected transport — a
stubbed `ask`, a faked capture, a short-circuited spawn — proves the fake, not the
seam. That is the same 80% gap one layer down: ui-review Phase 2 (#195) shipped
with every criterion fake-satisfiable, so the real Phase-1→Phase-2 handoff never
ran while the suite stayed green — the tell being that real capture yields *pixels*
and the fake comparator read *text*, so the two real halves could not run together.
So a **transport-bearing** criterion (interaction most visibly, but fidelity and
logic too) must assert its outcome against the **real transport or a faithful
deterministic stand-in** (e.g. a pixel-aware fake that consumes the real capture
bytes), never a stub that skips the seam — and the wrapper **rejects** a
transport-bearing ticket whose criteria are *all* fake-satisfiable. Its home is an
**always-run integration test** plus a **committed live smoke** run for real once
and pasted on the PR (`dev/ui-review.smoke.js` is the pattern). This is a
*qualifier* on the kinds, not a fifth kind: whether the transport is real is an
axis orthogonal to what the falsifier observes, applying across interaction,
fidelity, and logic alike — a correctly-written interaction AC already *is* the
integration.

### 2. `woa-implement` — fresh graders, no self-marking, a real completion gate

Three deltas over vanilla `implement`; nothing else:

- **Test-writer first.** A *fresh* subagent (never the implementer) writes the
  failing tests and confirms each AC's falsifier is RED at the base commit,
  *before* the implementer starts. It — not the implementer — may prune superseded
  **pin** tests. The implementer then drives red→green with **zero test-editing
  power**: a blocking test it did not anticipate is escalated back, never edited.
  The person who prunes has no implementation to protect; the person who builds
  cannot rationalize a test away. (This is the content loop's author≠grader
  separation, pointed at tests.)
- **Fresh blind review replaces the biased inline one.** For UI tickets, run
  `dev/ui-review.js` instead of the same-session `code-review`. Phase 1 is a
  **gate**: a clean session sees *only* before/after screenshots (never the ticket)
  and is asked "what changed, and what would a human want to do here?"; a second
  step compares that blind description to the ticket and **bounces** on any AC or
  human action the blind look did not evidence. Phase 2 is an **aim**: a ui-rubric
  read for readability — findings, never a bounce (rubrics never gate;
  see the content-loop grade-card doctrine).
- **A completion step vanilla lacks.** Open the PR, push screenshots to a
  shots-branch (not committed to main), and emit the PR-template callout block.

### 3. The suite carries the reds; the PR template carries the human's exceptions

Gate-to-home map (all reds run on every commit / pre-PR):

| Gate | Home | Kind |
| --- | --- | --- |
| Screen/element exists | `dev/smoke.js` assert | mechanical red |
| Human interaction works | `dev/smoke.js` drives the real click | mechanical red |
| Invariants (determinism, GUI==CLI parity, legal moves, terminal state) | `game/test.js` | mechanical red |
| No live content in test numbers | fixture/lint check in `game/test.js` | mechanical red |
| Route-through-base (no bespoke `.card` outside the one renderer) | single-source assert in `game/test.js` | mechanical red |
| Substance shipped (coverage vs target) | `dev/ui-review.js` Phase 1 (blind) | review bounce |
| Reads well | `dev/ui-review.js` Phase 2 (ui-rubric) | review aim |
| Real seam actually runs (transport-bearing AC) | always-run integration test (real transport / faithful stand-in) + a committed `*.smoke.js` live run | mechanical red + run-once |
| New primitive · invariant changed · pinned test pruned · version bump | PR template callout | human, by exception |

**Reuse is register-or-extend.** A new *variant* of an existing UI role must extend
the one base primitive (an `opts` flag and/or a modifier class), never re-implement
it, so a base change (bg colour, texture) is 2–3 lines and every variant moves; a
fork is a red. A genuinely new *role* is legal but must be registered in a
role-keyed **UI-element glossary** in the same diff — an unregistered new primitive
is a red, and a registered one is **surfaced in the PR callout** so the human can
reject its reasoning without reading every CSS line. Being forced to fork because
the base cannot express the variant is the signal to deepen the base's API.

**Invariant vs pin.** Each test is labelled at birth. *Invariants* (properties that
must hold every rules era — determinism, parity, legality, terminal state) are
sacred; changing one is a loud PR callout. *Pins* (this era's specific output —
mat-slot counts, golden aggregates) are movable as routine work by the test-writer,
atomically with a `RULES_VERSION` bump. Default is **pin**; invariants live in one
small, named, auditable set so the sacred list cannot silently grow or shrink. The
implementer judges neither — the label decides the bucket, which is why moving a
pin is not test-erosion and the human is never a mid-flow gate.

**Rules tests own their fixtures.** Mechanic tests must use dedicated fake fixtures
or hard-coded inputs, never live game-content ids for their numbers — enforced as a
red so developing content stops breaking mechanic tests. (`test.reports.js` already
works this way; extend the pattern to the ~dozen fixture-coupled rules tests.)

### Rejected alternatives

- **Status quo — doctrine as prose in `CLAUDE.md`/`workflow.md`.** This is the
  thing that fails: agents skip sentences. Prose is a signpost, not a fence.
- **Fork the mattpocock skills.** A local edit of `implement`/`to-tickets` rots
  against upstream and buries the enforcement inside a skill a session can skip.
- **Put the teeth in the wrappers.** Same skip risk. Teeth belong in the suite the
  chain already runs unconditionally; the wrappers stay ergonomic and disposable.
- **Make fidelity a hard gate ("matches prototype" = pass/fail).** Fights the
  findings-not-tally rubric doctrine and invents a binary verdict on a judgment.
  The gate is *"the blind review ran against the target"*; the rubric stays an aim.
- **Enumerate licensed test changes in the ticket.** The ticket-writer lacks the
  foresight (you always miss one), and "if they knew every test, why not just
  implement it?". The invariant/pin *label* plus a test-writer who discovers the
  collision replaces enumeration.

## Consequences

- The human stops being the "are you sure?" gate. The reds fire without them;
  they read a PR-template callout and judge only new elements and invariant/sacred
  changes — by exception, approving nothing mid-flow.
- What you run: `/to-spec → /woa-to-tickets → /woa-implement` per ticket. The
  command surface barely changes; the rails under it grow teeth. Bare `/implement`
  still hits every suite red — it only loses the test-writer ordering, the fresh
  review, and the callout.
- New build surfaces implied and owned by the writing-for-agents follow-on:
  `dev/ui-review.js` (Playwright-captured before/target/after, blind describe +
  compare + ui-rubric, exits non-zero on a Phase-1 bounce), a `ui-rubric` under
  `docs/rubrics/`, a role-keyed UI-element glossary, the AC + PR templates, the
  new `game/test.js` asserts (no-live-content, route-through-base), and the
  invariant/pin labelling of the existing suite.
- `dev/ui-review.js` needs real pixels; Playwright is available at user level
  (jsdom renders none). Screenshots live on a shots-branch, never in the tree
  (consistent with the screenshots-are-proof-not-committed practice).
- Cost rises per ticket: a test-writer pass and a fresh review are extra sessions.
  That is the price of the reds being real; it is paid once per ticket, not per
  "are you sure" round-trip.
- This ADR is the decision and the design shape. The build is a separate,
  sequenced effort (its own tickets, produced by the very chain this hardens).
