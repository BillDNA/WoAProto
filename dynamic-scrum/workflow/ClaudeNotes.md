# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-07)

- **WoA was adopted onto DynamicScrum today** (Adopt mode). Board is live in `dynamic-scrum/` (prefix
  `WOA`, hub port 4841); machine bootstrap healthy; root `Claude.md` merged verbatim into `CLAUDE.md`.
- Board populated from forward-looking material: **Project-Brief**, **Roadmap M0–M6** (Steam
  trajectory), **Backlog** WOA-001 (card batch) / WOA-002 (audio) / WOA-003 (docs reorg), **6 Decisions**,
  **Questions Q.1–Q.3**. No active sprint (setup only — nothing built this session).

## Next

- **WOA-003 — docs reorg** (the named next pick-up): index `design-docs/**` + `specs/**` into
  `dynamic-scrum/docs/` **Docs Index by pointing in place** (do NOT move the frozen-API wiki vault);
  reconcile `code-overview.md` ≈ filled-out `code-architecture.md`; decompose implemented V0/V1 specs
  into indexed orientation primers.

## Threads to carry

- **Don't dedup the vault.** `design-docs/`/`specs/` were deliberately NOT migrated — the board is a
  layer on top of a frozen-API, wiki-linked Obsidian vault. WOA-003 *indexes* it, never relocates it.
- **Doctor report sent to canonical** (`inbound/from-woa-doctor-2026-07-07.md`): F1 = adopt-discover is
  blind to `design-docs/`-style vaults (the gap behind WOA-003); F2/F3 = serve `ticket-block.md` /
  `_orientation-doc.md` instead of scaffolding per-project copies.
- **Two Bill-decides items still open:** the weight-tuner sweep #1 (Q.2) and the Steam roadmap draft.

## Related

[[Sprint]].

#claudenotes
