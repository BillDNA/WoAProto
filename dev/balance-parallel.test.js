#!/usr/bin/env node
/* Real-path gate for the balance-report --parallel worker pipe.
   The seam: each worker process serializes {agg, skirmishes:[{g, st: slimSkirmishState}]}
   to stdout, the parent JSON.parses it and calls insertSkirmish. slimSkirmishState's
   round-trip is pinned in db.test.js, but the WORKER STRING + the parent's parse/insert
   loop are only exercised by a real --parallel run. Drive it as a real subprocess with
   persistence pointed at a throwaway db (WOA_DB_PATH), and assert real rows land.

   --stdout --once returns before writing any logs/reports file, so this pollutes nothing. */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const db = require(path.join(__dirname, 'db.js'));
const sweep = require(path.join(__dirname, 'sweep.js'));

// the fact columns a byte-identical skirmish row must match — everything the
// report/DB read except the autoincrement id (which we compare via ORDER BY id).
const ROW_COLS = 'map,seed,first_player,winner,win_type,turns,fs_red,fs_blue,' +
  'first_blood,lead_changes,kill_tail,zero_kill,tiebreak,attacks,swaps,marches,' +
  'deploys,res_end_red,res_end_blue,trace,hexes_red,hexes_blue';
function skirmishRows(dbFile) {
  const h = db.open(dbFile);
  try { return h.db.prepare('SELECT ' + ROW_COLS + ' FROM skirmishes ORDER BY id').all(); }
  finally { db.close(h); }
}

test('--parallel worker slim-state -> parent -> db (C1)', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-par-'));
  const dbFile = path.join(dir, 'par.db');
  try {
    // One map (Causeway), 4 skirmishes, one worker process. --stdout --once: no file
    // writes; persistence goes to the temp db via WOA_DB_PATH.
    const out = cp.execFileSync(process.execPath,
      ['dev/balance-report.js', '--stdout', '--once', '--parallel', '1', '--mapset', 'all', '4', 'Causeway'],
      { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { WOA_DB_PATH: dbFile }) });
    assert.ok(out.indexOf('Causeway') >= 0, 'the run rendered a report to stdout for the filtered map');

    const h = db.open(dbFile);
    try {
      const runs = h.db.prepare('SELECT COUNT(*) c FROM runs').get().c;
      assert.ok(runs >= 1, 'the parent inserted a run row (' + runs + ')');
      const grp = h.db.prepare('SELECT map, COUNT(*) c FROM skirmishes GROUP BY map').all();
      assert.ok(grp.length === 1 && grp[0].map === 'Causeway' && grp[0].c > 0,
        'worker-produced skirmishes for Causeway landed as real rows via the parent insert loop (' +
        (grp[0] ? grp[0].map + ':' + grp[0].c : 'none') + ')');
      // The rows came through the slim-state pipe: they must still carry the trace
      // envelope + per-turn timeline, proving the worker serialized the full payload.
      const anyId = h.db.prepare('SELECT id, trace FROM skirmishes LIMIT 1').get();
      assert.ok(anyId && typeof anyId.trace === 'string' && JSON.parse(anyId.trace).map === 'Causeway',
        'a worker-piped row carries a parseable trace envelope (payload survived the stdout pipe)');
      const tl = h.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(anyId.id).c;
      assert.ok(tl > 0, 'the worker-piped row also landed its per-turn timeline (' + tl + ' rows)');
    } finally { db.close(h); }
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
});

