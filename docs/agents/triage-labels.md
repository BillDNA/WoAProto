# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |
| _(no mp equivalent)_       | `idea`               | Un-ready intent — the icebox              |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## The icebox is the tracker, not a doc

Un-ready, not-yet-spec'able intent lives as an open issue labelled `idea` — never as
a parking-lot markdown file. An idea graduates by being relabelled or spun into a
normal issue or spec when it is ready, not by moving text between files. This keeps
ideas, live work and their history in one queryable place with an audit trail; the
cost is the loss of a freeform linked-note canvas, so cross-idea structure rides
in-body links and labels instead.

Edit the right-hand column to match whatever vocabulary you actually use.
