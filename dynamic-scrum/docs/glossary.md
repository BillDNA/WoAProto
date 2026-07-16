---
last-reviewed: 2026-07-16
---

# Glossary

The project's lexicon — short definitions for a fresh context. This is a quick-reference index, not
the full explanation: each term's real depth lives in [[code-architecture]] or the
[[War Of Attrition rule book]] — follow the term to those docs for the mechanics.

| Term | Meaning |
| --- | --- |
| Field score | Surviving-unit value on the board (inf 1 / cav 2 / art 3) — the attrition win condition; reserves never deployed count for nothing. |
| Attrition win | Victory when a player can't draw a card, decided by field score (tie goes to the second player). |
| Deploy | Bring a reserve piece onto the board. Once deployed, a piece can't return to reserve. |
| Reserve | A piece not yet deployed — tracked per side (`reserveEndRed`/`reserveEndBlue`, WOA-016). |
| Support | Adjacent allied units add their `sup` stat to an attack/defense, unless blocked by a trench on that border. |
| Trench | Attacker-support denial on one hex border; also grants the defender tie-survival (rules 1.1). Not a defense bonus. |
| River | Blocks deploy-control extension across it; does NOT block support or attacks (rules 0.3+). |
| `noAdvance` / `tieSpare` | Attack-step flags: `noAdvance` = attacker never enters the hex even on a win; `tieSpare` = attacker survives a combat tie. |
| `mustPlayStep` | House rule: at least one step of a played card must resolve — you can't skip every step to burn a free order. |
| No-op / Noop% | A play that resolved zero actions — a dead turn. Tracked per card; printed in saved reports, not the `balance.js` terminal table. |
| `CARD_KEEP` | Per-card AI hoarding weight — how reluctant the AI is to burn a card as a basic action instead of its printed one. |
| `AI_WEIGHTS` | The tunable multipliers behind the AI's board evaluation (`evalState`); see [[ai-heuristic-model]]. |
| Map-set | A named roster of maps (`content/mapsets/`); the ACTIVE one is the match pool for every play mode and CLI tool. |
| `RULES_VERSION` / `Engine.VERSION` | The rules-era stamp (currently 1.1) that partitions `logs/reports/` and `logs/woa.db` so playtest data stays apples-to-apples. |
| Behaviour / Decisiveness lines | The balance-report summary rows: attacks/swaps/fielded% (Behaviour) and tie-goes-to-2nd/first-blood/board-control (Decisiveness). |
| Drag / Swings | Pacing metrics: Drag = trailing kill-less turns before game end (high = circling); Swings = field-score lead changes per battle (high = back-and-forth). |

## Related

[[Docs Index]] · [[code-architecture]] · [[War Of Attrition rule book]] · [[grading-rubrics]]

#glossary
