---
last-reviewed: 2026-07-16
---

# Version-control policy

**Root `CLAUDE.md`'s "Workflow authority" block is the canonical source for this project's git
protocol** — this doc is a short pointer + summary, not a duplicate (one implementation per fact).

- **Branching:** trunk-based, edit-in-place on `main` — standing consent to commit on `main`; no git
  worktrees, no feature branch except for genuinely risky/large structural work.
- **Commits:** no fixed convention beyond being descriptive of the change; granularity is per logical
  unit of work (a ticket, a fix, a doc sweep) — see root `CLAUDE.md` for the commit-message mechanics
  DynamicScrum expects (heredoc body, `Co-Authored-By` trailer).
- **Integration:** `/end-session` — commit on `main`, then push if a remote exists. Not a
  branch-finish / merge / PR menu.

## Related

[[Docs Index]] · root `CLAUDE.md`

#version-control
