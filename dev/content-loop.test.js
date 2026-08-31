#!/usr/bin/env node
/* dev/content-loop.test.js — red-test for the content loop orchestration (#167).
   The LLM brains (author / grade / feels) and git are injected as fakes so the
   DETERMINISTIC machine is proved in isolation: the stop-datetime wall, the batch of
   shaping moves through the real Author hands, the legality guard (illegal card ->
   finding, never swept), the fresh-grade findings, the pinned balance columns, the
   feels non-selection finding, the per-iteration commit sha in the run record, and
   retry-once-then-record self-recovery. A separate case runs the REAL pin sweep to
   prove real woa.db rows. Run: node dev/content-loop.test.js */
'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CL = require(path.join(__dirname, 'content-loop.js'));
const RR = require(path.join(__dirname, 'run-record.js'));
const db = require(path.join(__dirname, 'db.js'));
const E = require(path.join(__dirname, '..', 'game', 'engine.js'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-cloop-'));
after(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} });

let seq = 0;
function scratch() { const d = path.join(tmp, 'run' + (++seq)); fs.mkdirSync(d, { recursive: true }); return d; }

// A legal card the fake Author adds, plus an illegal one it also tries (a bad step).
const GOOD = { id: 'test_trench_hold', name: 'Test Dig In', text: 'Hold a trench.', steps: [{ type: 'trench' }] };
const BAD = { id: 'test_bad_probe', name: 'Test Bad', text: 'nope', steps: [{ type: 'teleport' }] };

const FINDINGS = { grader: 'fresh-subagent', axes: [
  { axis: 'set-fit', position: 'fills the "hold a trench under pressure" gap the catalog lacks', velocity: 'sharpen the trigger so it is not always-good-on-sight' },
  { axis: 'board-had-to-be-there', position: 'reads as a real board decision, not an auto-play', velocity: 'keep the cost lever visible' }
] };

// The injected catalog: the real active cards + our GOOD card, so the sweep can find it.
function catalogWith(card) { return E.CARDS.concat([card]); }

test('pure: parseFeelsOutput reads claude-plays FEELS_DRAFT / FEELS_REPORT lines', function () {
  const stdout = [
    '[00:01] claude-plays: some prose',
    'FEELS_DRAFT {"red":["a","b"],"blue":["b","c"]}',
    '[00:02] transcript written to x',
    'FEELS_REPORT logs/reports/skirmish/1.2/foo-match.md'
  ].join('\n');
  const r = CL.parseFeelsOutput(stdout);
  assert.deepStrictEqual(r.redPicks, ['a', 'b']);
  assert.deepStrictEqual(r.bluePicks, ['b', 'c']);
  assert.strictEqual(r.reportPath, 'logs/reports/skirmish/1.2/foo-match.md');
  // and the loop's non-selection over these: catalog {a,b,c,d} minus {a,b,c} = {d}
  assert.deepStrictEqual(CL.nonSelection(['a', 'b', 'c', 'd'], r.redPicks, r.bluePicks), ['d']);
});

test('pure: parseAuthorBatch extracts a move batch from prose-wrapped JSON', function () {
  const reply = 'Sure, here is my batch:\n[{"action":"add","card":{"id":"dig_in","name":"Dig In","text":"t","steps":[{"type":"trench"}]},"note":"gap"},' +
    '{"action":"remove","id":"dead_card","note":"never played"}]\nHope that helps.';
  const moves = CL.parseAuthorBatch(reply);
  assert.strictEqual(moves.length, 2);
  assert.strictEqual(moves[0].action, 'add');
  assert.strictEqual(moves[0].card.id, 'dig_in');
  assert.strictEqual(moves[1].action, 'remove');
  assert.strictEqual(moves[1].id, 'dead_card');
  assert.deepStrictEqual(CL.parseAuthorBatch('no json here'), [], 'junk -> empty batch (loop authors nothing, never crashes)');
  assert.deepStrictEqual(CL.parseAuthorBatch('{"moves":[{"action":"add","card":{"id":"x","name":"X","text":"t","steps":[{"type":"trench"}]}}]}').length, 1, 'accepts {moves:[...]}');
});

