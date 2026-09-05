#!/usr/bin/env node
/* dev/db-query.test.js — the litmus SELECT, driven through the real db-query.js
   CLI over a seeded star-schema DB. Zero deps; temp DB under os.tmpdir().
   Run: node dev/db-query.test.js (or via `npm test`).

   The litmus: "card X play-timing vs a map's mountain-hex count" is a plain
   3-table join (card_events x cards x maps) — no reach into the JS content. */
'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const db = require(path.join(__dirname, 'db.js'));
const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
const SIM = require(path.join(__dirname, '..', 'game', 'sim.js'));
const CLI = path.join(__dirname, 'db-query.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-dbq-test-'));
const dbFile = path.join(tmpDir, 'seed.db');
after(function () { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {} });

// Seed the DB via the real ingest: one run (upserts the dimensions) + a real
// finished skirmish on MAPS[0] (writes skirmishes + card_events + timeline).
function seed() {
  const h = db.open(dbFile);
  const st = SIM.simSkirmish(E.MAPS[0], 4242, 'red', 'normal', 'normal');
  const runId = db.insertRun(h, { version: E.VERSION, kind: 'balance', redAi: 'normal', blueAi: 'normal', n: 1, tool: 'db-query.test.js', battalion: 'default' });
  db.insertSkirmish(h, runId, st, 'red', { seed: 4242 });
  db.close(h);
}

function query(sql) {
  return cp.execFileSync(process.execPath, [CLI, '--db', dbFile, sql], { encoding: 'utf8' });
}

test('litmus: card timing vs mountain-hex count is a 3-table join through db-query.js', function () {
  seed();
  const out = query(
    'SELECT c.id card, m.mountain_hexes mtn, AVG(ce.turn) avg_turn, COUNT(*) plays' +
    ' FROM card_events ce' +
    ' JOIN cards c ON c.id = ce.card_id AND c.version = ce.version AND c.config_digest = ce.config_digest' +
    ' JOIN maps m ON m.name = ce.map AND m.version = ce.version AND m.config_digest = ce.config_digest' +
    " WHERE ce.outcome = 'played' GROUP BY c.id, m.mountain_hexes");
  assert.ok(out.indexOf('mtn') >= 0 && out.indexOf('avg_turn') >= 0 && out.indexOf('plays') >= 0,
    'the CLI prints the join column header (card/mtn/avg_turn/plays)');
  assert.ok(!/\(0 rows\)/.test(out), 'the join returns per-card aggregate rows');
  // The mountain-hex count in every row is the played map's COMPUTED value —
  // answered in SQL, never read from the JS content files.
  const mtn = db.terrainFeatures(E.MAPS[0]).hexes.mountain;
  const dataRows = out.split('\n').filter(function (l) { return /\S/.test(l) && !/mtn|-----|\(\d+ row/.test(l); });
  assert.ok(dataRows.length > 0 && dataRows.every(function (l) {
    const cols = l.trim().split(/\s{2,}/); // card | mtn | avg_turn | plays
    return String(cols[1]) === String(mtn);
  }), 'every row carries the played map\'s computed mountain-hex count (' + mtn + ')');
});

test('--anchors reads the cited balance anchors from v_global_balance', function () {
  seed();
  const out = cp.execFileSync(process.execPath, [CLI, '--db', dbFile, '--anchors'], { encoding: 'utf8' });
  assert.ok(/from v_global_balance/.test(out), 'the anchors header names the source view (not a markdown snapshot)');
  assert.ok(new RegExp('slice ' + E.VERSION).test(out), 'the anchors read the live slice (version ' + E.VERSION + ')');
  ['First mover', 'HQ endings', 'Tie-goes-to-2nd', 'Attack share', 'First-blood', 'Drag', 'Swings'].forEach(function (label) {
    assert.ok(out.indexOf(label) >= 0, '--anchors prints the cited anchor "' + label + '"');
  });
});

test('db-query.js no-arg dump shows the star schema; writes are refused', function () {
  const schema = cp.execFileSync(process.execPath, [CLI, '--db', dbFile], { encoding: 'utf8' });
  ['skirmishes', 'card_events', 'maps', 'cards', 'battalions', 'versions'].forEach(function (t) {
    assert.ok(schema.indexOf(t) >= 0, 'no-arg schema dump names the ' + t + ' table');
  });
  var wrote = true;
  try {
    cp.execFileSync(process.execPath, [CLI, '--db', dbFile, 'DELETE FROM card_events'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { wrote = false; }
  assert.ok(!wrote, 'the read-only connection refuses a DELETE');
});
