# ADR-0003 — `node:test` is the one test harness

Status: Accepted

## Context

The test surface was implemented N times: a hand-rolled `ok()` in `game/test/test.js`
plus a redefined copy in almost every `dev/` test, and two files already diverging
onto `node:assert`. A bespoke harness gives no isolation (one `throw` aborts the
file), no filtering, no first-class async, no timeouts or setup/teardown.

## Decision

`node:test` + `node:assert`, everywhere. Stdlib, so `game/` and the root stay
zero-dependency.

Rejected: a **shared bespoke harness module** — extracting `ok()`/`section()` into
one small module every file requires. Smallest diff at the time, but it is a module
you keep bolting isolation, async and filtering onto as the suite grows, which is
reinventing a runner badly. Do not re-propose it.

`game/test/test.js` is a **thin shim** over the subsystem files beside it, not the
tests themselves. The shim exists because that path is frozen API — skills and docs
pin it — so the split happened underneath it rather than by renaming it. Adding a
subsystem is a new file, never another section in a growing one.

### Tests answer "does it function", not "is this fair"

The balance diff is deliberately **not** promoted into this gate. Content work does
not care whether the meta is fair, so the fairness oracle does not belong in the
functional gate; coupling them adds a slow test and conflates two concerns. See
ADR-0005 for how balance regression is actually handled.

## Consequences

- The gate contract is only the **non-zero exit on failure**. Console format is free
  to change; nothing parses test output.
- A predictive fairness suite, if ever wanted, layers alongside — never folded in.
