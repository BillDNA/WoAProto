#claude-skills #human-instructions

> **For the human sharing this:** this doc describes a pattern, not a
> drop-in tool or code to copy. Hand it to a Claude instance working in
> *your own* game repo and ask it to design and build an implementation
> from scratch against your existing architecture (your engine, your move
> representation, your AI-vs-AI harness if you have one).

> **For the Claude picking this up:** there is no reference codebase
> attached to this doc — implement it fresh. Read the target repo first
> (rules engine, existing AI harness, move/state representation), then
> satisfy each numbered requirement below in whatever shape fits that
> codebase. If a requirement doesn't apply (e.g. the game has no hidden
> information), say so and skip it rather than forcing a match. Section 5
> and 6 give minimal pseudocode shapes to work from, not APIs to call.

# Headless-LLM playtest harness — generalized spec

## 1. Problem this solves

A scripted/heuristic AI is fast and good for bulk statistics (win rates,
turn counts, card-usage frequency) but can't tell you *why* something felt
bad to play. An LLM playing the game under the same rules a human would —
seeing only honest information, picking from the actual legal moves, and
giving free-text reasoning — gives you a second, qualitative signal: does
this card feel useless, does this map favor one side, does the endgame
drag. Use it to follow up on a suspicious stat from your quantitative
AI-vs-AI tooling, not to replace it.

## 2. Core requirements

Any implementation of this pattern needs all of the following. They're
listed in priority order — if you're cutting scope, cut from the bottom.

1. **Drive the LLM through your existing rules engine, never around it.**
   The model never writes a move in free text that gets parsed and
   validated after the fact. Instead: your engine enumerates the legal
   moves for the current decision point, you present them as a numbered
   list, and the model's entire output is an index into that list (plus a
   short rationale string). This makes illegal moves structurally
   impossible — there is no failure mode where the LLM "cheats" or hands
   you unparseable game logic to debug.

2. **Honest information only.** Serialize game state from the *current
   player's* point of view: their own full state, but only what a human
   in their seat would legitimately know about the opponent (visible
   board state, counts of hidden things, never the contents of hidden
   things or future randomness/deck order). If your game has no hidden
   information this requirement is trivially satisfied — say so and move
   on.

3. **Structured decision output.** Force a small JSON shape per decision —
   at minimum `{choice: <index>, why: "<short reason>"}`. Append the
   schema to the prompt (most cheap/local LLM transports don't have a
   native structured-output param) and parse leniently (find the first
   `{...}` block; don't require the whole reply to be pure JSON, models
   wrap it in prose sometimes).

4. **Fail open, always.** Any bad response — process spawn failure,
   timeout, malformed JSON, an out-of-range index, an empty reply — must
   fall back to a deterministic default (your existing heuristic AI's
   choice, or "first legal non-pass option") and get logged as a
   fallback, never thrown. A playtest run must be able to survive a flaky
   model indefinitely. Track the fallback rate; a high one tells you the
   run's qualitative notes aren't trustworthy.

5. **Cold call per decision — don't keep a persistent chat session open
   for the whole game.** Each decision (and each step within a multi-step
   turn) is its own stateless LLM call that restates the current game
   state fresh; there's no conversation memory carried between calls.
   This is a deliberate tradeoff, not a missing feature:
   - **Cost/latency stay flat.** A persistent session's context grows
     every turn, so the tense endgame — the turns you most want a good
     read on — end up the slowest and most expensive.
   - **Ground truth over remembered state.** The model reasons off the
     engine's authoritative state every call, not off a summary it might
     misremember from 40 turns back.
   - **Fail-open stays cheap.** A flaky single call just falls back for
     that one decision (requirement 4). A dead or corrupted long-lived
     session would cost you reasoning continuity for the rest of the game.
   - **Schema compliance holds up.** A long multi-turn conversation drifts
     from "always reply in exactly this JSON shape" as context fills with
     prior back-and-forth; a fresh call restates the schema every time.
   The real cost of this choice: the model can't build an evolving
   strategy across turns the way a human would. That's an acceptable
   trade for a playtest harness — worth revisiting only if felt-notes
   start complaining the AI "forgets its own plan."

