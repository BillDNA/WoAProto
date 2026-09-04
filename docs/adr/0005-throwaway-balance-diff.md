# ADR-0005 — Balance regression is a throwaway diff, never a committed fixture

Status: Accepted

The rule itself is in the CLAUDE.md "tests are the contract" clause, loaded every
session. This is the record of why the obvious alternative loses.

## Context

"Golden balance diff" read literally invites a **committed, gated fixture** that
hashes the current game's outcomes over shipping content. One shipped once.

## Decision

Rejected: **a committed outcome fixture, in any form** — a recorded aggregate, a
hashed transcript set, a pinned win-rate. Do not re-propose it.

It has **no oracle**. It only knows "different from last time", and when content is
the thing under active iteration — the entire point of this build — "different" is
the expected, correct result of every edit. So it fires on every content change and
its only maintenance is re-blessing the recording. That freezes content and makes
the game stand still, which is the opposite of what the fixture was meant to protect.
It also contradicts the mechanism-not-value doctrine ([[testing-seams]]) that had
just finished removing content-value pins from the suite.

What replaces it: the sim is deterministic, so a before/after `dev/balance.js` diff
you generate, read, and **discard** is a free regression net. Baselines go in the
gitignored `dev/baselines/` so a forgotten one cannot leak into main.

## Consequences

- Editing a map, a card or a unit stat reds nothing. Content iteration stays free.
- Refactor drift is caught by that on-demand diff plus *invariant* tests — a mirror
  reads ~50/50 within noise, the JS fold ≡ the SQL view — never by a frozen number.
