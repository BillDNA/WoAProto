# Sprint — M1.1 · Measuring "good"

**Goal:** refine how "good" is defined and measured — sweep the M1 drift, re-measure every baseline the
rubric cites (rules 1.1 / Core Six), refactor `grading-rubrics.md` + the `review-reports` skill around
those fresh figures, and define the constraint-temperature policy so the loop can escape local maxima
on purpose (settling the pending 17-card call under it).

**Done when:** the board carries no M1 drift (WOA-025 swept), every figure in `grading-rubrics.md` is a
dated rules-1.1 / Core Six measurement, every rubric criterion is Goal/Evidence/Score-shaped and names
the lever it points at, `review-reports` grades against that rubric (stating its temperature level), and
the temperature policy exists with `cavsplit17-raid-paid` adopted-or-rejected under it.

## Orientation

Planned 2026-07-16 from Bill's frame at M1 close. M1's lesson feeds this directly: WOA-018 refuted the
"bent ruler" premise (`D.D:ai-reserve-eval-rejected`), but the *measuring stick itself* is now stale —
north stars 1/2/4 still carry pre-1.1 June figures, and WOA-020's Void cut shrank core7 to 6 maps, so
every baseline is suspect. Refactoring "what good means" against stale numbers would repeat the
bent-ruler mistake — hence WOA-026 (re-baseline) lands before the rubric refactor.

**Build order:** WOA-025 → WOA-026 → WOA-027 → WOA-028 → WOA-029. 025 first (it patches the same files
the refactor touches — no double-churn); 026 feeds 027's figures; 029 writes its policy into the
rubric 027 refactored. Evidence for 025 is staged in `dynamic-scrum/planning/drafts/alignment-drafts.md`
(WOA-DRAFT-1) — delete the drafts file when 025 closes (drained-staging discipline).

**Scope calls (Bill, 2026-07-16):** re-baseline in-sprint · constraint-temperature = design + the
17-card call, **no loop-automation code yet** (that's M2's operationalize step) · WOA-025 runs as one
sonnet ticket.

## Tickets

### WOA-028 — Refactor the `review-reports` skill to grade against the new rubric
**Area:** skills · **Status:** Todo · **Type:** sonnet · **Docs:** grading-rubrics
**Depends on:** WOA-027

The measurement's other half: `review-reports` is how a graded analysis actually gets produced, so it
must mirror the refactored rubric — same criterion set, same Goal/Evidence/Score shape in its output,
grading against the WOA-026 baselines, and **stating the temperature level (T0/T1/T2) every analysis
grades at** so tolerance is explicit, never implied.

**Acceptance criteria:**
- [ ] Skill grades against the refactored rubric's criterion set + WOA-026 baselines (no stale figures or dead columns referenced)
- [ ] Every produced analysis states its temperature level and applies that tolerance
- [ ] Analysis output surfaces each failing metric's named lever (the rubric's pointer, carried through to the report)
- [ ] Dry-run proven: one graded analysis produced from the latest report set, saved the standard way under `logs/reports/analysis/`
- [ ] User confirms done

### WOA-029 — Constraint-temperature: design the escape mechanism + settle the 17-card call
**Area:** balance-loop · **Status:** Todo · **Type:** opus · **Skill:** brainstorming · **Docs:** grading-rubrics
**Depends on:** WOA-027

Graduated from the `constraint-temperature` parking-lot note (2026-07-15, deleted at graduation —
substance carried here). Bill: *"if the constraints are too tight in the balance loop, we can't make
big enough steps to move out of a local maximum of the search space."* `grading-rubrics.md` §Temperature
already defines the **acceptance-tolerance** face (T0 strict / T1 explore / T2 hot); this ticket designs
the undeveloped **search-exploration** face: (1) a **local-max signal** — how the loop knows it's stuck
(every north star passing, nothing adoptable) rather than a human noticing after the fact; (2) a
**ranked list of dial-able constraints** (16-card ceiling, piece stocks, deploy-step counts) vs. the
hard floors that never relax (Tie ≤15, 0-kill ≤5, deploy-steps ≥ stock); (3) a **re-measure-to-ship
rule** — big steps taken hot get re-graded at T0/T1 before anything ships. Then the live example:
`cavsplit17-raid-paid` (loop v2's 17-card deck — beat baseline on Drag *and* Swings but breaches the
16-card guardrail) gets its pending adopt/reject decided **under the policy**, not ad hoc. Design +
decision only — loop automation of the dial is M2's operationalize step ([[Roadmap]]).

