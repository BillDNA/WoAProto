---
last-reviewed: 2026-07-07
---
#onboarding #workflow
## Workflow — build/test/tooling conventions for this game

*(Process — sessions, board, tickets — is DynamicScrum's `WORKFLOW.md`, surfaced by the SessionStart
hook. This doc is the game-side build workflow only.)*

- **The server is the standard dev path**: `run-server.command` (Mac) / `run-server.bat` (Windows) / `node game/server.js`. It serves the app, regenerates `content/manifest.js` at boot, enables every save endpoint (maps, decks, map-sets, reports, debug dumps), and records finished battles into `logs/woa.db` (fail-open — play works without `dev/`). Double-clicked `file://` still plays but persists nothing.
- After ANY engine change: `node game/test.js`. After UI changes: `node dev/smoke.js`. After touching their areas, also run the focused dev suites: `node dev/claude-plays.test.js` (claude-plays / prompt surfaces — includes the honesty invariant), `node dev/db.test.js` (dev/db.js or the `/api/recordbattle` proxy), `node dev/llm-session.test.js` (the persistent LLM transport).
- For balance questions: `node game/balance.js 60` prints to the terminal; **`node dev/balance-report.js --parallel`** is the fast path to a SAVED report (process-per-map workers, folds into the per-version accumulator, prints `BEST_MAP:`; `--mapset <id|all>` picks the roster). The `generate-reports` / `review-reports` skills wrap the whole loop.
- After changing `AI_WEIGHTS`, AI personalities, or `game/content/`: `node dev/gen-docs.js` regenerates the doc tables between the `<!-- GEN:x -->` markers (ai-heuristic-model.md, code-overview.md). New weights need a description in its map or they render "TODO — describe me".
- Content lives in per-item files under `game/content/` — the kinds are `decks`, `maps`, and (V1) `mapsets` (named map rosters, one active = the match pool); `content/kinds.js` is the one list. Add/edit/delete through the app while the server runs — it rewrites the files AND regenerates `content/manifest.js`. If you hand-add a content file with the server down, the file:// browser won't see it until the manifest is refreshed (start the server once, or it's picked up on the next save). Node tools read the `content/` dirs directly, so they see hand-added files immediately.
- **Refactors ride the golden-diff oracle** (see `../planning/specs/v1-architecture.md`): capture `node game/balance.js 24 normal` AND `24 easy` output before moving code; every refactor commit must reproduce both byte-identically, on top of test.js + smoke.js green. A change that legitimately moves the numbers is a rules/AI-strength change, not a refactor — bump `RULES_VERSION` in `game/engine/01-core.js` atomically with the rule-book header and the test-pin updates.
- `logs/woa.db` (+ `-wal`/`-shm`) is **regenerable and gitignored** — delete it freely; the committed markdown under `logs/reports/` stays the human record. Query it read-only with `node dev/db-query.js` (no SQL = schema + row counts).
- Headless screenshots: `chrome --headless --screenshot=... "file:///...index.html?autostart=ai"` works (use classic `--headless`, not `--headless=new`).
- Git: repo root is the project; remote `https://github.com/BillDNA/WoAProto.git`; GitHub Pages serves `main` (root `index.html` redirects into `game/`). PSD/XCS art sources and prototype photos are gitignored on purpose (public repo) — `dynamic-scrum/planning/specs/original-specs/prototype pictures/HexClarificationDiagram.png` is the whitelisted exception.
- Don't add build steps, frameworks, or dependencies to `game/`. Everything is intentionally plain files Bill can zip and share. (`dev/` may hold dev-only deps like jsdom.)
- Aesthetic: steampunk Napoleonic field journal (see `../planning/specs/original-specs/Player Card Art direction drafts.md`, prompts in `../planning/specs/original-specs/art-prompts.md`) — parchment, brass, earthy tones; no modern UI chrome.

## Tools available to you
### The Dynamic Image Generation MCP

you have access to a local MCP server called dig-mcp is available — it generates images through a locally-running ComfyUI instance. Tools: generate_images, generate_set, list_checkpoints. Call list_checkpoints first to see installed models; omit checkpoint to use the first available. Requires ComfyUI to be running locally and uv installed.

I will note that is works great for the hero shots like card art. but i haven't really fine tuned it yet for UI elements.  It functions for UI elements like icons but might not be the cleanest results (which is ok if you think an icon is needed in places this can at lest give us a starting point that i can punch up manually) 

### graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Related

[[Docs Index]] · [[code-architecture]] · [[data-and-reports]]
