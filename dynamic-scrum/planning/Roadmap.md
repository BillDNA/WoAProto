# WarOfAttrition — Roadmap

> **Goal (post-V1):** turn the shipped battle prototype + balance-iteration pipeline into a **fun,
> shippable roguelite deck-builder on Steam** — *first make the loop trustworthy and the data
> actionable, then* decide the run, grow the content, wrap it in a shell.

**How to read this.** Each milestone is a candidate sprint: a guiding goal with concrete deliverables
and a clear "done when." Milestones are sized rough (S / M / L). Granular tickets are written at
**sprint-planning**, not here. V0 + V1 are already shipped — that history lives in `CLAUDE.md` + `specs/`.
Milestone numbers are just ordering handles — freely renumbered (reworked 2026-07-15 around Bill's three
short-term pillars: **1** a better balance loop, **2** actionable data, **3** roguelite intake — with
**3 gated by 1 & 2**, because the roguelite is a content explosion we have to be able to measure).

**Ticket prefix.** This project's tickets are `WOA-NNN`.

---

## Foundation — make the loop trustworthy and the data actionable *(pillars 1 & 2 gate everything after)*

## M1 — Trustworthy + autonomous balance loop  ·  size: M  *(pillar 1)*

**Goal:** the loop measures the *right* thing, unattended — before we build content on top of it.

**Deliverables:**
- ~~Fix/validate the **AI-eval bias** (the "bent ruler")~~ — **measured and refuted-closed** (WOA-018,
  `D.D:ai-reserve-eval-rejected`): `unitOnBoard 22 > unitReserve 16` (`engine/05-ai.js`) tells the AI
  to deploy on sight, and the loop-v2 LLM match's felt-note (*hoarding reserves for turn 15+ wins*)
  does **not** reproduce under AI-vs-AI measurement — no proposed lever beat current `hard` on core7,
  so deploy-on-sight is ~neutral, not a distorting bias. If the reserve-timing dominance is real for
  **humans/LLMs**, that's now WOA-024's question, not this milestone's.
- Loop runs **overnight, unguided**, to a graded report ([[Goals]] balance-iteration-loop) — **the
  remaining open scope of M1.**

**Sprint history: [[Sprint|M1 · Fix the bent ruler]]** (closed) — WOA-016 reserve-held metric ·
WOA-017 deploy-step-budget test · **WOA-018 AI eval fix — measured and refuted** · WOA-019 drop dead
per-card Win% · WOA-020 fix/cut The Void · WOA-021 `starting:true` lever. *(Deferred AI/rules
follow-ons WOA-022/023/024 are in [[Backlog]]; WOA-024 now carries the human/LLM reserve-timing
question the AI-vs-AI sweep couldn't see.)*

**Done when:** the loop runs unattended from start to graded report. *(The WOA-012 beat-hard matchup
gate is retired as M1's bar — no AI-eval lever ever beat `hard`, and AI-vs-AI measurement was never
blind to a real bias here. Source: balance-loop-v2 final report §5a.1; refutation:
`D.D:ai-reserve-eval-rejected`.)*

---

## M1.1 — Measuring "good"  ·  size: S–M  *(pillars 1+2 — the ruler itself)*

**Goal:** the definition and measurement of "good" is current, shaped, and lever-naming — before more
content or loop automation grades against it.

**Deliverables:** WOA-025 M1 drift sweep · WOA-026 re-baseline (rules 1.1 / Core Six) · WOA-027
`grading-rubrics.md` refactor (Goal/Evidence/Score everywhere, every metric names its lever) · WOA-028
`review-reports` refactor (temperature-stated grading) · WOA-029 constraint-temperature policy design +
the 17-card `cavsplit17-raid-paid` call (graduated from the parking lot; automation stays in M2).

**Active sprint: [[Sprint|M1.1 · Measuring "good"]]** (opened 2026-07-16).

**Done when:** every rubric figure is a dated Core Six measurement, every criterion names its lever,
`review-reports` grades temperature-aware, and the temperature policy has settled the 17-card call.

---

## M2 — Actionable, visible data  ·  size: S–M  *(pillar 2)*

**Goal:** every metric points at a lever, and is actually seen.

**Deliverables:**
- **WOA-006** — load saved CLI balance runs into the Dashboard Charts tab (close the one-way
  logs→dashboard gap; today the dashboard only charts its own live sims).
- **increase-data-value** — each report metric names the knob it implies and surfaces where it's used.
- Operationalize the **constraint-temperature** dial (policy designed in M1.1 / WOA-029;
  `grading-rubrics.md` §Temperature) so the loop drives its own escapes from local maxima, not by luck.

**Done when:** a balance report's every metric maps to a lever and shows in the dashboard.

---

## M3 — Roguelite design intake  ·  size: M  *(pillar 3 — gated by M1 + M2)*

**Goal:** decide what a "run" is, on paper, before any run code — the load-bearing decision (Q.1) the
whole Steam trajectory waits on.

**Deliverables:**
- Resolve **Q.1** from Bill's tentative loop (commander → operations → campaign; deck-update between
  operations — [[run-design]]); argue three candidate shapes, each **physically playtested on the board**.
