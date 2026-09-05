# Query cookbook — asking the balance store new questions

The per-skirmish store is a **star schema** (`dev/db.js`, ADR-0004): fact tables at
skirmish / card-decision / turn grain, surrounded by dimension tables upserted from
loaded content at ingest. Any balance question is a `GROUP BY` over a join — no new
table, no JS fold. This is the orientation for asking one, three ways:

1. **SQL, ad hoc** — `dev/db-query.js` (read-only console).
2. **Programmatic** — the `dev/db.js` query surface (`aggregate` / `cardTiming` / `dimensions`).
3. **Over HTTP** — `GET /api/aggregate` + `GET /api/dimensions`, which the dashboard's
   **Cross-cuts** pane drives.

## The grains and dimensions

| Table | Grain | Key columns |
|---|---|---|
| `skirmishes` | one skirmish | `winner, win_type, turns, first_player, map, kill_tail, tiebreak, lead_changes, zero_kill, hexes_red/blue`, … |
| `card_events` | one card decision | `card_id, turn, side, mode, outcome`(played/declined/held)`, won`(played-only) |
| `timeline` | one turn | `fs_red, fs_blue` |
| `maps` (dim) | one map × slice | `mountain_hexes, forest_hexes, river_hexes, hex_total, shape` |
| `cards` (dim) | one card × slice | `kind, points, steps, starting, no_opener` |
| `battalions` (dim) | one battalion × slice | `size, cards` |
| `versions` (dim) | one slice | `dials` (the human-readable config behind the digest) |

**Slice key = `(version, config_digest)`.** Every fact and dimension carries it, so two
games at the same rules version but a different dial (e.g. a point-cap change) never pool.
Always filter or group by it when comparing configs.

The fold lives in SQL as named views — `v_map_balance`, `v_global_balance`,
`v_card_timing` — each a cited metric per `(slice, …)`. Read those before writing a metric
by hand.

## The litmus

The store earns its shape if "how does a card's play-timing move with a map's mountain-hex
count?" is a plain 3-table join, no reach into JS:

```sql
SELECT c.id AS card, m.mountain_hexes AS mtn, AVG(ce.turn) AS avg_turn, COUNT(*) AS plays
FROM card_events ce
JOIN cards c ON c.id = ce.card_id AND c.version = ce.version AND c.config_digest = ce.config_digest
JOIN maps  m ON m.name = ce.map   AND m.version = ce.version AND m.config_digest = ce.config_digest
WHERE ce.outcome = 'played'
GROUP BY c.id, m.mountain_hexes;
```

Run it: `node dev/db-query.js "SELECT …"`. Terrain-hex counts are computed at ingest by
`terrainFeatures` (`dev/db.js`) — mountain/forest/river hexes and total.

## The query surface (`dev/db.js`)

Whitelisted, sliceable aggregates — the metric and group-by **names** are the injection
fence; the slice filters are bound params.

```js
var db = require('./dev/db.js'); var h = db.open();
db.aggregate(h, { x: 'mountain_hexes', metrics: ['n','first_win_pct'], version: '1.2' });
//   -> { x, numeric, metrics, rows:[{bucket, n, first_win_pct}, …] }  (one row per bucket)
db.cardTiming(h, { terrain: 'mountain', card: 'conscription' });   // the litmus, folded
db.dimensions(h);   // the DISTINCT slices + whitelisted metric/group-by/terrain names + card/map lists
```

- **metrics** (`AGG_METRICS`): `n, first_win_pct, red_win_pct, hq_pct, avg_turns, drag,
  tie_pct, swings, zero_kill_pct`.
- **group-bys** (`AGG_GROUPBYS`): `map, shape, mountain_hexes, forest_hexes, river_hexes,
  hex_total, first_player, win_type, winner, battalion_red`. Terrain group-bys pull the
  `maps` dimension in via a left join.
- **terrains** (`CARD_TERRAINS`): `mountain, forest, river`.

## Over HTTP

`node game/server.js`, then:

```
GET /api/dimensions
GET /api/aggregate?x=mountain_hexes&metrics=first_win_pct,n&version=1.2
GET /api/aggregate?grain=card&terrain=mountain&card=conscription
```

A non-whitelisted `x`/`metric`/`terrain` is a `400` before any SQL. No db (a zipped
`game/` without `dev/`) answers a clean empty shape. The **Cross-cuts** dashboard pill
drives these live: pick a metric and a dimension (default = the mountain-hex litmus),
reslice terrain / version / config, and read the bar chart — the query it ran is printed
under the chart to lift straight into `db-query.js`.

## Adding a question

- **A new metric or group-by** is a one-line entry in `AGG_METRICS` / `AGG_GROUPBYS`
  (`dev/db.js`) — a whitelisted SQL expression. It then rides `/api/dimensions` into the
  pickers automatically. Add a label in `CC_METRIC_LABEL` / `CC_DIM_LABEL`
  (`game/ui/screens/dashboard/panes/crosscuts.js`) so it reads in plain English.
- **A new cited metric** (one the reports name) is a column of a named view — see ADR-0004
  and `report-model.md`.
- Pin it with a test in `dev/db.test.js` (the query surface) and `dev/server.test.js` (the
  HTTP boundary).