test('planBatches slices each map, covers every game, fans a single map across workers', function () {
  // one map, high N, 8 workers -> many batches (not 1), so a lone map saturates the pool.
  const b = sweep.planBatches(1, 600, 8);
  assert.ok(b.length >= 8, 'a single high-N map fans into >= workers batches (' + b.length + ')');
  assert.ok(b.every(function (x) { return x.mapIndex === 0; }), 'all batches belong to the one map');
  assert.strictEqual(b.reduce(function (s, x) { return s + x.gLen; }, 0), 600, 'batches cover exactly N games');
  // contiguous, gap-free, non-overlapping ranges from 0
  let g = 0; b.forEach(function (x) { assert.strictEqual(x.gStart, g, 'contiguous ranges'); g += x.gLen; });

  // a tiny N stays one batch per map (no fragmentation -> byte-identical, no spawn tax).
  const t = sweep.planBatches(1, 4, 8);
  assert.strictEqual(t.length, 1, 'N below the min batch size is a single batch');
  assert.deepStrictEqual(t[0], { mapIndex: 0, gStart: 0, gLen: 4 });

  // many maps: every map still gets covered exactly.
  const m = sweep.planBatches(6, 100, 10);
  for (let mi = 0; mi < 6; mi++) {
    const mine = m.filter(function (x) { return x.mapIndex === mi; });
    assert.strictEqual(mine.reduce(function (s, x) { return s + x.gLen; }, 0), 100, 'map ' + mi + ' covers N');
  }
});

test('sub-map parallel DB rows are byte-identical to the serial run on the same seeds (C1)', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-submap-'));
  const serialDb = path.join(dir, 'serial.db'), parDb = path.join(dir, 'par.db');
  // one map, N large enough that --parallel fans it into MULTIPLE game-batches
  // (planBatches(1,16,4) -> 2), so this drives the sub-map path, not process-per-map.
  // `easy` keeps the real AI-vs-AI sim quick; the identity holds on any AI.
  const args = ['--stdout', '--once', '--mapset', 'all', '16', 'easy', 'Causeway'];
  const runIt = function (dbFile, extra) {
    cp.execFileSync(process.execPath, ['dev/balance-report.js'].concat(extra, args),
      { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { WOA_DB_PATH: dbFile }) });
  };
  try {
    runIt(serialDb, []);               // default serial path
    runIt(parDb, ['--parallel', '4']); // sub-map fan-out, 4 workers over 2 batches
    const s = skirmishRows(serialDb), p = skirmishRows(parDb);
    assert.ok(s.length === 16 && p.length === 16, 'both runs persisted all 16 skirmishes (' + s.length + '/' + p.length + ')');
    assert.deepStrictEqual(p, s, 'parallel skirmish rows (ordered by id) are byte-identical to serial');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
});

test('multi-map parallel keeps rows in serial (map, g) order — the in-order flush (C1)', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-multimap-'));
  const serialDb = path.join(dir, 'serial.db'), parDb = path.join(dir, 'par.db');
  // The full active pool (>1 map): with maps finishing out of order, the parent's
  // streaming flush must still insert map-by-map in index order, so even the
  // cross-map autoincrement ids line up with serial.
  const args = ['--stdout', '--once', '8', 'easy'];
  const runIt = function (dbFile, extra) {
    cp.execFileSync(process.execPath, ['dev/balance-report.js'].concat(extra, args),
      { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { WOA_DB_PATH: dbFile }) });
  };
  try {
    runIt(serialDb, []);
    runIt(parDb, ['--parallel', '6']);
    const s = skirmishRows(serialDb), p = skirmishRows(parDb);
    const mapCount = new Set(s.map(function (r) { return r.map; })).size;
    assert.ok(mapCount > 1, 'the run actually spanned multiple maps (' + mapCount + ')');
    assert.deepStrictEqual(p, s, 'multi-map parallel rows (ordered by id) are byte-identical to serial');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
});