test('pure: parseStopAt reads +Nm / +Nh / ISO relative to now', function () {
  const now = 1_000_000_000_000;
  assert.strictEqual(CL.parseStopAt('+15m', now), now + 15 * 60000);
  assert.strictEqual(CL.parseStopAt('+2h', now), now + 2 * 3600000);
  assert.strictEqual(CL.parseStopAt('', now), 0, 'unset -> 0 (no wall)');
  assert.strictEqual(CL.parseStopAt('2026-08-31T23:59:00.000Z', now), Date.parse('2026-08-31T23:59:00.000Z'));
});

test('pure: nonSelection is the catalog minus what either free draft picked', function () {
  assert.deepStrictEqual(CL.nonSelection(['a', 'b', 'c', 'd'], ['a'], ['c']), ['b', 'd']);
  assert.deepStrictEqual(CL.nonSelection(['a', 'b'], ['a', 'b'], []), [], 'everything drafted -> nothing flagged');
  assert.deepStrictEqual(CL.nonSelection(['a'], [], []), ['a'], 'neither side drafted a -> a is a finding');
});

test('a full iteration: author batch -> grade -> balance columns -> feels non-selection -> commit sha', async function () {
  const rec = scratch();
  const feedFile = path.join(rec, 'authored.json');
  const cardsDir = path.join(rec, 'cards');
  const dbh = db.open(path.join(rec, 't.db'));
  const catalog = catalogWith(GOOD);
  const stages = [];

  const res = await CL.runContentLoop({
    runId: 'run-full', maxIters: 1, recDir: rec, reportsDir: path.join(rec, 'reports'),
    config: { nudge: 'build out toward 30 cards', temperature: 'standard', tolerance: 'card', questionnaire: 'default' },
    catalog: catalog, panel: ['normal'], maps: [E.mapPool()[0]], n: 2, dbh: dbh,
    authorOpts: { cardsDir: cardsDir, feedFile: feedFile, regen: false },
    author: async () => [ { action: 'add', card: GOOD, note: 'rewards holding a trench' },
                          { action: 'add', card: BAD, note: 'this one is illegal on purpose' } ],
    grade: async (ids) => { const o = {}; ids.forEach(id => { o[id] = FINDINGS; }); return o; },
    // a fake pin sweep so the orchestration test is fast + deterministic (real sweep below)
    pinSweep: (card) => ({ legal: true, problems: [], swept: 24, flags: [],
      columns: { plays: 18, win: 50, simple: 22, sight: 33, points: 4, resid: null } }),
    feels: async () => ({ redPicks: [GOOD.id], bluePicks: ['cav_charge'], reportPath: 'logs/reports/skirmish/1.2/fake-match.md' }),
    commit: async () => 'abc1234',
    onStage: (s) => stages.push(s)
  });

  const record = RR.read(res.recordFile);
  assert.strictEqual(record.iterations.length, 1, 'one iteration ran');
  const it = record.iterations[0];

  // stages ran in order
  assert.deepStrictEqual(it.stages, ['author', 'grade', 'balance', 'feels', 'commit']);

  // author: the GOOD card landed; the BAD card was refused and recorded as a finding, never swept
  const good = it.authored.find(c => c.id === GOOD.id);
  const bad = it.authored.find(c => c.id === BAD.id);
  assert.ok(good && good.legal === true, 'the legal card was authored');
  assert.ok(fs.existsSync(path.join(cardsDir, GOOD.id + '.js')), 'the legal card was written to disk by the real Author hands');
  assert.ok(bad && bad.legal === false, 'the illegal card is caught');
  assert.ok(bad.problems.length >= 1 && /teleport|unknown type/.test(bad.problems.join(' ')), 'the illegal card carries its fault as a finding');
  assert.strictEqual(bad.balance, null, 'the illegal card was never swept');
  assert.ok(!fs.existsSync(path.join(cardsDir, BAD.id + '.js')), 'the illegal card was NEVER written / fed to the engine');

  // grade findings attach (position + velocity, set-fit present) — an aim, not a gate
  assert.ok(good.findings && good.findings.axes.some(a => a.axis === 'set-fit'), 'fresh-grade findings attach with set-fit');

  // balance columns attach for the legal card
  assert.strictEqual(good.balance.columns.simple, 22, 'per-card balance columns recorded');

  // feels non-selection: a catalog card neither side drafted is a kept finding
  assert.ok(it.feels.nothingWanted.length >= 1, 'at least one catalog card went undrafted');
  assert.ok(it.feels.findings.every(f => /nothing wanted/.test(f)), 'non-selection is phrased as a kept finding');
  assert.ok(!it.feels.nothingWanted.includes(GOOD.id), 'a drafted card is NOT flagged as non-selected');

  // the batch IS the commit
  assert.strictEqual(it.commit, 'abc1234', 'the iteration records its commit sha');
  assert.ok(it.balanceReportPath, 'a committed balance report path is recorded');
  // the three morning artifacts exist as markdown: balance, rubric findings, (feels transcript is claude-plays')
  assert.ok(it.rubricReportPath && fs.existsSync(it.rubricReportPath), 'a committed rubric-findings report is written');
  const rubricMd = fs.readFileSync(it.rubricReportPath, 'utf8');
  assert.ok(/set-fit/i.test(rubricMd) && /Position:/.test(rubricMd) && /Velocity:/.test(rubricMd), 'the rubric report renders the fresh findings (position + velocity), an aim not a gate');
  const balMd = fs.readFileSync(path.join(rec, 'reports', 'balance', String(E.VERSION), 'run-full-iter1-balance.md'), 'utf8');
  assert.ok(/Simple%/.test(balMd) && /1stSight%/.test(balMd), 'the balance report renders the pinned card columns');

  // config block survives
  assert.strictEqual(record.config.nudge, 'build out toward 30 cards');
  assert.strictEqual(record.config.temperature, 'standard');

  // live stage signal fired for every stage
  ['author', 'grade', 'balance', 'feels', 'commit'].forEach(nm =>
    assert.ok(stages.some(s => s.stage === nm), 'onStage fired for ' + nm));

  db.close(dbh);
});

