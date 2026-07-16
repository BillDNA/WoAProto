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

### WOA-026 — Re-baseline the rubric under rules 1.1 / Core Six
**Area:** balance-data · **Status:** Todo · **Type:** sonnet · **Skill:** /generate-reports · **Docs:** grading-rubrics, data-and-reports

Every figure `grading-rubrics.md` cites must be a current measurement, or grading is the bent-ruler
mistake in doc form. Two staleness sources compound: north stars 1/2/4 still carry pre-1.1 June
figures (the rubric's own caveat says "re-measure before grading"), and WOA-020 cut The Void, so
core7 = 6 maps ("Core Six") — even the 1.1-era numbers were measured on a 7-map pool. Run the standard
hard-vs-hard sweeps (fixed seeds 1001/2002/3003) on Core Six and land dated figures — including the
new WOA-016 reserve-held-at-end baseline — in one pass.

**Acceptance criteria:**
- [ ] Fresh hard-vs-hard Core Six figures for every number the rubric cites: north stars 1/2/4, behaviour guard (attacks/swaps/fielded), first-mover %, Red %, tie-decided %, zero-kill %, Drag, Swings, reserve-held-at-end
- [ ] Figures written into `grading-rubrics.md` dated with n; superseded June/7-map figures removed or explicitly marked superseded
- [ ] CLAUDE.md "baselines to protect" block updated to the Core Six figures (flag the diff to Bill — doctrine file)
- [ ] User confirms done

### WOA-027 — Refactor `grading-rubrics.md` — every metric Goal/Evidence/Score-shaped and lever-naming
**Area:** rubrics · **Status:** Todo · **Type:** opus · **Docs:** grading-rubrics
**Depends on:** WOA-025, WOA-026

The definition-of-"good" refactor. The rubric grew by accretion (June north stars, 1.1 patches,
§Temperature, `starting:true` lever) and now mixes eras, shapes, and dead columns. Rebuild it so every
criterion carries Bill's three-part shape (Goal / Evidence / Score meaning) and — per [[Goals]]
increase-data-value — **names the lever it points at** (which knob to turn when it reads bad, and where
that knob lives). Promote §Temperature from footnote to a first-class section (WOA-029 writes its
policy there).

**Acceptance criteria:**
- [ ] Every criterion in Goal/Evidence/Score shape; thresholds stay "target: X (tune me)", never hardcoded gates
- [ ] Every metric names its lever(s) — the knob it implies and the file/data it lives in ([[Goals]] increase-data-value)
- [ ] All superseded pre-1.1 / 7-map figures gone (WOA-026's dated figures are the only numbers)
- [ ] §Temperature is a first-class section (T0/T1/T2 kept; policy slot for WOA-029)
- [ ] Diagnostics-vs-targets distinction preserved (1stSight%/AvgSeen stay flagged AI readouts, never targets)
- [ ] User confirms done

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

- **WOA-025 — Alignment M1 drift sweep** (Done 2026-07-16, sprint-run): all 17 ACs landed across 20 files — dead `code-overview` pointers repointed; rules 1.0→1.1 era swept (incl. `run-tournament`/`review-reports` Behaviour-baseline checks repointed to `grading-rubrics.md`'s live 1.1 figures); gen-docs rerun (Decks 4→9); `version-control-policy.md` + `glossary.md` FILLED (not folded — rationale inline); `#onboarding`→`#claude-orientation`; Roadmap M1 reframed post-refutation (beat-hard gate retired; overnight loop = remaining scope); Project-Brief open-decisions closed; CLAUDE.md 20→16-card; `D.D:balance-loop-v2-shape` trimmed to a link; grading-rubrics card columns aligned (minimal, refactor left to WOA-027); rubric-rubric meta-coverage noted locally (canonical-served file untouched); AI headcount 6→7 (+1 same-class drive-by in code-architecture, flagged); M0 refs → M3; drafts staging deleted. Suite 237/237, wikilinks 0-dead (both runner-verified). cost: 213k tok / 11.7 min / 99 tools.

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]] · [[Goals]].

#sprint
