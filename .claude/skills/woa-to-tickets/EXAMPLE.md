# woa-to-tickets — worked example (dogfood of #197)

This is the skill run against a **real** downstream ticket: **#199 — workflow.md rewrite**.
It exercises the hard branches, not the happy path — the raw draft below carries lines the
skill must **reject** and a line it must **route to a goal**, and both outcomes are shown.

## Raw acceptance-criteria draft (as first handed by the spec author)

```
A. The advisory AC/screenshot prose is replaced by a mechanical gate-to-home map.
B. workflow.md matches what the spec asked for.
C. The rewritten workflow.md reads clearly and a fresh session can follow it end-to-end.
D. The rendered docs/workflow.md page looks polished and on-brand.
E. Bare /implement is documented as hitting game/test.js + dev/smoke.js reds
   unconditionally but NOT dev/ui-review.js.
```

## Classification

| Line | Outcome | Why |
| --- | --- | --- |
| **A** | **Criterion — existence** | A single observation falsifies it: the "gates, not wishes" advisory block is gone and the gate-to-home map is present. Home: an assert in `dev/smoke.js`… — see note. |
| **B** | **REJECTED — vacuous restatement** | "matches what the spec asked for" derives from the *ask*, not the *artifact*; it names no observation and points at no goal. Dropped, not rewritten into a fake test. |
| **C** | **Goal** | "reads clearly / a fresh session can follow it" is a taste aim no single observation falsifies. Routed to the review as a rubric axis — "do we approach it?" — never a gate. |
| **D** | **REJECTED — fidelity with no existing target** | "looks polished and on-brand" is a *fidelity* claim, so it needs a `dev/proto/<x>.html` target as its completion oracle. `docs/workflow.md` is a Markdown doc with no proto mock and none is named. Build the target first (its own ticket) or drop the line. Dropped. |
| **E** | **Criterion — logic** | Falsifiable by inspection-as-assert of the documented behaviour; but note this is a *documentation* claim, so its real red is the behaviour it documents (the `dev/ui-review.js`-is-woa-implement-only fact), already gated in `game/test.js` / the suite. Kept as a criterion citing that home. |

**Note on A/E — a docs-rewrite ticket is mostly goals.** `workflow.md` is prose, and prose
has no smoke element to assert on. The honest classification of this particular ticket is
that **A and E are thin existence/logic criteria** (the named block is present / absent — a
grep-level fact a smoke or source-scan assert can pin) while the *quality* of the rewrite is
a **goal**. This is the skill working correctly: it does not manufacture a falsifier where
the artifact is prose, it routes the unfalsifiable part to the review.

## Result — the classified acceptance criteria (Claim / (Falsifier | Goal) / Target)

```
- [ ] **Claim:** The advisory "gates, not wishes" AC/screenshot prose is gone and the
      mechanical gate-to-home map is present in docs/workflow.md.
      **Falsifier (existence):** a source-scan assert reds while the advisory block is
      present or the gate-to-home map is absent — dev/smoke.js / game/test.js source scan.

- [ ] **Claim:** Bare /implement is documented as hitting the game/test.js + dev/smoke.js
      reds unconditionally but NOT dev/ui-review.js (a woa-implement-only delta).
      **Falsifier (logic):** the documented fact is the ADR gate-to-home table; the red is
      that table's own suite behaviour — game/test.js.

- [ ] **Claim:** The rewritten workflow.md reads clearly and a fresh session can follow it
      end to end.
      **Goal:** carried into the review as a rubric axis — "do we approach it?" (an aim,
      never a gate; no falsifier).
```

**Both hard outcomes shown:** two lines **rejected** (B vacuous restatement, D fidelity with
no existing target) and one line **routed to a goal** (C). The anti-80% logic ran; it was
not skipped.
