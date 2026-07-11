# Backlog

Tickets defined but not yet pulled into a sprint. **Newest at top.** Pulled into `Sprint.md` during
sprint-planning. Same ticket format as `Sprint.md` (the `ticket-block` template; captured terse via the
`make-ticket` skill).

---

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
