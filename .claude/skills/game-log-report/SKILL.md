---
name: game-log-report
description: Read the War of Attrition game logs in design-docs/game-logs and produce a one-page summary of what happened plus graded suggestions for Bill. Use when asked to "read the game logs", "summarize the game logs", "what do the logs suggest", or "game-log report".
---

# game-log-report

Read the battle logs, distil them into ONE page: what happened, what the
players felt, and a short ranked list of suggestions. **Suggestions only —
never edit maps.js, the rules, or code. Bill decides.**

## Read first

- `design-docs/game-logs/` — the logs to summarize:
  - `*.md` per-run transcripts (result, decision list, campaign journal,
    felt-notes) — the readable record from `dev/claude-plays.js`.
  - `claude-plays-log.jsonl` — the machine record: one JSON object per battle
    (`map, seed, red, blue, effort, winner, winType, turns, fallbacks,
    decisions[], notes, usage`). Parse this for counts; read the `.md` files
    for the felt-notes wording.
  - If the user names a specific file, use only that one; otherwise summarize
    all logs present (say how many battles across which maps).
- `design-docs/grading-rubrics.md` — ground every suggestion in a rubric
  (north stars + card/map/unit/game rubrics), so a suggestion cites evidence,
  not vibes.
- `design-docs/human-instructions/ai-heuristic-model.md` — so an AI-behaviour
  suggestion names the right weight to turn.

## The one-page report (this exact shape)

1. **Scope** — N battles, which maps/seeds, which players (LLM vs heuristic),
   effort level. One line.
2. **Outcomes** — win split (red/blue, 1st/2nd mover), HQ vs attrition, average
   turns, and the **fallback rate** (fallbacks ÷ decisions). A high fallback
   rate means the LLM was confused or the move list was unclear — flag it,
   because it poisons everything else.
3. **How it felt** — distil the felt-notes across runs into 3–5 bullets:
   recurring "felt strong", "felt weak", "felt luck-driven". Quote sparingly.
4. **Suggestions (ranked, ≤5)** — each is one line: the change, the evidence
   from the logs, and which rubric/metric it should move. Mark whether it's a
   **rules** change (needs a spec + `test.js`), a **data** tweak (maps.js /
   deck), or an **AI** tweak (a heuristic weight). Recommend measuring with
   `node game/balance.js` before/after.
5. **Watch-list** — anything the logs hint at but can't confirm at this sample
   size (say the n). Not a suggestion yet.

## Rules

- Honest sample sizes: a felt-note from one battle is an anecdote; say so. Two
  LLMs agreeing across runs is a signal.
- The LLM's felt-notes are a player's *impression*, not ground truth — cross-
  check against the decision/outcome data before promoting one to a suggestion.
- Fallbacks are not player choices; don't read strategy into them.
- Keep it to one page. If there's nothing worth suggesting, say that plainly.