- Spec-out the parked pieces as the run needs them: [[metaprogression]], [[commander-traits]],
  [[narrative]], [[map-points-of-interest]].

**Done when:** one run shape is chosen and written as the spec the run-loop build (M5) follows.
*(Absorbs the former "design the run on paper" milestone.)*

---

## Product build — downstream of the decided run

## M4 — Grow the content pool  ·  size: M  *(gated on M3)*

**Goal:** move from prototype content (13 cards) toward run-game volume — but only once the run tells us
what content it needs, so we don't mass-produce cards a run throws away.

**Deliverables:**
- Batches of ~5 cards/maps/unit-types through the V1 pipeline (create-card → deck slot →
  `balance-report --parallel` → Charts → LLM match felt-notes → keep/kill). **WOA-001** is the first
  batch and doubles as an M1 loop-shakedown — it can run *early* as a proof; mass growth to a target
  count waits on M3.

**Done when:** the pool covers a decided run's needs; the card-quadrant chart has driven a keep/kill list.

---

## M5 — Run loop as a layer ABOVE the engine  ·  size: L

**Goal:** build the product around the decided run without leaking rules out of `engine/`.

**Deliverables:**
- A `run/` module owning map-graph + draft + persistence; battles stay exactly the engine's job; saves
  are plain JSON.

**Done when:** a full run is playable end-to-end against the current battle engine.

---

## M6 — Placeholder audio pass  ·  size: S  *(independent — can run anytime after the foundation)*

**Goal:** the cheapest perceived-quality jump — kill the "silent student project" read.

**Deliverables:**
- **WOA-002** — ~10 placeholder SFX (deal, deploy, march, strike, HQ fall, win/loss) + one ambient
  loop, wired to the existing FX event seams; mute + reduced-motion respected.

**Done when:** a battle plays start-to-finish with audio hanging off the FX layer.

---

## M7 — Tauri shell: double-clickable Win/Mac build  ·  size: M

**Goal:** surface packaging problems early, with the prototype as-is.

**Deliverables:**
- Tauri wrapper; the tiny node-server jobs (content writes, persistence) become Tauri commands;
  `game/` stays plain static files.

**Done when:** a double-clickable build runs the current game on Windows + Mac.

---

## M8 — Onboarding v1 (Academy)  ·  size: M

**Goal:** turn the manual's worked examples into a guided first battle.

**Deliverables:**
- Extend the field-manual diagram player (engine-truth animation) into a guided first battle.

**Done when:** a new player can complete a guided first battle without the written manual.

---

## M9 — Steamworks + store page + playtest ingestion  ·  size: L

**Goal:** ship it, and close the balance loop nobody else has.

**Deliverables:**
- Achievements (the DB already counts everything), cloud saves (runs are small JSON), a store page +
  wishlist funnel early, and Steam Playtest battles ingested into the same DB/charts that tuned the AI.

**Done when:** a wishlist-able store page is up and real player battles flow into the balance pipeline.

---

## Deferred / Post-MVP (Parking Lot)

Work intentionally parked until earned — research and not-yet-ready ideas live one-per-topic in the
parking lot (see [[Parking-Lot Index]]).

- **The run design + its pieces** — the load-bearing brainstorms M3 draws from: [[run-design]],
  [[metaprogression]], [[commander-traits]], [[narrative]], [[map-points-of-interest]].
- **Cross-run meta-progression + unlock cadence** — the *between-campaigns* layer (a content-scheduling
  problem for the data pipeline); [[metaprogression]] is the within-run layer.
- Localization string-extraction (YAGNI until the card pool stabilizes).
- Accessibility / input-remapping in the shell.

## Related

[[Project-Brief|Brief]] · [[Backlog]] · [[Sprint]] · [[Goals]].

#roadmap #project-direction
