# War of Attrition — battle on "The Cockpit" (seed 1234)

- rules version: **1.0** · transport: mock
- red: **haiku** · blue: **normal**
- 2026-07-07T18:01:04.211Z
- Result: **Blue** wins by hq after 4 turns
- Fallbacks (LLM reply unusable → engine chose): 1 of 5 decisions
- Transport: red 0 session / 0 cold calls · blue 0 session / 0 cold · tokens in/out 0/0

## Battle 1 — Blue by hq (T4)

### Decisions
- T1 red — card: "Deploy Infantry" — _mock: always the first option_
- T1 red — step-deploy: Deploy Infantry at A2 — _(fallback: choice failed)_  `(fallback)`
- T2 blue — card: "Deploy Cavalry"
- T3 red — card: "Ordered Withdraw" — _mock: always the first option_
- T4 blue — card: "Careful Maneuvers"

### Battle notes
- **red**: Mock felt-notes: the countdown felt strong; nothing felt luck-driven because the dice are imaginary. Suggested change: use a real model.

### Campaign journal
- T1 Battle 1 — "The Cockpit". Red moves first.
- T1 Red plays "Deploy Infantry".
- T1 Red deploys Infantry at A2.
- T2 Blue plays "Deploy Cavalry".
- T2 Blue deploys Cavalry at D3.
- T2 Blue deploys Cavalry at C3.
- T3 Red plays "Ordered Withdraw".
- T3 Red finds no opening — the order is spent to no effect.
- T4 Blue plays "Careful Maneuvers".
- T4 Blue marches Cavalry from C3 to B2.
- T4 Blue Cavalry attacks Red HQ at A1 (2 vs 1): defender destroyed, attacker advances.
- T4 Blue wins the battle by capturing the headquarters!

## Felt-notes

### red (haiku)

Mock felt-notes: the countdown felt strong; nothing felt luck-driven because the dice are imaginary. Suggested change: use a real model.

## Typicality vs the map baseline

_Baseline: 40 hard-AI self-play battles on "The Cockpit" (rules 1.0), folded through the same aggregation as the Balance Dashboard (cached)._

| Metric | This game | Baseline | Read |
|---|--:|--:|---|
| Ending | Blue by hq | 33% HQ / 67% attrition | HQ capture, in line with the map |
| Length | T4 | ~25 avg | 84% shorter — quicker than usual |
| Winner side | Blue | red 53% | map leans red 53% |
| Kills (units lost) | 0 | 3% zero-kill | a zero-kill game (3% of baseline games are) |
| Attacks resolved | 1 | ~6.3 avg | below baseline |
| Final VP gap | 3 | ~3.9 avg | about average |

An **atypical** game — much shorter than average; a zero-kill game where the map usually sees combat.

#reports #battle #v1-0
