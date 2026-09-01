# woa-implement — worked example (dogfood of #198)

This is the skill run against a **real** downstream **UI** ticket: **#169 — Rebuild the
Workbench Plan panel**. It exercises the hard branches, not the happy path — the
**escalation-keeps-red** path fired, and the fresh **`dev/ui-review.js`** blind gate caught an
80% gap the same-session review would have rubber-stamped. Dogfood PR:
[#211](https://github.com/BillDNA/WoAProto/pull/211).

## Step 1 — Fresh test-writer (never the implementer)

A fresh subagent wrote one red-at-base falsifier per criterion and confirmed each RED before
the implementer touched anything:

| AC | Falsifier | Home | Red at base? |
| --- | --- | --- | --- |
| AC1 card-only picker | picker offers only `card` | `dev/smoke.js` (existence) | ✅ (offered `card,map,ai`) |
| AC2 editable inputs | drive typing, read back `#wbStopAt` | `dev/smoke.js` (interaction) | ✅ (`#wbStopAt` absent) |
| AC3 knobs reach *spawned* config | real `POST /api/contentloop` → `startContentLoop`, syscalls captured | `game/test.workbench-plan.js` (logic, **transport-bearing**) | ✅ |
| AC4 defaults keep something | default profile loosens ≥1 axis | `game/test.workbench-plan.js` (invariant) | ⚠️ green at base — **documented**: `dev/content-loop.js` has no auto-reject gate, so no clean red is possible; written as a regression guard |
| AC5 questionnaire add+delete | drive add then delete | `dev/smoke.js` (interaction) | ✅ (no `.wb-qdel`) |
| AC6 meta-loop inert | `#wbMetaLoop` present + disabled | `dev/smoke.js` (existence) | ✅ (absent) |
| AC7 launch spawns real run | real `#wbLaunch` → spawn, captured | `dev/smoke.js` (interaction, **transport-bearing**) | ✅ |
| AC8 fidelity to target | `dev/ui-review.js` review-spec vs `calibration-dashboard.proto.html` | `dev/ui-review.js` + a deterministic `game/test.js` red | ✅ |

**Transport was real, not faked** (ADR-0004 §1 qualifier): AC3/AC7 drove the genuine
server launch with only the OS syscalls (git worktree-add, child spawn) captured — the whole
config→args assembly ran, and the live probe confirmed the spawned command carried
`--stop 2026-09-15T18:30`. AC4's honest "no clean red" was flagged, not faked into a red.
The test-writer committed the reds first (`7af0771`).

## Step 2 — Implementer (zero test-editing power) + the escalation

The implementer drove red→green on **product code only** and turned every mechanical red
green (`game/test.js` 99/99). Then it hit a test it was **forbidden to edit**:

> `dev/smoke.js` boot block (~L172–182) **pinned** the old three-kind picker —
> `assert.deepStrictEqual(ltIds, ['card','map','ai'], …)` and then clicked the now-removed
> `map`/`ai` entries. AC1 (card-only) necessarily reds it.

This is the **escalation-keeps-red** path (`docs/context/test.md`): the implementer did **not**
edit, `.skip`, or work around it, and did **not** take it to Bill mid-flow. It **escalated the
red back** and kept building the rest. The red stayed; only *who clears it* changed.

## Step 2b — Re-spawned test-writer prunes the superseded pin

A **fresh** test-writer (again, never the implementer) retargeted the superseded pin (and two
related map-switch assertions in the same test) to the card-only reality — dropping the clicks
on removed elements, inventing no fake entries. Because it is a **UI smoke pin, not in the
deletion-guard manifest**, it moved with **no `RULES_VERSION` bump** (verified: `game/test.js`
deletion-guard stayed green). Both suites then green (smoke 7/7, `game/test.js` 99/99).
Implementation + prune committed (`df77377`).

## Step 3 — Fresh blind review (`dev/ui-review.js`, not the inline `code-review`)

`dev/ui-review.js` captured **real pixels** (Playwright) of before (main's Plan panel) / after
(the rebuilt panel) / target (`calibration-dashboard.proto.html`), ran the **blind describer**
(before/after only, never the ticket) and the **comparator** vs target + ACs, and
**BOUNCED (27)** — non-zero exit. The gate is *"the review ran against the target and emitted a
verdict"*, and it did. This is the anti-80% oracle working: every mechanical AC passed, yet the
blind look showed the after-render **does not match the target design**, and it surfaced a
genuine **AC↔target tension** the ticket author missed — the ACs mandate a stop-datetime input
and a meta-loop button the named target proto does **not** contain. A same-session review would
have read its own "after" as progress and shipped the 80%.

## Step 4 — Completion

Shots staged to the local ref `refs/heads/pr-shots/169` (what `dev/ui-review.js` produces) and
pushed to the remote as **`pr-shots-169`** — the slashed name collided with the repo's existing
plain `pr-shots` branch (a git ref directory/file conflict), so it went to the repo's flat
convention; never committed to the tree. The PR opened
([#211](https://github.com/BillDNA/WoAProto/pull/211)) with the **callout block** filled and
green against the gate `dev/pr-lint.test.js` (pre-checked with `dev/pr-lint.js`'s `lint()`). The
fidelity **bounce and the AC↔target tension are recorded in the callout for Bill by exception** —
not silently resolved mid-flow, not self-certified as done.

## Both hard branches shown

- **Escalation-keeps-red fired** (Step 2→2b): a blocking pin the implementer never edited,
  cleared by a re-spawned test-writer.
- **The fresh blind UI gate had teeth** (Step 3): a real `dev/ui-review.js` bounce against the
  target, with shots-branch + callout completion — the exact 80%-catch the biased inline review
  cannot make. AC6's "a non-UI dogfood does not close this AC" is satisfied: this was a UI
  ticket and every UI-only delta (ui-review, shots-branch, callout) actually fired.
