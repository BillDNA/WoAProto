# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `BillDNA/WoAProto`. Drive them with the
**GitHub MCP plugin tools**. `gh` on the command line is for one thing only — issue dependencies,
below — never for reads, comments or edits.

Every tool takes `owner: BillDNA`, `repo: WoAProto`.

## Conventions

| Operation | Tool |
|---|---|
| Create an issue | `issue_write` — `method: "create"`, with `title`, `body`, `labels` |
| Read an issue | `issue_read` — `method: "get"`; `"get_comments"` for the thread, `"get_labels"`, `"get_sub_issues"`, `"get_parent"` |
| List issues | `list_issues` — `state`, `labels`, and `fields` to trim the payload |
| Find an issue by description | `search_issues` — natural language, already scoped to issues |
| Comment | `add_issue_comment` |
| Retitle / rewrite / relabel / assign | `issue_write` — `method: "update"` |
| Close | `issue_write` — `method: "update"`, `state: "closed"`, `state_reason: "completed"` |

`labels` and `assignees` are the **complete set**, not a delta: to add one, pass the existing ones
alongside it, or the omitted ones are removed. Read them first with `issue_read`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues:

- **Read a PR**: `pull_request_read` — `method: "get"`, `"get_diff"`, `"get_comments"`.
- **List external PRs for triage**: `list_pull_requests`, then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment**: `add_issue_comment` with the PR number.
- **Label**: `issue_write` — `method: "update"`; issues and PRs share one number space.
- **Close**: `update_pull_request` — `state: "closed"`.

That shared number space means a bare `#42` may be either: try `pull_request_read` and fall back to `issue_read`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

`issue_read` — `method: "get"`, then `"get_comments"`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: one issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: a GitHub sub-issue of the map — `issue_write` `method: "create"` with `parent_issue_number`, or `sub_issue_write` `method: "add"` to attach an existing one (it takes the sub-issue's **database id**, not its number: `issue_read` returns it). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation, and the one operation with no plugin tool — read *or* write. Add an edge with `gh api --method POST repos/BillDNA/WoAProto/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/BillDNA/WoAProto/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). List a ticket's edges with `gh api repos/BillDNA/WoAProto/issues/<n>/dependencies/blocked_by`. A ticket is unblocked when every blocker is closed.
- **Frontier query**: `list_issues` for the map's open children, then drop any with an open blocker or an assignee; first in map order wins. Open-blocker counts come from `gh api repos/BillDNA/WoAProto/issues/<n> --jq .issue_dependencies_summary.blocked_by` — the plugin's `issue_read` does not return that field.
- **Claim**: `issue_write` `method: "update"` with `assignees`, the session's first write.
- **Resolve**: `add_issue_comment` with the answer, then `issue_write` to close, then append a context pointer (gist + link) to the map's Decisions-so-far.
