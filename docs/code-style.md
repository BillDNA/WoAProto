#claude-orientation #code-style
# Style guide — comments & docs

*Standing guide. The build doctrine is [[code-architecture]]; this governs one thing: what a comment and a doc are allowed to say. Enforced tree-wide by `dev/check-prose.js` (in `npm test`).*

## The one rule

**A comment explains why the code is the shape it is. A doc explains the parts too big for a line. Git and the issue tracker explain when, who, and how we got here.**

State the current fact, tersely. If a line would still be true after every ticket is closed and forgotten, keep it. If it only makes sense to someone who lived through the ticket, cut it — that history is in `git log` and the issue tracker, where it belongs.

## Progressive disclosure in docs

Docs layer: an orientation page you can read in a screen ([[code-architecture]]) → a per-area drill-down when you need the mechanics → the source. A single doc that tries to hold everything is worse than nothing; a reader can't find the one fact in a wall of them. The orientation page names the subsystem and hands off; the subsystem doc holds the detail; one home per fact.

A schema, a data contract, a table of metric definitions, a "why the numbers are approximate" note — these are reference material, not comments. They belong in a doc under `docs/` that [[code-architecture]] points to. The code then carries a one-line summary and a pointer: `// trace envelope shape: see report-model.md`.

Before keeping a long "why" block inline, ask: *does a reader need this at THIS line, or would they find it faster from a doc?* Locality wins for a caveat that only makes sense next to the three lines it guards; a doc wins for anything a second file would also want to read.

## No war stories — anywhere

A rule states what is true now. The why, the when, the incident, and the tradeoff go in the **commit message or the PR body**, in full — never in the doc or the comment. `dev/check-prose.js` fails the build on the residue:

- **Ticket / spec tags** — `WOA-044`, `WoAProto#221`, `#217`, `SPEC §3`. The *fact* stays; the tag goes.
- **Round / dated narration** — `Feedback Round 4`, `Round-3 ruling`, `Batch B`, `July 2026`, `2026-07-18`, `as of 0.3`.
- **Era labels** — `V0`, `V1` as a story prefix ("the V1 layout pass"). Say the mechanic, not the era.
- **History** — "used to be hardcoded 16", "pre-WOA-037", "the ticket's explicit ask". What the code *was* is `git blame`'s job.
- **Repro anecdotes** — "Bill's repro: infantry on D3…". Turn it into an assertion or a fixture name; delete the story.
- **Narration that restates the code** — a 30-line paragraph over a 30-line function. Compress to the one line a reader can't derive.

## Keep

- **Invariants and non-obvious mechanics** — "survivors are right-censored at skirmish length, not excluded" · "registers into `CARD_BY_ID` without touching `CARDS` so the fixture never leaks into a shuffled deck."
- **Why *this* shape over the obvious one** — "one implementation per fact: this used to live in four places and drifted" (the reason, not the ticket that fixed it).
- **Load-bearing constants** — the meaning of a magic number, the reason for a threshold.
- **A function-index header** — a table of contents for a long file is worth its lines.

## Comments are not a second copy of the code

If a comment block is longer than the code it sits over, you have written the same fact twice — once in code, once in prose — and the two will drift. Cut until the comment is shorter than the code, or the two are telling a reader different things.

## Provenance, when you need it

Point, don't transcribe: a bare `[[analysis-file]]` wikilink is fine when a decision genuinely needs a source. A paragraph of it is not, and a ticket number is not — the tracker holds that.

## Rule of thumb

Signal-to-length: if the load-bearing content is one line, the comment is one line. When in doubt, cut — a reader who needs the history can `git blame`; a reader misled by stale narration can't un-read it.

## Related

[[code-architecture]] · `CONTEXT.md`
