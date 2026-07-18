# Bug Log

Bugs captured mid-work via `make-ticket bug`, kept out of the feature `Backlog.md` so the backlog
stays feature-focused. Triage drains these into a sprint or fixes them inline. Same ticket format as
`Sprint.md`.

---

### WOA-036 — Browser plays a stray "applied deck" override, never the active-flagged deck
**Area:** game-ui · **Status:** Todo · **Type:** bug

Found during WOA-030's verify (2026-07-18). `index.html` (~line 268) force-clears every `content/decks/` deck's `active` flag and substitutes a browser-only "applied deck" (`game/custom-deck.js`, or the `woa-custom-deck` localStorage key) whenever one is present — and one always is: `custom-deck.js` is a checked-in, non-empty 16-card leftover (commit 4ba14fa) with cards distinct from both `default` and `cavsplit17-raid-paid`. Consequence: interactive browser play has NEVER reflected the active flag — including the just-adopted 17-card deck — while every CLI/sim/test path (balance.js, test.js, dev/) bypasses the override and is correct. Related: `deck-editor.js` `deckProblems()` hard-codes `total !== 16` for that same editor sandbox (needs the 17-ceiling call if the override is kept). **Bill decides** the fix shape: clear/empty `custom-deck.js` so the active deck shows through, or keep the override but make it opt-in/visible.

**Acceptance criteria:**
- [ ] Bill picks the fix shape (clear the checked-in custom-deck.js vs make the override opt-in/visible in the UI)
- [ ] Browser play (node game/server.js AND zipped file://) demonstrably uses the adopted active deck unless a player deliberately applies a custom one
- [ ] deck-editor.js's hard-coded 16 total is reconciled with the 17-card adopt for whatever the override becomes
- [ ] User confirms done

---

_Empty._

## Related

[[Backlog]] · [[Sprint]].

#bugs
