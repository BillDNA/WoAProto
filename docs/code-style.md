# Code style — comments

*Standing guide. The build doctrine is in [[code-architecture]]; this governs one thing: what a comment is allowed to say.*

## The one rule

**A comment explains why the code is the shape it is. Git explains when and who.**

If a line would still be true after every ticket is closed and forgotten, keep it. If it only makes sense to someone who lived through the ticket, cut it — that history is in `git log` and the issue tracker, where it belongs.

## Keep

- **Invariants and non-obvious mechanics** — "survivors are right-censored at skirmish length, not excluded" · "registers into `CARD_BY_ID` without touching `CARDS` so the fixture never leaks into a shuffled deck."
- **Why *this* shape over the obvious one** — "one implementation per fact: this used to live in four places and drifted."
- **Load-bearing constants** — the meaning of a magic number, the reason for a threshold.
- **A function-index header** — a table of contents for a long file is worth its lines.

## Cut

- **Ticket / spec tags in code** — `WOA-044`, `SPEC §3`, `Feedback Round 4`, `balance-loop-v2 final report S5c.3`. The *fact* stays; the tag goes. If provenance matters, it goes in the commit message or the issue, not the source.
- **History** — "used to be hardcoded 16", "pre-WOA-037", "established by", "the ticket's explicit ask". What the code *was* is `git blame`'s job.
- **Repro anecdotes** — "Bill's repro: infantry on D3…". Turn it into an assertion or a fixture name; delete the story.
- **Narration that restates the code** — a 30-line paragraph over a 30-line function. Compress to the one line a reader can't derive by reading the code.

## Provenance, when you need it

Point, don't transcribe: a bare `[[analysis-file]]` link or one issue number is fine when a decision genuinely needs a source. A paragraph of it is not.

## Rule of thumb

Signal-to-length: if the load-bearing content is one line, the comment is one line. When in doubt, cut — a reader who needs the history can `git blame`; a reader misled by stale narration can't un-read it.
