/* dev/db.js — SQLite STAR SCHEMA for per-skirmish balance data. Zero deps: uses
   Node's built-in node:sqlite (Node 22+; we run 26). One row per skirmish, plus
   one row per card DECISION, plus per-turn field score — so any balance question
   is a join over dimensions already present, never a new table.

   Grain:
     FACTS      runs        one row per tool invocation (a batch of skirmishes)
                skirmishes  one row per skirmish (outcome + SIM.skirmishFacts +
                            BOTH battalion refs + version/config-digest slice key)
                card_events one row per card DECISION (played/declined/held) from
                            st.journal.decisionLog — never-played cards leave rows
                timeline    one row per turn (field score)
     DIMENSIONS versions    the slice key (rules version, config digest, dials)
                maps        terrain features computed from edge/shape data
                cards       intrinsics (steps, points, derived kind, opener flags)
                battalions  identity + composition
   Dimensions are UPSERTED from loaded engine content at ingest and version-
   stamped, so the DB is self-contained: a terrain- or card-intrinsic question is
   answerable in SQL without reaching into the JS content files.

   Slice key = (rules version, engine config digest). Engine.VERSION +
   Engine.CONFIG.digest are stamped onto every skirmish fact at ingest and carried
   in `versions` (with the human-readable dials behind the digest), so two games at
   the same rules version but a different point cap slice apart in plain SQL.

   The fold is SQL: each cited balance metric is a named VIEW over the star schema
   (v_map_balance, v_global_balance, v_card_timing — the last also carries fairness). See docs/adr/0004.

   Usage:
     var db = require('./db.js');
     var h = db.open();                          // default <repo>/logs/woa.db
     var runId = db.insertRun(h, { version: E.VERSION, kind: 'balance',
       redAi: 'hard', blueAi: 'hard', n: 60, tool: 'balance-report.js',
       battalionRed: 'default', battalionBlue: 'default', mapset: 'active',
       seedBase: 7919, label: 'r1', baseline: false });
     db.insertSkirmish(h, runId, st, firstPlayer); // + card_events + timeline rows
     db.close(h);

   Query it with dev/db-query.js. The .db file is gitignored (regenerable); the
   markdown reports remain the committed human-readable record.

   Fresh DB, not migrated: a pre-star-schema woa.db (its rows lack the grain and
   can't be back-filled) is renamed aside on open — see archiveIfLegacy. */
'use strict';

var fs = require('fs');
var path = require('path');
var sqlite = require('node:sqlite');
var E = require(path.join(__dirname, '..', 'game', 'engine.js'));
// skirmishFacts (the shared per-skirmish fact derivation) lives in the
// batch/measurement layer (game/sim.js), not the engine.
var SIM = require(path.join(__dirname, '..', 'game', 'sim.js'));

// WOA_DB_PATH lets a spawned/required server (and tests) target a throwaway db
// instead of the repo's logs/woa.db; unset in normal use.
var DEFAULT_DB = process.env.WOA_DB_PATH || path.join(__dirname, '..', 'logs', 'woa.db');
var RUN_KINDS = ['balance', 'llm', 'human', 'watch'];
var SCHEMA_VERSION = 2; // 2 = star schema; a DB below this that predates it is archived

