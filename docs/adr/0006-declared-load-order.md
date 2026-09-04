# ADR-0006 — The script chain is declared in one manifest, not inferred from filenames

Status: Accepted

## Context

`game/` is classic scripts with shared globals — no modules, no bundler, no build
step (ADR-0001 kept that while retiring `file://`). Classic scripts declare no
dependencies, so something has to assert the order.

That something was **filename sort, written down three times**: `game/engine.js`
readdir-sorted `engine/`, `index.html` hand-listed a 34-entry `<script>` chain, and
`game/sweep-worker.js` hardcoded its own array of engine part names.

The order is nearly free. Engine parts share the namespace `g.WOA_E` (alias `I`) and
reach each other through `I.*` at the **call** site, never captured at load time, so
a part constrains order only where it reads something *while loading*. There are
three such edges: `maps.js` before `01-core` (which reads `WOA_BUILTIN`),
`00-config` before the AI-config home (which calls `defineConfigHome`), and
everything before `07-export` (which reads the whole namespace). A three-edge
dependency graph was being encoded as a 34-element total order, in triplicate.

Two costs followed.

**Filenames carried scheduling.** A new concept could not simply be named: it had to
sort into its slot. `00a-ai-config.js` was the scar — the `a` existed only to land
after `00-config`. That makes "give this concept its own file" cost a name and
several edits, which is the standing pressure that produces lodgers.

**Subdirectories were impossible.** A naive path sort puts `engine/ai/…` after
`engine/07-export.js`, so the export step would run before the code it exports
exists. The concept-address effort needs depth as a first-class option.

The third copy had also drifted with nothing to catch it. `sweep-worker.js` was
written when the engine had eight parts; `00a-ai-config` and `03a-commander-effects`
landed later and only two of the three lists were updated. The worker threw on its
first task, `ui/boot.js` caught it as `workerFailed`, and the Balance Dashboard fell
back to a serial sweep with no visible error.

## Decision

The chain is **declared in `game/load-order.js` and nowhere else**. Three ordered
arrays — `CONTENT`, `ENGINE`, `APP`, with `PAGE` their concatenation — each path
written exactly once. `index.html` hand-lists that one script and it writes the rest;
`engine.js` requires `ENGINE`; `sweep-worker.js` imports `ENGINE`.

**Position in the array schedules a file.** Not its name, not its directory. A script
may live at any depth and be named for what it is; numeric prefixes are a reading
hint with no power.

Alternatives weighed:

- **Numbered directories** (`engine/00-config/`, `engine/05-ai/`). Keeps sort-as-
  dependency-graph and spreads the scar from filenames to directory names, so every
  new folder becomes a scheduling decision. Rejected.
- **Declared per-file dependencies**, topologically sorted at load. Honest, and the
  closest thing to what a compiler does, but it buys ordering flexibility the three
  real edges do not need, and costs a sorter plus a cycle check in a codebase whose
  whole premise is no build step. Rejected as speculative.
- **Generating `index.html`'s tags from the manifest**, gated for staleness the way
  `content/manifest.js` is. The fact still exists twice on disk and a gate keeps the
  copies equal — which is the defect, mediated rather than removed. Rejected.

## Consequences

- Adding a script is a one-line edit in one file. Forgetting it means the file never
  loads, which fails loudly on first use; the *partial* update that silently broke
  the sweep worker is no longer possible, because there is one list.
- `game/index.html` holds markup and one `<script src>`. Its inline battalion-override
  block became `game/applied-battalion.js`, which also publishes the override rule as
  `WOA_APPLY_BATTALION` so the page and the worker share one implementation.
- The browser sweep now loads the parts it had been missing, so its results move: it
  had been running without the AI dials and commander effects.
- `engine/ai/ai-config.js` lives at depth, proving the scheme rather than describing
  it. The load-order gate in `game/test/test.maps.js` asserts that every `.js` under
  `engine/`, `ui/` and `game/` root is scheduled, that no consumer keeps a second
  copy, and that the three load-time edges hold; `dev/boot.test.js` L1 asserts the
  page's one tag actually emits the chain.
- `game/` stays zero-dependency classic scripts. This ADR removes no constraint from
  ADR-0001; it only stops filenames from carrying the schedule.
