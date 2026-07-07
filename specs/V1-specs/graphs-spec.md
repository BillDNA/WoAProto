#spec
# Graphs / data visualization — first impressions & questions

Feedback Round 4: *"we might need to start thinking about what kinda graphs we want and how
to display them… the goal of graphs is to view the data from different perspectives so patterns
and insights can be seen."*

This is a **thinking doc, not an implementation plan**. It lays out what data we have, which
views would surface patterns a table hides, and the open questions I need Bill to answer before
anything gets built. Nothing here is committed.

## What data we already have (the corpus)

Everything a graph would draw already exists as numbers — we don't need new instrumentation,
just new ways to *look*:

- **Per-map balance** (`balanceMap` → the Balance Dashboard / `dev/balance-report.js` tables):
  Red%, 1st-mover%, HQ%, Turns, VPdiff, Atk, Swp, 0kill%, Tie%, Drag, Swings, Balance score —
  one row per map, per run.
- **Per-card** (same run): Win%, Simple%, 1stSight%, AvgSeen, plays.
- **Per-battle** (inside a run, currently only aggregated): winner, winType, turns, field-score
  timeline, lead changes, first blood, kills. We *aggregate then throw away* the per-battle rows —
  a graph of the distribution would need us to keep them (see Q4).
- **LLM battles** (`logs/reports/battle/`): one transcript each + the new Typicality footer, plus
  the `claude-plays-log.jsonl` machine record.
- **Now versioned** (Round 4): every report is stamped with the rules version and filed under
  `logs/reports/.../<version>/`, so **version-over-version comparison is finally possible** — the
  single biggest new thing graphs could unlock.

## The motivation: what tables hide

A 13-row × 14-column table is precise but flat. The questions Bill actually asks —
*"which maps are broken?"*, *"is this card overpowered?"*, *"did 0.3 help or hurt?"*, *"was that
game a fluke?"* — are all **comparisons across a dimension**, and comparison is what the eye does
well and a table does badly.

## Candidate views (one per "perspective")

Each is a different lens on the same corpus. I'd expect to build a few, not all.

1. **Map fairness scatter** — X = 1st-mover%, Y = Red%, dot = map, both axes crossed at 50%.
   Fair maps cluster at the centre; side-biased maps drift up/down, mover-biased maps drift
   left/right. Dot size = HQ% (rushable vs grind), dot colour = Balance score. *One picture tells
   you which maps are broken and how.*
2. **Tension profile (per map)** — Drag (X) vs Swings (Y). Bill's Round-4 rule: **high Swings +
   low Drag = a good map** (lead changed hands to the end). This view puts "good" in one corner
   and "circling stalemate" in the opposite one.
3. **Card quadrant** — X = AvgSeen (hoarded ↔ played on sight), Y = 1stSight%. Top-left (low
   AvgSeen + high 1stSight) = "always good the moment you see it" = the overpowered watchlist.
   Bubble size = plays, colour = Win% deviation from 50.
4. **Battle-length distribution (per map)** — a histogram of turns-to-finish across the n battles.
   A map that always ends at turn 32 (deck-out) looks identical in the "avg turns" column to one
   that's bimodal (fast HQ rushes + long grinds); the histogram shows the difference. *Needs
   per-battle retention — Q4.*
5. **Field-score timeline (single battle)** — the VP tug-bar over turns, as a line that crosses
   zero every time the lead flips. This is the *shape* of Swings for one game — great for reading
   a specific LLM transcript or a debug snapshot. Ties into the Typicality footer.
6. **Version trend** — a metric (e.g. tie-goes-to-2nd%, or a map's Red%) plotted across
   0.2 → 0.3 → … Now that data is versioned, this is how we'd *prove* a rule change did what we
   hoped instead of eyeballing two folders.
7. **Typicality dot** — for one game, plot it against the map's baseline distribution (percentile
   ticks) so "atypical" from the footer becomes a visible position, not just a word.

## How/where to display — the real constraint

The standing goal is **`game/` stays zero-dep, zippable, file:// runnable**. That rules out
Chart.js/D3/Plotly-from-a-CDN. Options, roughly in order of my preference:

- **A. Inline SVG, hand-rolled, in the Balance Dashboard.** A new "Charts" view/tab beside the
  existing tables, drawn from the same `DASH.results` we already have. Scatter/quadrant/bars are
  ~50 lines of SVG each; no dependency, matches the parchment/brass aesthetic, works offline. My
  lean.
- **B. A dev-only tool** under `dev/` that reads `logs/reports/**` and emits a static HTML/SVG
  chart page (could vendor a tiny lib since `dev/` allows deps). Keeps the game clean; good for
  the version-trend view that spans many report files the in-browser dashboard never loads.
- **C. Both** — live scatter/quadrant in the dashboard (A) for the current run; a dev report
  generator (B) for cross-version/cross-run trends.

Aesthetic + accessibility: I'd follow the repo's steampunk palette but keep series colours
colour-blind-safe and label directly (no legend-hunting). I'd load the `dataviz` skill before
writing any actual chart code.

## Questions for Bill

1. **Which views first?** If you could see only two of the seven above, which? (My guess: #1 map
   fairness scatter + #3 card quadrant — they answer "what's broken" fastest.)
	1. yeah 1 and 3 make sense and i thin 4 too.
2. **In-game or dev-tool?** Option A (a Charts tab in the Balance Dashboard), B (a `dev/` static
   report generator), or C (both)?
	1. its A, but B might me
3. **Interactive or static?** Hover-for-numbers + click-to-filter (more code), or static pictures
   that are good enough to screenshot into a discussion?
	1. the goal of these charts is to see whats going on in the numbers so some knobs to bring into focus is probably warrented
4. **Keep per-battle rows?** Views #4/#5/#7 need us to retain each battle's row (turns, timeline,
   winType), not just the aggregate. OK to add an opt-in "keep detail" mode to `balanceMap` /
   `balance-report.js` (bigger report files), or keep it aggregate-only for now?
	1. think this might be connected to [[v1-data-persistence]] which might change how we think about this whole spec
5. **Version trend priority?** Is proving-out-a-change across versions (#6) worth a dev tool that
   parses the whole `logs/reports/` tree, or premature until we have more than 0.2/0.3?
	1. displaying the data not super important right now but should at least start with tracking it.
6. **Anything you already picture?** You may already have a chart in your head from the physical
   playtests — describe it and I'll spec that instead of guessing.
	1. no not really but i think we should have a question in mind that the chart is supposed to answer b4 building it we don't need to build charts to build charts

Once you answer 1–3 I can turn the chosen view(s) into a real V1 spec and build them.
