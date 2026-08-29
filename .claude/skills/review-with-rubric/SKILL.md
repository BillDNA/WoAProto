---
name: review-with-rubric
description: whant to know if some content is "good" use a rubric to review that.  It's not a score card.
---

# review-with-rubric

Use a rubric the way `docs/rubrics/rubric-rubric.md` says to — *"measure with the
axes; aim for the goals."* A rubric produces **findings**, not a score: the axes
are lenses for describing where the thing under review sits on the path to the
**goals**, so the output is prose tied to the goal each observation threatens. A
number can be optimised for and still be bad — anything that reduces to a band or
a pass/fail belongs in `docs/balance/`, not a rubric read.

**Run it in a subagent** (Agent tool, `general-purpose`) and relay the prose —
keeps the file-reading out of the main thread and forces a fresh read.

## How to use a rubric to review

1. **Pick the rubric that owns the taste question** — a Card → `card-rubric`, a
   Map → `map-rubric`, a Unit → `unit-rubric`, a personality or the panel →
   `personality-rubric`, a rubric itself → `rubric-rubric`. Don't grade with the
   wrong one, and don't do a sibling rubric's job.
2. **Read its Goals first** — the goals are the destination; the axes only exist
   to ask *are we approaching them*.
3. **Walk each axis as a lens.** For each, 1–3 sentences: where does the target
   sit on the path to the goal that axis serves? What reads well, what reads off,
   which goal it undermines, and the minimal fix (quote the exact line).
4. **Ground the reading in evidence, not in it.** The runnable checks (a rubric's
   *Related runnable checks* → `docs/balance/`, report metrics like Swings/Drag)
   are evidence *for* the finding — grade the reading, never the number.
5. **Close with the 2–3 findings that matter**, as taste judgments.

## Do not

- No PASS/FAIL, no 1–5, no numeric band, no per-axis enum, no verdict column. If
  an enum is being written, recast it as a described observation.
- No inventing a format — read the peer rubrics and one real review artifact
  (`logs/reports/analysis/1.1/2026-07-16-1.1-analysis.md`) and match that voice.

## Subagent brief

Fill `<RUBRIC>` and `<TARGET>`. Read in full: `<RUBRIC>`, `<TARGET>`, the peer
rubrics in `docs/rubrics/` for voice, the analysis artifact above for register,
and `CONTEXT.md` to check the target speaks the glossary (flag coinages that
aren't in it). Then do steps 2–5 above. Review only — edit no files.
