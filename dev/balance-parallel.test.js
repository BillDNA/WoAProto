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
