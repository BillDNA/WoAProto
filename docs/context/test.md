# Test vocabulary

Words for the functional gate and how work is proven — the test harness, the smoke gate,
and the enforcement vocabulary. Distinct from the **Balance sweep** (a balance oracle, not
a functional gate — see [balance](balance.md)): tests answer *"does the code function,"*
balance answers *"is the build fair"* (ADR-0003).

This file is the home for test vocabulary as it crystallizes. The enforcement terms below
are carved; the remaining terms from `docs/adr/0004-build-chain-teeth.md` — invariant vs
pin test, the test-writer role, the red-at-base falsifier, no-live-content-in-tests — are
carved here as each resolves, and only here: one term, one canonical home.

## Enforcement

**Gate**:
A *deterministic* check that goes RED — a non-zero exit or a failing assertion — on the
same inputs every time, with no model or human judgment in the loop. Its homes are
`game/test.js`, `dev/smoke.js`, and process-level facts (an exit code, or *the verdict
artifact exists*). A gate blocks the PR and nothing approves past it. In `dev/ui-review.js`
the gate is that *the review ran against the target and emitted a verdict* — a fact, not
the review's opinion (ADR-0004).
_Avoid_: check, guard (when the thing is really a **Judgment**).

**Judgment** (aim):
A *non-deterministic* read — a model vibe-check or a human eye — that emits findings
pointing at a goal and **never blocks**. Its homes are the `ui-rubric` pass and every
*"do we approach this goal?"* read. Wiring a judgment to an exit code does not make it a
gate: the yes/no is an opinion that can differ run to run. A rubric is a judgment, which is
why it is findings, not a tally.
_Avoid_: gate, score, pass/fail, band.

**Escape valve**:
Any path that lets a session *end its obligation* without meeting the red — forbidden,
because future sessions reach for the valve instead of doing the work. A legitimate
escalation (a genuine upstream gap, or an off-by-one the test-writer must fix) *keeps the
red* and only reassigns **who** clears it — a re-spawned test-writer for a pin, Bill by
exception for an invariant — never **whether** it must clear.
_Avoid_: bail-out, skip, override.

## Invariant vs pin

Every test is labelled at birth, so a session can tell a **contract it must honour** from a
**pin of this era's behaviour it may supersede** (ADR-0004). The label decides the bucket;
the implementer judges neither, which is why moving a pin is not test-erosion and the human
is never a mid-flow gate.

**Pin** (the default):
A test of *this rules era's* specific output — a mat-slot count, a golden aggregate, a
tuned threshold. A bare `test('name', fn)` (imported from `game/test.helpers.js`) is a pin;
no ceremony is required. A pin is movable as routine work by the test-writer role — but a
**pin moves atomically with a `RULES_VERSION` bump**. Changing a pinned number without
bumping the version (`game/engine/01-core.js`) is the tell of a silent behaviour change;
bump the version and regenerate `game/test-manifest.json` (`node dev/gen-test-manifest.js`)
in the same commit. Deleting or `.skip`-ing a pin with neither a bump nor a pin-prune
record is itself a RED (the deletion guard in `game/test.invariants.js`) — an
[Escape valve](#enforcement), not a legitimate escalation.
_Avoid_: sacred (a pin is not), invariant.

**Invariant**:
A property that must hold in *every* rules era — **determinism**, **GUI==CLI parity**,
**legal-move generation**, **terminal-state reachability**, and the **conservation** laws
(finite piece/terrain stock). Invariants are sacred: changing one is a loud PR callout, not
routine test-writer work. Each is declared explicitly with
`invariant('<category>', 'name', fn)` and may **not** hide behind the pin default. The set
is one small, named, auditable registry — `game/test-registry.js` (`INVARIANT_REGISTRY`
over the frozen five categories) — guarded so the sacred list cannot silently grow or
shrink: a registry guard reds if the labelled set and the registry ever diverge.
_Avoid_: pin, golden (an invariant pins no specific number).
