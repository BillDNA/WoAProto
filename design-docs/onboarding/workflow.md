#onboarding #workflow
## Workflow

- After ANY engine change: `node game/test.js`. After UI changes: `node dev/smoke.js`. For balance questions: `node game/balance.js 60` (or `node dev/balance-report.js` to save + accumulate a report; the `generate-reports` / `review-reports` skills wrap the whole loop).
- Content lives in per-item files under `game/content/` (Round 4 Pass 2). Add/edit/delete maps through the app while the server runs — it rewrites the files AND regenerates `content/manifest.js`. If you hand-add a content file with the server down, the file:// browser won't see it until the manifest is refreshed (start the server once, or it's picked up on the next save). Node tools read the `content/` dirs directly, so they see hand-added files immediately.
- Headless screenshots: `chrome --headless --screenshot=... "file:///...index.html?autostart=ai"` works (use classic `--headless`, not `--headless=new`).
- Git: repo root is the project; remote `https://github.com/BillDNA/WoAProto.git`; GitHub Pages serves `main` (root `index.html` redirects into `game/`). PSD/XCS art sources and prototype photos are gitignored on purpose (public repo) — HexClarificationDiagram.png is the whitelisted exception.
- Don't add build steps, frameworks, or dependencies to `game/`. Everything is intentionally plain files Bill can zip and share. (`dev/` may hold dev-only deps like jsdom.)
- Aesthetic: steampunk Napoleonic field journal (see `../design-docs/Player Card Art direction drafts.md`, prompts in `../design-docs/art-prompts.md`) — parchment, brass, earthy tones; no modern UI chrome.

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
