# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-12, balance-loop-v2 session)

- **S3 CLOSED** (7/7, archived). **No sprint active.** Balance loop v2 ran **between sprints**: 3
  iterations, 6 deck slots, **4,200 battles**, 1 LLM feels-match. Cards were the only knob (Bill dropped
  weights once reminded WOA-012 rejected the tuner).
- **The loop is DONE.** Final report:
  `logs/reports/analysis/1.1/2026-07-12-1.1-balance-loop-final.md`. **The next sprint is planned from
  its §5** (three ranked suggestion lists). Don't plan one before reading it.
- **Two results.** (1) An adopt-worthy deck, `cavsplit17-raid-paid` — passes every north star at T0 and
  beats baseline on both of Bill's goals (Drag 2.4→2.2, Swings 2.8→3.3). **Awaiting Bill: it's a 17-card
  deck.** (2) **The AI's eval function encodes a losing strategy** — and that's the bigger one.

## The one thing to carry forward

**`unitOnBoard: 22` vs `unitReserve: 16` tells the AI to deploy on sight. The LLM match found the
opposite wins** — both players, independently: *"the rules heavily favor whoever saves Infantry/Cavalry
reserves for turn 15+"*, *"early VP leads feel hollow"*. Both AI sides share the error, so it **cancels
out in AI-vs-AI** — 4,200 hard-vs-hard battles could not see it; one LLM match could. The second-mover
advantage and the drag we've been attacking with cards may both be downstream of this single wrong
heuristic. **Fix this before designing more cards** (final report §5a.1; gate: WOA-012's beat-hard matchup).

## Threads to carry

- **Card metrics are AI readouts, not card properties** — `1stSight%` ≈ eval delta, `AvgSeen` ≈
  `CARD_KEEP`. `aiPlanTurn` has no hand lookahead, so "hoarding" isn't hoarding. Rubric now says so.
  Corollary, measured: **auto-play RELOCATES** (split cavalry → Deploy Artillery jumps 69→77%). No card
  batch can ever fix it.
- **Temperature dial** now in `grading-rubrics.md` (Bill's idea): T0 strict / T1 explore / T2 hot, with
  hard floors that never relax (Tie ≤15, 0-kill, **deploy-steps ≥ stock** — there is *no deploy fallback*,
  so a stranded unit never reaches the board).
- **The Void is geometrically broken** — a donut; two hexes missing from `shapeDef` split the HQs, so
  there are fewer *legal* attacks. Not a card problem. Fix the shape or cut it from `core7`.
- **The 16-card ceiling has a price tag now** — it's the only thing making the good change expensive.
- WOA-015 (Backlog): ds-board-hub live-parse bug — canonical tooling, route via `send-report`.
- Steam-roadmap draft still parked. Skill premium (60/78%) still unverified under 1.1.

## Related

[[Sprint]].

#claudenotes
