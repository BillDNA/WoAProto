#!/usr/bin/env node
/* Real-path server hand-off gate. Drives the ACTUAL game/server.js
   over REAL HTTP on an ephemeral port — nothing mocked — so every producer->consumer
   boundary on the /api/* surface is exercised with real data, not a described shape.
   Persistence targets a throwaway db via WOA_DB_PATH; LAN rooms are in-memory.

   Seams covered here (see docs/reference/testing-seams.md for the full inventory):
   - A1/A2 finished skirmish -> POST /api/recordskirmish -> dev/db.js -> a real row
   - B1/B2/B3 db rows -> GET /api/runs + /api/skirmishes (with the timeline join) ->
     fed straight into report-model.envelopeFromRow (closes the fixture-vs-reality gap)
   - D1/D2/D3 LAN create/join/push/poll + the optimistic-concurrency seq machine
   - A6/A7 the savereport/savedebug path-injection fences (reject side, no writes)

   Run: WOA_DB_PATH set automatically below; `node --test dev/server.test.js` or npm test. */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Point persistence at a throwaway db BEFORE requiring the server (db.js reads
// WOA_DB_PATH at load). Never touches the repo's logs/woa.db.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-srv-'));
process.env.WOA_DB_PATH = path.join(tmpDir, 'srv.db');

const server = require(path.join(__dirname, '..', 'game', 'server.js'));
const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
const SIM = require(path.join(__dirname, '..', 'game', 'sim.js')); // the batch/measurement layer, outside the engine
const R = require(path.join(__dirname, '..', 'game', 'report-model.js'));

let srv, port;
before(function () {
  return new Promise(function (resolve) {
    srv = server.listen(0, function () { port = srv.address().port; resolve(); });
  });
});
after(function () {
  try { srv.close(); } catch (e) {}
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
});

function req(method, pathname, body) {
  return new Promise(function (resolve, reject) {
    const data = body != null ? JSON.stringify(body) : null;
    const r = http.request({
      host: '127.0.0.1', port: port, path: pathname, method: method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
    }, function (res) {
      let b = ''; res.on('data', function (c) { b += c; });
      res.on('end', function () { let j = null; try { j = JSON.parse(b); } catch (e) {} resolve({ status: res.statusCode, body: b, json: j }); });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

// Thread ids across the ordered tests below.
var runId, skirmishId, finishedState;

test('recordskirmish persists a real finished skirmish (A1)', async function () {
  finishedState = SIM.simSkirmish(E.MAPS[0], 20250901, 'red', 'normal', 'normal');
  assert.strictEqual(finishedState.flow.phase, 'skirmish-over', 'the sim produced a finished state to hand off');
  const r = await req('POST', '/api/recordskirmish', {
    run: { version: E.VERSION, kind: 'balance', redAi: 'normal', blueAi: 'normal', n: 1, tool: 'server.test.js', battalion: 'default', mapset: 'core7', seedBase: 20250901 },
    state: finishedState, firstPlayer: 'red', seed: 20250901
  });
  assert.strictEqual(r.status, 200, 'recordskirmish accepts a finished state (got ' + r.status + ' ' + r.body + ')');
  assert.ok(Number.isInteger(r.json.runId) && Number.isInteger(r.json.skirmishId),
    'the real POST returns db ids (runId/skirmishId) — the hand-off reached dev/db.js');
  runId = r.json.runId; skirmishId = r.json.skirmishId;
});

test('recordskirmish rejects unfinished / malformed hand-offs (A1 guards)', async function () {
  const unfinished = await req('POST', '/api/recordskirmish', { run: { version: E.VERSION, kind: 'balance' }, state: { phase: 'choose-card' }, firstPlayer: 'red' });
  assert.strictEqual(unfinished.status, 400, 'an unfinished state is refused (not silently persisted)');
  const noRun = await req('POST', '/api/recordskirmish', { state: finishedState, firstPlayer: 'red' });
  assert.strictEqual(noRun.status, 400, 'a body with no run info is refused');
});

test('db rows read back through the real routes and parse via envelopeFromRow (B1/B2/B3)', async function () {
  const runs = await req('GET', '/api/runs');
  assert.strictEqual(runs.status, 200, '/api/runs answers');
  const mine = runs.json.filter(function (x) { return x.id === runId; })[0];
  assert.ok(mine && mine.redAi === 'normal' && mine.mapset === 'core7' && mine.battalionRed === 'default',
    'the run round-trips through GET /api/runs with its stamped identity (battalion/mapset/redAi)');

  const sk = await req('GET', '/api/skirmishes?run=' + runId);
  assert.strictEqual(sk.status, 200, '/api/skirmishes answers');
  assert.strictEqual(sk.json.length, 1, 'exactly the one skirmish for this run comes back (' + sk.json.length + ')');
  const row = sk.json[0];
  assert.strictEqual(row.winner, finishedState.result.skirmishWinner, 'the row winner matches the finished state handed off');
  assert.ok(typeof row.trace === 'string', 'trace crosses as a JSON string (parsed client-side)');
  assert.ok(Array.isArray(row.fs) && row.fs.length > 0, 'the server timeline join attached a per-turn fs track (B2)');

  // The real row (not a hand-built fixture) must parse through the consumer the
  // dashboard uses — this is the fixture-vs-reality gap the inventory flagged.
  const env = R.envelopeFromRow(row);
  assert.ok(env && env.map === E.MAPS[0].name && env.winner === finishedState.result.skirmishWinner,
    'envelopeFromRow turns the REAL db row into an envelope (map/winner intact)');
});

test('a different run id returns its own slice, never a cross-run leak', async function () {
  const other = await req('GET', '/api/skirmishes?run=' + (runId + 999));
  assert.strictEqual(other.status, 200);
  assert.strictEqual(other.json.length, 0, 'an unknown run id yields an empty slice');
});

test('LAN room sync: create/join/push/poll + the seq-conflict machine (D1/D2/D3)', async function () {
  const st = { phase: 'choose-card', tag: 'lan-seam', battle: { maps: [E.MAPS[0]] } };
  const created = await req('POST', '/api/create', { state: st });
  assert.strictEqual(created.status, 200, 'host creates a room');
  const room = created.json.room;
  assert.ok(/^[A-Z]{4}$/.test(room) && created.json.seq === 1, 'room code + seq 1 returned');

  const joined = await req('POST', '/api/join', { room: room });
  assert.strictEqual(joined.status, 200, 'joiner fetches the room');
  assert.strictEqual(joined.json.state.tag, 'lan-seam', 'the joiner receives the host state verbatim (whole-state JSON hand-off)');

  const bad = await req('POST', '/api/join', { room: 'ZZZZ' });
  assert.strictEqual(bad.status, 404, 'joining an unknown room 404s');

  const push2 = await req('POST', '/api/push', { room: room, seq: 2, state: { phase: 'choose-card', tag: 'turn2', battle: st.battle } });
  assert.ok(push2.json.ok && push2.json.seq === 2, 'an in-order push (seq+1) is accepted');
  const stale = await req('POST', '/api/push', { room: room, seq: 2, state: { tag: 'stale' } });
  assert.ok(stale.json.conflict === true && stale.json.seq === 2 && stale.json.state.tag === 'turn2',
    'a stale seq is rejected as a conflict and hands back the authoritative state (optimistic-concurrency seam)');

  const poll = await req('GET', '/api/poll?room=' + room + '&seq=1');
  assert.strictEqual(poll.status, 200, 'poll returns the newer state');
  assert.strictEqual(poll.json.state.tag, 'turn2', 'the poller sees the latest pushed state');
});

test('save routes reject path-injection filenames (A6/A7 fences)', async function () {
  const badVer = await req('POST', '/api/savereport', { filename: 'r.md', content: 'x', version: '../../etc' });
  assert.strictEqual(badVer.status, 400, 'a version with path separators is rejected before any write');
  const badName = await req('POST', '/api/savereport', { filename: '../escape.md', content: 'x', version: '1.2' });
  assert.strictEqual(badName.status, 400, 'a report filename that escapes the dir is rejected');
  const badExt = await req('POST', '/api/savedebug', { filename: 'evil.sh', content: 'x' });
  assert.strictEqual(badExt.status, 400, 'a debug filename outside the *.json whitelist is rejected');
});
