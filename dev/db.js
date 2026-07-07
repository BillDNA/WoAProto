/* dev/db.js — SQLite persistence for per-battle data (V1 data persistence,
   dynamic-scrum/planning/specs/v1-data-persistence.md). Zero deps: uses Node's BUILT-IN
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
       redAi: 'hard', blueAi: 'hard', n: 60, tool: 'balance-report.js' });
     db.insertBattle(h, runId, st, firstPlayer); // + card_plays + timeline rows
     db.close(h);

   Query it with dev/db-query.js. The .db file is gitignored (regenerable);
   the markdown reports remain the committed human-readable record. */
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
  '  red_ai TEXT, blue_ai TEXT, n INTEGER, tool TEXT, notes TEXT',
  ');',
  'CREATE TABLE IF NOT EXISTS battles (',
  '  id INTEGER PRIMARY KEY, run_id INTEGER, version TEXT, map TEXT, seed INTEGER,',
  '  first_player TEXT, winner TEXT, win_type TEXT, turns INTEGER,',
  '  fs_red INTEGER, fs_blue INTEGER, first_blood TEXT, lead_changes INTEGER,',
  '  kill_tail INTEGER, zero_kill INTEGER, tiebreak INTEGER,',
  '  attacks INTEGER, swaps INTEGER, marches INTEGER, deploys INTEGER',
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

/* Open (creating if needed) the DB, ensure the schema, switch on WAL, and
   prepare every statement once. Returns the handle the other calls take. */
function open(dbPath) {
  var file = dbPath || DEFAULT_DB;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  var db = new sqlite.DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  var stmts = {
    insertRun: db.prepare(
      'INSERT INTO runs (version, ts, kind, red_ai, blue_ai, n, tool, notes) VALUES (?,?,?,?,?,?,?,?)'),
    getRunVersion: db.prepare('SELECT version FROM runs WHERE id = ?'),
    insertBattle: db.prepare(
      'INSERT INTO battles (run_id, version, map, seed, first_player, winner, win_type, turns,' +
      ' fs_red, fs_blue, first_blood, lead_changes, kill_tail, zero_kill, tiebreak,' +
      ' attacks, swaps, marches, deploys) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'),
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

/* Record one run (a batch of battles from one tool invocation).
   r = { version, kind('balance'|'llm'|'human'|'watch'), redAi, blueAi, n,
         tool, notes?, ts? (ISO string; default now) }. Returns runId. */
function insertRun(h, r) {
  r = r || {};
  if (RUN_KINDS.indexOf(r.kind) < 0)
    throw new Error('insertRun: kind must be one of ' + RUN_KINDS.join('|') + ' (got "' + r.kind + '")');
  var res = h.stmts.insertRun.run(
    nz(r.version), r.ts || new Date().toISOString(), r.kind,
    nz(r.redAi), nz(r.blueAi), nz(r.n), nz(r.tool), nz(r.notes));
  return Number(res.lastInsertRowid);
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
  return txn(h, function () {
    var res = h.stmts.insertBattle.run(
      runId, version, nz(st.mapName),
      extra.seed !== undefined ? extra.seed : nz(st.seed),
      nz(firstPlayer), winner, nz(st.winType), nz(st.turnNumber),
      fsr, fsb, nz(stats.firstBlood),
      st.leadChanges || 0,
      Math.max(0, (st.turnNumber || 0) - (st.lastKillTurn || 0)),      // trailing kill-less turns
      (vp.red + vp.blue === 0) ? 1 : 0,                                // no unit ever died
      (st.winType === 'attrition' && fsr === fsb) ? 1 : 0,             // decided only by tie-goes-to-2nd
      stats.attacks || 0, stats.swaps || 0, stats.marches || 0, stats.deploys || 0);
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

function close(h) { h.db.close(); }

module.exports = { open: open, insertRun: insertRun, insertBattle: insertBattle, close: close, DEFAULT_DB: DEFAULT_DB };
