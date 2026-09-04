# Heuristic AI

Does it exist to fill a seat and choose a move where no human is choosing? What the bot is, and how it decides.

The line against dev-tooling: this file holds what changes how the bot plays. What we do with bots in order to learn something is dev-tooling.

## The seat

**AI personality**:
A named weight-set that gives a bot a playstyle rather than a strength tier.
_Avoid_: Difficulty (a personality is a style, not a tier), Bot.
_Home_: `game/engine/05-ai.js` — `AI_PRESETS`

**Strength tier**:
How hard a seat plays, chosen separately from which personality it plays as.
_Home_: `game/engine/05-ai.js` — `AI_PRESETS`

**Stronghold**:
An opponent with a character you recognise across games.
_Home_: `docs/rubrics/personality-rubric.md` — `Stronghold`

**Punch-Out**:
An opponent that reads as a puzzle you learn and beat on purpose.
_Home_: `docs/rubrics/personality-rubric.md` — `Punch-Out`

## Choosing a move

**Evaluation**:
The bot's scoring of a position, which is its opinion rather than a rule.
_Home_: `game/engine/05-ai.js` — `evalState`

**Shortlist**:
The capped set of ranked options the bot actually considers.
_Home_: `game/engine/05-ai.js` — `rankChoices`

**Card-keep**:
The bot deciding to hold a Card rather than play it.
_Home_: `game/engine/05-ai.js` — `CARD_KEEP`

**Concede advice**:
The bot's judgement that its position is lost.
_Home_: `game/engine/04-skirmish.js` — `concedeAdvised`

## Guards against degenerate play

**Attrition projection**:
The bot looking ahead to how a Skirmish ends if nobody breaks through.
_Home_: `game/engine/ai/ai-config.js` — `attrWin`

**Anti-shuffle**:
The guard against pointless back-and-forth Repositions.
_Home_: `game/engine/ai/ai-config.js` — `antiShuffle`

**No-op penalty**:
The guard against a turn that resolves nothing.
_Home_: `game/engine/ai/ai-config.js` — `noopPenalty`

## The dials

**AI weights**:
The eval weight table, and the surface a Commander's override merges over.
_Home_: `game/engine/ai/ai-config.js` — `AI_WEIGHTS`

**AI tuning**:
The search and eval dials that are not per-personality weights.
_Home_: `game/engine/ai/ai-config.js` — `AI_TUNING`
