#!/usr/bin/env node
/* dev/loop.test.js — red-test for the deck-loop orchestrator (#138).
   Zero deps; a temp DB under os.tmpdir(). Run: node dev/loop.test.js
   (or `node --test dev/loop.test.js`, or the whole gate via `npm test`).

   The AC: a 2-iteration MOCK run must iterate AND chain — >=1 non-NULL parent_id
   in logs.woa.db, and an adopt/reject verdict per iteration. Fails RED if the
   loop doesn't iterate (history length) or doesn't chain (all parent_id NULL). */
'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const loop = require(path.join(__dirname, 'loop.js'));
const deckbuild = require(path.join(__dirname, 'deckbuild.js'));
const db = require(path.join(__dirname, 'db.js'));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-loop-test-'));
const dbFile = path.join(tmpDir, 'test.db');
after(function () { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {} });

test('2-iteration mock run iterates, chains parent_id, and verdicts each candidate', async function () {
  const pool = deckbuild.buildPool();
  // Two DISTINCT mock specs so the candidates actually differ (a real search).
  const specs = [
    { opening: pool[0].id, filler: pool[1 % pool.length].id },
    { opening: pool[2 % pool.length].id, filler: pool[3 % pool.length].id }
  ];
  const steps = [];
  const h = db.open(dbFile);

  const res = await loop.runDeckLoop({
    iters: 2, n: 2, panel: ['normal'], profile: 'card',
    maps: [require('../game/engine.js').mapPool()[0]],
    dbh: h, ask: null, specs: specs,
    onStep: function (s) { steps.push(s); }
  });

  // Iterates: exactly 2 candidates, each with a real adopt/reject verdict.
  assert.strictEqual(res.history.length, 2, 'loop ran 2 iterations');
  assert.strictEqual(steps.length, 2, 'onStep fired once per iteration');
  res.history.forEach(function (s, i) {
    assert.ok(s.verdict === 'adopt' || s.verdict === 'reject', 'iter ' + (i + 1) + ' has an adopt/reject verdict (got "' + s.verdict + '")');
    assert.ok(typeof s.velocity === 'number', 'iter ' + (i + 1) + ' reports a velocity');
  });

  // Chains: the candidate is measured against the reigning incumbent, and iter 1's
  // parent is the seed incumbent's id (the active deck), NOT null.
  assert.strictEqual(res.history[0].parent, (require('../game/engine.js').ACTIVE_DECK.id || 'seed'),
    'iter 1 chains to the seed incumbent');

  // The DB proves it: at least one skirmish row carries a non-NULL parent_id.
  const chained = h.db.prepare('SELECT COUNT(*) c FROM skirmishes WHERE parent_id IS NOT NULL').get().c;
  assert.ok(chained >= 1, 'at least one skirmish row has a non-NULL parent_id (got ' + chained + ')');
  const total = h.db.prepare('SELECT COUNT(*) c FROM skirmishes').get().c;
  assert.ok(total >= 1, 'skirmish rows were written (got ' + total + ')');
  // Every written parent_id is a real deck id (a chain, not a stray value).
  const parents = h.db.prepare('SELECT DISTINCT parent_id FROM skirmishes WHERE parent_id IS NOT NULL').all().map(function (r) { return r.parent_id; });
  assert.ok(parents.length >= 1 && parents.every(function (p) { return typeof p === 'string' && p.length; }),
    'parent_id values are real deck ids: ' + JSON.stringify(parents));

  db.close(h);
});