var SCHEMA = [
  // ---- fact tables ----
  'CREATE TABLE IF NOT EXISTS runs (',
  '  id INTEGER PRIMARY KEY, version TEXT, ts TEXT, kind TEXT,',
  '  red_ai TEXT, blue_ai TEXT, n INTEGER, tool TEXT, notes TEXT,',
  '  mapset TEXT, seed_base INTEGER, label TEXT, baseline INTEGER,',
  '  battalion_red TEXT, battalion_blue TEXT',
  ');',
  'CREATE TABLE IF NOT EXISTS skirmishes (',
  '  id INTEGER PRIMARY KEY, run_id INTEGER, version TEXT, config_digest TEXT,',
  '  map TEXT, seed INTEGER, first_player TEXT, battalion_red TEXT, battalion_blue TEXT,',
  '  winner TEXT, win_type TEXT, turns INTEGER,',
  '  fs_red INTEGER, fs_blue INTEGER, first_blood TEXT, lead_changes INTEGER,',
  '  kill_tail INTEGER, zero_kill INTEGER, tiebreak INTEGER,',
  '  attacks INTEGER, swaps INTEGER, marches INTEGER, deploys INTEGER,',
  '  res_end_red INTEGER, res_end_blue INTEGER, trace TEXT,',
  '  hexes_red INTEGER, hexes_blue INTEGER',
  ');',
  // one row per card decision — played/declined/held. `map` + the (version,
  // config_digest) slice key are denormalized from the skirmish so "card timing
  // vs terrain" is a plain 3-table join to the slice-keyed `cards`/`maps` dims
  // WITHOUT fanning out across slices. `won` is played-only (NULL on declines).
  'CREATE TABLE IF NOT EXISTS card_events (',
  '  id INTEGER PRIMARY KEY, skirmish_id INTEGER, version TEXT, config_digest TEXT, map TEXT,',
  '  turn INTEGER, side TEXT, card_id TEXT, mode TEXT, outcome TEXT, won INTEGER',
  ');',
  'CREATE TABLE IF NOT EXISTS timeline (',
  '  id INTEGER PRIMARY KEY, skirmish_id INTEGER, turn INTEGER, fs_red INTEGER, fs_blue INTEGER',
  ');',
  // ---- dimension tables (upserted from loaded content; keyed by id + slice) ----
  'CREATE TABLE IF NOT EXISTS versions (',
  '  version TEXT, config_digest TEXT, dials TEXT, ts TEXT,',
  '  PRIMARY KEY (version, config_digest)',
  ');',
  'CREATE TABLE IF NOT EXISTS maps (',
  '  id TEXT, name TEXT, shape TEXT, hex_total INTEGER,',
  '  mountain_hexes INTEGER, forest_hexes INTEGER, river_hexes INTEGER,',
  '  version TEXT, config_digest TEXT,',
  '  PRIMARY KEY (id, version, config_digest)',
  ');',
  'CREATE TABLE IF NOT EXISTS cards (',
  '  id TEXT, name TEXT, kind TEXT, points REAL, steps TEXT,',
  '  starting INTEGER, no_opener INTEGER,',
  '  version TEXT, config_digest TEXT,',
  '  PRIMARY KEY (id, version, config_digest)',
  ');',
  'CREATE TABLE IF NOT EXISTS battalions (',
  '  id TEXT, name TEXT, size INTEGER, cards TEXT,',
  '  version TEXT, config_digest TEXT,',
  '  PRIMARY KEY (id, version, config_digest)',
  ');',
  // ---- indexes ----
  'CREATE INDEX IF NOT EXISTS idx_skirmishes_version_map ON skirmishes(version, map);',
  'CREATE INDEX IF NOT EXISTS idx_skirmishes_run ON skirmishes(run_id);',
  'CREATE INDEX IF NOT EXISTS idx_card_events_skirmish ON card_events(skirmish_id);',
  'CREATE INDEX IF NOT EXISTS idx_card_events_card ON card_events(card_id);',
  'CREATE INDEX IF NOT EXISTS idx_timeline_skirmish ON timeline(skirmish_id);'
].join('\n');

/* The fold, in SQL. Each cited balance metric is a column of a named view over
   the star schema (ADR-0004) — report-model.js is demoted to rendering. Sliced
   by (version, config_digest) so two rules-configs never pool. */
