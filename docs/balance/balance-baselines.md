# Balance baselines — the figures to protect

**This note is the single source of truth for the game's *measured* balance anchors.**

The boundary: **balance is math** — the numbers below are the empirical anchor a fresh
run is graded against, so a sharp move in any of them signals a regression even when win
rates look fine. **Rubrics are the "is this subjectively fun" layer** (`docs/rubrics/`)
— they hold the *judgment* and cite this note for their anchors. Numbers here; taste there.

Only the **live rules-1.2** fact set lives here. Superseded lineage is intentionally dropped —
**git is the archive**; grep-able stale baselines poison a fresh session's onboarding.

## Provenance

Measured hard-vs-hard, **n=60/map = 360**, **Core Six** (`core7`'s 6-map set), deck
**`cavsplit17-raid-paid`**, rules-1.2. Regenerate with `node dev/balance-report.js --parallel`.

## Figures (rules-1.2)

| Anchor | Value | Notes |
|---|---|---|
| First mover win% | **47%** | |
| Red win% | **49%** | |
| HQ endings | **17%** | |
| Tie-goes-to-2nd | **13%** | of **attrition** endings |
| Attack share | **19%** | of all actions |
| Swap share | **16%** | of all actions |
| Zero-kill games | **2%** | |
| First-blood → win | **66%** | |
| Control | **93%** | |
| Drag | **2.4** | **attrition** endings |
| Swings | **3.5** | |
| Reserves-at-end (HQ-only) | red **33%** / blue **31%** | n=61, small-n |

**Skill premium** (`matchup 96`, n=96/map = 576/pairing):
normal>easy **69%**, hard>easy **76%**, hard>normal **56%** (thin, within noise),
sanity **46%** (thin, within noise).

## The 1.2 metric-redefinition warning (load-bearing — keep verbatim)

Under rules-1.2 the metrics were redefined:

- **Attack / Swap** are now **% of actions**, not counts-per-skirmish.
- **Tie% / Drag** condition to **attrition endings** (not pooled over all endings).
- **Reserves** condition to **HQ endings**.

So a **1.1 count/pooled figure and a 1.2 share/sliced figure are NOT comparable** — grading a
fresh 1.2 run against an old 1.1 count would flag a healthy deck as broken. If you find a stray
count-per-skirmish or pooled figure, it is superseded; use the table above.
