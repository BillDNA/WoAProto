#human-instructions #claude-skills #game-logs
# Having Claude play a battle — how to run it and set the knobs

`dev/claude-plays.js` runs one real battle where an LLM (or the built-in
heuristic AI) plays each side. The LLM only ever picks from a numbered list of
**legal** moves the engine hands it, and sees only what a player sees (its own
hand, the board, reserves, spent piles, enemy hand *counts* — never the enemy
hand or deck order). A bad/garbage reply falls back to the engine's own choice
and is logged as a fallback; a run never crashes on a bad response. After the
battle each LLM player is asked for short "how it felt" notes.

## Run it

```
node dev/claude-plays.js [options]
```

Requires the Claude Code CLI on PATH (it spawns `claude -p` per decision). Use
`--mock` to exercise the whole loop offline with a canned transport (no spawns).

## The knobs you asked for

### Set the map
```
node dev/claude-plays.js --map thornfield
```
`--map <filter>` is a case-insensitive name match against the built-in roster
(e.g. `--map cockpit`, `--map "long march"`). Omit it to use the first
built-in map. (Custom maps aren't matched here — it reads the built-in roster;
say the word if you want custom-maps.js included.)

### Set the effort level of the headless Claude CLI
```
node dev/claude-plays.js --blue sonnet --effort high
```
`--effort <low|medium|high|xhigh|max>` is passed straight through to every
`claude -p` call the LLM players make (it maps to the CLI's own `--effort`
flag). Omit it to use the CLI's default effort. Higher effort = the model
deliberates more per move (slower, more thoughtful play); it applies to both
LLM sides and to their end-of-battle felt-notes. It has no effect on a side
run by the heuristic AI (`easy|normal|hard`).

## The other options

| Option | Default | What it does |
|--------|---------|--------------|
| `--red <spec>`  | `haiku`  | Who plays red. `easy`/`normal`/`hard` = the built-in heuristic AI; anything else (`haiku`, `sonnet`, `opus`, or a full model id) = an LLM. |
| `--blue <spec>` | `normal` | Same, for blue. So the default is haiku (LLM) red vs the normal heuristic AI blue. |
| `--seed <n>`    | `1234`   | Match seed — same seed + same players = the same deck draws. |
| `--max-turns <n>` | `60`   | Safety cap; a battle normally ends in ≤32 turns. |
| `--mock`        | off      | Fake transport (always picks option 0, canned notes) — offline loop test. |
| `--out <file>`  | game-logs/claude-plays-log.jsonl | The append-only JSONL master log. |

## Where the logs go (Feedback Round 2)

Both land in `design-docs/game-logs/`:

- **`claude-plays-log.jsonl`** — one JSON line appended per battle: map, seed,
  players, effort, winner/winType, turns, every decision (with the model's
  one-line reasoning and whether it was a fallback), the felt-notes, and token
  usage. This is the machine record.
- **`<timestamp>-<map>-<red>-v-<blue>.md`** — one readable transcript per run:
  the result, the decision list, the full campaign journal, and each side's
  felt-notes. This is what you (and the game-log summary skill) read.

## Examples

```
# Sonnet (red) vs the Field Marshal AI (blue) on The Cockpit, deliberating hard
node dev/claude-plays.js --red sonnet --blue hard --map cockpit --effort high

# Two LLMs head to head, quick and cheap
node dev/claude-plays.js --red haiku --blue haiku --effort low

# Offline smoke of the whole pipeline (no CLI spawns, writes real log files)
node dev/claude-plays.js --mock --blue haiku
```
