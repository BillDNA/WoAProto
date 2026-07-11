# Goals

Living one-pager stating this project's short/medium/long-term **intent** — not a tracked plan — so a
judgment call (a mid-ticket trade-off, a runner disposition, a sprint-planning pull) can goal-orient.
Bullets carry a stable **slug-based handle** (few in number — one page for *all* goals — high-leverage
guidance only); cite as `[[Goals]] <goal-slug>`.

**Horizons are altitude, not calendar:** **Short** ≈ current-milestone/ticket altitude, **Medium** ≈
spec/parking-lot altitude, **Long** ≈ project level. A goal that straddles horizons goes wherever it
reads best.

**One page, hard. Replace-in-place** — this file never grows like `Decisions.md`; git history is the
archive of past goals.

**Owner: Bill.** `end-session` / `close-ticket` never touch this file. Claude proposes an edit only
when asked, or flags (never silently edits) a goal that reality has plainly overtaken. Natural review
moment: a `session-start roadmapping` glance.

<!-- drafted by reconnect 2026-07-10 — Bill: edit/approve in place -->

## Short-term
<!-- current-milestone/ticket altitude — what should THIS sprint's calls optimize for? -->
- **balance-iteration-loop** — get this to a point where we can run it over night without guidance.
- **improve-balance-numbers** — reduce drag (less dead turns at the end), increase swings (more back and forth), distribute turns (i.e they shouldn't just be attrition and quick rushes), reduce 0 kills (ideally <= 2%), 
- **increase-data-value** — if we are measuring something how dose it single something to improve and how do we make sure it can be seen.

## Medium-term
<!-- spec/parking-lot altitude — what should the next few milestones converge on? -->
- **content-as-data** — a new card, map, metric, or content kind stays a one-file diff (`content/`, `report-model.js`, `kinds.js`); if it isn't, fix the seam before adding the thing.
- **physical-limitations** — keeping the physical-board constraints (24-hex ceiling, 16-card decks, piece stocks) as design guardrails helps limit systems explosion 
- **roguelite-deck-builder** — converge on a card pool larger than the 20-card deck plus a deck-building loop between battles, with side asymmetry (per-side decks, Commander abilities) behind it; metrics/rubrics tooling lands first because the balance swings get bigger.

## Long-term
<!-- project altitude — why does this project exist, and what does "done" look like? -->
- **zero-build-game** — `game/` stays plain scripts, no bundler, zip-and-double-click keeps working; `node game/server.js` is the standard dev path. 
- **steam-release** — ship a Steam roguelite deck-builder.

## Related
[[Decisions]] · [[Roadmap]]

#goals
