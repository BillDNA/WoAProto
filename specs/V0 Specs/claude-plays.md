# Claude plays (LLM player)

Wire an LLM in as a "player" so it can play battles and give notes on how the game *felt*.
Doubles as a luck-vs-skill probe: a better model / higher effort should win meaningfully more —
if it doesn't, the game is more luck than skill. Runs on top of [[cli-responder-transport]]
(the `claude -p` subprocess transport — zero API credits for batch play).

## The key insight: pick from a legal-move list

Do **not** ask the LLM to invent a move from the raw rules — it will hallucinate illegal plays and
parsing becomes a nightmare. The engine's AI already enumerates the legal candidate plays each turn
(the `aiPlanTurn` candidate generation). Reuse that: hand the LLM the **numbered list of legal
moves** plus the board state, and it returns an index + a one-line rationale. Legal by
construction, trivial to parse, and the rationale is free "why" for the felt-notes.

```
prompt = short rules blurb
       + serialized state (board / mats / hands-you-can-see, using hexLabel grid refs)
       + numbered legal moves (from the engine's candidate list)
   -> LLM returns { moveIndex, rationale }
   -> engine applies moves[moveIndex]
```

## Grounding

- **Rules blurb**: the README already documents the rules tersely; a trimmed version should be
  enough for the LLM to "understand" the game (Bill's stated goal — short rules are the whole
  test). If it isn't, that's a signal the rules doc needs tightening, which is its own win.
- **State serialization**: use `hexLabel` grid refs (A1…E4) everywhere — the same language the
  journal speaks — so the model and the human read the same board.
- **Honesty**: the model sees only what a player sees (its own hand + public info), never the
  opponent's hand. Same rule the hard AI already keeps with `sampledReplyScore`.
- **Model / effort knobs**: pass `--model <tier>` through the transport; set effort via the CLI.
  Log which tier/effort played so `balance.js matchup`-style analysis can chart the skill curve —
  the LLM is a non-heuristic reference point next to easy/normal/hard (see [[ai-variety]]).
- **Felt-notes**: after the battle, one more call asking for free-text notes on how it played —
  what felt strong/weak/luck-driven. That's the actual product here.

## Session reuse (from the transport spec)

One-shot spawn is a cold process per call (~1–2s). For a full game that tax stacks. The transport's
upgrade path is `--resume`/`--continue` to keep the **prompt cache** warm across a game's turns.
Hard rule (copy it): warm session is for cache reuse, **not** conversational carryover — each turn
must still send a fresh, fully-assembled state, or turn N bleeds into N+1. Bill's `/clear`
instinct is the same idea. YAGNI until per-move latency actually hurts a run.

## Gotchas

- Fail-open like the transport: a bad/timed-out/garbage response → the player forfeits its choice
  gracefully (e.g. falls back to the engine's top candidate, logged as such), never crashes a
  tournament run. See [[claude-skills]] (run-tournament).
- Keep `game/` zero-dependency: the LLM player is dev tooling — it lives in `dev/`, calls the
  engine as a library, and never ships inside `game/`.

---
skipped: real-time interactive LLM opponent in the browser UI, streaming — this is turn-by-turn
batch play for playtesting + notes. Add interactive only if Bill wants to *play against* it.
	*Bill* - i kind of like the idea of this but it is definitely an aver v0 thing
