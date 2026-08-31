# woa-to-tickets — worked example (dogfood of #197)

This is the skill run against a **real** downstream ticket: **#199 — workflow.md rewrite**.
It exercises the hard branches, not the happy path — the raw draft below carries lines the
skill must **reject** and a line it must **route to a goal**, and both outcomes are shown.

## Raw acceptance-criteria draft (as first handed by the spec author)

```
A. The advisory "gates, not wishes" AC/screenshot prose is replaced by a mechanical
   gate-to-home map.
B. workflow.md matches what the spec asked for.
C. The rewritten workflow.md reads clearly and a fresh session can follow it end-to-end.
D. The rendered docs/workflow.md page looks polished and on-brand.
E. Bare /implement is documented as hitting game/test.js + dev/smoke.js reds
   unconditionally but NOT dev/ui-review.js.
```

## Classification

| Line | Outcome | Why |
| --- | --- | --- |
| **A** | **Criterion — logic (source-scan)** | One observation falsifies it: a `game/test.js` source-scan that reds while the "gates, not wishes" advisory block is present *or* the gate-to-home map is absent from `docs/workflow.md`. Red at base: the block is present and the map absent today, so the new assert fails at the commit the implementer starts from. Source-scan is the `game/test.js` logic home (the shape `route-through-base` / `no-live-content` already take), not an invented home. |
| **B** | **REJECTED — vacuous restatement** | "matches what the spec asked for" derives from the *ask*, not the *artifact*; it names no observation and points at no goal. Dropped, not rewritten into a fake test. |
| **C** | **Goal** | "reads clearly / a fresh session can follow it" is a taste aim no single observation falsifies. Routed to the review as a rubric axis — "do we approach it?" — never a gate. |
| **D** | **REJECTED — fidelity with no existing target** | "looks polished and on-brand" is a *fidelity* claim, so it needs a `dev/proto/<x>.html` target as its completion oracle. `docs/workflow.md` is a Markdown doc with no proto mock and none is named. Build the target first (its own ticket) or drop the line. Dropped. |
| **E** | **Criterion — logic (source-scan)** | Falsifiable by a `game/test.js` source-scan asserting `docs/workflow.md` states the bare-`/implement` fact (hits `game/test.js` + `dev/smoke.js` unconditionally, **not** `dev/ui-review.js` — the `woa-implement`-only delta from the ADR gate-to-home table). Red at base: the sentence is absent before the rewrite. |

**How a prose-doc ticket classifies.** Presence/absence of a **named block** in the doc is a
real, red-at-base criterion — a `game/test.js` source-scan (A, E). The doc's **quality** —
whether it *reads* clearly (C) — is unfalsifiable and becomes a goal. The skill neither
manufactures a falsifier for the taste nor rejects it: it splits the ticket into the
source-scannable facts (criteria) and the readability aim (goal).

## Result — the classified acceptance criteria (Claim / (Falsifier | Goal) / Target)

```
- [ ] **Claim:** The advisory "gates, not wishes" AC/screenshot prose is gone and the
      mechanical gate-to-home map is present in docs/workflow.md.
      **Falsifier (logic):** a game/test.js source-scan reds while the advisory block is
      present or the gate-to-home map is absent — game/test.js.

- [ ] **Claim:** docs/workflow.md documents that bare /implement hits the game/test.js +
      dev/smoke.js reds unconditionally but NOT dev/ui-review.js (a woa-implement-only delta).
      **Falsifier (logic):** a game/test.js source-scan reds while workflow.md omits that
      sentence — game/test.js.

- [ ] **Claim:** The rewritten workflow.md reads clearly and a fresh session can follow it
      end to end.
      **Goal:** carried into the review as a rubric axis — "do we approach it?" (an aim,
      never a gate; no falsifier).
```

**Both hard outcomes shown:** two lines **rejected** (B vacuous restatement, D fidelity with
no existing target) and one line **routed to a goal** (C). The anti-80% logic ran; it was
not skipped.
