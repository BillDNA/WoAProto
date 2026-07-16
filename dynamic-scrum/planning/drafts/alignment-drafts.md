# Alignment-pass drafts — 2026-07-15 (M1 close, full pass)

Read-only drift + bloat scan, 11 slices, Opus scanners → Sonnet adversarial verify.
**32 raw → 30 deduped → 25 confirmed** (2 MUST · 17 SHOULD · 6 NICE), 5 refuted. Deferrals harvested: 0.
Staging only — nothing here is on the live board. MUST = reviewed fix-through with Bill; SHOULD = one draft to mint; NICE = raise-if-wanted.

---

## MUST — fix-list

- [x] **M1 · Four orientation primers carry no `last-reviewed:` stamp** (ODOC-M2). ✅ **Applied 2026-07-15** — stamped each at its last-touch date (card-cheatsheet + manual-animations `2026-07-07`; ai-heuristic-model + claude-plays `2026-07-10`).
  `dynamic-scrum/docs/card-cheatsheet.md:1`, `human-instructions/ai-heuristic-model.md:1`, `human-instructions/claude-plays-human-instructions.md:1`, `human-instructions/manual-animations-authoring.md:1` — each opens straight into a `#tag` line, no YAML frontmatter. Template `_orientation-doc.md:4-6` mandates the stamp; sibling human-instructions docs carry it. Content verified accurate-as-built, so the only defect is a stampless doc can never be caught going stale.
  **Fix:** add the `---\nlast-reviewed: <date>\n---` block. *Decision for the fix-through: stamp today (2026-07-15) only if we affirm each is current, else use its last-substantive-touch date.*

- [x] **M2 · `grading-rubrics.md` has no `last-reviewed:` stamp and mixes pre-1.1 + 1.1 baselines** (RUBRIC-M6). ✅ **Applied 2026-07-15** — stamped `2026-07-15`; folded the superseded `~5/~7` Behaviour baseline → 1.1's `6.1/5.7`; top caveat now flags north stars 1/2/4 as pre-1.1 pending re-measure (left unchanged — Bill's balance call).
  `dynamic-scrum/rubrics/grading-rubrics.md:1` no frontmatter. North star 5 was swept to 1.1 (`:42-43` "10% (rules 1.1, n60)") but north stars 1/2/4 (`:25,:29,:39`) still carry June-2026 pre-1.1 numbers with no per-item currency flag. RUBRIC-M6 treats a missing stamp as unconditionally fireable.
  **Fix:** add the stamp + reconcile which baselines are current. *The stamp is mechanical; the baseline numbers are Bill's call (numbers-not-decisions) — but the ~5/~7 Behaviour baseline is documented-superseded (see SHOULD, cluster below), so that one is a fact-fix not a balance decision.* Overlaps two SHOULDs on the same file (behaviour baseline + Win%/Noop% column) — worth doing as one reconciliation sweep.

---

## SHOULD — minted as WOA-025 (2026-07-15)

✅ Minted to `Backlog.md` as one ticket, 12 ACs line-iteming every SHOULD below; decomposable at pull-in. WOA-025 points back here for the per-item `file:line` evidence, so the draft body is retained as the source of record.

### WOA-DRAFT-1 — Alignment M1 drift sweep (docs/skills/board currency)
**Type:** Sonnet · **Area:** docs+board+skills · **Why:** M1-close alignment pass found 17 confirmed currency/duplication drifts; left unswept they misdirect the next runner (dead doc pointers, superseded rules era, stale roadmap framing).
Each AC clusters ≥1 confirmed finding; decomposable into smaller tickets at mint if Bill prefers.

