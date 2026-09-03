# Balance baselines — the figures to protect

**This note is the single source of truth for what the game's *measured* balance anchors ARE
and where they live.** The numbers themselves now live in the DB, not in this file.

The boundary: **balance is math** — the anchors below are the empirical yardstick a fresh
run is graded against, so a sharp move in any of them signals a regression even when win
rates look fine. **Rubrics are the "is this subjectively fun" layer** (`docs/rubrics/`)
— they hold the *judgment* and cite this note for their anchors. Numbers here; taste there.

## The anchors are named SQL views, read from the accumulating pool

Each cited balance metric is defined **once** as a column of a named view over the star
schema (`dev/db.js`; ADR-0004) — official numbers and ad-hoc exploration share the one
definition, and `game/report-model.js` only renders (its browser fold is pinned to the
views by a parity test, so the two cannot drift). A hand-typed markdown snapshot is *not*
the source of truth: it goes stale and poisons onboarding.

Read the live anchors from the accumulating **version-sliced pool** (sliced by rules
version + engine config digest — two configs never pool):

```
node dev/db-query.js --anchors            # the cited anchors for the largest-n slice
```

Adding games **converges** the figures (LLN); they are not pinned to a fixed N. Grow the
pool with `node dev/balance-report.js --parallel` (hard-vs-hard, the active deck + mapset).

### Anchor → view column

| Anchor | View column |
|---|---|
| First mover win% | `v_global_balance.first_win_pct` |
| Red win% | `.red_win_pct` |
| HQ endings | `.hq_pct` |
| Zero-kill games | `.zero_kill_pct` |
| Tie-goes-to-2nd (of **attrition** endings) | `.tie_pct` |
| Drag (**attrition** endings) | `.drag` |
| Swings | `.swings` |
| Attack share (of all actions) | `.attack_share` |
| Swap share (of all actions) | `.swap_share` |
| First-blood → win | `.first_blood_win_pct` |
| Control | `.control_pct` |

Per-map, the identical columns live in `v_map_balance` (add `map`). Fractions are 0..1
(the renderer prints ×100).

## The protected rules-regression anchor

The **`cavsplit17-raid-paid` mirror over Core Six** (`core7`, hard-vs-hard) is the
designated rules-regression anchor. It **survives deckbuilding**: the anchor reads outcomes
through the slice-keyed view, never the deck label, so swapping the mirrored battalion
cannot move a rules read (pinned by the mirror test in `dev/db.test.js`).

The anchor is the **accumulating version-sliced pool** above — LLN convergence, not a
fixed-N snapshot. It is protected by *invariant* tests (a mirror reads ~50/50 within noise;
the JS fold ≡ the SQL view on a known pool; no map runs wildly side-biased), **never by a
byte-frozen transcript over shipping content** — editing a Core Six map or a
`cavsplit17-raid-paid` card must red **zero** tests ([[testing-seams]]). Only a rules/AI
change (not a content edit or a refactor) bumps the rules version.

## Bottom-up card fairness

`v_card_timing` carries a per-card signal across the **sampled battalion space** (every
battalion that fielded the card in the slice pools here — *not* a battalion round-robin,
ruled out as C(50,17)-impractical):

- `win_contribution` — the card's share of the slice's winning plays;
- `pass_rate` — declines / offers, over the **decline/held** decision events, not
  play-only, so a card that is offered but never played still reads (pass-rate 1.0).

It is **advisory, never a gate** (ADR-0002 below).

## ADR-0002 is intact — never refit weights to chase win-rate

Army-points is a **descriptive capability yardstick, not a predictive win-rate proxy**.
Measured balance always overrules the points score; the mispricing residual (measured
contribution − points cost) is a **soft flag, never a hard gate**. The card-fairness view
and the weight table are calibrated against measured play only as an *advisory* nudge —
**never fitted to reproduce win-rate**. (Full record: `docs/adr/0002`.)

## Skill premium (a separate measured axis)

Skill premium is an AI-strength matchup diagnostic, not part of the hard-vs-hard anchor
pool — read it per-matchup with `node dev/balance.js matchup 96` (n=96/map = 576/pairing):
normal>easy, hard>easy, hard>normal, and the sanity (mirror) check. It measures whether
stronger play wins more, orthogonal to the pooled fairness anchors above.

## The 1.2 metric-redefinition warning (load-bearing — keep verbatim)

Under rules-1.2 the metrics were redefined:

- **Attack / Swap** are now **% of actions**, not counts-per-skirmish.
- **Tie% / Drag** condition to **attrition endings** (not pooled over all endings).
- **Reserves** condition to **HQ endings**.

So a **1.1 count/pooled figure and a 1.2 share/sliced figure are NOT comparable** — grading a
fresh 1.2 run against an old 1.1 count would flag a healthy deck as broken. If you find a stray
count-per-skirmish or pooled figure, it is superseded; use the views above.
