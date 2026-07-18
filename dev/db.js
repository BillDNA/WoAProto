/* dev/db.js — SQLite persistence for per-battle data (V1 data persistence,
   the retired v1-data-persistence spec, git history). Zero deps: uses Node's BUILT-IN
   node:sqlite (Node 22+; we run 26). The DB is the dev-side analysis store —
   one row per battle instead of the pre-summed aggregates balanceAdd keeps —
   so distributions, typicality and version-over-version trends become SQL.

   Every battle source (CLI balance lab, dashboard via server proxy, human
   play, LLM battles) funnels through insertBattle with a FINISHED engine
   battle state (st.phase === 'battle-over').

   Usage:
     var db = require('./db.js');
     var h = db.open();                          // default <repo>/logs/woa.db
     var runId = db.insertRun(h, { version: E.VERSION, kind: 'balance',
       redAi: 'hard', blueAi: 'hard', n: 60, tool: 'balance-report.js',
       deck: 'default', mapset: 'active', seedBase: 7919, label: 'r1',
       baseline: false });
     db.insertBattle(h, runId, st, firstPlayer); // + card_plays + timeline rows
     db.close(h);

   Query it with dev/db-query.js. The .db file is gitignored (regenerable);
   the markdown reports remain the committed human-readable record.

   WOA-032 (SPEC §7, run identity for the A/B picker): `runs` grew deck/
   mapset/seed_base/label/baseline columns. Exactly one baseline=1 row per
   `version` is enforced by db.js itself (insertRun's baseline:true, or the
   standalone setBaseline(h, runId)) — pinning a new baseline atomically
   clears the old one(s) for that version, never left to callers. Callers
   never create a baseline implicitly; baseline is opt-in per insertRun call.

   WOA-032 (SPEC §4, the trace): `battles` grew a `trace` TEXT column — one
   JSON blob per battle holding the full per-play trace (st.playLog, as the
   engine wrote it — action/hex/kill/leader/unit fields already folded in by
   WOA-031) plus the per-unit-type `units` fold (st.unitMetrics). Everything
   in SPEC §1-3 derivable from the trace is meant to be derived FROM this
   column (report-model.js folds), not re-captured as new battles columns.

   WOA-038 (Control% on the dashboard): `battles` grew `hexes_red`/`hexes_blue`
   INTEGER columns -- hex-ownership tally at battle end (hexesHeld(st) below),
   bit-for-bit the same count balanceAdd folds live (game/engine/06-sim.js:73-74).
   NULL on rows written before this ticket (report-model.js's foldBattles
   treats a NULL pair as "no control data", never a fabricated 0/0 tie). */
'use strict';

var fs = require('fs');
var path = require('path');
var sqlite = require('node:sqlite');
var E = require(path.join(__dirname, '..', 'game', 'engine.js'));

var DEFAULT_DB = path.join(__dirname, '..', 'logs', 'woa.db');
var RUN_KINDS = ['balance', 'llm', 'human', 'watch'];

var SCHEMA = [
  'CREATE TABLE IF NOT EXISTS runs (',
  '  id INTEGER PRIMARY KEY, version TEXT, ts TEXT, kind TEXT,',
  '  red_ai TEXT, blue_ai TEXT, n INTEGER, tool TEXT, notes TEXT,',
  '  deck TEXT, mapset TEXT, seed_base INTEGER, label TEXT, baseline INTEGER',
  ');',
  'CREATE TABLE IF NOT EXISTS battles (',
  '  id INTEGER PRIMARY KEY, run_id INTEGER, version TEXT, map TEXT, seed INTEGER,',
  '  first_player TEXT, winner TEXT, win_type TEXT, turns INTEGER,',
  '  fs_red INTEGER, fs_blue INTEGER, first_blood TEXT, lead_changes INTEGER,',
  '  kill_tail INTEGER, zero_kill INTEGER, tiebreak INTEGER,',
  '  attacks INTEGER, swaps INTEGER, marches INTEGER, deploys INTEGER,',
  '  res_end_red INTEGER, res_end_blue INTEGER, trace TEXT,',
  '  hexes_red INTEGER, hexes_blue INTEGER',
  ');',
  'CREATE TABLE IF NOT EXISTS card_plays (',
  '  id INTEGER PRIMARY KEY, battle_id INTEGER, side TEXT, card_id TEXT,',
  '  mode TEXT, turn INTEGER, seen INTEGER, noop INTEGER, won INTEGER',
  ');',
  'CREATE TABLE IF NOT EXISTS timeline (',
  '  id INTEGER PRIMARY KEY, battle_id INTEGER, turn INTEGER, fs_red INTEGER, fs_blue INTEGER',
  ');',
  'CREATE INDEX IF NOT EXISTS idx_battles_version_map ON battles(version, map);',
  'CREATE INDEX IF NOT EXISTS idx_battles_run ON battles(run_id);',
  'CREATE INDEX IF NOT EXISTS idx_card_plays_battle ON card_plays(battle_id);',
  'CREATE INDEX IF NOT EXISTS idx_timeline_battle ON timeline(battle_id);'
].join('\n');