- [ ] **AC1 · Kill dead `code-overview` pointers** (TICKET-S1 + doc-vs-reality ×2). `code-overview.md` was absorbed into `code-architecture.md`; repoint `Backlog.md:94` (WOA-001 `Docs:`), `Backlog.md:82` (WOA-002 `Docs:`), and `workflow.md:13` (gen-docs target list) to `code-architecture.md`.
- [ ] **AC2 · Sweep rules `1.0` → `1.1` current-era** (doc-vs-reality ×2 + SKILL-S3 + grading doc-vs-reality). Engine is `RULES_VERSION='1.1'` and `logs/reports/balance/1.1/` is populated. Fix: `code-architecture.md:133`; `driving-the-balance-loop.md:31,:108-110,:113`; `run-tournament/SKILL.md:60` + `review-reports/SKILL.md:91` (1.0 accumulator → 1.1); `grading-rubrics.md:264` Behaviour baseline `~5 attacks / ~7 swaps` is the superseded V0 signature (1.1 is 6.1/5.7 — CLAUDE.md marks V0 superseded, "grading against it flags healthy decks as broken").
- [ ] **AC3 · Rerun gen-docs for content roster** (doc-vs-reality). `code-architecture.md:78` "Decks (4)" — 9 deck files on disk (5 cavsplit* absent). `node dev/gen-docs.js` regenerates the GEN:content block.
- [ ] **AC4 · `version-control-policy.md` is an empty stub billed as git SOT** (doc-vs-reality/omission + bloat/duplication, cluster `adopt-scaffolded-empty-stubs`). `:11-13` all `_stub_`, `:9` "single source of truth", `:4` stamped 2026-07-07. Real policy lives in CLAUDE.md + `workflow.md:18`. Fix: fill it (point to CLAUDE.md as canonical) or fold + drop the Docs-Index SOT claim.
- [ ] **AC5 · `#onboarding` → `#claude-orientation` tag rename** (ODOC-S1, cluster `onboarding-tag-rename`). Settled name per DS-134. Fix: `code-architecture.md:4`, `workflow.md:4`, `data-and-reports.md:4`, `War Of Attrition rule book.md:1`, `driving-the-balance-loop.md:4`, and the `Docs Index.md:10` legend.
- [ ] **AC6 · Roadmap M1 AI-eval framing is stale post-WOA-018** (ROADMAP-M1, cluster `woa018-refuted-not-swept`). `Roadmap.md:28` deliverable + `:36` Done-when still frame the refuted reserve-lever as achievable; `D.D:ai-reserve-eval-rejected` + `Backlog.md:41` closed that route. (ClaudeNotes already queues this as Bill's roadmap-revisit — this AC is the doc edit once decided. M1's overnight-autonomous half stays legitimately open.)
- [ ] **AC7 · Project-Brief "Open decisions" present resolved items as live** (doc-vs-reality, cluster `brief-open-decisions-stale`). `Project-Brief.md:50-51` (Q.2 weight-tuner sweep; ~26% tie-lever) vs CLAUDE.md "weight-tuner suggestions are closed … Defaults stand" + "old ~26% V0 row superseded". Fix: reconcile to closed.
- [ ] **AC8 · CLAUDE.md Vision says "20-card deck"** (doc-vs-reality). `CLAUDE.md:73` "20-card deck" vs its own `:50` 16-card guardrail + shipped 16-card `default.js`. Fix: 20 → 16.
- [ ] **AC9 · `D.D:balance-loop-v2-shape` restates skill-owned loop order** (DEC-S4). `Decisions.md:40-42` duplicates the order-of-ops that `generate-reports/SKILL.md:62-78` owns as SoT — will drift. Fix: trim the restated ordering to a link; keep the parametric decisions.
- [ ] **AC10 · `grading-rubrics.md` card-report criterion is un-gradeable** (meta, cluster `grading-rubrics-card-report-stale`). `:112-114` + criterion 6 (`:155-160`) grade on a `Win%` column WOA-019 removed the same day; Noop% self-contradiction (`:114` "no longer printed" vs `:33`/`:123-127` grade a printed Noop% column — `report-model.js:205` prints it, `balance.js:154` doesn't). Fix: align the rubric to the live report columns. *(Do with M2's reconciliation sweep.)*
- [ ] **AC11 · `run-tournament` states no lane boundary** (SKILL-S2, cluster `balance-measure-grade-overlap`). It measures AND grades — the combined job of generate-reports + review-reports — but no boundary vs either; "check the balance after a change" can route to it OR the pair. Fix: add a stays-in-lane line.
- [ ] **AC12 · Project rubric uncovered by any meta-rubric** (meta, cluster `project-rubric-uncovered`). `grading-rubrics.md` (SoT for create-card/create-map/review-reports/run-tournament) sits outside rubric-rubric's enumeration and uses Bill's Goal/Evidence/Score shape (not MUST/SHOULD/NICE), so applying rubric-rubric fires on schema mismatch, not real drift — which is why M2's staleness went uncaught. Fix: either add grading-rubrics to rubric-rubric's `Related` with a shape carve-out, or note it as a deliberately-uncovered project rubric. *(Process gap — could split to its own ticket / discussion.)*