var VIEWS = [
  // Refreshed on every open (DROP+CREATE, not CREATE IF NOT EXISTS) so an edited
  // metric's SQL takes effect on an existing carried-over DB, not just a fresh one.
  'DROP VIEW IF EXISTS v_map_balance;',
  'DROP VIEW IF EXISTS v_global_balance;',
  'DROP VIEW IF EXISTS v_card_timing;',
  // per-map balance fold: mirrors game/report-model.js BANDS, one row per (slice,
  // map). Every cited balance metric is a column here — official numbers and
  // ad-hoc exploration share the definition (ADR-0004). Fractions 0..1 (the JS
  // fold's pct() renders ×100); NULL where a conditioned slice is empty.
  'CREATE VIEW v_map_balance AS SELECT',
  '  version, config_digest, map, COUNT(*) AS n,',
  "  AVG(CASE WHEN winner='red' THEN 1.0 ELSE 0.0 END) AS red_win_pct,",
  '  AVG(CASE WHEN winner=first_player THEN 1.0 ELSE 0.0 END) AS first_win_pct,',
  "  AVG(CASE WHEN win_type='hq' THEN 1.0 ELSE 0.0 END) AS hq_pct,",
  '  AVG(CAST(zero_kill AS REAL)) AS zero_kill_pct,',
  '  AVG(turns) AS avg_turns,',
  "  AVG(CASE WHEN win_type='attrition' THEN kill_tail END) AS drag,",
  "  AVG(CASE WHEN win_type='attrition' THEN CAST(tiebreak AS REAL) END) AS tie_pct,",
  '  AVG(lead_changes) AS swings,',
  // shares over ALL actions in the slice (SUM/SUM, not a per-game average) —
  // matches report-model actionTotal(); NULL only when no actions were taken.
  '  CAST(SUM(COALESCE(attacks,0)) AS REAL) / NULLIF(SUM(COALESCE(attacks,0)+COALESCE(swaps,0)+COALESCE(marches,0)+COALESCE(deploys,0)), 0) AS attack_share,',
  '  CAST(SUM(COALESCE(swaps,0)) AS REAL) / NULLIF(SUM(COALESCE(attacks,0)+COALESCE(swaps,0)+COALESCE(marches,0)+COALESCE(deploys,0)), 0) AS swap_share,',
  // first-blood -> win: conditioned on games that drew first blood (first_blood side won).
  '  AVG(CASE WHEN first_blood IS NOT NULL THEN (CASE WHEN first_blood=winner THEN 1.0 ELSE 0.0 END) END) AS first_blood_win_pct,',
  '  AVG(CASE WHEN hexes_red IS NOT NULL AND hexes_blue IS NOT NULL AND hexes_red<>hexes_blue',
  "       THEN (CASE WHEN (winner='red')=(hexes_red>hexes_blue) THEN 1.0 ELSE 0.0 END) END) AS control_pct",
  '  FROM skirmishes GROUP BY version, config_digest, map;',
  // global fold: the SAME metric columns across all maps of a slice — the cited
  // anchors read from here (docs/balance/balance-baselines.md).
  'CREATE VIEW v_global_balance AS SELECT',
  '  version, config_digest, COUNT(*) AS n,',
  "  AVG(CASE WHEN winner='red' THEN 1.0 ELSE 0.0 END) AS red_win_pct,",
  '  AVG(CASE WHEN winner=first_player THEN 1.0 ELSE 0.0 END) AS first_win_pct,',
  "  AVG(CASE WHEN win_type='hq' THEN 1.0 ELSE 0.0 END) AS hq_pct,",
  '  AVG(CAST(zero_kill AS REAL)) AS zero_kill_pct,',
  '  AVG(turns) AS avg_turns,',
  "  AVG(CASE WHEN win_type='attrition' THEN kill_tail END) AS drag,",
  "  AVG(CASE WHEN win_type='attrition' THEN CAST(tiebreak AS REAL) END) AS tie_pct,",
  '  AVG(lead_changes) AS swings,',
  '  CAST(SUM(COALESCE(attacks,0)) AS REAL) / NULLIF(SUM(COALESCE(attacks,0)+COALESCE(swaps,0)+COALESCE(marches,0)+COALESCE(deploys,0)), 0) AS attack_share,',
  '  CAST(SUM(COALESCE(swaps,0)) AS REAL) / NULLIF(SUM(COALESCE(attacks,0)+COALESCE(swaps,0)+COALESCE(marches,0)+COALESCE(deploys,0)), 0) AS swap_share,',
  '  AVG(CASE WHEN first_blood IS NOT NULL THEN (CASE WHEN first_blood=winner THEN 1.0 ELSE 0.0 END) END) AS first_blood_win_pct,',
  '  AVG(CASE WHEN hexes_red IS NOT NULL AND hexes_blue IS NOT NULL AND hexes_red<>hexes_blue',
  "       THEN (CASE WHEN (winner='red')=(hexes_red>hexes_blue) THEN 1.0 ELSE 0.0 END) END) AS control_pct",
  '  FROM skirmishes GROUP BY version, config_digest;',
  // per-(slice, card) decision view: timing AND the bottom-up fairness signal, one
  // grain, one definition of plays/declines. card_events carries its own slice key,
  // so no join is needed. pass_rate uses the decline/held events (a card offered
  // every turn but never played reads pass 1.0), NOT play-only. win_contribution =
  // the card's share of the slice's winning plays (a window SUM over the grouped
  // rows) across the SAMPLED battalion space (every battalion that fielded the card
  // pools here). Fairness is advisory, not a gate (ADR-0002) — exposure-weighted,
  // so a more-drawn card accrues more wins.
  'CREATE VIEW v_card_timing AS SELECT',
  '  version, config_digest, card_id,',
  "  SUM(CASE WHEN outcome='played' THEN 1 ELSE 0 END) AS plays,",
  "  SUM(CASE WHEN outcome='declined' THEN 1 ELSE 0 END) AS declines,",
  '  COUNT(*) AS offers,',
  "  AVG(CASE WHEN outcome='played' THEN turn END) AS avg_play_turn,",
  "  CAST(SUM(CASE WHEN outcome='declined' THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(*), 0) AS pass_rate,",
  "  SUM(CASE WHEN outcome='played' AND won=1 THEN 1 ELSE 0 END) AS won_plays,",
  "  CAST(SUM(CASE WHEN outcome='played' AND won=1 THEN 1 ELSE 0 END) AS REAL)",
  "    / NULLIF(SUM(CASE WHEN outcome='played' THEN 1 ELSE 0 END), 0) AS play_win_pct,",
  "  CAST(SUM(CASE WHEN outcome='played' AND won=1 THEN 1 ELSE 0 END) AS REAL)",
  "    / NULLIF(SUM(SUM(CASE WHEN outcome='played' AND won=1 THEN 1 ELSE 0 END)) OVER (PARTITION BY version, config_digest), 0) AS win_contribution",
  '  FROM card_events GROUP BY version, config_digest, card_id;'
].join('\n');

// node:sqlite refuses `undefined` params — normalize to NULL.
function nz(v) { return v === undefined ? null : v; }

/* ---------- dimension derivations (pure; exported for tests) ---------- */

// The board hex list for a map: its inline shapeDef, else the named built-in
// shape. Pure — buildShape/boardHexes return fresh data, no global board mutation.
function boardHexList(map) {
  if (map && map.shapeDef) return E.buildShape('@' + (map.id || map.name || 'custom'), map.shapeDef).list;
  return E.boardHexes((map && map.shape) || E.DEFAULT_SHAPE);
}

// Terrain features computed from the map's edge data. The game stores terrain as
// owned SIDES ([q,r,dir] per piece, every side of a piece inside ONE hex), not
// counts — so a type's hex count is the distinct hexes owning any side of it.
function terrainFeatures(map) {
  var byType = { M: {}, F: {}, R: {} };
  (map && map.pieces || []).forEach(function (p) {
    if (!p || !p.edges || !p.edges.length || !byType[p.t]) return;
    // A well-formed piece's sides all lie in one hex (pieceProblem enforces it);
    // count every hex any side touches so a malformed piece is never under-counted.
    p.edges.forEach(function (e) { byType[p.t][e[0] + ',' + e[1]] = true; });
  });
  return {
    hexTotal: boardHexList(map).length,
    mountainHexes: Object.keys(byType.M).length,
    forestHexes: Object.keys(byType.F).length,
    riverHexes: Object.keys(byType.R).length
  };
}