test('the one fix pass is recorded, and the card is NOT double-graded on the feed', async function () {
  const A = require(path.join(__dirname, 'author-card.js'));
  const rec = scratch();
  const feedFile = path.join(rec, 'authored.json');
  const cardsDir = path.join(rec, 'cards');
  const res = await CL.runContentLoop({
    runId: 'run-fix', maxIters: 1, recDir: rec, reportsDir: path.join(rec, 'reports'),
    config: { nudge: 'x', temperature: 'standard', tolerance: 'card' },
    catalog: catalogWith(GOOD), panel: ['normal'], maps: [E.mapPool()[0]], n: 2, dbh: db.open(path.join(rec, 'f.db')),
    authorOpts: { cardsDir: cardsDir, feedFile: feedFile, regen: false },
    author: async () => [{ action: 'add', card: GOOD, note: 'seed' }],
    grade: async (ids) => { const o = {}; ids.forEach(id => { o[id] = FINDINGS; }); return o; },
    // the Author's one fix pass EDITS the card toward the aim
    fixPass: async (id) => ({ card: Object.assign({}, GOOD, { text: 'Hold a trench — revised toward the aim.' }), note: 'sharpened the trigger' }),
    pinSweep: () => ({ legal: true, problems: [], swept: 4, columns: {}, flags: [] }),
    feels: async () => ({ redPicks: [], bluePicks: [] }), commit: async () => 'fx'
  });
  const record = RR.read(res.recordFile);
  const card = record.iterations[0].authored.find(c => c.id === GOOD.id);
  assert.ok(card.findings && card.findings.fixPass, 'the fix-pass outcome is recorded on the run-record grade');
  assert.ok(/sharpened/.test(card.findings.fixPass.note), 'the fix-pass note is captured');
  // the /api/authored feed must not carry findings on TWO records for the same id (no double-graded card)
  const feed = A.readFeed(feedFile);
  const gradedForId = feed.cards.filter(c => c.card && c.card.id === GOOD.id && c.findings);
  assert.strictEqual(gradedForId.length, 1, 'exactly one feed record carries the findings (the card is not graded twice)');
});