6. **Post-game free-text reasoning ("felt-notes").** After the game ends,
   show the LLM player the full game log/journal and ask for short
   free-text notes: what felt strong, what felt weak, what felt
   luck-driven, one suggested change. This is the actual qualitative
   payoff of the whole harness — everything above exists to make this
   answer trustworthy.

7. **Structured, appendable report output.** One record per run (JSON
   Lines is the natural fit — one JSON object per line, easy to append
   and to `grep`/stream-process). Include: run identity (which sides were
   AI vs. LLM, which model, seed/map/config), the full decision log with
   each choice + rationale + fallback flag, outcome, the felt-notes text,
   and token usage if you're paying per call.

8. **A mock/offline transport.** Let the harness run without spawning a
   real LLM (canned deterministic responses) so you can test the harness
   itself — turn loop, logging, report shape — without burning API calls
   or waiting on real inference.

## 3. Things that are genuinely optional

- **Model/effort selection per side.** Nice to have (lets you A/B
  cheap-vs-strong models, or pit LLM against your heuristic AI) but not
  load-bearing. If your transport doesn't expose a reasoning-effort knob,
  don't fake one — just document that it isn't there yet.
- **Live console narration.** Printing each decision as it happens is
  good for debugging the harness and for a human watching along, but the
  JSONL report is the real artifact.
- **Attack/outcome previews or other precomputed hints.** If your engine
  can cheaply tell the model "this move wins/loses/ties," include it —
  it reduces wasted model effort re-deriving arithmetic your engine
  already knows, but it's a quality-of-life addition, not a requirement.

## 4. Non-goals

- This is not a way to get the LLM to *learn* — no fine-tuning, no
  memory across games. Every game is a cold start.
- This is not meant to replace your bulk AI-vs-AI balance tooling. It's
  slower and costs real tokens; use it to spot-check, not to sweep.
- Don't build a report-summarizer as part of this harness. Keep "play
  the game and log it" and "read logs and produce recommendations" as
  separate tools/skills — the harness's job stops at producing a
  faithful, structured record.

## 5. Minimal shape of one decision round-trip

```
state  = serialize_state(game, perspective_of=current_player, reveal_hand=depends_on_decision)
moves  = engine.enumerate_legal_moves(game)          # your engine, not the LLM
prompt = rules_blurb + state + numbered(describe(m) for m in moves) + "pick the option number"
reply  = llm.call(system=rules_blurb, user=prompt, schema={choice:int, why:string})
if reply is valid and 0 <= reply.choice < len(moves):
    apply(moves[reply.choice])
else:
    apply(fallback_choice(moves))   # heuristic AI's pick, or first non-pass
    log(fallback=True)
log(turn, side, move_description, reply.why, fallback)
```

## 6. Minimal shape of the report record

```json
{
  "ts": "...", "config": {"map/level": "...", "seed": 1234, "sideA": "haiku", "sideB": "hard-ai"},
  "winner": "...", "outcome_type": "...", "turns": 41,
  "fallbacks": 2,
  "decisions": [{"turn": 3, "side": "A", "choice": "...", "why": "...", "fallback": false}],
  "notes": {"A": "felt-notes text..."},
  "usage": {"inputTokens": 12345, "outputTokens": 678}
}
```

## 7. Practical LLM-transport notes (whatever CLI/SDK you use)

- Spawning a subscription CLI (like `claude -p`) per call is a fine,
  zero-dependency transport if you already have that CLI authenticated.
  It's a cold process per call (no session memory), matching
  requirement 5 above by construction.
- Put the prompt on stdin, not argv — assembled game state can exceed
  argv length limits on some platforms.
- Resolve the real binary defensively on Windows: an npm-installed shim
  is a `.cmd`/`.ps1`, which a plain `spawn()` can't exec without
  `shell: true` (and `shell: true` will mangle multi-line prompts) — find
  the actual `.exe` or fall back to running the adjacent `cli.js` under
  `node` directly.
- Wire up stdout/stderr listeners *before* writing to stdin, or a big
  prompt can deadlock on the pipe buffer.
- Always set a timeout that kills the process and fails open — a hung
  subprocess must not hang your whole playtest run.
