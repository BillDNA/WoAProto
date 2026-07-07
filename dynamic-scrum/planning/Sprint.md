# Sprint — S1 · Docs onto the board

**Goal:** the board's docs layer is the ONE docs home — `design-docs/` dissolved into `dynamic-scrum/docs/`,
implemented specs indexed to orientation primers, root `CLAUDE.md` slimmed to doctrine.

**Orientation:** [[Docs Index]] + [[code-architecture]].

**Done when:** `design-docs/` no longer exists, every mover's references are swept (code, skills, docs),
tests green, and Bill confirms.

## Ticket overview

| Ticket  | Title                                             | Area | Status      | Depends on |
| ------- | ------------------------------------------------- | ---- | ----------- | ---------- |
| WOA-003 | Docs reorg: dissolve design-docs into dynamic-scrum/docs | docs | In Progress | —          |

**Suggested order:** single ticket.

## In Progress / Todo

### WOA-003 — Docs reorg: dissolve design-docs into dynamic-scrum/docs
**Area:** docs · **Status:** In Progress · **Type:** sonnet · **Docs:** code-architecture, Docs Index

Scope expanded at session-start (Bill, 2026-07-07): `design-docs/` is dissolved — everything moves into
`dynamic-scrum/docs/` (the human-instructions / claude-onboarding divide is kept as a subdir). `specs/`
stays in place as the historical record; implemented specs get indexed to orientation primers.
`code-architecture.md` keeps its DS name but takes `code-overview.md`'s contents. Root `CLAUDE.md`
keeps the standing goals (Bill likes them) but the shipped History/V0/V1 blocks parse out into a
history doc. Frozen-API paths that move require a same-commit sweep of code + `.claude/skills/` + docs.
Afterwards: `/send-report` to canonical DS noting the standing-goals pattern and the docs-tags
convention this project uses.

**Acceptance criteria:**
- [ ] `design-docs/` gone; contents live under `dynamic-scrum/docs/` (human-instructions divide kept)
- [ ] `code-architecture.md` = code-overview contents; old name/path references swept
- [ ] Implemented V0/V1 specs indexed to orientation primers in [[Docs Index]]
- [ ] Root `CLAUDE.md`: standing goals kept, shipped-history blocks parsed out
- [ ] Same-commit sweep: `dev/gen-docs.js`, `dev/optimize-art.ps1`, game code comments/strings, 4 skills — tests + gen-docs green
- [ ] Report sent to canonical DS (standing goals + docs tags note)
- [ ] User confirms done

## Finished

_None yet._

## Blockers

- _None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]].

#sprint
