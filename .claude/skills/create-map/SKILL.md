---
name: create-map
description: Propose new War of Attrition maps that fill a measured gap in the roster, graded against the map rubric, in the map data shape (including carved shapeDef outlines). Use when asked to "design a map", "add a map", or "what map is the roster missing".
---

# create-map

Read the roster and its balance numbers, find the gap, propose maps in the
exact data shape. **Proposals only — Bill saves them via the editor (which
writes a `game/content/maps/` file).**

## Read first

- `game/maps.js` — `"shapes"` and the terrain piece format (documented in its
  header: `{"t":"F"|"M"|"R","edges":[[q,r,d],...]}`, sides of one piece belong
  to ONE hex, contiguous dirs; rivers come in the same 2/3-side lengths as
  forest and mountain).
- `game/content/maps/<slug>.js` — the map library, one file per map (12 shipped
  after the V1 trim). Note the match pool is the ACTIVE map-set
  (`game/content/mapsets/`), so a new map must also be added to a set — or
  measured directly with a name filter / `--mapset all`.
- `dynamic-scrum/rubrics/grading-rubrics.md` — the map rubric.
- Balance evidence: dynamic-scrum/docs/code-architecture.md "Known balance
  signals" (0.x-era baseline) + a fresh `node game/balance.js 40 <filter>` for
  any map you're comparing against.

## Data shape

```json
{ "name": "Name", "shape": "compact", "redHQ": [0,-2], "blueHQ": [0,2],
  "pieces": [ { "t": "F", "edges": [[0,0,1],[0,0,2]] } ] }
```

Custom outlines carry the board inline instead of `shape`:

```json
{ "name": "Name", "shapeDef": { "label": "Custom (21 hexes)",
  "hexes": [[0,-2],[1,-2], "..."] }, "redHQ": [0,-2], "blueHQ": [0,2], "pieces": [] }
```

Hard constraints (validateMaps enforces): ≤ 24 hexes, HQs on-board and distinct,
terrain within stock (`F3:2, F2:4, M3:2, M2:4, R3:2, R2:4`), pieces single-hex
contiguous. House norms: HQs ≥ 4 apart (no turn-2 rush — test.js asserts it for
built-ins), point-symmetric outlines keep Mirror and fair-HQ placement working.

## Steps

1. Name the measured gap: e.g. "only the compact dist-4 maps produce healthy
   HQ-capture rates; the roster lacks a river map; spear maps all read
   2nd-mover-strong." Cite numbers.
2. Draft 1–3 maps. For each: the JSON, the intent (what fight it forces), and a
   map-rubric self-grade (predicted side balance, HQ-vs-attrition mix, tie-rule
   exposure). Rivers are new — a proposal that actually uses the
   deploy-denial rule is worth more than another forest pair.
   **One adversarial checker per candidate** — a single skeptic pass against the
   map rubric, trying to break the balance claim before any sim. (Loop v2, B.5.1.1:
   v1 ran two checkers per candidate; the delta wasn't worth the tokens — one now.)
3. **Verify structure first — it's free.** `node -e "const E=require('./game/engine.js');
   console.log(E.validateMaps([<def>]))"` must print `[]`. This structural check
   (≤24 hexes / HQ / terrain-stock / contiguity) is ~0.06 s; run it, the self-grade,
   and the checker BEFORE any sim, so no candidate reaches the expensive balance
   screen until it's structurally sound and has a reason to exist.
4. Tell Bill how to test: paste into the editor (its Balance button runs the
   Balance Dashboard on the map AS DRAWN, before saving) or Import, then
   the balance screen — **reject cheaply, verdict-check dear**:
   `node game/balance.js 40 <name>` at the default **normal** AI (~4 s) is enough to
   *kill* a side-biased / attrition-only candidate; only promote the one or two
   finalists to a **hard** screen at n=100–200 (a hard screen is ~7× slower —
   ~28 s at n=40 — so it's a finalist verdict, not triage; profile:
   `logs/reports/analysis/1.1/2026-07-10-create-map-profile.md`). To put a survivor
   in the match pool, tick it into the active map-set on the maps screen. Flag
   thresholds live in game/report-model.js (side ≥62/38, mover ≥62, HQ% ≤8 =
   attrition-only).

## Gotchas

- Big empty maps are not fun (Bill) — that's WHY the ceiling is 24; prefer the
  compact end and terrain that channels fights.
- Terrain is directional and hex-owned: `F` helps attacks OUT of its hex,
  `M` defends its hex. `R` (0.3 semantics, unchanged in 1.0) lets support, attacks, moves, and
  Airdrop cross freely BOTH ways — it only stops deploy-control from extending
  across (you can't deploy to an empty hex reachable only across a river); not
  barrageable.
- Barrage removes forests and trenches anywhere — a forest-dependent map plan
  must survive one barrage.
- Screen cost is all in the sim, and AI difficulty dominates it (~690 ms/battle
  hard vs ~100 ms normal; n is near-linear on top). When a finalist is screened
  across the whole active set, `dev/balance-report.js --parallel` is ~3.3× faster
  for identical numbers — prefer it over serial `balance.js` for multi-map screens.
