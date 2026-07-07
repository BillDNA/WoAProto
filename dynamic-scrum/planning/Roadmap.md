# WarOfAttrition — Roadmap

> **Goal (post-V1):** turn the shipped battle prototype + balance-iteration pipeline into a **fun,
> shippable roguelite deck-builder on Steam** — decide the run, grow the content, wrap it in a shell.

**How to read this.** Each milestone is a candidate sprint: a guiding goal with concrete deliverables
and a clear "done when." Milestones are sized rough (S / M / L). Granular tickets are written at
**sprint-planning**, not here. V0 + V1 are already shipped — that history lives in `CLAUDE.md` + `specs/`.

**Ticket prefix.** This project's tickets are `WOA-NNN`.

---

## M0 — Design the run (on paper)  ·  size: S

**Goal:** decide what a "run" is before writing any run code.

**Deliverables:**
- One page, three candidate run shapes (campaign decks / drafting between battles / commander choice /
  lose-condition), each argued.
- Each shape **physically playtested on the board** (you have it) before implementing any.

**Done when:** one run shape is chosen and written down as the spec the M3 build follows.

---

## M1 — Grow the card pool to ~40 candidates  ·  size: M

**Goal:** move from prototype content (13 cards) toward run-game volume.

**Deliverables:**
- Batches of ~5 cards through the V1 pipeline (create-card → deck slot → `balance-report --parallel`
  → Charts → LLM match felt-notes → keep/kill).

**Done when:** ~40 candidate cards evaluated; the card-quadrant chart has driven a keep/kill list.

---

## M2 — Placeholder audio pass  ·  size: S

**Goal:** the cheapest perceived-quality jump — kill the "silent student project" read.

**Deliverables:**
- ~10 placeholder SFX (deal, deploy, march, strike, HQ fall, win/loss) + one ambient loop, wired to the
  existing FX event seams; mute + reduced-motion respected.

**Done when:** a battle plays start-to-finish with audio hanging off the FX layer.

---

## M3 — Run loop as a layer ABOVE the engine  ·  size: L

**Goal:** build the product around the decided run without leaking rules out of `engine/`.

**Deliverables:**
- A `run/` module owning map-graph + draft + persistence; battles stay exactly the engine's job; saves
  are plain JSON.

**Done when:** a full run is playable end-to-end against the current battle engine.

---

## M4 — Tauri shell: double-clickable Win/Mac build  ·  size: M

**Goal:** surface packaging problems early, with the prototype as-is.

**Deliverables:**
- Tauri wrapper; the tiny node-server jobs (content writes, persistence) become Tauri commands;
  `game/` stays plain static files.

**Done when:** a double-clickable build runs the current game on Windows + Mac.

---

## M5 — Onboarding v1 (Academy)  ·  size: M

**Goal:** turn the manual's worked examples into a guided first battle.

**Deliverables:**
- Extend the field-manual diagram player (engine-truth animation) into a guided first battle.

**Done when:** a new player can complete a guided first battle without the written manual.

---

## M6 — Steamworks + store page + playtest ingestion  ·  size: L

**Goal:** ship it, and close the balance loop nobody else has.

**Deliverables:**
- Achievements (the DB already counts everything), cloud saves (runs are small JSON), a store page +
  wishlist funnel early, and Steam Playtest battles ingested into the same DB/charts that tuned the AI.

**Done when:** a wishlist-able store page is up and real player battles flow into the balance pipeline.

---

## Deferred / Post-MVP (Parking Lot)

Work intentionally parked until earned — research and not-yet-ready ideas live one-per-topic in the
parking lot (see [[Parking-Lot Index]]).

- **The run design** — the load-bearing brainstorm that M0 draws from ([[run-design]]).
- Meta-progression + unlock cadence (a content-scheduling problem for the data pipeline).
- Localization string-extraction (YAGNI until the card pool stabilizes).
- Accessibility / input-remapping in the shell.

## Related

[[Project-Brief|Brief]] · [[Backlog]] · [[Sprint]].

#roadmap #project-direction
