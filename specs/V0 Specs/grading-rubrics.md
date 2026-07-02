# Grading rubrics + north-star goals

Formalized rubrics for cards, maps, units, and the game overall, each anchored to a **north-star
goal** and, where possible, to the `balance.js` number that measures it. This is the reference
[[claude-skills]] (create-card / create-map / run-tournament) grade against, and what a "is this
change good?" conversation with Bill leans on. It is mostly a written doc, not a scoring engine.

## North stars (what "good" means for this game)

- **Skill over luck.** A stronger player should win more — `balance.js matchup` skill premium is
  the meter. (Currently: normal>easy 70%, hard>easy 83%, hard>normal ~54% — thin.)
- **Decisive games.** Low zero-kill%, first-blood converts to a win, board control tracks winning.
  (Baselines: zero-kill ~4%, first-blood→win 62%, control-tracks-win 79%.)
- **No dead turns.** A player always feels they can act — Skip% ≈ 0.
- **Balanced start.** Mover advantage healed (first mover ~46%); side bias per map within reason.
- **Tie-rule not deciding too much.** Tie-goes-to-2nd currently decides ~25% of battles — the
  biggest open lever; a rubric threshold makes "too much" a number.

## Rubric shape (per artifact → tie each criterion to a metric)

**Card** — does it add a *decision*? Signals from the card report:
- Skip% (dead card if high) · Simple% (weak printed action if high) · 1stSight% (OP watchlist) ·
  AvgSeen (situational) · Win% (kept but weak in an attrition game — don't over-index).

**Map** — side balance · mover balance · HQ-vs-attrition mix · distance-4 compactness (the dist-4
maps are the healthiest) · board-control-tracks-win · tie-rule share.

**Unit** — role distinctness (inf/cav/art as 1/2/3 field-score and as attack/def/support roles) ·
field-score contribution · is any unit strictly dominated?

## Grounding

- Every criterion that *can* map to a `balance.js` metric should name it, so grading is "read the
  number against the threshold," not vibes. Criteria that can't (theme, readability) stay
  qualitative and say so.
- Thresholds are Bill's call — leave them as tunable targets in the doc, not hardcoded gates.
	*Bill* - in general I'm think the shape of each item in a rubric is; a goal statement, evidence framework and data origin, and score meaning. 

---
skipped: an automated pass/fail scorer / CI gate on balance numbers — the rubric is a reasoning
aid for Bill + the skills, not a merge blocker. Add gating only if manual grading gets tedious.