// node:sqlite refuses `undefined` params — normalize to NULL.
function nz(v) { return v === undefined ? null : v; }

// Additive migration for a pre-existing woa.db (CREATE TABLE IF NOT EXISTS
// doesn't add columns to an already-created table) — safe/idempotent, keeps
// prior battle history instead of forcing a delete-and-regenerate.
function ensureColumn(db, table, col, type) {
  var cols = db.prepare('PRAGMA table_info(' + table + ')').all().map(function (c) { return c.name; });
  if (cols.indexOf(col) < 0) db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + col + ' ' + type + ';');
}

// Sum of a side's reserves at battle end, across every unit type in the
// active content (excludes the trench reserve — same convention as the
// engine's deployedShare, which this metric is a per-side split of).
function reservesLeft(st, side) {
  var n = 0, r = st && st.reserves && st.reserves[side];
  if (r) Object.keys(E.UNITS).forEach(function (t) { n += r[t] || 0; });
  return n;
}

// WOA-038: hexes held per side at battle end — the SAME count balanceAdd
// (game/engine/06-sim.js:73-74) folds live, kept here so the DB path
// reproduces it exactly: for (var h in st.units) owner red/blue tally.
function hexesHeld(st) {
  var hr = 0, hb = 0;
  for (var h in (st && st.units) || {}) (st.units[h].owner === 'red' ? hr++ : hb++);
  return { red: hr, blue: hb };
}

/* Open (creating if needed) the DB, ensure the schema, switch on WAL, and
   prepare every statement once. Returns the handle the other calls take. */
