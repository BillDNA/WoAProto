# ADR-0007 — Un-ready intent lives as `idea`-labeled issues, not a parking-lot doc

Status: Accepted

## Context

The project inherited a DynamicScrum-style planning surface under `dynamic-scrum/planning/`:
a `Backlog.md` / `Bugs.md` / `Sprint.md` / `Roadmap.md` set for live work, and a
`parking-lot/` directory of one-file-per-topic brainstorms for not-yet-ready ideas (the
"icebox") — plus an `inbound/` routing area. Ideas graduated by hand-editing docs and moving
text between files.

Moving this project onto the standard mattpocock flow raised the question: its best
practice is **the tracker is the source of truth — no bespoke
spec-markdown in the repo**. That leaves the question of where *un-ready* intent lives: keep the
freeform parking-lot canvas, or invert it onto the tracker.

## Decision

Un-ready, not-yet-spec'able intent lives as **open GitHub issues labeled `idea`** (the mp
icebox), not as parking-lot markdown docs. An idea graduates by being relabeled/spun into a
normal `enhancement`/`bug` issue (or a spec) when it's ready — not by moving text between files.
The `dynamic-scrum/planning/parking-lot/` docs are migrated into `idea` issues and deleted; the
live backlog/roadmap intent becomes normal labeled issues; the scrum-process scaffolding
(`Sprint.md`, the spent `Roadmap.md`, `inbound/`) is deleted with git as the archive.

## Consequences

- **Gain:** one queryable source of truth; ideas, live work, and their history share the tracker;
  no drift between a doc board and the issue list; graduation is a label change with an audit trail.
- **Cost:** loses the freeform Obsidian/markdown canvas — the `[[wikilink]]` web and the ability
  to sketch half-formed structure in prose across linked files. Issue bodies are a flatter medium;
  cross-idea structure now rides in-body links and labels rather than a linked-note graph.
- Migrated ideas: run-design, meta-progression, commander-traits, narrative, map points of
  interest, and the Steam leverage map now live as `idea` issues.
