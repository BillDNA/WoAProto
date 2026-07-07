#onboarding #code-architecture
# War of Attrition — V0 summary & retrospective (July 2026)

The one-page account of what V0 set out to do, what shipped, what five feedback rounds changed,
and what state the prototype is in as V1 speccing begins (`v1-data-persistence`,
`v1-ai-search-and-tuning`, `v1-claude-plays-and-reports`,
`v1-content-curation`). Terse by design — current *behaviour* lives in
`game/CLAUDE.md`, `game/README.md`, and [[code-architecture]]; this is the *arc*.

## The point of V0

Take Bill's physical board game and make a **browser prototype for rapid balance iteration** —
something to playtest and tune, not a shippable product. Two standing goals shaped every decision:
`game/` stays **zero-dependency, zippable, file://-runnable**; dev-only tooling lives in `dev/`.
"Prefer data files + small tools over hardcoding" is why maps, decks, AIs, and card steps are all
data, and why a balance lab exists at all.

## What shipped — the ten V0 specs

Built and committed in one autonomous run (July 2, 2026); the V0 spec files were the design
rationale, current behaviour is in `game/CLAUDE.md`.

**Rules / game**
- `terrain-crossing-rules` — trenches became **attacker-support denial** (no more +1 defense,
  ownership irrelevant); new directional **river** terrain (`R`).
- `combat-clarity-qol` — one-click trench placement, hover attack-math pills, strike
  arrows + supporter rings drawn from engine truth.
- `layout-v2-implementation` — the "2A + topbar scoreboard" battle layout: both mats left,
  Campaign Journal as a bound book on the right, board bounded by its hex geometry, VP tug-bar.

**Tooling / app**
- `metrics-dashboard` — the in-browser Balance Dashboard (the full `balance.js` report, same
  aggregation code as the CLI — smoke-asserted identical).
- `deck-editor` — the Quartermaster's Ledger: in-browser card editing with validation.
- `map-roster-and-shapes` — deletable maps + the editor's hex-by-hex board carving (24-hex
  ceiling, `shapeDef` travels inline).
- `ai-variety` — one parameterized AI engine; personalities are data rows (brawler/turtle);
  `balance.js matchup` pits any two.
- grading-rubrics — `design-docs/grading-rubrics.md`: north stars + card/map/unit/game rubrics.
- `cli-responder-transport` + `claude-plays` — the `claude -p` transport + LLM-plays-real-
  battles harness with honest info and felt-notes.
- `claude-skills` — `.claude/skills/`: thin orchestrators over `balance.js` + the rubrics.

## The five feedback rounds (what each closed)

Every item from rounds 1–4 is struck through in `CLAUDE.md`; the arc:

1. **Round 1 — polish + rules nudges.** River parity with forest/mountain (lengths + stock),
   interior terrain placement, Airdrop-in-opener as a deck toggle (`noOpener`), reposition refused
   while an attack exists (encourage attacking), AI names on mats, dashboard QoL. **graphify added.**
2. **Round 2 — AI transparency + metrics.** [[ai-heuristic-model]] doc (the "where are the 5 AIs"
   + weights answer), journal-copy button, wider dashboard, no-skip rule (`mustPlayStep`), the
   **Drag** (kill-less-tail) and **Swings** (lead-change) pacing metrics, **rule-book versioning
   starts at 0.2.** Doc reorg into tagged onboarding/skills/rules/architecture/workflow.
3. **Round 3 — rules refinement + perf questions.** River went from no-support to no-deploy-
   -control-extension; no-swapping-same-type rule; trench-orientation + search-cost questions
   raised (now answered in `v1-ai-search-and-tuning`); first data review against
   the rubrics.
4. **Round 4 — data infrastructure.** Persistent per-version accumulation (`accumulated.json`),
   Typicality footer on LLM battles, the **`content/` file reorg** (maps + decks as deletable
   files, tombstones gone), reports moved to `logs/reports/{balance,battle,analysis}/<version>/`,
   the **Debug button** state-dump, `generate-reports` + `review-reports` skills, and
   `graphs-spec` (a thinking doc — the first V1-shaped question).
5. **Round 5 — prepping V1 (this round).** Not built — **specced.** Data persistence, AI search
   pruning + weight tuning + the trench-orientation answer, Claude Plays persistent sessions +
   first-to-3, generate-reports fire-and-forget, and trim-to-12 + a map-set mechanic. See the four
   V1 spec docs (now `dynamic-scrum/planning/specs/`).

## Where the prototype stands (baselines to protect)

Measured post-V0 (`balance.js`, normal AI, n≈40/map — verify before acting, present to Bill):
- **Mover advantage healed** (first mover ~46%); Red ~52%.
- **Tie-goes-to-2nd still decides ~26% of battles** — the biggest open balance lever.
- Attrition ends ~78% (HQ 22%); first blood converts ~61%; board control tracks winning ~81%.
- **Skill premium widened** post-terrain-rework: hard beats normal 60%, hard beats easy 78% —
  the support-denial rules reward the deeper search (skill over luck, good).
- Behaviour band: ~4.9 attacks / ~6.5 swaps per battle, zero-kill 3%, ~88% of units ever fielded.
  **If a change moves these sharply, treat it as a regression even if win rates look fine.**

Roster: **17 maps** (V1 trims to 12). Green bars to keep green: `node game/test.js` (engine),
`node dev/smoke.js` (UI), `node game/balance.js 60` (balance).

## What carries into V1

The four V1 thinking docs (now `dynamic-scrum/planning/specs/`), each ending in questions for Bill:
- **Data persistence** — SQLite dev-only, keep per-battle rows (unblocks `graphs-spec` trends).
- **AI search & tuning** — kill the random 80-cap → ranked shortlist; reuse for a concentrated
  claude-plays option list; offline weight tuner; the trench-orientation fix.
- **Claude Plays & reports** — persistent piped session (pending Bill's dynamic-scrum md),
  first-to-3 matches, generate-reports fire-and-forget.
- **Content curation** — trim to 12 by data + coverage; a file-backed map-set "deck" mechanic that
  may make the trim a curation act, not a deletion.

Plus the still-open **`graphs-spec`** (awaiting Bill's answers on which views + in-game vs dev-tool)
and the Vision's roguelite-deck-builder / side-asymmetry direction (YAGNI until V1 lands).