function open(dbPath) {
  var file = dbPath || DEFAULT_DB;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  var db = new sqlite.DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  ensureColumn(db, 'battles', 'res_end_red', 'INTEGER');
  ensureColumn(db, 'battles', 'res_end_blue', 'INTEGER');
  ensureColumn(db, 'battles', 'trace', 'TEXT');       // WOA-032 (SPEC §4): per-battle trace JSON
  ensureColumn(db, 'battles', 'hexes_red', 'INTEGER'); // WOA-038: hex-ownership tally at battle end
  ensureColumn(db, 'battles', 'hexes_blue', 'INTEGER');
  ensureColumn(db, 'runs', 'deck', 'TEXT');           // WOA-032 (SPEC §7): run identity for the A/B picker
  ensureColumn(db, 'runs', 'mapset', 'TEXT');
  ensureColumn(db, 'runs', 'seed_base', 'INTEGER');
  ensureColumn(db, 'runs', 'label', 'TEXT');
  ensureColumn(db, 'runs', 'baseline', 'INTEGER');
  var stmts = {
    insertRun: db.prepare(
      'INSERT INTO runs (version, ts, kind, red_ai, blue_ai, n, tool, notes,' +
      ' deck, mapset, seed_base, label, baseline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'),
    getRunVersion: db.prepare('SELECT version FROM runs WHERE id = ?'),
    // WOA-032: exactly one baseline=1 row per rules version. `version IS ?`
    // (not `=`) so a NULL-version run's baseline still clears correctly —
    // SQL `= NULL` never matches, `IS ?` does.
    clearBaseline: db.prepare('UPDATE runs SET baseline = 0 WHERE baseline = 1 AND version IS ?'),
    setBaselineFlag: db.prepare('UPDATE runs SET baseline = 1 WHERE id = ?'),
    // WOA-034: the header run-A/B pickers' listing — id DESC (most recent
    // first) so "no baseline pinned yet" falls back to runs[0] with no
    // extra query. Aliased to the camelCase shape the dashboard/GET /api/runs
    // hand across the wire, so the server stays a dumb pass-through.
    listRuns: db.prepare(
      'SELECT id, version, ts, kind, red_ai AS redAi, blue_ai AS blueAi, n, tool, notes,' +
      ' deck, mapset, seed_base AS seedBase, label, baseline FROM runs ORDER BY id DESC LIMIT ?'),
    // WOA-035: the Overview screen's battle fetch (GET /api/battles?run=<id>)
    // — every stored scalar column + the trace TEXT blob (parsed client-side
    // by WOA_REPORT.envelopeFromRow), camelCase like listRuns above so the
    // server stays a dumb pass-through.
    listBattles: db.prepare(
      'SELECT id, map, seed, first_player AS firstPlayer, winner, win_type AS winType, turns,' +
      ' fs_red AS fsRed, fs_blue AS fsBlue, first_blood AS firstBlood, lead_changes AS leadChanges,' +
      ' kill_tail AS killTail, zero_kill AS zeroKill, tiebreak, attacks, swaps, marches, deploys,' +
      ' res_end_red AS resEndRed, res_end_blue AS resEndBlue, trace,' +
      ' hexes_red AS hexesRed, hexes_blue AS hexesBlue' +
      ' FROM battles WHERE run_id = ? ORDER BY id'),
    insertBattle: db.prepare(
      'INSERT INTO battles (run_id, version, map, seed, first_player, winner, win_type, turns,' +
      ' fs_red, fs_blue, first_blood, lead_changes, kill_tail, zero_kill, tiebreak,' +
      ' attacks, swaps, marches, deploys, res_end_red, res_end_blue, trace, hexes_red, hexes_blue)' +
      ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'),
    insertCardPlay: db.prepare(
      'INSERT INTO card_plays (battle_id, side, card_id, mode, turn, seen, noop, won) VALUES (?,?,?,?,?,?,?,?)'),
    insertTimeline: db.prepare(
      'INSERT INTO timeline (battle_id, turn, fs_red, fs_blue) VALUES (?,?,?,?)')
  };
  return { db: db, file: file, stmts: stmts };
}

// One-transaction wrapper: COMMIT on success, ROLLBACK + rethrow on failure.
function txn(h, fn) {
  h.db.exec('BEGIN');
  try { var r = fn(); h.db.exec('COMMIT'); return r; }
  catch (e) { try { h.db.exec('ROLLBACK'); } catch (e2) {} throw e; }
}

// Pin runId as the baseline: clears every OTHER baseline=1 row sharing its
// version, then flags runId — all inside the caller's transaction, so a
// concurrent read never sees two baselines (or zero) for a version. Shared
// by insertRun(..., {baseline:true}) and the standalone setBaseline below.
function pinBaseline(h, version, runId) {
  h.stmts.clearBaseline.run(nz(version));
  h.stmts.setBaselineFlag.run(runId);
}

/* Record one run (a batch of battles from one tool invocation) — SPEC §7.
   r = { version, kind('balance'|'llm'|'human'|'watch'), redAi, blueAi, n,
         tool, notes?, ts? (ISO string; default now),
         deck?, mapset?, seedBase?, label?, baseline?(bool) }. Returns runId.
   baseline:true pins this run as ITS version's one baseline, atomically
   clearing any prior baseline for that version (SPEC §7: "pinning a new one
   clears the old") — never left half-done even if the insert or the clear
   fails partway (both run inside one transaction). */
function insertRun(h, r) {
  r = r || {};
  if (RUN_KINDS.indexOf(r.kind) < 0)
    throw new Error('insertRun: kind must be one of ' + RUN_KINDS.join('|') + ' (got "' + r.kind + '")');
  return txn(h, function () {
    var res = h.stmts.insertRun.run(
      nz(r.version), r.ts || new Date().toISOString(), r.kind,
      nz(r.redAi), nz(r.blueAi), nz(r.n), nz(r.tool), nz(r.notes),
      nz(r.deck), nz(r.mapset), nz(r.seedBase), nz(r.label), 0); // insert baseline=0; pin below
    var runId = Number(res.lastInsertRowid);
    if (r.baseline) pinBaseline(h, r.version, runId);
    return runId;
  });
}

/* Pin an EXISTING run as its version's baseline (e.g. promoting a run after
   the fact). Same atomic clear-then-set as insertRun's baseline:true —
   exposed standalone so callers never hand-roll the two UPDATEs themselves.
   Returns runId. Throws if runId doesn't exist. */
function setBaseline(h, runId) {
  var row = h.stmts.getRunVersion.get(runId);
  if (!row) throw new Error('setBaseline: no run with id ' + runId);
  return txn(h, function () { pinBaseline(h, row.version, runId); return runId; });
}

/* Fold one FINISHED battle state into the DB — the same extractions
   engine.js balanceAdd makes (engine.js:1243), kept at battle grain instead
   of summed away. Inserts the battles row + its card_plays (+ timeline rows
   when st.fsTimeline exists) in ONE transaction. Returns battleId.
     firstPlayer: 'red'|'blue' — who moved first (balanceFP schedule etc.)
     extra: { version?, seed? } — version falls back to st.version, then the
       run's version. seed falls back to st.seed, which by battle end is the
       EVOLVED rng state, not the starting seed — callers who know the
       original seed (simBattle callers do) should pass extra.seed. */
function insertBattle(h, runId, st, firstPlayer, extra) {
  extra = extra || {};
  if (!st || st.phase !== 'battle-over')
    throw new Error('insertBattle: st must be a finished battle (phase battle-over, got "' + (st && st.phase) + '")');
  var version = extra.version || st.version || null;
  if (version === null) {
    var row = h.stmts.getRunVersion.get(runId);
    version = row ? row.version : null;
  }
  var winner = st.battleWinner || null;
  var stats = st.stats || {};
  var fsr = E.fieldScore(st, 'red'), fsb = E.fieldScore(st, 'blue'); // VP of surviving units, same as balanceAdd
  var vp = st.vp || { red: 0, blue: 0 };
  var seed = extra.seed !== undefined ? extra.seed : nz(st.seed);
  // WOA-032 (SPEC §4): the trace envelope — st.playLog + st.unitMetrics
  // verbatim as the engine wrote them (WOA-031), not renamed to the spec
  // doc's shorthand keys ("store what the engine gives", feed-forward).
  // ~1.3 KB/battle (SPEC §4 cost estimate) — accepted.
  var trace = JSON.stringify({
    v: version, map: nz(st.mapName), seed: seed, fp: nz(firstPlayer),
    winner: winner, winType: nz(st.winType), turns: nz(st.turnNumber),
    trace: st.playLog || [], units: st.unitMetrics || {}
  });
  var hexes = hexesHeld(st); // WOA-038: hex-ownership tally at battle end (mirrors balanceAdd)
  return txn(h, function () {
    var res = h.stmts.insertBattle.run(
      runId, version, nz(st.mapName), seed,
      nz(firstPlayer), winner, nz(st.winType), nz(st.turnNumber),
      fsr, fsb, nz(stats.firstBlood),
      st.leadChanges || 0,
      Math.max(0, (st.turnNumber || 0) - (st.lastKillTurn || 0)),      // trailing kill-less turns
      (vp.red + vp.blue === 0) ? 1 : 0,                                // no unit ever died
      (st.winType === 'attrition' && fsr === fsb) ? 1 : 0,             // decided only by tie-goes-to-2nd
      stats.attacks || 0, stats.swaps || 0, stats.marches || 0, stats.deploys || 0,
      reservesLeft(st, 'red'), reservesLeft(st, 'blue'),  // WOA-016: pieces left in reserve at battle end
      trace, hexes.red, hexes.blue);
    var battleId = Number(res.lastInsertRowid);
    (st.playLog || []).forEach(function (e) {
      h.stmts.insertCardPlay.run(battleId, e.p, e.id, nz(e.mode), nz(e.turn),
        nz(e.seen), e.noop ? 1 : 0, e.p === winner ? 1 : 0);
    });
    // st.fsTimeline is an upcoming engine field ([fsRed, fsBlue] per turn,
    // index 0 = turn 1) — tolerate its absence silently.
    if (Array.isArray(st.fsTimeline)) {
      st.fsTimeline.forEach(function (pair, i) {
        if (Array.isArray(pair)) h.stmts.insertTimeline.run(battleId, i + 1, nz(pair[0]), nz(pair[1]));
      });
    }
    return battleId;
  });
}

/* List runs, most recent first (WOA-034: the dashboard header's run-A/B
   pickers, via GET /api/runs). limit defaults to 200 — plenty for a picker,
   cheap even on a DB with years of balance sweeps in it. */
function listRuns(h, limit) {
  return h.stmts.listRuns.all(limit || 200);
}

/* List every battle row for one run, in insertion order (WOA-035: the
   Overview screen's fetch, via GET /api/battles?run=<id>). trace comes back
   as the raw TEXT column — callers parse it (report-model.js's
   envelopeFromRow), the same "parse client-side" contract the spec asked for. */
function listBattles(h, runId) {
  return h.stmts.listBattles.all(runId);
}

function close(h) { h.db.close(); }

module.exports = {
  open: open, insertRun: insertRun, insertBattle: insertBattle, setBaseline: setBaseline,
  listRuns: listRuns, listBattles: listBattles, close: close, DEFAULT_DB: DEFAULT_DB
};
