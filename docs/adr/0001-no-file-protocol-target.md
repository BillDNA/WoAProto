# ADR-0001 — `file://` double-click is not a supported target

Status: Accepted

The rule itself is in the CLAUDE.md `game/` doctrine clause, loaded every session.
This is the record of why the guarantee was dropped.

## Context

An early guardrail held that `game/` must keep working zipped and opened by
double-clicking `index.html`. That bought real value at prototype scale, and on the
way to a Steam release it inverted: the constraint taxed the features it protected.

The dashboard needs `fetch('/api/battles')` and was dead under `file://`, so the
double-click artifact shipped with most of its panes non-functional — the constraint
keeping double-click alive guaranteed the double-click build was a degraded product.
Meanwhile the local server was already the standard dev path and the only one with
persistence, and Steam ships into an Electron / embedded-Chromium-class runtime where
nobody double-clicks a raw `index.html`.

## Decision

Rejected: **keeping `file://` support**. Do not re-propose it. Reopen only if a
genuine no-server distribution path reappears — it has no destination today.

Exactly one guarantee was dropped: "zip + double-click keeps working". This did
**not** adopt a bundler and did not abandon classic scripts — "no bundler, no build
step, classic scripts + shared globals" stays, and ADR-0006 covers how the script
chain is ordered.
