# WarOfAttrition — Project Brief

> **Vision:** A web-browser prototype of the *War of Attrition* board game, built to playtest and
> rapidly iterate on balance — now on a deliberate trajectory to a **Steam roguelite deck-builder**.

The high-level kickoff doc. Detail lives in companion docs — the [[Roadmap]], the process doc, and the
project's own orientation vault (`design-docs/onboarding/code-overview.md`, `specs/`).

---

## Status — where the project is (2026-07-07)

**V1 shipped** (rules version **1.0**, built July 6–7). The balance-iteration pipeline — the whole point
of V0/V1 — is complete: every battle from every source lands in a queryable `logs/woa.db`; a Charts tab
answers "what's broken"; a weight tuner and `--parallel` reports (~5 min) and LLM playtesters producing
felt-notes for pennies make content iteration cheap. A clean headless engine, deterministic battles, and
a test suite that survived a full restructure back it.

**Next:** decide the run and grow content (see [[Roadmap]] M0–M1). Two items are filed for Bill to
decide — the weight-tuner sweep and the Steam leverage draft (Q.2, Q.3, `design-docs/steam-roadmap.md`).

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
   targets, and the pitch.
2. **(Q.2)** Adopt the weight-tuner sweep #1 suggestions (needs firmer verification first)?
3. **(Q.3)** Is the tie-goes-to-2nd lever (~26% of battles) the biggest balance target, and how?

## Related

[[Roadmap]] · the canonical process doc (`WORKFLOW.md`, surfaced by the SessionStart grounding hook) ·
orientation docs in [[Docs Index]] · the project's own `design-docs/` + `specs/` vault.

#brief
