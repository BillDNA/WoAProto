# Dev-tooling

Does it ship with the game, or is it built to help develop the game? Everything used to run games in bulk, record what happened, and judge what came back.

The words for judging live here; what "good" currently measures does not — those numbers live with the rubrics, so they can move without editing a glossary. The dev screens themselves are interface; what identifies a run is integration.

## The loop

**Balance loop**:
The cycle of running play, folding the results, judging them, and changing content.
_Home_: `docs/human-instructions/standard-runs-runbook.md` — `balance-loop recipe`

**Rules era**:
A regime of rules and AI strength treated as internally comparable.
_Avoid_: Version (reserve that for the era's number).
_Home_: `game/engine/01-core.js` — `RULES_VERSION`

## Running games in bulk

**Sweep**:
A batch of Skirmishes run to produce numbers rather than to be watched.
_Home_: `game/sim.js` — `balanceMap`

**Luck-o-meter**:
Pitting two personalities against each other to size how much of a result is variance.
_Home_: `dev/balance.js` — `matchup`

**Balance lab**:
The command-line tool Bill iterates with.
_Home_: `dev/balance.js` — `balance lab`

**Config bug**:
The screen-corner stamp of the live config identity, so a screenshot carries the dials behind it.
_Avoid_: Watermark, badge.
_Home_: `game/ui/boot.js` — `configBug`

## What gets recorded

**Skirmish fact**:
The flat record of everything the balance layer reads off one finished Skirmish.
_Avoid_: battle fact, per-battle row.
_Home_: `game/sim.js` — `skirmishFacts`

**Decision journal**:
The per-decision event stream, carrying the Card played and every Card declined.
_Avoid_: play log (that is the played-only subset).
_Home_: `game/engine/04-skirmish.js` — `decisionLog`

**Held Card**:
A Card that has declined events and no played one.
_Home_: `dev/db.js` — `card_events`

**Decline signal**:
Evidence drawn from a Card being passed over rather than played.
_Home_: `docs/rubrics/card-rubric.md` — `Decline signal`

**Star schema**:
The shape of the balance store: fact tables at a few grains, surrounded by dimensions they join to.
_Avoid_: bolted-flat.
_Home_: `dev/db.js` — `SCHEMA`

**Fact table**:
A table at one measured grain.
_Home_: `dev/db.js` — `skirmishes`

**Dimension table**:
A lookup upserted from loaded content that facts point at by id.
_Home_: `dev/db.js` — `maps`

**Card event**:
One row of the card-decision fact table.
_Avoid_: card play row.
_Home_: `dev/db.js` — `card_events`

**Fold**:
The single reduction from many finished Skirmishes to aggregate numbers.
_Home_: `dev/db.js` — `SCHEMA`

## Reading the numbers

**Drag**:
Trailing kill-less turns before a Skirmish ends.
_Home_: `game/report-model.js` — `'drag'`

**Swings**:
Lead changes within a Skirmish.
_Home_: `game/report-model.js` — `'swings'`

**Kill-tail**:
The run of turns at the end of a Skirmish in which nothing died.
_Home_: `game/sim.js` — `killTail`

**Simple%**:
The share of a Card's plays that were its plain, unconditional use.
_Home_: `game/report-model.js` — `simple`

**Mispricing residual**:
The gap between a Card's measured contribution and its army-points cost.
_Home_: `game/report-model.js` — `r.resid`

**Skill premium**:
How much better a stronger seat does against a weaker one.
_Home_: `docs/balance/balance-baselines.md` — `Skill premium`

**Small-n rule**:
The refusal to conclude anything from too few Skirmishes.
_Home_: `game/report-model.js` — `SMALL_N`

## Judging

**North star**:
A statement of what good means, that a change is judged against.
_Home_: `docs/balance/README.md` — `North stars`

**Hard floor**:
A threshold that is never relaxed, whatever the tolerance.
_Home_: `docs/balance/README.md` — `Hard floors`

**Guard band**:
A range shown for context but deliberately not scored.
_Home_: `docs/balance/best-map-score.md` — `Guard bands`

**Baselines to protect**:
The healthy values for the current era, where a sharp move signals a regression.
_Home_: `docs/balance/balance-baselines.md` — `figures to protect`

**Regression anchor**:
The fixed set a rules change is measured against.
_Home_: `docs/balance/balance-baselines.md` — `anchor`

**Tolerance temperature**:
How far a measured metric may sit outside its band and still be accepted.
_Avoid_: bare "temperature" — say which one.
_Home_: `game/report-model.js` — `temperature`

**Exploration temperature**:
How large a step content iteration takes through design space.
_Home_: none yet — search-layer concept, not in code.

**Timing blind spot**:
The scorer's inability to value a Card whose worth is in when it is held or played.
_Home_: `docs/rubrics/card-rubric.md` — `Timing blind spot`
