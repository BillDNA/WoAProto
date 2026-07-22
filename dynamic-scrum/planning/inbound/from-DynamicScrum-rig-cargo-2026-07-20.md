# Rig cargo — from canonical DynamicScrum refine cycle 2 (2026-07-20)

These are rig-specific lessons harvested from WarOfAttrition's own observation drops during canonical DynamicScrum's refine passes over run-ticket / run-sprint / decompose (2026-07-20); destination: this project's `dynamic-scrum/docs/rig-notes.md`; route via `route-inbound` — each item below is a fold-in, not a ticket.

## Items

### Shell / process management (already in rig-notes? verify, don't duplicate)
- On Windows/Git-Bash, `kill $!` after backgrounding a server with `&` kills the MSYS subshell PID, not node.exe — the server keeps listening. Find the real PID with `netstat -ano | grep <port>` and kill it with `taskkill //PID <pid> //F` (WOA-037) (already in rig-notes? verify, don't duplicate — this doc's "Killing servers (Windows/Git-Bash)" section appears to cover it).

### Golden-diff & staleness checks
- `balance.js`'s output carries a `Persisted N battles … (run <id>)` trailer line whose run-id auto-increments every invocation; exclude that one line from golden diffs — byte-identical otherwise is a pass (WOA-037) (already in rig-notes? verify, don't duplicate — this doc's "Golden balance diff" section appears to cover it).
- Same-mode `balance.js` runs before/after a capture-only change should replay the same seeds so seed-derived dashboard charts render identically except for the new field's charts — a free UI-layer golden diff. When citing a test-data run pair in a dispatch, name what that pair *can't* show (a parallel-vs-serial parity pair proves nothing about visual divergence) (WOA-044) (already in rig-notes? verify, don't duplicate — this doc's "Fixed-seed cross-run check (WOA-044 run)" section appears to cover it).
- Run a staleness sweep on the generated `content/manifest.js` — it can drift out of date against its source content and needs a periodic re-generation check (WOA-030).
