#!/usr/bin/env node
/* dev/runloop.smoke.js — the committed LIVE smoke for the #168 launch bridge (ADR-0004 §1).
 *
 * The run-once proof that the faithful stand-in (dev/fixtures/fake-loop-session.js) is not a
 * divergent fake: this spawns the REAL content loop (dev/content-loop.js) through the REAL
 * product path — POST /api/runloop -> startLoop -> its own worktree/branch -> the file-tail
 * transport GET /api/runloop reads — run for real (offline mock brains, so no network/CLI),
 * and asserts a genuine iteration lands (author -> grade -> balance -> feels -> commit) on the
 * SAME run-record surface the dashboard polls. Both halves — stand-in and real loop — write
 * the same transport, which is the whole point of the foundation.
 *
 * Run:  node dev/runloop.smoke.js     (paste the PROOF block on the PR)
 * It is NOT part of the *.test.js gate — it makes a real worktree + commit and is a manual /
 * PR-time proof, cleaned up on the way out.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const GAME = path.join(__dirname, '..', 'game');
const REPO = path.join(__dirname, '..');
const SERVER = require(path.join(GAME, 'server.js'));

function req(srv, method, pathName, body) {
  return new Promise(function (resolve, reject) {
    const data = body != null ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port: srv.address().port, path: pathName, method: method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      function (resp) {
        const chunks = []; resp.on('data', function (d) { chunks.push(d); });
        resp.on('end', function () {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) {}
          resolve({ status: resp.statusCode, json: json });
        });
      });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

function fail(msg) { console.error('\n✖ LIVE SMOKE FAILED: ' + msg + '\n'); process.exit(1); }

(async function () {
  const recDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-runloop-smoke-'));
  const tmpDb = path.join(os.tmpdir(), 'woa-runloop-smoke-' + process.pid + '.db');
  const srv = await new Promise(function (resolve) {
    const s = http.createServer(SERVER.handler).listen(0, function () { resolve(s); });
  });
  let runId = null;
  function teardown() {
    try { srv.close(); } catch (e) {}
    if (runId) {
      try { cp.execFileSync('git', ['worktree', 'remove', '--force', path.join(REPO, '.claude', 'worktrees', runId)], { cwd: REPO, stdio: 'pipe' }); } catch (e) {}
      try { cp.execFileSync('git', ['branch', '-D', runId], { cwd: REPO, stdio: 'pipe' }); } catch (e) {}
    }
    try { fs.rmSync(recDir, { recursive: true, force: true }); } catch (e) {}
    try { fs.unlinkSync(tmpDb); } catch (e) {}
  }

  try {
    console.log('== #168 live smoke: real content loop through POST /api/runloop ==');
    // Real loop, offline brains, tiny + bounded so one iteration lands fast; its OWN worktree.
    // `profile` is the EDITED Tolerance OBJECT the browser Plan actually sends (not a bare key
    // string) — so the run-once proof exercises the real config shape end to end.
    const launch = await req(srv, 'POST', '/api/runloop', {
      nudge: 'live smoke', temperature: 'standard',
      profile: { name: 'Card', tolerances: { hq: 'nudge', drag: 'nudge' } }, stop: '+3m',
      iters: 1, n: 2, maps: 1, feelsMatch: 1, feelsTurns: 4, mock: true, headless: true,
      recDir: recDir, db: tmpDb, feedFile: path.join(recDir, 'authored.json')
    });
    if (!(launch.status >= 200 && launch.status < 300)) fail('POST /api/runloop status ' + launch.status);
    runId = launch.json && launch.json.runId;
    console.log('  launched ' + runId + ' (own worktree/branch, main untouched)');
    if (!/^content-run-/.test(String(runId))) fail('launch did not return a content-run id (got ' + runId + ')');

    let rec = null, waited = 0;
    while (waited < 180000) {
      rec = (await req(srv, 'GET', '/api/runloop')).json;
      const st = rec && rec.state;
      const it = rec && (rec.iterations || [])[0];
      process.stdout.write('\r  state=' + st + '  iter1 stages=[' + ((it && it.stages) || []).join(',') + ']            ');
      if (st === 'done' || st === 'stopped') break;
      await sleep(500); waited += 500;
    }
    process.stdout.write('\n');

    const it = rec && (rec.iterations || [])[0];
    if (!rec || rec.state !== 'done') fail('the run never reached state:done (last state ' + (rec && rec.state) + ')');
    if (!it) fail('the run record carries no iteration 1');
    const stages = it.stages || [];
    ['author', 'grade', 'balance', 'feels', 'commit'].forEach(function (s) {
      if (stages.indexOf(s) < 0) fail('iteration 1 missing stage "' + s + '" (saw [' + stages.join(',') + '])');
    });
    if (!(it.authored && it.authored.length >= 1)) fail('iteration 1 authored no card');

    console.log('\n════════════════ #168 LIVE SMOKE — PROOF ════════════════');
    console.log('real content loop (dev/content-loop.js) spawned via POST /api/runloop,');
    console.log('status file-tailed off the run-record via GET /api/runloop:');
    console.log('  runId:   ' + runId);
    console.log('  state:   ' + rec.state);
    console.log('  iter 1 stages: ' + stages.join(' -> '));
    console.log('  authored:      ' + it.authored.map(function (a) { return a.action + ' ' + a.id; }).join(', '));
    console.log('  commit:        ' + (it.commit || '(no content change this iter)'));
    console.log('══════════════════════════════════════════════════════════');
    console.log('\n✔ LIVE SMOKE PASSED — the stand-in speaks the same real transport.');
    teardown();
    process.exit(0);
  } catch (e) {
    teardown();
    fail(e && e.stack || String(e));
  }
})();