// A card's derived kind: the dominant step type, ties broken by a fixed priority
// (deploy > attack > barrage > trench > reposition — step cost, then a stable
// order). A coarse grouping label; measured balance always overrules it.
var KIND_PRIORITY = ['deploy', 'attack', 'barrage', 'trench', 'reposition'];
function cardKind(card) {
  var steps = (card && Array.isArray(card.steps)) ? card.steps : [];
  if (!steps.length) return 'none';
  var count = {};
  steps.forEach(function (s) { if (s && s.type) count[s.type] = (count[s.type] || 0) + 1; });
  var types = Object.keys(count);
  if (!types.length) return 'none';
  types.sort(function (a, b) {
    if (count[b] !== count[a]) return count[b] - count[a];               // most frequent first
    var pa = KIND_PRIORITY.indexOf(a), pb = KIND_PRIORITY.indexOf(b);    // then fixed priority
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
  });
  return types[0];
}

/* ---------- state-field picking (the --parallel worker->parent envelope) ---------- */
// The exact fields insertSkirmish reads, addressed by their de-flattened block.
// Top-level identity fields carry a null block. Extend this in the same diff as a
// new insertSkirmish read — the field list and its reader still cannot drift apart.
var SKIRMISH_ST_FIELDS = [
  [null, 'version'], [null, 'mapName'], [null, 'seed'],
  ['flow', 'phase'], ['flow', 'turnNumber'],
  ['result', 'skirmishWinner'], ['result', 'winType'], ['result', 'kills'],
  ['pieces', 'units'], ['pieces', 'reserves'],
  ['journal', 'stats'], ['journal', 'playLog'], ['journal', 'decisionLog'], ['journal', 'unitMetrics'],
  ['journal', 'leadChanges'], ['journal', 'lastKillTurn'], ['journal', 'fsTimeline']
];
function slimSkirmishState(st) {
  var s = {};
  if (!st) return s;
  SKIRMISH_ST_FIELDS.forEach(function (fb) {
    var block = fb[0], k = fb[1];
    var src = block ? st[block] : st;
    if (src && src[k] !== undefined) {
      if (block) { (s[block] = s[block] || {})[k] = src[k]; }
      else s[k] = src[k];
    }
  });
  return s;
}

/* ---------- open / archive ---------- */

// A pre-star-schema woa.db can't be back-filled (its rows lack the grain), so
// rename it aside on open rather than migrate. No-op on a fresh/new/current DB.
function archiveIfLegacy(file) {
  if (!fs.existsSync(file)) return;
  var legacy = false;
  var probe = new sqlite.DatabaseSync(file);
  try {
    var uv = probe.prepare('PRAGMA user_version').get();
    var v = uv[Object.keys(uv)[0]];
    var tbls = probe.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(function (r) { return r.name; });
    // Archive ANY stale (older-than-current) woa.db, not just the first star bump —
    // gated on it being one of ours (a known table) so an unrelated file is never
    // renamed. A fresh/current DB has user_version === SCHEMA_VERSION and is left alone.
    var OURS = ['skirmishes', 'battles', 'card_events', 'card_plays', 'runs'];
    legacy = (v < SCHEMA_VERSION) && tbls.some(function (t) { return OURS.indexOf(t) >= 0; });
  } catch (e) { /* unreadable: leave it, the fresh open will surface the error */ }
  finally { probe.close(); }
  if (!legacy) return;
  var stamp = new Date().toISOString().replace(/[:.]/g, '-');
  var archived = file.replace(/\.db$/, '') + '.archived-' + stamp + '.db';
  fs.renameSync(file, archived);
  ['-wal', '-shm'].forEach(function (s) { try { if (fs.existsSync(file + s)) fs.renameSync(file + s, archived + s); } catch (e) {} });
  try { console.error('[db] archived pre-star-schema woa.db -> ' + path.basename(archived) + ' (fresh DB, not migrated)'); } catch (e) {}
}

/* Open (creating if needed) the DB, ensure the star schema + views, switch on
   WAL, and prepare every statement once. Returns the handle the other calls take. */
