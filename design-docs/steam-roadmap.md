#project-direction

# War of Attrition → Steam: the leverage map (July 2026 draft)

Written at the end of the V1 run, with the whole codebase fresh in mind. The
frame: **what moves us furthest toward a shippable roguelite deck-builder per
unit of Bill-time**, short / medium / long. Everything here is a draft for you
to argue with.

## Where we actually stand (honest inventory)

**Unusually strong for this stage** — most indie deck-builders never get this:
- A balance-iteration pipeline few shipped games have: every battle from every
  source lands in a queryable DB; charts that answer "what's broken"; a weight
  tuner; parallel reports in ~5 minutes; and LLM playtesters that produce
  felt-notes for pennies. Content iteration is now cheap — that was V1's goal.
- A clean engine/UI split with the rules in one headless module, deterministic
  battles, and a test suite that has survived a full restructure.
- A *distinctive* aesthetic already in hand (the field-journal/parchment look)
  and a design guardrail (physical-board constraints) that keeps scope honest.

**The gaps, in order of how much they'd embarrass us on Steam:**
1. **There is no run.** The roguelite loop — the actual product — is undesigned.
2. **No audio at all.** Silence reads as "student project" faster than any
   graphical flaw.
3. **Content volume**: 13 cards and 12 maps is a prototype; a run-based game
   wants a 60–100 card pool and enemies with personality.
4. **No shell**: Steam ships executables, not file:// pages.
5. **Onboarding**: the manual's worked examples are a seed, not a tutorial.

## SHORT TERM (the next few weeks) — decide the game, grow the content

1. **Design the run on paper before any code.** What is a run? A map campaign
   (the map-set mechanic is begging to become "campaign decks" — your own words
   in the spec answers), drafting cards between battles, a commander choice up
   front, lose-a-battle-lose-the-run vs attrition-of-resources. This single
   design decision gates the shell, the save system, the content targets, and
   the pitch. Recommendation: one page, three candidate run shapes, playtest
   them PHYSICALLY (you have the board) before implementing any.
2. **Sprint the card pool using the V1 pipeline.** Target: ~40 candidate cards
   in batches of 5 (create-card skill → deck slots → `balance-report --parallel`
   → charts → LLM match felt-notes → keep/kill). The pipeline makes each batch
   an evening, not a week. The card QUADRANT chart is the kill-list tool.
3. **Cheapest juice first: a placeholder audio pass.** ~10 sounds (deal, deploy,
   march, strike, HQ fall, battle win/loss) + one ambient loop. Even freesound
   placeholders transform perceived quality; the FX layer already has the
   event seams to hang them on.
4. **Keep the data honest**: every rules/content change under the 1.0+ version
   discipline; run the weight tuner after each card batch (suggestions only).

## MEDIUM TERM (1–3 months) — build the product around the decided run

5. **Implement the run loop as a layer ABOVE the battle engine** (a `run/`
   module owning map-graph, draft, persistence; battles stay exactly the
   engine's job). The architecture was cut for this: rules never leak out of
   engine/, content is data files, saves are plain JSON.
6. **Shell: Tauri, not Electron.** Small binaries, the game is already plain
   static files + a tiny node server whose jobs (content writes, persistence)
   become Tauri commands. Deliverable: a double-clickable build on Win+Mac that
   runs the current game — do this EARLY with the prototype as-is, so packaging
   problems surface before they're urgent.
7. **Commit to the art identity and scale it.** The field-journal look is the
   differentiator — lean in (battles as journal entries, runs as campaigns in a
   general's diary). The DIG pipeline gets you card-art volume; budget a real
   pass on the ~20 hero pieces (cover, commanders, key cards) later.
8. **Onboarding v1**: extend the manual's diagram player into a guided first
   battle (the "Academy" idea you deferred — the engine-truth animation system
   was built to grow into exactly this).
9. **Store page + wishlist funnel early.** Steam wishlists compound; a page can
   go up with the prototype's aesthetic long before launch. First trailer =
   captured play + the journal aesthetic; decide a Next Fest window only after
   the run loop is fun.

## LONG TERM (3–12 months) — ship it

10. **Steamworks**: achievements (the DB already counts everything worth
    achieving), cloud saves (runs are small JSON), Playtest program for the
    balance beta — your pipeline can ingest THOUSANDS of real player battles
    into the same DB/charts that tuned the AI. That closes the loop nobody
    else has.
11. **Meta-progression + unlock cadence**, tuned with the same charts (unlock
    curve is a content-scheduling problem; the data pipeline is the scheduler).
12. **Text pipeline for localization** — strings are inline today; extract when
    card text stabilizes, not before (YAGNI until the pool is stable).
13. **Accessibility**: reduced-motion shipped; keep colorblind-safe-by-
    construction (the chart discipline generalizes to unit/terrain palettes);
    input remapping in the shell.

## Risks worth naming

- **Scope creep is the killer** — the physical-board guardrails (24 hexes,
  16-card decks, piece stocks) have been your best design tool; keep them even
  when code no longer requires them (they're in the standing goals now).
- **The zero-dep purity will eventually collide with shipping** (audio, shell,
  save encryption?). The standing goals already gate this: formalization is
  pulled in by a shipped feature, never speculatively. Tauri keeps game/ plain.
- **Solo bandwidth**: the pipeline + skills + LLM playtesters are force
  multipliers, but art and audio are the two lanes where outside help buys the
  most (fixed-scope commissions, not staff).

## If you only do three things next

1. Write the one-page run design (three candidate shapes) and physically
   playtest them.
2. Run the first 5-card batch through the full pipeline end-to-end.
3. Drop placeholder audio onto the existing FX events.