---

## NICE — dispositioned 2026-07-16 (Bill, M1.1 open): 3 local items folded into WOA-025 as ACs; the canonical-scoped cosmetic below DROPPED (not worth a send-report)

- **ai-heuristic-model.md headcount stale** (doc-vs-reality). `:17` "Six ship today" / `:28-31` "→ 6 total" omit the `tuned` row its own GEN:personalities block (`:153`) lists; `boot.js:12-21` puts every non-preset key in the live pickers, so the real roster is 7. `tuned` was WOA-012-rejected but still ships in `maps.js "ai"`. Fix: recount to 7, or gate `tuned` out of the pickers.
- **Stale `M0` references** (doc-vs-reality, cluster `stale-M0`). `run-design.md:3` "graduates to Roadmap M0" + `Backlog.md:86` "(Arguably M0 gates this)". Milestones start at M1 after the 2026-07-15 renumber; run-design intake is now M3. Fix: M0 → M3 / drop.
- **`glossary.md` empty scaffold** (doc-vs-reality/not-yet-built + bloat/overbuild, cluster `adopt-scaffolded-empty-stubs`). Single `_stub_` row, stamped 2026-07-07, indexed as "Project lexicon"; the lexicon actually lives inline in the rule book + code-architecture. Fix: fill, or drop + prune from Docs Index.
- *(Informational, no action)* **SPECS slice is clean** — no active feature specs in this repo (the three the scanner expected are canonical's own); only `original-specs/` art kits remain, correctly quarantined. Spec lifecycle here is healthy.

---

## Canonical-scoped — route home (NOT a local fix)

- **`~/.claude/skills/run-sprint/SKILL.md:3` dogfood range stale** (doc-vs-reality, NICE). Frontmatter says "dogfooded across M6.4–M9.1"; body cites canonical M10/M11 runs. This is a **canonical-served** artifact (realpath → DynamicScrum/skills/run-sprint) — editing it here edits canonical for every consumer. Route via `send-report alignment` if worth it (it's a single cosmetic NICE — Bill's call whether to bother).

---

## Friction notes worth Bill's awareness (recommendations, not findings)

- **superpowers:brainstorming trigger collides with DS's altitude-gated model.** Its "You MUST use this before any creative work" fires mandatory design-before-all-work, which DS explicitly retired (D.A:altitude-rule). DS defends via session-start Step 5 remap + WORKFLOW precedence, so it holds — but it's the one 3rd-party trigger worth awareness. No route (3rd-party, no fix path here).
- **Owner's "M2 over-built like crazy" hunch not borne out** in this repo — the M2 spec/plan overbuild was already pruned upstream (DS-041); M1's last run was disciplined (2/6 cards measured-and-rejected/cut, no code added). Only genuine bloat found: 2 adopt-scaffolded empty stubs (AC4 + glossary NICE).
