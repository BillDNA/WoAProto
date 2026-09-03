# ADR-0005 — Balance regression is a throwaway diff, never a committed fixture

Status: Accepted

## Context

Refactor-safety for sim behaviour was expressed for a while as a "golden balance
diff." Read literally, that invites a **committed, gated fixture** that hashes the
current game's outcomes over shipping content (the active battalion, the Core Six
maps). Such a fixture has **no oracle** — it only knows "different from last time."
When content is the thing under active iteration (the whole point of this build),
"different" is the expected, correct result of every edit, so the fixture fires on
every content change and its only maintenance is to re-bless the recording. That
freezes content and forces the game to stand still — the opposite of rapid balance
iteration. A committed 60-game fixture shipped once and contradicted the
mechanism-not-value doctrine ([[testing-seams]]) that had just removed
content-value pins from the suite.

## Decision

Balance-regression checking is a **throwaway diff generated on demand — never a
committed artifact, never in the gate.** The determinism of the sim (same seed
schedule → byte-identical `dev/balance.js` aggregates) is the free regression net:
before a refactor you generate a baseline, do the work, generate again, diff, and
**discard both**. Only the *tooling* that produces the numbers is kept; the numbers
themselves are never frozen into the repo. Baselines are captured into the
**gitignored `dev/baselines/`** so a forgotten one can never leak into main.

Tests assert the **mechanism, never the content value** ([[testing-seams]]): tuning
an in-bounds card/map/unit number reds zero tests. Balance is protected instead by
*invariant* tests (a mirror reads ~50/50 within noise; the JS fold ≡ the SQL view;
no map runs wildly side-biased) and by the version-sliced anchor pool in the DB (LLN
convergence, read via `node dev/db-query.js --anchors`). Only a **rules/AI** change —
not a content edit, not a refactor — bumps `RULES_VERSION`.

## Consequences

- Editing content (a map, a card, a unit stat) never reds the gate; content
  iteration stays friction-free.
- No committed golden fixture and no golden gate test. Refactor drift is caught by
  an on-demand `dev/balance.js` before/after diff you run yourself, plus the
  invariant tests and the JS-fold ≡ SQL-view parity pin.
- The *enforced* statement of this lives in the CLAUDE.md "tests are the contract"
  clause (loaded every session); this ADR is the record, not the mechanism.
- ADR-0002 (points are a descriptive yardstick) and ADR-0004 (the balance fold is
  SQL views) are unaffected.
