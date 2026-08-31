#!/usr/bin/env node
/* dev/run-record.test.js — red-test for the content loop's structured run record
   (#167). The run record is the ONE machine-readable contract the dashboard (#170)
   and "Review with Claude" (#171) consume — NOT a stdout stream, NOT reconstructed
   from woa.db. It must, at a known path: carry the run-config knobs, expose the live
   in-flight stage BEFORE a commit, and hold each iteration's authored ids + rubric
   findings + per-card balance columns + feels/non-selection findings + commit sha.
   Run: node dev/run-record.test.js */
'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RR = require(path.join(__dirname, 'run-record.js'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-runrec-'));
after(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} });

function fresh(name) {
  return RR.open({
    runId: name, kind: 'card', dir: tmp,
    config: { nudge: 'build out toward 30 cards', temperature: 'standard',
      tolerance: 'card', stopAt: '2026-08-31T23:59:00.000Z', questionnaire: 'default' }
  });
}

test('open writes the config block + empty run at a known path', function () {
  const h = fresh('run-a');
  assert.ok(fs.existsSync(h.file), 'the per-run record file exists at ' + h.file);
  assert.ok(fs.existsSync(RR.latestPath(tmp)), 'the latest.json pointer exists (the Workbench reads it)');
  const rec = RR.read(h.file);
  assert.strictEqual(rec.state, 'running');
  assert.strictEqual(rec.kind, 'card');
  // Run-config block — all five knobs #164/#169/#171 read back.
  assert.strictEqual(rec.config.nudge, 'build out toward 30 cards');
  assert.strictEqual(rec.config.temperature, 'standard');
  assert.strictEqual(rec.config.tolerance, 'card');
  assert.strictEqual(rec.config.stopAt, '2026-08-31T23:59:00.000Z');
  assert.strictEqual(rec.config.questionnaire, 'default');
  assert.deepStrictEqual(rec.iterations, []);
});

test('the live in-flight stage is visible BEFORE the iteration commits', function () {
  const h = fresh('run-b');
  RR.startIteration(h, 1);
  RR.setStage(h, { iter: 1, name: 'author' });
  let rec = RR.read(RR.latestPath(tmp));
  assert.deepStrictEqual({ iter: rec.stage.iter, name: rec.stage.name }, { iter: 1, name: 'author' },
    'the feed can see "author running now" on iteration 1 before any commit');
  RR.setStage(h, { iter: 1, name: 'balance' });
  rec = RR.read(RR.latestPath(tmp));
  assert.strictEqual(rec.stage.name, 'balance', 'the live stage advances author -> balance');
  assert.strictEqual(rec.iterations[0].commit, null, 'the iteration has not committed yet');
});

test('a full iteration records authored ids + findings + balance columns + feels + commit, in order', function () {
  const h = fresh('run-c');
  RR.startIteration(h, 1);

  RR.markStage(h, 1, 'author');
  RR.recordAuthored(h, 1, [
    { action: 'add', id: 'trench_hold', name: 'Dig In', points: 4, note: 'rewards holding a trench' },
    { action: 'add', id: 'flank_push', name: 'Flank Push', points: 6, note: 'a new mobility line' }
  ]);

  RR.markStage(h, 1, 'grade');
  RR.recordGrade(h, 1, 'trench_hold', { gradedAt: 'now', grader: 'fresh-subagent',
    axes: [{ axis: 'set-fit', title: 'Across the set', setFit: true, position: 'fills a gap', velocity: 'sharpen the trigger' }] });

  RR.markStage(h, 1, 'balance');
  RR.recordBalance(h, 1, 'trench_hold', { legal: true, problems: [], swept: 60,
    columns: { plays: 40, win: 52, simple: 20, sight: 33, points: 4 }, flags: [] });
  RR.recordBalance(h, 1, 'flank_push', { legal: false, problems: ['flank_push step 2: unknown type'], swept: 0,
    columns: null, flags: [] });

  RR.markStage(h, 1, 'feels');
  RR.recordFeels(h, 1, { reportPath: 'logs/reports/skirmish/1.2/x-match.md',
    redPicks: ['trench_hold', 'a'], bluePicks: ['b'], nothingWanted: ['flank_push'],
    findings: ['nothing wanted flank_push — neither free draft picked it'] });

  RR.markStage(h, 1, 'commit');
  RR.finishIteration(h, 1, { commit: 'deadbeef', balanceReportPath: 'logs/reports/balance/1.2/y.md' });

  const rec = RR.read(h.file);
  const it = rec.iterations[0];
  assert.deepStrictEqual(it.stages, ['author', 'grade', 'balance', 'feels', 'commit'], 'stages recorded in the order they ran');
  assert.deepStrictEqual(it.authored.map(c => c.id), ['trench_hold', 'flank_push'], 'authored ids captured');

  const th = it.authored.find(c => c.id === 'trench_hold');
  assert.ok(th.findings && th.findings.axes[0].axis === 'set-fit', 'rubric findings attach to the card');
  assert.strictEqual(th.balance.columns.simple, 20, 'per-card balance columns attach to the card');
  assert.strictEqual(th.balance.legal, true);

  const fp = it.authored.find(c => c.id === 'flank_push');
  assert.strictEqual(fp.balance.legal, false, 'an illegal card is flagged, not swept');
  assert.ok(fp.balance.problems.length >= 1, 'the legality problem is recorded as a finding');

  assert.deepStrictEqual(it.feels.nothingWanted, ['flank_push'], 'feels non-selection is kept as a finding, not dropped');
  assert.strictEqual(it.commit, 'deadbeef', 'the iteration commit sha is recorded');
  assert.strictEqual(it.balanceReportPath, 'logs/reports/balance/1.2/y.md');
});

test('a failed iteration is recorded as a finding and the run keeps going', function () {
  const h = fresh('run-d');
  RR.startIteration(h, 1);
  RR.recordFailure(h, 1, { stage: 'feels', message: 'claude-plays timed out twice' });
  RR.finishIteration(h, 1, { commit: null });
  RR.startIteration(h, 2);              // the loop advanced past the break
  RR.finishIteration(h, 2, { commit: 'cafe' });
  RR.finish(h, 'done');

  const rec = RR.read(h.file);
  assert.strictEqual(rec.iterations.length, 2, 'the loop advanced to the next iteration after the break');
  assert.ok(rec.iterations[0].failure && /timed out/.test(rec.iterations[0].failure.message), 'the break is a failed-iteration finding');
  assert.strictEqual(rec.state, 'done', 'the run finishes');
});
