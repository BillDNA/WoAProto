# Backlog

Tickets defined but not yet pulled into a sprint. **Newest at top.** Pulled into `Sprint.md` during
sprint-planning. Same ticket format as `Sprint.md` (the `ticket-block` template; captured terse via the
`make-ticket` skill).

---

### WOA-003 — Docs reorg: index the design-docs/specs vault into dynamic-scrum/docs
**Area:** docs · **Status:** Todo · **Type:** sonnet · **Docs:** code-architecture, Docs Index

Represent the project's existing orientation material (`design-docs/**`, `specs/**`) in the DS
`dynamic-scrum/docs/` layer **by indexing / pointing in place** — do **not** move the frozen-API,
wiki-linked vault (that's the F1 finding sent to canonical). Reconcile the overlap:
`design-docs/onboarding/code-overview.md` is effectively the filled-out `code-architecture.md` (pick one
SOT, point the other at it), and the **implemented V0/V1 specs** should be decomposed into / indexed as
orientation-doc primers so a fresh session finds them via [[Docs Index]].

**Acceptance criteria:**
- [ ] `Docs Index` links out to the existing `design-docs/` primers in place — no vault files relocated
- [ ] `code-architecture.md` reconciled with `code-overview.md` (one is SOT; the other points to it)
- [ ] Implemented V0/V1 specs are represented as (or indexed to) orientation primers a fresh session can find
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
