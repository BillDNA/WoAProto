# Metrics / balance dashboard (GUI)

Read the balance numbers in a GUI instead of scraping `node game/balance.js` terminal output.
Bill's main iteration loop is "change a number → run sims → read the spread"; today the reading
half is terminal-only. This closes that.

## What already exists (don't rebuild it)

- `balanceMap` / `simBattle` in `engine.js` run in the browser already (window.Engine).
- `index.html` already has an **in-game balance lab** (`runBalanceUI`, chunked sims so the tab
  doesn't freeze) wired to Balance buttons on every map tile and in the editor, plus a
  Rematch-this-map button. So sims-in-browser is solved.

The gap is presentation: the lab shows a summary, but `balance.js` prints strictly more —
side/mover win rates, HQ-vs-attrition split, the **card report** (plays / Win% / Simple% /
1stSight% / AvgSeen / Skip%) and the **Behaviour/Decisiveness** block (attacks & swaps per
battle, zero-kill%, tie-rule share, first-blood conversion, hex-control-vs-win, deployed share).

## The idea

One dashboard view that runs `balanceMap` across the roster (or a chosen map/difficulty/n) and
lays every metric `balance.js` computes out as sortable tables + simple bars — same numbers,
readable, comparable across maps side by side. `balanceMap` already aggregates all of it; this is
a rendering + a run-control (n, difficulty, which maps) on top of the chunked runner.

## Grounding

- Reuse the `runBalanceUI` chunking exactly — a 60-battle run must not lock the tab.
- Render with plain DOM + inline SVG bars, the way the board is drawn. **No charting library** —
  `game/` stays zero-dependency and zippable (standing goal).
- The card-report and Behaviour metrics are already computed per-run inside `balanceMap`; make
  sure it returns them structured (not just a formatted string) so both the CLI and the GUI read
  the same object. If `balance.js` currently formats inline, factor the aggregation into
  `engine.js` and let both callers format.

## Gotchas

- Every metric here has a documented weakness (Win% is weak in an attrition game; hard's edge
  over normal is within noise at small n). Show `n` next to each number so nobody over-reads a
  20-battle run.
- Keep it honest with the terminal: if the GUI and `balance.js` ever disagree on a number,
  that's a bug — same aggregation feeding both is the whole point.

---
skipped: run history / diffing two runs, CSV export, charts beyond bars — add when comparing
across sessions actually hurts. YAGNI until Bill asks to track a metric over time.
	*Bill* - yeah this is mostly just a starting place there will defiantly be a ton of back and forth on this one, but if you want to make some judgment call on obvious things go for it don't over index on YAGNI here; this tool works directly towards our standing goal of rapid balance iteration.
