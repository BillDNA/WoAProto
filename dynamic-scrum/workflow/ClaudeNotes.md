# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-15, roadmapping + sprint-planning session)

- **Sprint OPENED: `M1 · Fix the bent ruler`** — 6 tickets (WOA-016…021), planned from the
  balance-loop-v2 final report §5. **0 Done — not started.** Build order: WOA-016 → WOA-017 → WOA-018
  (dep 016) → WOA-019 → WOA-020 → WOA-021.
- **Roadmap reworked** around Bill's three short-term pillars, foundation-first (`D.D:roadmap-3-pillar-reframe`):
  M1 trustworthy+autonomous loop → M2 actionable data → M3 roguelite intake, **3 gated by 1 & 2**.
  Content growth moved *after* run design (now M4). 5 new parking-lot specs added.

## The one thing to carry forward

**WOA-018 is the flagship — and its gate is behavioral, not cosmetic.** The AI eval (`unitOnBoard 22 >
unitReserve 16`, `game/engine/05-ai.js`) encodes a losing strategy: the LLM match proved *hold reserve,
deploy late* wins, but the AI deploys on sight. Both AI sides share the error so AI-vs-AI can't see it.
Fix = narrow/urgency-scale the gap. **Gate: beat current `hard` (WOA-012 matchup, must clear 44%) + the
new reserve metric shows it actually holds reserve — NEVER "the metrics look nicer."** WOA-016 (reserve
metric) is its instrument and lands first.

## Threads to carry

- **17-card deck (`cavsplit17-raid-paid`) + 16-card ceiling** — parked in [[constraint-temperature]];
  decide once the (search-side) temperature policy is defined. The report's recommended adopt deck, on hold.
- **Q.1 "what is a run" — tentatively answered** (Bill, in Questions.md): commander → operations →
  campaign; deck-update *between operations*. Establishes vocabulary battle < operation < campaign. Still
  tentative → Q.1 stays open; feeds M3 + [[metaprogression]] / [[run-design]].
- **Deferred M1 follow-ons in Backlog:** WOA-022 (`aiPlanTurn` lookahead), WOA-023 (`CARD_KEEP` review),
  WOA-024 (gated reserve-economy-as-rules — measure WOA-018 first).
- **Goals flag (Bill's):** the `zero-build-game` long-term goal carries his own "is this still valid?"
  margin note — worth deciding when the Tauri shell (M7) gets real. Left for Bill (his file).
- WOA-015 (Backlog): ds-board-hub live-parse bug — canonical tooling, route via `send-report`.
- Reconnect ran at session top: machine bootstrap clean; **CRLF drift (DS-211) fixed** (77 files
  re-checked-out to LF, no commit needed); hub started detached on :4841 (MCP attaches next session).

## Related

[[Sprint]] · [[Roadmap]] · [[constraint-temperature]].

#claudenotes
