/* dev/runloop.test.js — the transport-bearing server-integration falsifiers for
 * #168 (ADR-0004 §2). Each drives the REAL product route (POST /api/runloop, GET
 * /api/runloop, POST /api/runloopctl) against the faithful deterministic stand-in
 * (dev/fixtures/fake-loop-session.js), which speaks the REAL transport: it writes
 * dev/run-record.js records to --rec-dir, the same file the server tails.
 *
 * Run:  node --test dev/runloop.test.js
 *
 * Hermetic: every run uses a fresh temp --rec-dir under os.tmpdir(), an isolated
 * temp db, and is always SIGTERM/stopped + torn down in a finally.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GAME = path.join(__dirname, '..', 'game');
const SERVER = require(path.join(GAME, 'server.js'));
const STANDIN = path.join(__dirname, 'fixtures', 'fake-loop-session.js');

// ---- tiny JSON client over the exported handler --------------------------------
function listen() {
  return new Promise(function (resolve) {
    var srv = http.createServer(SERVER.handler).listen(0, function () { resolve(srv); });
  });
}
function req(srv, method, pathName, body) {
  return new Promise(function (resolve, reject) {
    var data = body != null ? JSON.stringify(body) : null;
    var r = http.request({ host: '127.0.0.1', port: srv.address().port, path: pathName, method: method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      function (resp) {
        var chunks = []; resp.on('data', function (d) { chunks.push(d); });
        resp.on('end', function () {
          var text = Buffer.concat(chunks).toString('utf8');
          var json = null; try { json = text ? JSON.parse(text) : null; } catch (e) {}
          resolve({ status: resp.statusCode, json: json });
        });
      });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
var GET = function (srv) { return req(srv, 'GET', '/api/runloop'); };
var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

// The set of stage names visible in a GET /api/runloop record, in first-seen
// order (the live in-flight stage plus every recorded per-iteration stage).
function stagesSeen(rec) {
  var out = [];
  function push(n) { if (n && out.indexOf(n) < 0) out.push(n); }
  (rec && rec.iterations || []).forEach(function (it) { (it.stages || []).forEach(push); });
  if (rec && rec.stage && rec.stage.name) push(rec.stage.name);
  return out;
}
function maxIter(rec) {
  var m = 0;
  (rec && rec.iterations || []).forEach(function (it) { if (it.iter > m) m = it.iter; });
  if (rec && rec.stage && rec.stage.iter > m) m = rec.stage.iter;
  return m;
}
function tmpRecDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'woa-runloop-')); }
function tmpDb() { return path.join(os.tmpdir(), 'woa-runloop-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.db'); }

// A base cfg carrying the stand-in levers AND tiny deck-loop levers, so at the base
// commit (which ignores cfg.entry and spawns dev/loop.js) the fallback run stays a
// small, db-isolated deck loop we can stop — the assertions still red because the
// deck loop writes no author->grade->balance run record to recDir.
function cfg(recDir, extra) {
  return Object.assign({ entry: STANDIN, recDir: recDir, db: tmpDb(), n: 2, maps: 1 }, extra || {});
}
async function stopAndClean(srv, recDir) {
  try { await req(srv, 'POST', '/api/runloopctl', { action: 'stop' }); } catch (e) {}
  await sleep(60);
  try { await new Promise(function (r) { srv.close(r); }); } catch (e) {}
  try { fs.rmSync(recDir, { recursive: true, force: true }); } catch (e) {}
}

// AC3 — progress reaches the status surface AS IT ADVANCES (the transport carries
// the run's bytes, not merely a surface that exists).
test('#168 AC3: GET /api/runloop reflects the stand-in stages author->grade->balance as they advance', { timeout: 20000 }, async () => {
  var srv = await listen();
  var recDir = tmpRecDir();
  try {
    var launch = await req(srv, 'POST', '/api/runloop', cfg(recDir, { stop: '+4s', iterMs: '40', iters: '4' }));
    assert.ok(launch.status >= 200 && launch.status < 300, 'POST /api/runloop accepted the launch (status ' + launch.status + ')');
    var seen = [];
    for (var i = 0; i < 120; i++) {
      var rec = (await GET(srv)).json;
      seen = stagesSeen(rec);
      if (seen.indexOf('author') >= 0 && seen.indexOf('grade') >= 0 && seen.indexOf('balance') >= 0) break;
      await sleep(40);
    }
    var ai = seen.indexOf('author'), gi = seen.indexOf('grade'), bi = seen.indexOf('balance');
    assert.ok(ai >= 0 && gi >= 0 && bi >= 0,
      'the status surface carries the stand-in stages author/grade/balance (saw: [' + seen.join(', ') + '])');
    assert.ok(ai < gi && gi < bi, 'the stages appear in order author -> grade -> balance (saw: [' + seen.join(', ') + '])');
  } finally {
    await stopAndClean(srv, recDir);
  }
});

// AC5 — /api/runloopctl pause/stop/resume drive the real run-state (running ->
// paused -> running -> stopped), read back from GET, not a canned 200.
test('#168 AC5: runloopctl pause/resume/stop drive the file-tailed run-state', { timeout: 20000 }, async () => {
  var srv = await listen();
  var recDir = tmpRecDir();
  try {
    await req(srv, 'POST', '/api/runloop', cfg(recDir, { stop: '+30s', iterMs: '80' }));
    // Precondition: a RUNNING run WITH stand-in iterations (proves it's the stand-in,
    // over the real transport — not the base deck-loop fold with no run record).
    var rec = null, running = false;
    for (var i = 0; i < 120; i++) {
      rec = (await GET(srv)).json;
      if (rec && rec.state === 'running' && (rec.iterations || []).length >= 1) { running = true; break; }
      await sleep(50);
    }
    assert.ok(running, 'GET shows a RUNNING run carrying stand-in iterations (state=' + (rec && rec.state) + ', iters=' + (rec && (rec.iterations || []).length) + ')');

    await req(srv, 'POST', '/api/runloopctl', { action: 'pause' });
    var paused = false;
    for (var p = 0; p < 40; p++) { rec = (await GET(srv)).json; if (rec && rec.state === 'paused') { paused = true; break; } await sleep(50); }
    assert.ok(paused, 'after pause GET run-state is "paused" (got ' + (rec && rec.state) + ')');

    await req(srv, 'POST', '/api/runloopctl', { action: 'resume' });
    var resumed = false;
    for (var r = 0; r < 40; r++) { rec = (await GET(srv)).json; if (rec && rec.state === 'running') { resumed = true; break; } await sleep(50); }
    assert.ok(resumed, 'after resume GET run-state is "running" again (got ' + (rec && rec.state) + ')');

    await req(srv, 'POST', '/api/runloopctl', { action: 'stop' });
    var stopped = false;
    for (var s = 0; s < 40; s++) { rec = (await GET(srv)).json; if (rec && rec.state === 'stopped') { stopped = true; break; } await sleep(50); }
    assert.ok(stopped, 'after stop GET run-state is "stopped" (got ' + (rec && rec.state) + ')');
  } finally {
    await stopAndClean(srv, recDir);
  }
});

// AC8 — graceful pause: resume continues the SAME session (the iteration counter
// only ever advances, never resets to 1 — a fresh process would restart at 1).
test('#168 AC8: pause mid-run then resume continues the same session (iteration counter never resets)', { timeout: 25000 }, async () => {
  var srv = await listen();
  var recDir = tmpRecDir();
  try {
    await req(srv, 'POST', '/api/runloop', cfg(recDir, { stop: '+30s', iterMs: '70' }));
    // Run until at least the 2nd iteration, so pause lands mid-run, not at iter 1.
    var rec = null, atIter = 0;
    for (var i = 0; i < 200; i++) {
      rec = (await GET(srv)).json;
      atIter = maxIter(rec);
      if (rec && rec.state === 'running' && atIter >= 2) break;
      await sleep(40);
    }
    assert.ok(atIter >= 2, 'the stand-in reached iteration >= 2 before pause (got ' + atIter + ', state ' + (rec && rec.state) + ')');

    await req(srv, 'POST', '/api/runloopctl', { action: 'pause' });
    await sleep(150);
    var pausedIter = maxIter((await GET(srv)).json);
    assert.ok(pausedIter >= atIter, 'the iteration counter did not go backwards at pause (' + pausedIter + ' >= ' + atIter + ')');

    await req(srv, 'POST', '/api/runloopctl', { action: 'resume' });
    // After resume the SAME run must keep advancing from where it paused, never reset to 1.
    var minAfter = Infinity, advanced = false, last = pausedIter;
    for (var r = 0; r < 200; r++) {
      rec = (await GET(srv)).json;
      var m = maxIter(rec);
      if (m > 0) minAfter = Math.min(minAfter, m);
      if (m > pausedIter) advanced = true;
      last = m;
      if (advanced || (rec && (rec.state === 'done' || rec.state === 'stopped'))) break;
      await sleep(40);
    }
    assert.ok(minAfter >= pausedIter, 'resume never reset the iteration counter to a lower value (min after resume ' + minAfter + ' >= paused ' + pausedIter + ')');
    assert.ok(advanced || (rec && rec.state === 'done'),
      'the SAME run kept advancing after resume (paused at ' + pausedIter + ', later ' + last + ', state ' + (rec && rec.state) + ')');
  } finally {
    await stopAndClean(srv, recDir);
  }
});
