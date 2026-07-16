# WarOfAttrition — Project Brief

> **Vision:** A web-browser prototype of the *War of Attrition* board game, built to playtest and
> rapidly iterate on balance — now on a deliberate trajectory to a **Steam roguelite deck-builder**.

The high-level kickoff doc. Detail lives in companion docs — the [[Roadmap]], the process doc, and the
project's own orientation vault (`dynamic-scrum/docs/code-architecture.md`, `specs/`).

---

## Status — where the project is (2026-07-07)

**V1 shipped** (rules version **1.0**, built July 6–7). The balance-iteration pipeline — the whole point
of V0/V1 — is complete: every battle from every source lands in a queryable `logs/woa.db`; a Charts tab
answers "what's broken"; a weight tuner and `--parallel` reports (~5 min) and LLM playtesters producing
felt-notes for pennies make content iteration cheap. A clean headless engine, deterministic battles, and
a test suite that survived a full restructure back it.

**Next:** decide the run and grow content (see [[Roadmap]] M0–M1). Two items are filed for Bill to
decide — the weight-tuner sweep and the Steam leverage draft (Q.2, Q.3, `dynamic-scrum/planning/parking-lot/steam-roadmap.md`).

---

## Goals

- Keep balance iteration cheap and honest (the pipeline stays the product's spine).
- Commit to the distinctive field-journal / parchment aesthetic as the differentiator.
- Ship a *fun run* on Steam — a roguelite deck-builder built above the existing battle engine.

---

## Scope — next vs later

### Next — what we build now
- **Design the run on paper** and physically playtest three candidate shapes before any code (M0).
- **Grow the card pool** to ~40 candidates in batches of 5 through the V1 pipeline (M1).
- **Placeholder audio pass** on the existing FX event seams (M2).

### Later / explicitly parked
- Run-loop `run/` module above the engine (M3); Tauri shell (M4); onboarding "Academy" (M5);
  Steamworks + store page + playtest ingestion (M6).
- Meta-progression, localization, accessibility polish — YAGNI until the run is fun.

---

## Open decisions

1. **(Q.1)** What *is* a run? The roguelite loop is undesigned and gates the shell, saves, content
   targets, and the pitch. **Open** — see [[Roadmap]] M3 / `run-design`.
2. ~~**(Q.2)** Adopt the weight-tuner sweep #1 suggestions?~~ **Closed — rejected** (WOA-012,
   `D.D:weight-tuner-sweep-rejected`): the tuned personality lost the beat-hard matchup gate (44% of
   192 under rules 1.1). `AI_WEIGHTS` defaults stand.
3. ~~**(Q.3)** Is the tie-goes-to-2nd lever (~26% of battles) the biggest balance target?~~ **Closed**
   — the ~26% reading was a pre-1.1 (V0-era) number; rules 1.1's trench tie-survival (WOA-010) brought
   it to **10%**, inside `grading-rubrics.md`'s north-star-5 target band. It's a guardrail to hold now,
   not a lever to pull.

## Related

[[Roadmap]] · the canonical process doc (`WORKFLOW.md`, surfaced by the SessionStart grounding hook) ·
orientation docs in [[Docs Index]] · the project's own `specs/` vault (design history).

#brief
