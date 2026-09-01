---
last-reviewed: 2026-09-01
---
#claude-orientation #workflow
## woa-implement — the enforced implement protocol

This file is **injected verbatim** into any session that invokes an implement skill on a ticket
(the `.claude/hooks/impl-route.js` hook fires on the invocation). It is not a description you may
skip — it is the protocol the run MUST follow. The mattpocock `/implement` skill stays human-invoked
and unmodified; this protocol *cites* it as the Implementer's inner loop and never restates its steps.

**A ticket is done only when it is FEATURE-COMPLETE against every acceptance criterion — not 80%,
not "logic landed, wiring punted." Do not report done, do not open the PR, until every AC's falsifier
is green through real product and the completion gates pass. Never hand the "are you sure?" judgment
back to the human; that is the exact failure this protocol exists to delete.**

### The four phases — run them in order, do not skip

1. **Test-writer phase (a FRESH subagent, never you).** Spawn a subagent — uniquely named per ticket
   (`testwriter-<n>`, never a bare role word) — whose only job is to write each AC's red-at-base
   falsifier at the home the ticket names (`dev/smoke.js` / `game/test.js` / `dev/ui-review.js`), and
   prune superseded **pin** tests. It confirms each falsifier is RED at the base commit and pastes the
   failing output. It implements no product. You set the phase marker to `testwriter`
   (`node .claude/hooks/impl-phase.js testwriter`) before it starts and back to `implement` after.
   You do not write the tests yourself — a test you can trivially pass is not a gate.
2. **Implement phase (you, frozen).** With the marker at `implement`, the test-freeze hook DENIES you
   any test-file edit. Drive red→green through real product only. A blocking test you did not
   anticipate is escalated back to a test-writer phase, never edited around. Every AC binds to the
   real entrypoint: deleting the product line must re-red its test. A falsifier that greens via a stub
   or a synthetic input handed to an internal helper does not count (ADR-0004 §1).
3. **Review phase (a DIFFERENT subagent, never you).** Spawn a uniquely-named `reviewer-<n>` subagent,
   fresh context. It runs the invocable `/code-review`; for a UI ticket it runs `dev/ui-review.js`
   (blind before/after/target — readability is the ui-rubric aim, never a bounce). It performs the
   binding check per AC (revert the product line, confirm the test reds) and flags any fake-satisfiable
   criterion. You never review your own work.
4. **Completion phase.** Open the PR; push shots to a `pr-shots-<ticket>` branch (never committed to
   the tree); fill the PR-template callout. `node dev/pr-lint.js <body>` must pass (#196); for a UI
   ticket `dev/ui-review.js` must have run against the target (#192). The full suite is green.

### Why it is mechanisms, not prose

- The freeze is a `PreToolUse` hook (`.claude/hooks/test-freeze.js`), not a request — the set it
  guards is `TEST_PATTERNS` in that hook, and it also denies rewriting the phase marker itself, so the
  implementer cannot lift its own freeze. Phase changes go through `node .claude/hooks/impl-phase.js`.
- The completion gates (`dev/pr-lint.js` #196, `dev/ui-review.js` #192/#195) are red-at-base and run
  regardless of what any doc says.
- Role separation is structural: distinct fresh subagents, uniquely named so parallel sessions never
  collide on one mailbox.

### Reference

- `/implement` (mattpocock, human-invoked, unmodified) — the Implementer's inner loop this cites.
- ADR-0004 `docs/adr/0004-build-chain-teeth.md`; spec #185.
