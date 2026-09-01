# ADR-0003 — Adopt `node:test` as the one test harness

Status: Accepted (2026-08-25)

## Context

`game/test.js` is a flat 1654-line god-file with a hand-rolled `ok()` harness,
and that harness is re-implemented inline in almost every other test file
(`dev/claude-plays.test.js`, `dev/db.test.js`, `dev/smoke.js` each redefine
`ok()`; `dev/db.test.js` also redefines `section()`). Two files
(`dev/llm-client.test.js`, `dev/llm-session.test.js`) already use `node:assert`
instead — a second, divergent style. There is no single command that runs all
three tiers (game gate + dev module tests + jsdom smoke) with one pass/fail.

This violates one-implementation-per-fact (the test surface is implemented N
times) and, left alone, gets worse: a bespoke `ok()` gives no test isolation
(one `throw` aborts the whole file), no run-one-test filtering, no first-class
async, no timeouts / skip / setup-teardown. As the project grows toward the
Steam deck-builder scope, those are exactly the features we would end up
reinventing — re-growing the god-file this ADR is trying to kill. Future
sessions also ape what they see, so two coexisting harness styles blur into
more divergence over time, not less.

Considered harness choices:

- **Keep flat / status quo** — the god-file the spec (#46) is filed against.
- **Bespoke shared harness module** — extract `ok()`/`section()` into one
  ~15-line module every file requires. Smallest diff today, still zero-dep, but
  it is a module we keep bolting features onto (isolation, async, filtering) as
  the suite grows — reinventing a runner badly.
- **`node:test` + `node:assert`** — Node's built-in test runner and assertions.
  Stdlib, so still zero-dependency; gives isolation, filtering, async,
  timeouts, and setup/teardown for free; `node --test` is itself the aggregate
  runner and single entry point.

An earlier objection — that `node:test` would break the golden-balance-diff's
byte-identical contract — was wrong: the golden diff oracles
`node game/balance.js` output, **not** `test.js` output. The functional gate's
console format is free to change as long as it still exits non-zero on failure.

## Decision

Adopt **`node:test` + `node:assert`** as the single test harness for every test
file. The bespoke `ok()`/`section()` surface is retired; the two files already
on `node:assert` converge by wrapping their bodies in `test()` blocks.

Single entry point is **`npm test`**, wired in a root `package.json` that
carries only the `test` script and **no dependencies**:

```json
{ "scripts": { "test": "node --test game/test.js dev/*.test.js dev/smoke.js" } }
```

Explicit paths (not a rename of the frozen `game/test.js`) so no path-freeze
sweep is triggered by the runner itself. `jsdom` stays declared in
`dev/package.json`; Node resolves it for the smoke test regardless of where
`npm test` is invoked, so the root stays dependency-free.

`game/test.js` is split by subsystem along its existing `== section ==` seams
(geometry / terrain / cards / maps / ai-matches). A thin `game/test.js` shim
remains so the frozen-API path still resolves; its subsystem doc/skill sweep
lands in the same commit as the split.

### Out of scope: the balance oracle stays a discipline, not a gate

The golden-balance-diff is **not** promoted to a first-class test here. Tests
answer *"does it function"*; balance answers *"is this fair"*. Content and
functional work does not care whether the meta is fair, so the fairness oracle
does not belong in the functional gate — coupling it would add a slow test and
conflate two separate concerns. It stays the manual `node game/balance.js`
byte-identical discipline. A dedicated fairness-check *suite* (a sweep sibling
to the test suite) is a parked idea, not this work.

## Consequences

- One test surface, one command. New test files inherit isolation, async,
  filtering, and setup/teardown from stdlib — nothing bespoke to feed.
- The 1654-line god-file is split into subsystem files under the shared runner;
  adding a subsystem is a new file, not another section in one growing file.
- `game/test.js` stays a resolvable path via a thin shim, so skills and docs
  that pin it keep working; the split lands with its same-commit doc sweep.
- Test console output changes format (TAP). This is cosmetic: the gate contract
  is only the non-zero exit on failure, and the golden diff never read test
  output. `node game/test.js` still runs standalone under `node:test`.
- Conversion is file-by-file, each riding its own green gate; a temporary mixed
  state (some files converted, some not) is harmless because a plain `ok()`
  file still runs under `node --test` as one implicit test.
- If a predictive fairness suite is ever wanted, it is a *separate* harness
  layered alongside — never folded into this functional gate.