// The balance loop grows the LLN pool by running the sweep parallel BY DEFAULT:
// no --parallel flag must still spawn workers, and its output must stay byte-identical
// to a forced --serial run on the same seeds — report AND db.
test('parallel is the default; --serial matches it byte-for-byte (C1)', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-def-'));
  const parDb = path.join(dir, 'par.db'), serDb = path.join(dir, 'ser.db');
  const SKCOLS = 'version,config_digest,map,seed,first_player,winner,win_type,turns,' +
    'fs_red,fs_blue,first_blood,lead_changes,attacks,swaps,marches,deploys,res_end_red,res_end_blue,trace';
  function sweep(dbFile, extraArgs) {
    // spawnSync captures stdout AND stderr — stderr carries the worker banner, stdout the report.
    const r = cp.spawnSync(process.execPath,
      ['dev/balance-report.js', '--stdout', '--once', '--mapset', 'all', '2'].concat(extraArgs),
      { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { WOA_DB_PATH: dbFile }) });
    assert.strictEqual(r.status, 0, 'sweep exited clean (' + (r.stderr || '').trim() + ')');
    return r;
  }
  function skirmishRows(dbFile) {
    const h = db.open(dbFile);
    try { return JSON.stringify(h.db.prepare('SELECT ' + SKCOLS + ' FROM skirmishes ORDER BY map,seed').all()); }
    finally { db.close(h); }
  }
  try {
    const par = sweep(parDb, []);           // default: parallel, no flag
    const ser = sweep(serDb, ['--serial']); // forced in-process
    assert.match(par.stderr, /\(\d+ workers?\)/, 'the no-flag run announced parallel workers (' + par.stderr.trim() + ')');
    assert.doesNotMatch(ser.stderr, /workers?\)/, '--serial ran in-process, no worker banner (' + ser.stderr.trim() + ')');
    // --stdout returns before the Date-stamped filename block, so the report is pure
    // aggregate — deterministic, hence safe to compare byte-for-byte.
    assert.strictEqual(par.stdout, ser.stdout, 'default-parallel and --serial produced byte-identical reports');
    assert.strictEqual(skirmishRows(parDb), skirmishRows(serDb),
      'default-parallel and --serial wrote byte-identical per-skirmish db rows');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
});

// INTEGRATION — the parallel-by-default × sub-map fan-out seam that neither half
// exercises alone: a LONE map must fan across MORE workers than maps,
// via (map, game-batch) batches, and the banner must report the workers that
// actually run. Guards against re-introducing a `Math.min(workers, maps.length)`
// worker cap — that clamp would silently pin a single-map sweep to one worker
// (back to process-per-map), killing sub-map throughput with every other test green.
test('a single map fans across more workers than maps — sub-map, not process-per-map (C1)', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-fanout-'));
  try {
    // 32 games on ONE map, 4 explicit workers: planBatches(1,32,4) -> 4 batches, so
    // the pool runs 4 workers on a single map. `easy` keeps the real AI sim quick.
    const r = cp.spawnSync(process.execPath,
      ['dev/balance-report.js', '--stdout', '--once', '--parallel', '4', '--mapset', 'all', '32', 'easy', 'Causeway'],
      { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { WOA_DB_PATH: path.join(dir, 'fan.db') }) });
    assert.strictEqual(r.status, 0, 'the single-map fan-out run exited clean (' + (r.stderr || '').trim() + ')');
    const m = /\((\d+) workers?\)/.exec(r.stderr);
    assert.ok(m, 'the banner announced a worker count (' + r.stderr.trim() + ')');
    assert.ok(+m[1] > 1, 'one map ran on ' + (m && m[1]) + ' workers — sub-map fan-out, not capped at map count (a process-per-map clamp would report 1)');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
});

// dev/balance.js (the balance-lab CLI, the run-tournament sweep path) fans its map
// sweep across the SAME dev/sweep.js pool. Pin that its default parallel run is
// byte-identical to --serial — DB skirmish rows match row-for-row on the same seeds —
// so the run-tournament speedup (the sub-map fan-out wired into balance.js) can't regress.
test('balance.js mapReport: default parallel DB rows == --serial, byte-for-byte (C1)', function () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-lab-'));
  const serDb = path.join(dir, 'ser.db'), parDb = path.join(dir, 'par.db');
  const runIt = function (dbFile, extra) {
    cp.execFileSync(process.execPath,
      ['dev/balance.js', '20', 'easy', 'Causeway', '--mapset', 'all'].concat(extra),
      { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { WOA_DB_PATH: dbFile }) });
  };
  try {
    runIt(serDb, ['--serial']);
    runIt(parDb, ['--parallel', '4']);   // fan the single map across workers (sub-map)
    const s = skirmishRows(serDb), p = skirmishRows(parDb);
    assert.ok(s.length === 20 && p.length === 20, 'both runs persisted all 20 skirmishes (' + s.length + '/' + p.length + ')');
    assert.deepStrictEqual(p, s, 'balance.js parallel rows (ordered by id) are byte-identical to --serial');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
});