function open(dbPath) {
  var file = dbPath || DEFAULT_DB;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  archiveIfLegacy(file);
  var db = new sqlite.DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  db.exec(VIEWS);
  db.exec('PRAGMA user_version = ' + SCHEMA_VERSION + ';');
  var stmts = {
    insertRun: db.prepare(
      'INSERT INTO runs (version, ts, kind, red_ai, blue_ai, n, tool, notes,' +
      ' mapset, seed_base, label, baseline, battalion_red, battalion_blue) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'),
    getRun: db.prepare('SELECT version, battalion_red, battalion_blue FROM runs WHERE id = ?'),
    clearBaseline: db.prepare('UPDATE runs SET baseline = 0 WHERE baseline = 1 AND version IS ?'),
    setBaselineFlag: db.prepare('UPDATE runs SET baseline = 1 WHERE id = ?'),
    listRuns: db.prepare(
      'SELECT id, version, ts, kind, red_ai AS redAi, blue_ai AS blueAi, n, tool, notes,' +
      ' mapset, seed_base AS seedBase, label, baseline,' +
      ' battalion_red AS battalionRed, battalion_blue AS battalionBlue FROM runs ORDER BY id DESC LIMIT ?'),
    listSkirmishes: db.prepare(
      'SELECT id, map, seed, first_player AS firstPlayer, winner, win_type AS winType, turns,' +
      ' config_digest AS configDigest, battalion_red AS battalionRed, battalion_blue AS battalionBlue,' +
      ' fs_red AS fsRed, fs_blue AS fsBlue, first_blood AS firstBlood, lead_changes AS leadChanges,' +
      ' kill_tail AS killTail, zero_kill AS zeroKill, tiebreak, attacks, swaps, marches, deploys,' +
      ' res_end_red AS resEndRed, res_end_blue AS resEndBlue, trace,' +
      ' hexes_red AS hexesRed, hexes_blue AS hexesBlue' +
      ' FROM skirmishes WHERE run_id = ? ORDER BY id'),
    insertSkirmish: db.prepare(
      'INSERT INTO skirmishes (run_id, version, config_digest, map, seed, first_player,' +
      ' battalion_red, battalion_blue, winner, win_type, turns,' +
      ' fs_red, fs_blue, first_blood, lead_changes, kill_tail, zero_kill, tiebreak,' +
      ' attacks, swaps, marches, deploys, res_end_red, res_end_blue, trace, hexes_red, hexes_blue)' +
      ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'),
    insertCardEvent: db.prepare(
      'INSERT INTO card_events (skirmish_id, version, config_digest, map, turn, side, card_id, mode, outcome, won)' +
      ' VALUES (?,?,?,?,?,?,?,?,?,?)'),
    insertTimeline: db.prepare(
      'INSERT INTO timeline (skirmish_id, turn, fs_red, fs_blue) VALUES (?,?,?,?)'),
    upsertVersion: db.prepare(
      'INSERT OR REPLACE INTO versions (version, config_digest, dials, ts) VALUES (?,?,?,?)'),
    upsertMap: db.prepare(
      'INSERT OR REPLACE INTO maps (id, name, shape, hex_total, mountain_hexes, forest_hexes, river_hexes, version, config_digest)' +
      ' VALUES (?,?,?,?,?,?,?,?,?)'),
    upsertCard: db.prepare(
      'INSERT OR REPLACE INTO cards (id, name, kind, points, steps, starting, no_opener, version, config_digest)' +
      ' VALUES (?,?,?,?,?,?,?,?,?)'),
    upsertBattalion: db.prepare(
      'INSERT OR REPLACE INTO battalions (id, name, size, cards, version, config_digest) VALUES (?,?,?,?,?,?)')
  };
  return { db: db, file: file, stmts: stmts };
}

// One-transaction wrapper: COMMIT on success, ROLLBACK + rethrow on failure.
function txn(h, fn) {
  h.db.exec('BEGIN');
  try { var r = fn(); h.db.exec('COMMIT'); return r; }
  catch (e) { try { h.db.exec('ROLLBACK'); } catch (e2) {} throw e; }
}

/* ---------- dimension upsert (from loaded engine content, at ingest) ---------- */

// Upsert every map/card/battalion + the version row for one slice
// (version, engine config digest), so the DB answers terrain- and card-intrinsic
// questions without reaching into JS. Idempotent (INSERT OR REPLACE). Called once
// per run (a run is one slice). Runs inside the caller's transaction.
function upsertDimensions(h, version, digest) {
  var v = nz(version);
  h.stmts.upsertVersion.run(v, digest, JSON.stringify(E.CONFIG), new Date().toISOString());
  (E.MAPS || []).forEach(function (m) {
    var t = terrainFeatures(m);
    var shape = (m.shape && String(m.shape).charAt(0) === '@') || m.shapeDef ? 'custom' : (m.shape || E.DEFAULT_SHAPE);
    h.stmts.upsertMap.run(nz(m.id || m.name), nz(m.name), shape, t.hexTotal,
      t.mountainHexes, t.forestHexes, t.riverHexes, v, digest);
  });
  // The full card POOL (not just the active battalion's slice) — every card any
  // battalion can reference is a queryable dimension row.
  (E.CARD_POOL || E.CARDS || []).forEach(function (c) {
    h.stmts.upsertCard.run(c.id, nz(c.name), cardKind(c), E.cardPoints(c),
      JSON.stringify(c.steps || []), c.starting ? 1 : 0, c.noOpener ? 1 : 0, v, digest);
  });
  (E.BATTALIONS || []).forEach(function (b) {
    var cards = (b.cards || []);
    var size = cards.reduce(function (s, c) { return s + (c.count == null ? 1 : c.count); }, 0);
    h.stmts.upsertBattalion.run(b.id, nz(b.name), size, JSON.stringify(cards), v, digest);
  });
}

/* ---------- baseline ---------- */

// Pin runId as its version's one baseline: clear every OTHER baseline=1 row
// sharing its version, then flag runId — inside the caller's transaction.
function pinBaseline(h, version, runId) {
  h.stmts.clearBaseline.run(nz(version));
  h.stmts.setBaselineFlag.run(runId);
}

/* ---------- inserts ---------- */

/* Record one run (a batch of skirmishes from one tool invocation) + upsert the
   dimensions for its slice. Returns runId.
   r = { version, kind('balance'|'llm'|'human'|'watch'), redAi, blueAi, n, tool,
         notes?, ts?, mapset?, seedBase?, label?, baseline?(bool),
         battalionRed?, battalionBlue?, battalion?(sets both when the pair is symmetric) }. */
function insertRun(h, r) {
  r = r || {};
  if (RUN_KINDS.indexOf(r.kind) < 0)
    throw new Error('insertRun: kind must be one of ' + RUN_KINDS.join('|') + ' (got "' + r.kind + '")');
  var batRed = r.battalionRed !== undefined ? r.battalionRed : r.battalion;
  var batBlue = r.battalionBlue !== undefined ? r.battalionBlue : r.battalion;
  return txn(h, function () {
    var res = h.stmts.insertRun.run(
      nz(r.version), r.ts || new Date().toISOString(), r.kind,
      nz(r.redAi), nz(r.blueAi), nz(r.n), nz(r.tool), nz(r.notes),
      nz(r.mapset), nz(r.seedBase), nz(r.label), 0, nz(batRed), nz(batBlue)); // baseline=0; pin below
    var runId = Number(res.lastInsertRowid);
    if (r.baseline) pinBaseline(h, r.version, runId);
    upsertDimensions(h, r.version, E.CONFIG.digest);
    return runId;
  });
}

/* Pin an EXISTING run as its version's baseline. Returns runId; throws if absent. */
function setBaseline(h, runId) {
  var row = h.stmts.getRun.get(runId);
  if (!row) throw new Error('setBaseline: no run with id ' + runId);
  return txn(h, function () { pinBaseline(h, row.version, runId); return runId; });
}

/* Fold one FINISHED skirmish state into the DB — the skirmishes row + its
   card_events (from st.journal.decisionLog) + timeline rows, in ONE transaction.
   Returns skirmishId.
     firstPlayer: 'red'|'blue' — who moved first.
     extra: { version?, seed?, battalionRed?, battalionBlue?, battalion? } —
       version falls back to st.version then the run's; seed falls back to
       st.seed (the EVOLVED rng state by skirmish end, so simSkirmish callers
       pass the original); battalion refs fall back to the run's pair. */
function insertSkirmish(h, runId, st, firstPlayer, extra) {
  extra = extra || {};
  if (!st || !st.flow || st.flow.phase !== 'skirmish-over')
    throw new Error('insertSkirmish: st must be a finished skirmish (phase skirmish-over, got "' + (st && st.flow && st.flow.phase) + '")');
  var run = h.stmts.getRun.get(runId) || {};
  var version = extra.version || st.version || run.version || null;
  var digest = E.CONFIG.digest; // stamped live at ingest — the slice key's config half
  var batRed = extra.battalionRed !== undefined ? extra.battalionRed
    : (extra.battalion !== undefined ? extra.battalion : (run.battalion_red != null ? run.battalion_red : null));
  var batBlue = extra.battalionBlue !== undefined ? extra.battalionBlue
    : (extra.battalion !== undefined ? extra.battalion : (run.battalion_blue != null ? run.battalion_blue : null));
  // The per-Skirmish scalar facts, derived ONCE by the sim layer.
  var f = SIM.skirmishFacts(st, firstPlayer);
  var winner = f.winner;
  var seed = extra.seed !== undefined ? extra.seed : nz(st.seed);
  var trace = JSON.stringify({
    v: version, map: nz(st.mapName), seed: seed, fp: nz(firstPlayer),
    winner: winner, winType: nz(f.winType), turns: nz(f.turns),
    trace: st.journal.playLog || [], units: st.journal.unitMetrics || {}
  });
  return txn(h, function () {
    var res = h.stmts.insertSkirmish.run(
      runId, version, digest, nz(st.mapName), seed, nz(firstPlayer),
      nz(batRed), nz(batBlue), winner, nz(f.winType), nz(f.turns),
      f.fsRed, f.fsBlue, nz(f.firstBlood), f.leadChanges,
      f.killTail, f.zeroKill, f.tiebreak,
      f.attacks, f.swaps, f.marches, f.deploys,
      f.resEndRed, f.resEndBlue, trace, f.hexesRed, f.hexesBlue);
    var skirmishId = Number(res.lastInsertRowid);
    // card_events: one per decision from the decision-journal stream. Fall back to
    // played-only (from playLog) for a pre-decision-journal state, so it is never empty.
    var decisions = (Array.isArray(st.journal.decisionLog) && st.journal.decisionLog.length)
      ? st.journal.decisionLog
      : (st.journal.playLog || []).map(function (e) { return { turn: e.turn, side: e.p, mode: e.mode, card: e.id, outcome: 'played' }; });
    decisions.forEach(function (d) {
      // won is played-only (NULL on a decline) — matches the retired card_plays.won,
      // so AVG(won) is a play win-rate even without an outcome filter.
      var won = d.outcome === 'played' ? (d.side === winner ? 1 : 0) : null;
      h.stmts.insertCardEvent.run(skirmishId, version, digest, nz(st.mapName), nz(d.turn),
        d.side, d.card, nz(d.mode), d.outcome, won);
    });
    if (Array.isArray(st.journal.fsTimeline)) {
      st.journal.fsTimeline.forEach(function (pair, i) {
        if (Array.isArray(pair)) h.stmts.insertTimeline.run(skirmishId, i + 1, nz(pair[0]), nz(pair[1]));
      });
    }
    return skirmishId;
  });
}

/* ---------- reads ---------- */

function listRuns(h, limit) { return h.stmts.listRuns.all(limit || 200); }
function listSkirmishes(h, runId) { return h.stmts.listSkirmishes.all(runId); }
function close(h) { h.db.close(); }

/* ---------- the query surface: whitelisted sliceable aggregates ----------
   One re-sliceable aggregate over the star schema, so the dashboard (and an
   agent, via /api/aggregate) can ask "shadows of what needs changing" without a
   new view per question. Metric and group-by NAMES are whitelisted -> the only
   SQL that ever interpolates a request value is a known-safe expression; the
   slice filters (version, config_digest) are bound parameters. See ADR-0004 and
   docs/reference/query-cookbook.md. */

// Metric = a SQL aggregate expression over the skirmishes fact (alias s). Same
// definitions as the v_*_balance views (ADR-0004), reused per-slice on demand.
var AGG_METRICS = {
  n:             'COUNT(*)',
  first_win_pct: "AVG(CASE WHEN s.winner = s.first_player THEN 1.0 ELSE 0.0 END)",
  red_win_pct:   "AVG(CASE WHEN s.winner = 'red' THEN 1.0 ELSE 0.0 END)",
  hq_pct:        "AVG(CASE WHEN s.win_type = 'hq' THEN 1.0 ELSE 0.0 END)",
  avg_turns:     'AVG(s.turns)',
  drag:          "AVG(CASE WHEN s.win_type = 'attrition' THEN s.kill_tail END)",
  tie_pct:       "AVG(CASE WHEN s.win_type = 'attrition' THEN CAST(s.tiebreak AS REAL) END)",
  swings:        'AVG(s.lead_changes)',
  zero_kill_pct: 'AVG(CAST(s.zero_kill AS REAL))',
  attack_share:  'CAST(SUM(COALESCE(s.attacks,0)) AS REAL) / NULLIF(SUM(COALESCE(s.attacks,0)+COALESCE(s.swaps,0)+COALESCE(s.marches,0)+COALESCE(s.deploys,0)), 0)',
  swap_share:    'CAST(SUM(COALESCE(s.swaps,0)) AS REAL) / NULLIF(SUM(COALESCE(s.attacks,0)+COALESCE(s.swaps,0)+COALESCE(s.marches,0)+COALESCE(s.deploys,0)), 0)',
  first_blood_win_pct: 'AVG(CASE WHEN s.first_blood IS NOT NULL THEN (CASE WHEN s.first_blood=s.winner THEN 1.0 ELSE 0.0 END) END)',
  control_pct:   'AVG(CASE WHEN s.hexes_red IS NOT NULL AND s.hexes_blue IS NOT NULL AND s.hexes_red<>s.hexes_blue' +
                 " THEN (CASE WHEN (s.winner='red')=(s.hexes_red>s.hexes_blue) THEN 1.0 ELSE 0.0 END) END)"
};
// Group-by = the x-axis dimension. `join` pulls the maps dimension in (terrain
// features live there); `num` marks a numeric bucket (drives ordering + a
// numeric x-axis in the chart). The mountain_hexes bucket IS the ADR litmus.
var AGG_GROUPBYS = {
  map:            { sql: 's.map',            join: false, num: false },
  shape:          { sql: 'm.shape',          join: true,  num: false },
  mountain_hexes: { sql: 'm.mountain_hexes', join: true,  num: true },
  forest_hexes:   { sql: 'm.forest_hexes',   join: true,  num: true },
  river_hexes:    { sql: 'm.river_hexes',    join: true,  num: true },
  hex_total:      { sql: 'm.hex_total',      join: true,  num: true },
  first_player:   { sql: 's.first_player',   join: false, num: false },
  win_type:       { sql: 's.win_type',       join: false, num: false },
  winner:         { sql: 's.winner',         join: false, num: false },
  battalion_red:  { sql: 's.battalion_red',  join: false, num: false }
};
// card_events terrain cross-cut: which maps-dimension terrain column the card's
// play-timing is bucketed against.
var CARD_TERRAINS = { mountain: 'm.mountain_hexes', forest: 'm.forest_hexes', river: 'm.river_hexes' };

// maps dimension is keyed by NAME to the fact's `map` column (= st.mapName), and
// by the (version, config_digest) slice so two configs never cross-join.
var MAPS_JOIN = ' LEFT JOIN maps m ON m.name = s.map AND m.version = s.version AND m.config_digest = s.config_digest';

// A rejected request value (a non-whitelisted x/metric/terrain) is the caller's
// fault -> tag it so the HTTP layer answers 400, not 500.
function badRequest(msg) { var e = new Error(msg); e.badRequest = true; return e; }

// slice filters are ALWAYS bound params, never interpolated.
function sliceWhere(prefix, version, config, params) {
  var w = [];
  if (version != null && version !== '') { w.push(prefix + '.version = ?'); params.push(version); }
  if (config != null && config !== '') { w.push(prefix + '.config_digest = ?'); params.push(config); }
  return w;
}

/* Skirmish-grain aggregate: one row per bucket of `x`, each requested metric a
   column. opts = { x, metrics?, version?, config? }. Throws on an unknown x or
   metric (the whitelist is the injection fence). Returns
   { x, numeric, metrics, rows:[{bucket, <metric>...}] }. */
function aggregate(h, opts) {
  opts = opts || {};
  var gb = AGG_GROUPBYS[opts.x || 'map'];
  if (!gb) throw badRequest('aggregate: unknown group-by "' + opts.x + '"');
  var metrics = (opts.metrics && opts.metrics.length)
    ? opts.metrics : ['n', 'first_win_pct', 'red_win_pct', 'hq_pct', 'avg_turns', 'tie_pct', 'drag', 'swings'];
  metrics.forEach(function (m) { if (!AGG_METRICS[m]) throw badRequest('aggregate: unknown metric "' + m + '"'); });
  var sel = [gb.sql + ' AS bucket'].concat(metrics.map(function (m) { return AGG_METRICS[m] + ' AS ' + m; }));
  var params = [];
  var where = sliceWhere('s', opts.version, opts.config, params);
  var sql = 'SELECT ' + sel.join(', ') + ' FROM skirmishes s' + (gb.join ? MAPS_JOIN : '') +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' GROUP BY bucket ORDER BY bucket';
  var stmt = h.db.prepare(sql);
  return { x: opts.x || 'map', numeric: gb.num, metrics: metrics, rows: stmt.all.apply(stmt, params) };
}

/* The literal ADR litmus: a card's play-timing vs a map's terrain-hex count —
   one row per (terrain bucket, card). opts = { terrain?, card?, version?, config? }.
   Returns { terrain, rows:[{bucket, card_id, avg_play_turn, plays, win_pct}] }. */
function cardTiming(h, opts) {
  opts = opts || {};
  var tcol = CARD_TERRAINS[opts.terrain || 'mountain'];
  if (!tcol) throw badRequest('cardTiming: unknown terrain "' + opts.terrain + '"');
  var params = [];
  var where = ["ce.outcome = 'played'"];
  if (opts.card) { where.push('ce.card_id = ?'); params.push(opts.card); }
  Array.prototype.push.apply(where, sliceWhere('ce', opts.version, opts.config, params));
  var sql = 'SELECT ' + tcol + ' AS bucket, ce.card_id AS card_id,' +
    ' AVG(ce.turn) AS avg_play_turn, COUNT(*) AS plays, AVG(CAST(ce.won AS REAL)) AS win_pct' +
    ' FROM card_events ce JOIN maps m ON m.name = ce.map AND m.version = ce.version AND m.config_digest = ce.config_digest' +
    ' WHERE ' + where.join(' AND ') + ' GROUP BY bucket, card_id ORDER BY card_id, bucket';
  var stmt = h.db.prepare(sql);
  return { terrain: opts.terrain || 'mountain', rows: stmt.all.apply(stmt, params) };
}

/* What the dashboard's slice pickers need: the DISTINCT slice keys actually in
   the DB, plus the whitelisted metric/group-by/terrain names and the card/map
   lists. All reads, never writes. */
function dimensions(h) {
  return {
    versions: h.db.prepare('SELECT DISTINCT version, config_digest FROM skirmishes ORDER BY version, config_digest').all(),
    metrics: Object.keys(AGG_METRICS),
    groupBys: Object.keys(AGG_GROUPBYS),
    terrains: Object.keys(CARD_TERRAINS),
    cards: h.db.prepare('SELECT DISTINCT card_id FROM card_events WHERE card_id IS NOT NULL ORDER BY card_id').all().map(function (r) { return r.card_id; }),
    maps: h.db.prepare('SELECT DISTINCT map FROM skirmishes WHERE map IS NOT NULL ORDER BY map').all().map(function (r) { return r.map; })
  };
}

module.exports = {
  open: open, insertRun: insertRun, insertSkirmish: insertSkirmish, setBaseline: setBaseline,
  listRuns: listRuns, listSkirmishes: listSkirmishes, close: close, DEFAULT_DB: DEFAULT_DB,
  slimSkirmishState: slimSkirmishState, // the --parallel worker->parent skirmish envelope
  // the query surface (sliceable aggregates over the star schema)
  aggregate: aggregate, cardTiming: cardTiming, dimensions: dimensions,
  AGG_METRICS: AGG_METRICS, AGG_GROUPBYS: AGG_GROUPBYS, CARD_TERRAINS: CARD_TERRAINS,
  // pure dimension derivations, exported for tests + reuse
  terrainFeatures: terrainFeatures, cardKind: cardKind, upsertDimensions: upsertDimensions,
  SCHEMA_VERSION: SCHEMA_VERSION
};
