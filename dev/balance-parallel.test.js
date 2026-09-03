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
    assert.strictEqual(par.stdout, ser.stdout, 'default-parallel and --serial produced byte-identical reports');
    assert.strictEqual(skirmishRows(parDb), skirmishRows(serDb),
      'default-parallel and --serial wrote byte-identical per-skirmish db rows');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
});
