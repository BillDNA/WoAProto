---
name: woa-to-tickets
description: Break a spec/plan/conversation into WoA tickets like mattpocock to-tickets, but classify every acceptance criterion as a falsifiable **criterion** (ships a red-at-base falsifier that gates) or a **goal** (carried into review as a rubric axis). Use when asked to "cut tickets", "woa-to-tickets", or to turn a spec into ready-for-agent issues with teeth.
disable-model-invocation: true
---

# woa-to-tickets

The WoA wrapper over mattpocock **`to-tickets`**. It sits **beside** that skill, never
forks it: everything about slicing tracer bullets, declaring blocking edges, and publishing
to the tracker is `to-tickets`' job and is restated below only because a
`disable-model-invocation` skill can't be called programmatically. The **only** thing this
wrapper adds is the one joint `to-tickets` leaves loose — it writes acceptance criteria that
grade nothing. Here, every acceptance criterion is classified and structured so the ones
that can gate ship a **falsifier that is red at the base commit**, and the ones that can't
become reviewed **goals** instead of faked tests or rejected tickets.

**This wrapper carries no enforcement of its own.** The teeth live in the suite the chain
already runs — `game/test.js` and `dev/smoke.js` on every commit (bare `/implement`
included), plus `dev/ui-review.js` for the fidelity gate (a `woa-implement`-only delta per
the ADR gate-to-home table) — per `docs/adr/0004-build-chain-teeth.md`.
Do not move any gate into this skill; "put the teeth in the wrappers" is a rejected
alternative in the ADR (a wrapper is skippable; the suite is not). All this skill does is
*name*, for each criterion, the red that already has a home.

Read `docs/context/test.md` (gate vs judgment vs escape valve) and `docs/context/ui.md`
(existence / fidelity / readability) before you classify — every "gate" and "goal" here
means exactly what those files carve.

## Process

Follow `to-tickets` steps 1–4 unchanged — gather context, explore the codebase in the
project glossary, draft vertical tracer-bullet slices with their blocking edges, and quiz
the user on granularity and edges until approved. `to-tickets` steps 1–4 write no
acceptance criteria — they appear only inside the **step-5 issue template** it publishes.
**That issue template is where this wrapper diverges:** classify each acceptance criterion
before you publish it.

### Classify each acceptance criterion

For every line you would have written as a bare `- [ ] Criterion`, decide what it is:

1. **Is it a vacuous restatement of the request?** A line that just echoes the ask ("the
   feature works", "the button does what the ticket says") derives from the *ask*, not from
   the *artifact* — it names no observation and points at no goal. **Reject it.** Rewrite it
   as a real criterion drawn from the artifact, or drop it.

2. **Can a single observation show it false — one that would fail at the commit the
   implementer starts from?** If yes, it is a **criterion**. Give it a **Falsifier** of
   exactly one kind, each mapping to a real home:

   | Falsifier kind | The red, and its home |
   | --- | --- |
   | **existence** | an assert in `dev/smoke.js` — the element is present and wired |
   | **interaction** | `dev/smoke.js` drives the real click/keypress and asserts the outcome (never a checklist of interactions — the smoke *does* the human action) |
   | **fidelity** | `dev/ui-review.js` blind-describes the after-render and compares it to a named **Target**; the bounce is on any target element the after-render omits |
   | **logic / invariant** | an assert in `game/test.js` (a `pin` for this era's output, an `invariant()` for a property that holds every era). This home covers **source-scan** asserts too — a mechanical red that greps for the presence/absence of a named construct — the shape `route-through-base` and `no-live-content` already take. A new source-scan is red-at-base when the construct it demands is absent today. |

   A criterion whose falsifier you cannot place in one of these homes has **no usable
   falsifier** — **reject it** (it is a wish, not a gate). Do not invent a new home; if a
   criterion needs one, that is a missing foundation ticket, name it as a blocker.

3. **A fidelity criterion must name an existing Target.** The Target is the completion
   oracle: a `dev/proto/<x>.html` mock that already exists. Fidelity binds to the *target*,
   not to an enumerated polish checklist — that is what catches the missing 20% as "the
   blind describe doesn't match the target" without anyone listing the polish item by item.
   If the named target does not exist on disk, **reject** the criterion (build the target
   first — a `dev/proto` mock is a design answer, its own ticket).

4. **Otherwise it is a goal.** A line that no single observation can falsify — a taste,
   readability, or "feels right" aim — is **never rejected**. Recognise it as a **goal** and
   route it to the review, where the rubric reads it as an axis and asks *"do we approach
   this goal?"* (an aim, never a bounce). A goal carries no falsifier and no Target.

The **anti-enumeration principle** governs all four (`docs/adr/0004`, Further Notes): bind
to an oracle or a label, never to an up-front complete list — you always miss one. Never
hand smoke an interaction checklist, never enumerate licensed test changes, never replace a
fidelity Target with an AC-polish list.

**Reject only these three, nothing else:** a vacuous restatement, a criterion with no usable
falsifier, and a fidelity criterion with no existing target. A non-falsifiable line is a
goal, not a rejection.

### Emit the templates

Write each acceptance criterion in the **Claim / (Falsifier | Goal) / Target** shape, then
publish with the issue template (step 5 of `to-tickets`: one issue per ticket, dependency
order, `ready-for-agent` label, native blocking links). Do not close or modify the parent.

<ac-template>

A **criterion** (existence / interaction / logic / invariant):

```
- [ ] **Claim:** <the behaviour, from the user's perspective>
      **Falsifier (<existence|interaction|logic|invariant>):** <the single observation that
      is red at the base commit> — <its home: dev/smoke.js | game/test.js>
```

A **fidelity criterion** (adds a Target):

```
- [ ] **Claim:** <the behaviour, from the user's perspective>
      **Falsifier (fidelity):** dev/ui-review.js blind-describe of the after-render bounces
      on any target element it omits
      **Target:** dev/proto/<x>.html
```

A **goal**:

```
- [ ] **Claim:** <the aim, from the user's perspective>
      **Goal:** carried into the review as a rubric axis — "do we approach it?" (an aim,
      never a gate; no falsifier)
```

</ac-template>

<issue-template>

## Parent

Reference to the parent spec/issue (omit if none).

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective — not a
layer-by-layer implementation list.

## Acceptance criteria

*(Each is a criterion or a goal, in the Claim / (Falsifier | Goal) / Target shape above.)*

- [ ] **Claim:** … **Falsifier (…):** … — …
- [ ] **Claim:** … **Goal:** …

## Blocked by

- Each blocking ticket, or "None (can start immediately)".

</issue-template>

## Do not

- Do not put a gate, an exit code, or any enforcement in this skill — teeth live in the
  suite (ADR-0004 rejected "teeth in the wrappers").
- Do not reject a non-falsifiable line — route it to a **goal**. The only rejections are the
  three named above.
- Do not give a criterion more than one falsifier kind, and do not invent a falsifier home
  outside the four; a missing home is a blocking foundation ticket, not a new home here.
- Do not attach a Target to a non-fidelity criterion or to a goal.
- Do not fork or edit the mattpocock `to-tickets` skill; this wrapper restates its flow and
  replaces only the acceptance-criteria step.

## How this is proven

This skill is an agent procedure, not code, so it is **proven by dogfood** — cutting real
downstream tickets through it — not unit-tested. A dogfood that only walks the happy path
proves nothing: exercise the hard branches. A genuine run classifies at least one line to a
**goal** and **rejects** at least one line (a vacuous restatement, or a fidelity criterion
with a missing target), and shows both outcomes — otherwise the anti-vacuous / route-to-goal
logic was skipped, not proven.
