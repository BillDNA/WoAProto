---
name: review-with-rubric
description: whant to know if some content is "good" use a rubric to review that.  It's not a score card.
---

# review-with-rubric

Use a rubric the way `docs/rubrics/rubric-rubric.md` says to — *"measure with the
axes; aim for the goals."* A rubric produces **findings**, not a score.

The goals are the **destination** — where good content lives. The axes are
**orthogonal coordinates** on the subjective space of good-vs-bad: no single axis
calls good from bad, so only between them do they *span* the space and locate the
artifact. Together, goals and axes give a review the two things it must state —
**position** (where the artifact sits) and **velocity** (which way to move it
toward the ideal, and the fix that moves it there). A coordinate with no
direction is a checkbox; a number can be optimised for and still be bad —
anything that reduces to a band or a pass/fail belongs in `docs/balance/`, not a
rubric read.

**Invoke with only the target and the rubric** — "review `<target>` with
`<rubric>`", nothing more. The whole method is below; an operator who adds steps
anchors the reviewer to a checklist and gets a checklist back.

**Run it in a subagent** (Agent tool, `general-purpose`) and relay the prose —
keeps the file-reading out of the main thread and forces a fresh read of the
rubric. Pass the brief below unchanged.

## How to use a rubric to review

1. **Pick the rubric that owns the taste question** — a Card → `card-rubric`, a
   Map → `map-rubric`, a Unit → `unit-rubric`, a personality or the panel →
   `personality-rubric`, a rubric itself → `rubric-rubric`. Don't grade with the
   wrong one, and don't do a sibling rubric's job.
2. **Read its Goals first** — the destination. The axes only exist to ask *which
   way is the artifact from good, and how do we close the gap*.
3. **Walk each axis — position *and* velocity.** For each, 1–3 sentences: where
   does the target sit along this coordinate, *and* the direction to the ideal —
   the fix that moves it there. Naming a gap with no direction is a checkbox; flag
   it (if the rubric under review has such an axis) or supply the direction (in
   your review).
4. **Check the axes are a basis.** When the target is itself a rubric, its axes
   must be orthogonal: two that move together on one artifact are one coordinate,
   not two, and the space is under-described. Collinear axes are a finding.
5. **Ground the reading in evidence, not in it.** Runnable checks (a rubric's
   *Related runnable checks* → `docs/balance/`, report metrics like Swings/Drag)
   are evidence *for* the finding — grade the reading, never the number.
6. **Chase perfection, not a pass.** Measure the gap to the ideal, not whether it
   clears a bar. "What reads well" is one clause; if no finding would move the
   artifact toward good, you stopped short of the ideal.
7. **Close with the 2–3 findings that most change position or velocity** — the
   forest, not the trees. A nit that moves neither (a stray glossary term, a
   moved pointer) is a tree; leave it out.

## Do not

- No PASS/FAIL, no 1–5, no numeric band, no per-axis enum, no verdict column. If
  an enum is being written, recast it as a described observation.
- A **yes/no axis slug** is a checkbox even when its body disclaims scoring — a
  good slug is an assertion whose body demands a described position + direction.
- No inventing a format — read the peer rubrics and one real review artifact
  under `logs/reports/analysis/` and match that voice.

## Subagent brief

Fill `<RUBRIC>` and `<TARGET>`. Read in full: `<RUBRIC>`, `<TARGET>`, the peer
rubrics in `docs/rubrics/` for voice, the analysis artifact above for register,
and `CONTEXT.md` (glossary — a coinage is a tree unless it moves position or
velocity). Then do steps 2–7 above. Chase perfection; close on the forest, not
the trees. Review only — edit no files.
