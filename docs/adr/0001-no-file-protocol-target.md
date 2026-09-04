# ADR-0001 — `file://` double-click is not a supported target

Status: Accepted

## Context

An early project guardrail (CLAUDE.md) held that `game/` must keep working when
zipped and opened by double-clicking `index.html` — i.e. served over the
`file://` protocol with no server. That bought real value at prototype scale:
zero-dependency, no build step, hand it to anyone.

On the way to a Steam release the target has moved, and the guardrail now taxes
the features it was meant to protect:

- The app is bimodal on `canNet` (`game/ui/app.js`). The entire A/B dashboard —
  Overview / Maps / Cards / Units, i.e. most of `game/ui/charts.js` — needs
  `fetch('/api/battles')` and is dead under `file://`. So the double-click
  artifact silently ships with 4 of 5 dashboard panes non-functional. The
  constraint that keeps double-click alive guarantees the double-click build is
  a degraded product.
- Content loads via `document.write()` in `game/content/manifest.js` *only*
  because `file://` has no module loader.
- The bare-global UI cross-referencing style (`ui/*` files referencing each
  other by bare name, no wrapper) is a direct consequence of "no modules".

The local server (`node game/server.js`) is already the standard dev path and
the only path with persistence, and Steam ships a fixed artifact into an
Electron / embedded-Chromium-class runtime. Nobody double-clicks a Steam
install's raw `index.html`. So `file://` support is dead flexibility.

## Decision

`file://` double-click is **no longer a supported target**. Running the game
and the dashboard assumes the local server (`node game/server.js`) or an
equivalent HTTP origin.

This does **not** adopt a bundler and does **not** abandon plain classic
scripts. "No bundler, no build step, classic scripts + shared globals" stays.
The one guarantee dropped is "zip + double-click `index.html` keeps working".

The engine already proves modularity survives without a bundler and without
`file://`: `engine/*` parts are IIFE-UMD (`window` in the browser, `require`
re-export via `game/engine.js` in node).

## Consequences

- `canNet` branching is removable, and the dashboard panes that need
  `fetch('/api/battles')` are no longer a degraded second mode.
- A future architecture review should **not** re-propose keeping `file://`
  support — this decision is deliberate. Reopen only if a genuine no-server
  distribution path reappears (it has no destination today).
