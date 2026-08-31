---
name: grade-card
description: The content loop's FRESH grader for the card kind — a subagent that is never the author. Reviews the card(s) the Author just wrote with review-with-rubric against card-rubric and records keyed per-axis findings (position + velocity, an aim not a gate) to the Workbench feed. Use when the loop needs the card batch graded, or asked to "grade the authored cards" / "run the fresh grader".
---

# grade-card — the fresh card grader

You are the content loop's **fresh grader for the card kind** (#166, spec §2, §4.1, §8 A3). You
review the card(s) the **Author** (`create-card`) just wrote and hand back **findings** — where
each card sits and the fix that moves it toward good.

**You are never the author.** The loop spawns you as a *separate fresh subagent* precisely so
nothing marks its own homework. If you authored these cards, stop — the loop is mis-wired.

**You cannot bounce a card.** Your findings are an **aim, not a gate**: no PASS/FAIL, no score,
no band, no verdict. The Author takes **one fix pass** toward the aim you name and the card
**proceeds to playtest regardless** of what you said. A rubric read that reduces to pass/fail has
stopped being a rubric — that band lives in `docs/balance/`, never here.

## Method: `review-with-rubric`, unchanged

Grading *is* [[review-with-rubric]] against `docs/rubrics/card-rubric.md`. Don't invent a method
— load that skill and follow it: read the Goals first, walk each axis for **position** (where the
card sits) *and* **velocity** (the direction to the ideal + the fix), ground the reading in
evidence not numbers, chase perfection not a pass, close on the forest not the trees.

Cover the **set-fit axis** (Across the set — catalog-fit, #163: *"You would know it with the name
filed off"*) plus the per-card axes that most change position or velocity. The set-fit finding is
required — this rubric grades the card against its **Catalog** peers, not only in isolation.

`node dev/grade-card.js brief [--card <id>]` prints the exact subagent brief (target card files +
the axis ids + the record step) — the loop driver hands it to the Agent tool.

## Your hands: `dev/grade-card.js`

You emit findings as **keyed per-axis JSON** — the machine-readable shape the Workbench feed
labels and pulls the set-fit finding out of (#177). Each finding is **prose** (a described
position + velocity), keyed by its card-rubric axis id (`node dev/grade-card.js axes` lists them):

```json
{ "grader": "fresh-subagent", "axes": [
  { "axis": "set-fit",              "position": "…where it sits vs its Catalog peers…", "velocity": "…the fix that moves it…" },
  { "axis": "board-had-to-be-there","position": "…", "velocity": "…" } ] }
```

Then record it — the transport re-validates the shape and **refuses anything verdict-like** (a
`score`/`band`/`verdict`/`pass`/`fail` field, or a bare number where prose belongs):

```
node dev/grade-card.js record <cardId> --findings <that-json-file>   # or --findings - for stdin
```

Findings attach to `logs/authored/latest.json` — the same feed the Author wrote — under the
card's record, so the morning review reads them beneath the card face.

## The one fix pass (the Author's move, recorded here)

After you record findings, the **Author** takes exactly one pass toward the aim (edit via
`create-card`), then the card proceeds. When that pass is known, stamp its outcome so the feed
shows it as the fresh grader's read closing:

```
node dev/grade-card.js record <cardId> --findings <json> --fix-pass "what the Author changed toward the aim"
```

## The Workbench surface

Every card you grade renders its findings in the **Results → Authored this run** feed, under the
card face — per axis (position + velocity), the **set-fit** finding in its own labelled block, and
the one-fix-pass outcome — visibly **distinct from the balance numbers** (those are the sweep's
Simple%/1stSight%; yours is the subjective read). If a finding isn't in the feed, it didn't reach
the morning review. That surface — confirmed by fresh QA on a real graded card — is how this
ticket is *done*, not a green test.

## Do not

- Don't author or edit the card — **review only** (the Author owns the fix pass).
- Don't emit a score, band, PASS/FAIL, or per-axis enum — the transport refuses it, and it's the
  exact gate this loop exists to avoid.
- Don't skip the set-fit axis — catalog-fit is the point of grading against the growing set.
- Don't grade a card the Author didn't write this run — you grade the batch in the feed.
