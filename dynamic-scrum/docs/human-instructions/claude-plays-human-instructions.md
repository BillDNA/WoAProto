#human-instructions #claude-skills #game-logs

# Claude Plays — human instructions

`dev/claude-plays.js` puts a real LLM in the general's chair: it plays complete
battles — or a whole first-to-N **match** — against the heuristic AI (or another
LLM) using your Claude Code subscription. V1 rewired the transport: each LLM
side gets **one persistent claude session for the whole match**, so the rules
are paid for once and ride the prompt cache; every later turn only sends the
fresh battle state.

## What it's for

Heuristic AI (`easy`/`normal`/`hard` in `balance.js`) is fast and good for bulk
balance stats, but it never tells you *why* a card or map felt bad. Claude Plays
trades speed for judgment: it plays like a person reading the rules for the
first time, explains each pick in one sentence, and gives free-text "how did
that feel" notes — per battle AND per match. Match mode also answers Bill's
Round-5 question directly: when a rush draw decides game 1, does first-to-3
smooth it out? The match summary records whether the game-1 winner also took
the match (`seriesFlipped` in the log).

## Running it

```
node dev/claude-plays.js [options]
```

| Flag | What it does |
|---|---|
| `--map <filter>` | pin the map by name substring. Omit it and each battle draws from the (mapset-filtered) roster via the match seed's shuffled map order (WOA-008) |
| `--red / --blue <spec>` | `easy`/`normal`/`hard`/any maps.js `ai` row = heuristic AI; anything else (`haiku`, `sonnet`, `opus`, full model id) = LLM. Defaults: red haiku, blue normal |
| `--match [w]` | **match mode**: first to `w` battle wins (bare `--match` = 3). Omit for a single battle |
| `--effort <lvl>` | `low`\|`medium`\|`high`\|`xhigh`\|`max` for the LLM; `--red-effort`/`--blue-effort` per side |
| `--seed <n>` | match seed (default 1234) — same seed = same deals |
| `--deck <id>` | play a specific `content/decks/<id>.js` instead of the active deck |
| `--mapset <id>` | restrict the roster to a `content/mapsets/<id>.js` set |
| `--k <n>` | show the LLM the `n` most promising step options of the full legal list, picked by the engine's own eval (default 15). Attack steps are never truncated, skip is always listed, and the prompt says how many legal moves the list was cut from. `--full-options` restores the V0 everything-list |
| `--cold` | V0 transport: one `claude -p` process per decision (no session) |
| `--mock` | offline fake transport — full loop test, no spawns, stays out of the DB |
| `--max-turns <n>` | per-battle safety cap (default 60) |
| `--typical-n <n>` | baseline battles for the typicality footer (default 40; cached per map+version+n, so repeat runs don't recompute) |
| `--out <file>` | redirect the JSONL master log |

Typical runs:

```
# quick single battle, cheap model
node dev/claude-plays.js --map cockpit --red haiku --red-effort low --blue normal

# the generate-reports shape: a detached first-to-3 haiku mirror match
nohup node dev/claude-plays.js --map "Saber Ridge" --match 3 \
  --red haiku --blue haiku --red-effort low --blue-effort low --seed 1234 \
  > logs/reports/battle/run-$(date +%Y%m%d-%H%M%S).log 2>&1 &
```

Console output carries a wall-clock timestamp on every line (so you can tell
"stuck" from "thinking") and a scoreboard after each LLM turn: field score,
cards left, match score.

## The transport (V1)

- **Persistent session per side** (`dev/llm-session.js`): the rules go into the
  system prompt once; turn 2 onward reads them from the prompt cache. The model
  also remembers its own match — "last battle I over-extended" is real memory,
  which is exactly what the match felt-notes are probing.
- **Fail-open, always**: a dead session (timeout, error, context overflow)
  flips that side to the V0 cold per-call transport (`dev/llm-client.js`) and
  the run continues; a garbage reply becomes the engine's choice, logged
  `fallback: true`. A run never crashes on transport trouble. The transcript
  header reports session-vs-cold call counts per side.

## What the LLM actually sees (the honesty contract)

Only what a player at the table sees: the board, both sides' units/reserves/
spent piles, terrain, trenches, field scores, cards-left counts, its OWN hand —
and the **count** of the enemy's hidden cards, never their names. The state
text is built in one place (`stateView`); `dev/claude-plays.test.js` plants a
sentinel card in the enemy hand and proves it cannot leak into any prompt
surface. The `--k` option list prunes *dominated* moves using the engine's own
eval, never strategic ones, and is presented in board order (not strength
order) so the model still has to think for itself.

## The logs: `logs/reports/battle/`

- `claude-plays-log.jsonl` — append-only master log. One row per finished
  battle (written the moment it ends — crash-safe), plus a `type: "match"`
  summary row per match (`wins`, `winner`, `game1Winner`, `seriesFlipped`,
  token usage). Rows carry `version`, `transport` (`session`/`cold`/`mock`),
  and `matchId` to group a match's battles.
- `<version>/<stamp>-<map>-<red>-v-<blue>[-match].md` — the readable
  transcript: per-battle decisions + campaign journal + short battle notes,
  the match summary with the rush-luck line, match felt-notes, and the
  **Typicality vs the map baseline** footer (baseline cached per
  map+version+n in `.typicality-cache.json`).
- Finished battles also land as per-battle rows in `logs/woa.db` (kind `llm`)
  when `dev/db.js` is present — query with `node dev/db-query.js`.

## Fail-open behaviour

No transport or model failure may crash a run (a batch keeps running; the
failure shows in the record):

- missing/errored `claude` binary, timeout, garbage JSON, out-of-range pick →
  the engine's own plan is played, logged `fallback: true`;
- an illegal-but-well-formed pick (e.g. a reposition the rules forbid) → same
  fallback path;
- fallback counts are themselves a metric — a high count means the model
  couldn't parse the game, which is a legibility finding, not noise.

## Gotchas

- The claude CLI must be logged in; every LLM decision costs real tokens.
  haiku + `--effort low` is the cheap workhorse.
- Session context grows over a 5-battle match. If a session ever overflows or
  stalls, the fail-open path degrades that side to cold calls — visible in the
  transcript's transport line, not a crash.
- `--mock` is the offline pipeline test (always picks option 0) — use it after
  changing this file's plumbing.
- The engine never lies for the model: every option comes from
  `enumerateChoices`/`rankChoices`, and an illegal pick falls back to a legal
  one (logged). The LLM cannot cheat and cannot crash the game.
- Run `node dev/claude-plays.test.js` after touching the prompt code — it holds
  the honesty-sentinel proof and the rules-text staleness checks.
