# Backlog

Tickets defined but not yet pulled into a sprint. **Newest at top.** Pulled into `Sprint.md` during
sprint-planning. Same ticket format as `Sprint.md` (the `ticket-block` template; captured terse via the
`make-ticket` skill).

---

### WOA-025 — Alignment M1 drift sweep (docs / skills / board currency)
**Area:** docs+board+skills · **Status:** Todo · **Type:** sonnet · **Docs:** code-architecture, grading-rubrics

From the 2026-07-15 M1-close alignment pass — 17 confirmed SHOULD drifts (the 2 MUSTs are already fixed). Currency/duplication drift across docs, skills, and the board; left unswept it misdirects the next runner (dead doc pointers, superseded rules era, stale roadmap framing). Full evidence + `file:line` for every item in `dynamic-scrum/planning/drafts/alignment-drafts.md` (WOA-DRAFT-1). Decomposable into smaller tickets if a runner prefers.

**Acceptance criteria:**
- [ ] Dead `code-overview` pointers repointed to `code-architecture` — WOA-001 + WOA-002 `Docs:` fields; `workflow.md:13` gen-docs target list
- [ ] rules `1.0` → `1.1` era swept — `code-architecture.md:133`, `driving-the-balance-loop.md:31/108-110/113`, `run-tournament/SKILL.md:60` + `review-reports/SKILL.md:91` (accumulator → `logs/reports/balance/1.1/`)
- [ ] gen-docs rerun for content roster — `code-architecture.md:78` "Decks (4)" vs 9 on disk (`node dev/gen-docs.js`)
- [ ] `version-control-policy.md` empty SOT stub — filled (point to CLAUDE.md as canonical) or folded + the Docs-Index "single source of truth" claim dropped
- [ ] `#onboarding` → `#claude-orientation` tag — `code-architecture.md:4`, `workflow.md:4`, `data-and-reports.md:4`, `War Of Attrition rule book.md:1`, `driving-the-balance-loop.md:4`, and the `Docs Index.md:10` legend
- [ ] Roadmap M1 AI-eval framing reconciled post-WOA-018 (`Roadmap.md:28/36`) — the refuted reserve-lever no longer framed as achievable (Bill's roadmap-revisit call per ClaudeNotes; M1's overnight-autonomous half stays open)
- [ ] Project-Brief "Open decisions" reconciled to closed (`Project-Brief.md:50-51` vs CLAUDE.md — Q.2 weight-tuner + ~26% tie-lever are dead)
- [ ] `CLAUDE.md:73` Vision "20-card deck" → "16-card"
- [ ] `D.D:balance-loop-v2-shape` (`Decisions.md:40-42`) restated loop order trimmed to a link to `generate-reports/SKILL.md` (keep the parametric decisions)
- [ ] `grading-rubrics.md` card report aligned to live columns — criterion 6 Win% (WOA-019-removed) + Noop% self-contradiction (`:112-160`)
- [ ] `run-tournament` stays-in-lane boundary stated vs generate-reports / review-reports
- [ ] Project-rubric meta-coverage — `grading-rubrics.md` added to `rubric-rubric` `Related` (with a Goal/Evidence/Score shape carve-out) or noted as a deliberately-uncovered project rubric
- [ ] User confirms done

<!-- M1 follow-ons deferred from the "Fix the bent ruler" sprint (balance-loop-v2 final report §5). -->

### WOA-022 — Give `aiPlanTurn` real hand lookahead (or keep its metrics diagnostic-only)
**Area:** ai · **Status:** Todo · **Type:** opus · **Docs:** code-architecture

From the balance-loop-v2 final report (§5a.2). `aiPlanTurn` (`game/engine/05-ai.js`) has **no hand
lookahead** — it can't hold a card for a better moment, only fail to pick it, which is why `1stSight%` /
`AvgSeen` are AI readouts, not card properties. The cheap half is done (the rubric flags them as
diagnostics, never targets); the expensive half is real planning. Follow-on to WOA-018 — worth it only if
reserve-timing behavior needs more than a weight fix.

**Acceptance criteria:**
- [ ] Either `aiPlanTurn` gains hand lookahead (a card can be held for a better turn) with a measured effect on the reflex band, or a decision is recorded to keep it lookahead-free and treat its card metrics as diagnostics permanently
- [ ] User confirms done

### WOA-023 — Review `CARD_KEEP` — the unexamined balance lever
**Area:** ai · **Status:** Todo · **Type:** sonnet · **Docs:** code-architecture

From the final report (§5a.3). `CARD_KEEP` (`game/engine/05-ai.js`) alone separates the hoard band (keep
3–5 → AvgSeen 3.8–5.7) from the deep-hoard tail (keep 8–9 → AvgSeen 7–11), yet it's hand-authored and
never reviewed — balance work nobody signed off on. Audit the per-card keep values; re-justify or tune.