test('the stop-datetime is the only hard wall — no NEW iteration starts past it', async function () {
  const rec = scratch();
  // a clock that jumps past stopAt after the first read used by the while-guard
  let ticks = 0;
  const base = 1_000_000;
  const res = await CL.runContentLoop({
    runId: 'run-wall', recDir: rec, reportsDir: path.join(rec, 'r'),
    config: { nudge: 'x', temperature: 'safe', tolerance: 'card' },
    stopAt: base + 50, clock: () => base + (ticks++ * 60),   // read #0=0 (iter1), read #1=60 (>50 -> stop)
    catalog: catalogWith(GOOD), panel: ['normal'], maps: [E.mapPool()[0]], n: 2,
    dbh: db.open(path.join(rec, 'w.db')),
    authorOpts: { cardsDir: path.join(rec, 'c'), feedFile: path.join(rec, 'f.json'), regen: false },
    author: async () => [{ action: 'add', card: GOOD }],
    grade: async () => ({}), pinSweep: () => ({ legal: true, problems: [], swept: 1, columns: {}, flags: [] }),
    feels: async () => ({ redPicks: [], bluePicks: [] }), commit: async () => 'w'
  });
  assert.strictEqual(res.iterations, 1, 'exactly one iteration started before the wall (past the wall, no new one starts)');
  const record = RR.read(res.recordFile);
  assert.strictEqual(record.state, 'done');
});

test('a stopAt already in the past runs zero iterations', async function () {
  const rec = scratch();
  const res = await CL.runContentLoop({
    runId: 'run-past', recDir: rec, config: { tolerance: 'card' },
    stopAt: Date.now() - 1000, clock: () => Date.now(),
    dbh: db.open(path.join(rec, 'p.db')),
    author: async () => [{ action: 'add', card: GOOD }]
  });
  assert.strictEqual(res.iterations, 0, 'no iteration starts when the wall is already past');
});

test('a genuine break is retried once, then recorded as a failed-iteration finding and the loop advances', async function () {
  const rec = scratch();
  let feelsCalls = 0;
  const res = await CL.runContentLoop({
    runId: 'run-fail', maxIters: 2, recDir: rec, reportsDir: path.join(rec, 'r'),
    config: { nudge: 'x', temperature: 'bold', tolerance: 'card' },
    catalog: catalogWith(GOOD), panel: ['normal'], maps: [E.mapPool()[0]], n: 2,
    dbh: db.open(path.join(rec, 'x.db')),
    authorOpts: { cardsDir: path.join(rec, 'c'), feedFile: path.join(rec, 'f.json'), regen: false },
    author: async () => [{ action: 'add', card: GOOD }],
    grade: async () => ({}),
    pinSweep: () => ({ legal: true, problems: [], swept: 1, columns: {}, flags: [] }),
    // iteration 1 always throws in feels (both attempts) -> failed finding + advance; iteration 2 is clean
    feels: async (ctx) => { feelsCalls++; if (ctx.iter === 1) throw new Error('claude-plays broke'); return { redPicks: [], bluePicks: [] }; },
    commit: async () => 'ok'
  });
  const record = RR.read(res.recordFile);
  assert.strictEqual(record.iterations.length, 2, 'the loop advanced past the broken iteration');
  assert.ok(record.iterations[0].failure && /broke/.test(record.iterations[0].failure.message), 'the break is a failed-iteration finding');
  assert.ok(feelsCalls >= 3, 'iteration 1 was retried once (2 feels attempts) before being recorded (got ' + feelsCalls + ' calls)');
  assert.strictEqual(record.iterations[1].failure, null, 'iteration 2 ran clean after the advance');
});

test('the REAL pin sweep writes real per-skirmish rows to woa.db and yields real columns', async function () {
  const rec = scratch();
  const dbh = db.open(path.join(rec, 'real.db'));
  const runId = db.insertRun(dbh, { version: E.VERSION, kind: 'balance', redAi: 'normal', blueAi: 'normal', n: 3, tool: 'test' });
  let rows = 0;
  const out = CL.pinSweep(GOOD, {
    catalog: catalogWith(GOOD), panel: ['normal'], maps: [E.mapPool()[0]], n: 3, tolerance: 'card',
    onSkirmish: (g1, seedBase, st) => { db.insertSkirmish(dbh, runId, st, E.balanceFP(g1 - 1), { seed: E.balanceSeed(seedBase, g1 - 1), version: E.VERSION }); rows++; }
  });
  assert.ok(out.legal && out.swept >= 1, 'the real sweep finished skirmishes');
  assert.ok(out.columns && out.columns.plays >= 1, 'the pinned card has real measured columns');
  const inDb = dbh.db.prepare('SELECT COUNT(*) c FROM skirmishes WHERE run_id = ?').get(runId).c;
  assert.ok(inDb >= 1 && inDb === rows, 'real per-skirmish rows landed in woa.db (' + inDb + ')');
  db.close(dbh);
});
