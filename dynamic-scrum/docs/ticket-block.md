<!-- Ticket-block template — NOT a board file. Copy one block per ticket into Backlog / Sprint / Bugs.
     The canonical ticket format (graded by the `ticket` rubric). Keep tickets bite-size — a concrete
     deliverable an agent can finish *and verify* in one focused pass. -->

### WOA-000 — <Title>
**Area:** <area> · **Status:** Todo · **Completed:** YYYY-MM-DD · **Depends on:** WOA-XXX · **Skill:** /skill-name · **Type:** <type> · **Docs:** doc-a, doc-b

<Brief description: what this is and — crucially — *why* it matters, not only the change.>

**Acceptance criteria:**
- [ ] <concrete, verifiable end-state — pin the observable result, not the activity>
- [ ] User confirms done

**Closing note:** <one line on what was built or any deviation — added at close.>

<!-- Field notes:
  - `**Completed:**` / `**Depends on:**` / `**Skill:**` / `**Docs:**` are OPTIONAL — include only when they apply.
  - `**Skill:**` names a skill to invoke before starting; `session-start` reads it.
  - `**Type:**` is the work-type from the doc-lifecycle taxonomy — `sonnet` | `opus` | `brainstorming` |
    `whiteboard-readability` | `audit` (+ the `bug` marker bug stubs write). Dispatch picks the model off
    it (`sonnet` → sonnet, else the default); untyped is legal.
  - `**Docs:**` lists the orientation docs this ticket touches; scopes the staleness flag.
  - IDs are `WOA-` + zero-padded number; the next ID is the max across the board + 1.
  - The LAST acceptance criterion is ALWAYS `User confirms done`.
-->