**Acceptance criteria:**
- [ ] The `CARD_KEEP` values are reviewed against what they should encode; either re-justified in a note or adjusted with a golden-diff re-baseline
- [ ] User confirms done

### WOA-024 — (gated) Reserve-vs-board economy as a RULES change
**Area:** rules · **Status:** Todo · **Type:** sonnet · **Docs:** code-architecture, grading-rubrics

From the final report (§5b.1). Both LLMs independently proposed a *rules* fix for late-deploy dominance
(cap total deployments per side, or an entrenchment tax — deployments cost a card action). **Gate
resolved by WOA-018 (2026-07-15):** the AI-eval route is CLOSED — §5a.1 was refuted under AI-vs-AI
(deploy-on-sight is ~neutral, not a distorting bias; `D.D:ai-reserve-eval-rejected`). So there is no
AI-vs-AI pathology to dissolve. This ticket now stands ONLY on whether the reserve-timing dominance is
real for **humans/LLMs** — which AI-vs-AI cannot see. It needs a fresh human/LLM-match signal before any
rules change, using the reserve-held-at-end metric (WOA-016) as the instrument. Do not build a rules
change on the AI-vs-AI sweep alone.

**Acceptance criteria:**
- [ ] A human/LLM-match signal is gathered (reserve-held-at-end + win correlation): if late-deploy dominance is real for humans, a rules change (deployment cap / entrenchment tax) is designed + measured; if the LLM felt-note doesn't reproduce, this closes with that finding recorded
- [ ] User confirms done

### WOA-015 — ds-board-hub drops a well-formed ticket on live parse
**Area:** workflow · **Status:** Todo

During the S3 run the hub at :4841 served `/api/board` fine but `GET /api/ticket/WOA-009` returned
"ticket not found on board", and the move endpoint then errored (`reading 'chunks'` on the missing
ticket). WOA-009 was correctly formatted in `Sprint.md` — byte-identical in shape to WOA-010, which
*did* parse — so the hub's live parse was silently dropping it. Runner fell back to direct `Sprint.md`
edits (run-ticket Precondition 4), so nothing was lost, but a run that trusts the API mid-sprint will
corrupt its own board state.

**This is canonical DynamicScrum tooling, not WoA code** — WoA can't fix it here. Route upstream via
`send-report` rather than patching locally. Filed from the drained WOA-009 observations report
(2026-07-10).

**Acceptance criteria:**
- [ ] Reported to canonical DynamicScrum (send-report), or root-caused if the parse bug turns out to be WoA-side board formatting
- [ ] User confirms done

### WOA-006 — Load saved balance reports into the Dashboard Charts tab
**Area:** game-ui · **Status:** Todo

Dashboard→logs data flow is one-way today: the Balance Dashboard only charts its own live in-browser
sims. Let it load previous CLI runs (`logs/reports/balance/<version>/` — `accumulated.json` and/or
saved reports) so `dev/balance-report.js` terminal runs get the Charts tab too. (S2 dogfood friction;
returned to Backlog at S2 close, 2026-07-10.)

**Acceptance criteria:**
- [ ] Dashboard can display data from a prior CLI balance run (at minimum the accumulator)
- [ ] User confirms done

### WOA-002 — Placeholder audio pass
**Area:** feel · **Status:** Todo · **Type:** sonnet · **Docs:** code-overview

~10 placeholder SFX + one ambient loop wired to the existing FX event seams (deal / deploy / march /
strike / HQ-fall / win / loss). The cheapest perceived-quality jump before the run exists; the FX layer
already has the event seams to hang them on. *(Arguably M0 gates this — but it needs no run-design to
start.)*

**Acceptance criteria:**
- [ ] Sounds hang off the FX event layer; a battle plays start-to-finish with audio; mute + reduced-motion respected
- [ ] User confirms done

### WOA-001 — First 5-card batch through the V1 pipeline
**Area:** content · **Status:** Todo · **Type:** sonnet · **Skill:** /create-card · **Docs:** code-overview

Run one batch of ~5 candidate cards end-to-end (create-card → deck slot → `balance-report --parallel`
→ Charts → LLM match felt-notes → keep/kill) to prove the "an evening, not a week" loop and start the
pool toward the ~40-card target (M1). The card-quadrant chart is the kill-list tool.

**Acceptance criteria:**
- [ ] 5 candidate cards created and run through the full pipeline; keep/kill recorded with the chart evidence
- [ ] User confirms done

## Related

[[Sprint]] · [[Roadmap]].

#backlog