**Acceptance criteria:**
- [ ] The policy is written (rubric §Temperature and/or a `dynamic-scrum/planning/specs/` note): local-max signal, ranked dial-able constraints vs. hard floors, re-measure-to-ship rule
- [ ] `cavsplit17-raid-paid` adopt/reject decided under the policy, measured (Core Six, WOA-026 baselines) and recorded in `Decisions.md`
- [ ] Physical-limitations goal respected: any relaxed guardrail is an explicit temperature move with a re-measure gate, not a silent default change ([[Goals]] physical-limitations)
- [ ] User confirms done

## In Progress

_None._

## Finished

- **WOA-027 — grading-rubrics.md refactor** (Done 2026-07-16, sprint-run): the rubric is now four-part everywhere — **Goal / Evidence / Score / Lever** — with 25 lever statements across all 23 criteria + `starting:true` + the Best-map table; 3 honest "none — diagnostic" calls (Card 4/5/6) with reasons. Superseded figures compacted to trailing `_Superseded:_` notes (mislabel ⚠ flag preserved); only 2026-07-16 Core Six figures sit in grading positions. §Temperature first-class with a reserved **Search-side policy (WOA-029)** slot; setup-label rule (AI tier/n/mapset/date, WOA-026's structural fix) written into the intro; stale Thornfield-era map examples replaced with live 1418-report Core Six reads + a read-the-live-report pointer. All skill-cited anchors kept verbatim (no citing-skill edits needed). Every target value verbatim, "tune me" preserved. Suite 237/237, wikilinks 0-dead (runner-verified); per-map examples runner-cross-checked vs the 1418 report. Runner follow-up caught at gate: run-tournament/review-reports restated the superseded 6.1/5.7/88 inline — run-tournament fixed as a runner commit; review-reports folds into WOA-028. cost: 117k tok / 10.5 min / 23 tools.
- **WOA-026 — Re-baseline the rubric under rules 1.1 / Core Six** (Done 2026-07-16, sprint-run): every rubric figure re-measured on Core Six and landed dated + setup-labeled — hard-vs-hard n=60/map (SAVED `2026-07-16-1418`), normal n=40/map (SAVED `2026-07-16-1435`), 4 bounded `matchup 96` runs (576/pairing). Headlines: first-mover 45 / Red 51 / tie 9% / atk 6.3 / swp 5.4 / 0-kill 1% / Drag 2.1 / Swings 2.7 / reserves 10-9%; skill premium NOW VERIFIED under 1.1 (n>e 69, h>e 73, h>n 56 thin, sanity 50); Behaviour guard's first genuine normal-AI read (6.8/4.3/86, reserves 14/14). Superseded figures marked, not deleted. CLAUDE.md baselines block updated (Bill pre-approved; diff flagged in run report). code-architecture "Known balance signals" converted to a POINTER (one numbers-home; 3-eras-stale pattern ended). **Finding for Bill:** the old "normal n=40" Behaviour baseline (6.1/5.7/88) was actually a 12-map hard-vs-hard read — mislabeled at recording; flagged inline, not retro-corrected. Suite 237/237, wikilinks 0-dead, all numbers runner-cross-checked vs saved reports. cost: 145k tok / 30.4 min / 64 tools.
- **WOA-025 — Alignment M1 drift sweep** (Done 2026-07-16, sprint-run): all 17 ACs landed across 20 files — dead `code-overview` pointers repointed; rules 1.0→1.1 era swept (incl. `run-tournament`/`review-reports` Behaviour-baseline checks repointed to `grading-rubrics.md`'s live 1.1 figures); gen-docs rerun (Decks 4→9); `version-control-policy.md` + `glossary.md` FILLED (not folded — rationale inline); `#onboarding`→`#claude-orientation`; Roadmap M1 reframed post-refutation (beat-hard gate retired; overnight loop = remaining scope); Project-Brief open-decisions closed; CLAUDE.md 20→16-card; `D.D:balance-loop-v2-shape` trimmed to a link; grading-rubrics card columns aligned (minimal, refactor left to WOA-027); rubric-rubric meta-coverage noted locally (canonical-served file untouched); AI headcount 6→7 (+1 same-class drive-by in code-architecture, flagged); M0 refs → M3; drafts staging deleted. Suite 237/237, wikilinks 0-dead (both runner-verified). cost: 213k tok / 11.7 min / 99 tools.

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]] · [[Goals]].

#sprint
