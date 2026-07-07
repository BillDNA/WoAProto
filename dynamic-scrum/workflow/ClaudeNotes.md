# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-07, second session post-adopt)

- **Sprint S1 (Docs onto the board) is DONE, Bill-confirmed — not yet close-sprint'ed.** WOA-003 ran 3
  rounds: `design-docs/` AND repo-root `specs/` are gone. New layout: docs → `dynamic-scrum/docs/`
  (+ `human-instructions/` subdir), history → `dynamic-scrum/history/` (shipped-history, V0-summary),
  rubrics → `dynamic-scrum/rubrics/` (grading-rubrics), parked → `steam-roadmap` in parking-lot,
  `original-specs/` (prototype record + art) → `dynamic-scrum/planning/specs/original-specs/`.
  V0+V1 spec files deleted (fully decomposed into docs; git = archive). Reports now auto-tag
  `#reports #<kind> #v<version>` (report-model + claude-plays + review-reports skill).
- Dogfood report sent to canonical inbound (standing-goals + docs-tags SOP candidates).

## Next (Bill said at wrap)

- **Roadmapping session** (`session-start roadmapping`), likely planning a **human-onboarding-to-V1 +
  readability sprint**. First order of business: run **close-sprint on S1** (archive to
  `dynamic-scrum/history/finished/`, clear the shell) before or during planning.
- Backlog ready: WOA-001 (card batch), WOA-002 (audio). Parking lot: run-design, steam-roadmap.

## Threads to carry

- Templates `ticket-block.md` / `_orientation-doc.md` were KEPT — canonical scaffolds them and
  WORKFLOW.md authors from them (Bill asked to delete; corrected with evidence — doctor F2/F3
  serve-instead proposal still pending canonical-side).
- Two Bill-decides items still open: weight-tuner sweep #1 (Q.2) and the parked steam-roadmap draft.
- `code-architecture.md` is now THE orientation doc (absorbed code-overview); gen-docs writes its
  GEN:content block — it's a build target, not just prose.

## Related

[[Sprint]].

#claudenotes
