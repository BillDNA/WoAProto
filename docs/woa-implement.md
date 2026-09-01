---
last-reviewed: 2026-09-01
---
#claude-orientation #workflow
## woa-implement — the playbook that sequences the teeth

The enforcement lives in **mechanisms**, not this page (ADR-0004; spec #185; #198). This is the
one-screen order of operations. It **cites** the human-invoked mattpocock `/implement`; it does not
restate it — run `/implement` for the implementation loop itself.

### Roles — three fresh teammates, never one session

| Teammate | Does | Cannot |
| --- | --- | --- |
| **TestWriter** | writes each AC's red-at-base falsifier; prunes superseded **pin** tests | implement the feature |
| **Implementer** | runs `/implement`, drives red→green | edit/delete/disable any test (the hook forbids it) |
| **Reviewer** | runs the invocable `/code-review`; for UI, `dev/ui-review.js` | be the same agent as the Implementer |

Role-separation is **structural** (distinct teammate contexts), not a sentence. The Reviewer being a
different agent is what makes "no self-review" real (stories 9/12/15).

### The order

1. **TestWriter phase.** `printf testwriter > .claude/impl-phase`. The TestWriter writes the failing
   tests, confirms each falsifier is RED at the base commit, and prunes superseded pins. Invariant
   tests are not pruned silently — changing one is a PR callout.
2. **Freeze.** `printf implement > .claude/impl-phase`. The `PreToolUse` test-freeze hook
   (`.claude/hooks/test-freeze.js`, wired in `.claude/settings.json`) now DENIES any Edit/Write to a
   test file — the set is `TEST_PATTERNS` in that hook. The marker is gitignored; **absent = frozen**.
3. **Implementer phase.** Run `/implement`. The Implementer drives red→green with zero test-editing
   power — a blocking test it did not anticipate is escalated back to a TestWriter phase, never edited.
4. **Reviewer phase.** A different teammate runs `/code-review`. For a UI ticket, run `dev/ui-review.js`
   (blind before/after/target — #192/#195); readability is the ui-rubric aim, never a bounce.
5. **Completion.** Open the PR; push shots to a `pr-shots-<ticket>` branch (never committed to the tree);
   fill the PR-template callout. `node dev/pr-lint.js <body>` must pass (#196); `dev/ui-review.js` must
   have run against the target for a UI ticket (#192).

### The binding rule (the Reviewer's job, per AC)

Every falsifier must green **only through the real product entrypoint**: delete the product line and the
test must re-red. Red-at-base is necessary but not sufficient — a fake reds at base too. A criterion an
AC test satisfies by handing a synthetic input to an internal helper (bypassing the product seam) is a
fake; the Reviewer flags it. A transport-bearing AC asserts against the real transport or a faithful
deterministic stand-in, never a stub that skips the seam (ADR-0004 §1).

### Reference

- `/implement` (mattpocock, human-invoked) — the implementation loop this sequences.
- ADR-0004 `docs/adr/0004-build-chain-teeth.md` — the decision; spec #185 — the elaboration.
- Gates already shipped and red-at-base: `dev/ui-review.js` (#192/#195), `dev/pr-lint.js` (#196).
