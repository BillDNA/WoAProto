#!/usr/bin/env node
/* dev/db.test.js — tests for dev/db.js (node:sqlite persistence layer).
   Zero deps; uses a temp DB under os.tmpdir(). Run: node dev/db.test.js
   (or `node --test dev/db.test.js`, or the whole gate via `npm test`).
   Sections run in order as separate node:test blocks over shared state. */
'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const db = require(path.join(__dirname, 'db.js'));
const E = require(path.join(__dirname, '..', 'game', 'engine.js'));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-db-test-'));
const dbFile = path.join(tmpDir, 'test.db');
after(function () { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {} });

// State threaded across the sections below (tests run in order).
var h, h2, st, st2, runId, runId2, runIdA, skirmishId, skirmishIdA, hexesExpected;

/* ---------- schema creation is idempotent ---------- */
test('schema', function () {
  h = db.open(dbFile);
  db.close(h);
  h = db.open(dbFile); // second open on the same file must not throw or duplicate
  var tables = h.db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map(function (r) { return r.name; });
  assert.ok(tables.join(',') === 'card_plays,runs,skirmishes,timeline',
    'all four tables exist after re-open (got: ' + tables.join(',') + ')');
  var idx = h.db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").get().c;
  assert.ok(idx === 4, 'all four indexes exist (got ' + idx + ')');
  var mode = h.db.prepare('PRAGMA journal_mode').get();
  assert.ok(String(mode[Object.keys(mode)[0]]).toLowerCase() === 'wal', 'journal_mode is WAL');
});

/* ---------- insertRun / insertSkirmish round-trip with a REAL skirmish ---------- */
test('round-trip (real simSkirmish state)', function () {
  st = E.simSkirmish(E.MAPS[0], 1234, 'red', 'normal', 'normal');
  assert.ok(st.phase === 'skirmish-over', 'simSkirmish(MAPS[0], 1234) finished (phase ' + st.phase + ')');

  runId = db.insertRun(h, {
    version: E.VERSION, kind: 'balance', redAi: 'normal', blueAi: 'normal',
    n: 1, tool: 'db.test.js', notes: 'round-trip test'
  });
  assert.ok(runId === 1, 'insertRun returned id 1 (got ' + runId + ')');
  var runRow = h.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
  assert.ok(runRow.kind === 'balance' && runRow.red_ai === 'normal' && runRow.n === 1,
    'runs row round-trips (kind/red_ai/n)');
  assert.ok(typeof runRow.ts === 'string' && runRow.ts.indexOf('T') > 0, 'ts defaulted to an ISO string (' + runRow.ts + ')');

  skirmishId = db.insertSkirmish(h, runId, st, 'red', { seed: 1234 });
  var b = h.db.prepare('SELECT * FROM skirmishes WHERE id = ?').get(skirmishId);
  assert.ok(b.run_id === runId && b.version === E.VERSION, 'skirmish carries run_id + version');
  assert.ok(b.map === E.MAPS[0].name, 'map name matches (' + b.map + ')');
  assert.ok(b.seed === 1234, 'extra.seed stored as the skirmish seed');
  assert.ok(b.first_player === 'red', 'first_player stored');
  assert.ok(b.winner === st.skirmishWinner, 'winner matches st.skirmishWinner (' + b.winner + ')');
  assert.ok(b.win_type === st.winType, 'win_type matches (' + b.win_type + ')');
  assert.ok(b.turns === st.turnNumber, 'turns matches st.turnNumber (' + b.turns + ')');
  assert.ok(b.fs_red === E.fieldScore(st, 'red') && b.fs_blue === E.fieldScore(st, 'blue'),
    'fs_red/fs_blue = fieldScore of surviving units (' + b.fs_red + '/' + b.fs_blue + ')');
  assert.ok(b.kill_tail === Math.max(0, st.turnNumber - (st.lastKillTurn || 0)),
    'kill_tail = turns - lastKillTurn (' + b.kill_tail + ')');
  assert.ok(b.lead_changes === (st.leadChanges || 0), 'lead_changes matches (' + b.lead_changes + ')');
  assert.ok(b.zero_kill === ((st.vp.red + st.vp.blue === 0) ? 1 : 0), 'zero_kill flag matches');
  assert.ok(b.tiebreak === ((st.winType === 'attrition' && b.fs_red === b.fs_blue) ? 1 : 0), 'tiebreak flag matches');
  assert.ok(b.attacks === (st.stats.attacks || 0) && b.swaps === (st.stats.swaps || 0) &&
     b.marches === (st.stats.marches || 0) && b.deploys === (st.stats.deploys || 0),
    'attacks/swaps/marches/deploys copied from st.stats');
  assert.ok(b.first_blood === (st.stats.firstBlood || null), 'first_blood matches (' + b.first_blood + ')');
  // WOA-016: reserve-held-at-end, computed independently here from st.reserves
  // to prove db.js's own reservesLeft() reads the same source of truth.
  function reservesLeft(sideReserves) {
    var n = 0; Object.keys(E.UNITS).forEach(function (t) { n += sideReserves[t] || 0; }); return n;
  }
  assert.ok(b.res_end_red === reservesLeft(st.reserves.red) && b.res_end_blue === reservesLeft(st.reserves.blue),
    'res_end_red/res_end_blue = pieces left in st.reserves at skirmish end (' + b.res_end_red + '/' + b.res_end_blue + ')');
  // WOA-038: hexes_red/hexes_blue = hex-ownership tally at skirmish end, computed
  // independently here from st.units (the SAME read balanceAdd does live) to
  // prove db.js's hexesHeld() reads the same source of truth.
  function hexTally(units) {
    var hr = 0, hb = 0;
    for (var hh in units) (units[hh].owner === 'red' ? hr++ : hb++);
    return { red: hr, blue: hb };
  }
  hexesExpected = hexTally(st.units);
  assert.ok(b.hexes_red === hexesExpected.red && b.hexes_blue === hexesExpected.blue,
    'hexes_red/hexes_blue match a hex-ownership tally of st.units (' + b.hexes_red + '/' + b.hexes_blue + ')');
  // WOA-110 (#95): no extra.parentId -> parent_id NULL (off-loop / iteration-0 fixture)
  assert.ok(b.parent_id === null, 'parent_id defaults to NULL when no incumbent is passed (' + b.parent_id + ')');
});

/* ---------- card_plays ---------- */
test('card_plays', function () {
  var plays = h.db.prepare('SELECT * FROM card_plays WHERE skirmish_id = ? ORDER BY id').all(skirmishId);
  assert.ok(plays.length === st.playLog.length,
    'one card_plays row per playLog entry (' + plays.length + ' = ' + st.playLog.length + ')');
  var allMatch = plays.every(function (r, i) {
    var e = st.playLog[i];
    return r.side === e.p && r.card_id === e.id && r.mode === e.mode &&
      r.turn === e.turn && r.seen === e.seen && r.noop === (e.noop ? 1 : 0) &&
      r.won === (e.p === st.skirmishWinner ? 1 : 0);
  });
  assert.ok(allMatch, 'every row matches its playLog entry (side/card/mode/turn/seen/noop/won)');
  var wonRows = h.db.prepare('SELECT COUNT(*) c FROM card_plays WHERE skirmish_id = ? AND won = 1').get(skirmishId).c;
  var wonExpected = st.playLog.filter(function (e) { return e.p === st.skirmishWinner; }).length;
  assert.ok(wonRows === wonExpected, 'won=1 count equals winner-side plays (' + wonRows + ')');
});

/* ---------- timeline: real skirmishes carry one; absence is tolerated ---------- */
test('timeline', function () {
  // simSkirmish states carry fsTimeline since the V1 seams commit — a real skirmish
  // should have produced per-turn rows above.
  var tl0 = h.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(skirmishId).c;
  assert.ok(tl0 === (st.fsTimeline ? st.fsTimeline.length : 0) && tl0 > 0,
    'a real skirmish lands its per-turn timeline (' + tl0 + ' rows)');
  var noTl = JSON.parse(JSON.stringify(st)); noTl.match = st.match; delete noTl.fsTimeline;
  var skirmishId0 = db.insertSkirmish(h, runId, noTl, 'red', { seed: 1234 });
  var tlAbsent = h.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(skirmishId0).c;
  assert.ok(tlAbsent === 0, 'a state without fsTimeline (pre-V1 save) -> zero rows, tolerated silently');

  st.fsTimeline = [[2, 2], [4, 2], [4, 5]]; // synthetic, to pin the column mapping
  var skirmishId2 = db.insertSkirmish(h, runId, st, 'blue', { seed: 1234, parentId: 'cavsplit17' });
  // WOA-110 (#95): the incumbent deck id round-trips into parent_id verbatim
  var pRow = h.db.prepare('SELECT parent_id FROM skirmishes WHERE id = ?').get(skirmishId2);
  assert.ok(pRow.parent_id === 'cavsplit17', 'extra.parentId stored as parent_id (' + pRow.parent_id + ')');
  var tl = h.db.prepare('SELECT turn, fs_red, fs_blue FROM timeline WHERE skirmish_id = ? ORDER BY turn').all(skirmishId2);
  assert.ok(tl.length === 3, 'synthetic 3-entry fsTimeline -> 3 rows (got ' + tl.length + ')');
  assert.ok(tl[0].turn === 1 && tl[2].turn === 3, 'timeline turns are 1-based (index 0 = turn 1)');
  assert.ok(tl[1].fs_red === 4 && tl[1].fs_blue === 2 && tl[2].fs_blue === 5, 'fs values land in the right columns');
  delete st.fsTimeline;
});

/* ---------- unfinished states are rejected (transaction leaves no debris) ---------- */
test('guards', function () {
  var threw = false;
  try { db.insertSkirmish(h, runId, { phase: 'choose-card' }, 'red'); } catch (e) { threw = true; }
  assert.ok(threw, 'insertSkirmish throws on a non-finished state');
  var threwKind = false;
  try { db.insertRun(h, { version: E.VERSION, kind: 'nonsense' }); } catch (e) { threwKind = true; }
  assert.ok(threwKind, 'insertRun rejects an unknown kind');
  assert.ok(h.db.prepare('SELECT COUNT(*) c FROM skirmishes').get().c === 3, 'failed inserts left no skirmishes rows');
});

/* ---------- a GROUP BY through the same handle ---------- */
test('GROUP BY via the handle', function () {
  var g = h.db.prepare('SELECT map, COUNT(*) n, AVG(turns) avg_turns FROM skirmishes GROUP BY map').all();
  assert.ok(g.length === 1 && g[0].map === E.MAPS[0].name, 'one map group (' + (g[0] && g[0].map) + ')');
  assert.ok(g[0].n === 3, 'all three skirmishes counted (n=' + g[0].n + ')');
  assert.ok(g[0].avg_turns === st.turnNumber, 'AVG(turns) is sane (' + g[0].avg_turns + ')');
});

/* ---------- listRuns (WOA-034: the dashboard header's run-A/B pickers) ---------- */
test('listRuns (WOA-034)', function () {
  runId2 = db.insertRun(h, { version: E.VERSION, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 40, tool: 'db.test.js', label: 'r2' });
  var runs = db.listRuns(h);
  assert.ok(runs.length === 2, 'listRuns returns every run on this handle (' + runs.length + ')');
  assert.ok(runs[0].id === runId2 && runs[1].id === runId, 'ordered id DESC — most recent first');
  assert.ok(runs[0].redAi === 'hard' && runs[0].blueAi === 'hard' && runs[0].label === 'r2',
    'camelCase columns (redAi/blueAi/label) round-trip from the snake_case table');
  assert.ok(runs.every(function (r) { return 'seedBase' in r && 'baseline' in r; }), 'seedBase/baseline columns present (nullable)');
  assert.ok(db.listRuns(h, 1).length === 1, 'limit is honoured');
});

/* ---------- listSkirmishes (WOA-035: the Overview screen's skirmish fetch) ---------- */
test('listSkirmishes (WOA-035)', function () {
  var skirmishesForRun1 = db.listSkirmishes(h, runId);
  assert.ok(skirmishesForRun1.length === 3, 'listSkirmishes returns every skirmish row for the run (' + skirmishesForRun1.length + ')');
  assert.ok(skirmishesForRun1.every(function (r) { return r.id != null; }) && skirmishesForRun1[0].id < skirmishesForRun1[1].id,
    'ordered by id ascending (' + skirmishesForRun1.map(function (r) { return r.id; }).join(',') + ')');
  var bRow = skirmishesForRun1[0];
  ['id', 'map', 'seed', 'firstPlayer', 'winner', 'winType', 'turns', 'fsRed', 'fsBlue', 'firstBlood',
    'leadChanges', 'killTail', 'zeroKill', 'tiebreak', 'attacks', 'swaps', 'marches', 'deploys',
    'resEndRed', 'resEndBlue', 'trace', 'hexesRed', 'hexesBlue', 'parentId'].forEach(function (k) {
    assert.ok(k in bRow, 'listSkirmishes row carries camelCase "' + k + '"');
  });
  // WOA-110 (#95): parent_id surfaces as camelCase parentId — NULL for the off-loop
  // first row, the incumbent id for the row that carried one (skirmishId2, index 2).
  assert.ok(bRow.parentId === null, 'listSkirmishes parentId is NULL for the off-loop skirmish');
  assert.ok(skirmishesForRun1[2].parentId === 'cavsplit17', 'listSkirmishes parentId round-trips the incumbent id (' + skirmishesForRun1[2].parentId + ')');
  assert.ok(bRow.hexesRed === hexesExpected.red && bRow.hexesBlue === hexesExpected.blue,
    'listSkirmishes hexesRed/hexesBlue round-trip the same tally (' + bRow.hexesRed + '/' + bRow.hexesBlue + ')');
  assert.ok(bRow.map === E.MAPS[0].name && bRow.firstPlayer === 'red' && bRow.winner === st.skirmishWinner,
    'listSkirmishes row matches the round-trip skirmish inserted above (map/firstPlayer/winner)');
  assert.ok(typeof bRow.trace === 'string' && JSON.parse(bRow.trace).map === E.MAPS[0].name,
    'trace column is still a raw JSON string — envelopeFromRow parses it client-side, not db.js');
  assert.ok(db.listSkirmishes(h, runId2).length === 0, 'a different run id returns its own (empty) slice, not a cross-run leak');

  db.close(h);
});

/* ---------- db-query.js CLI against the temp db ---------- */
test('db-query.js CLI', function () {
  var cli = path.join(__dirname, 'db-query.js');
  var out = cp.execFileSync(process.execPath,
    [cli, '--db', dbFile, 'SELECT map, COUNT(*) n, AVG(turns) avg_turns FROM skirmishes GROUP BY map'],
    { encoding: 'utf8' });
  assert.ok(out.indexOf('map') >= 0 && out.indexOf('avg_turns') >= 0, 'CLI prints the column header');
  assert.ok(out.indexOf(E.MAPS[0].name) >= 0, 'CLI prints the map row (' + E.MAPS[0].name + ')');
  assert.ok(/\(1 row\)/.test(out), 'CLI prints the row count');

  var schemaOut = cp.execFileSync(process.execPath, [cli, '--db', dbFile], { encoding: 'utf8' });
  assert.ok(schemaOut.indexOf('CREATE TABLE') >= 0 && schemaOut.indexOf('skirmishes') >= 0,
    'no-arg CLI prints the schema');
  assert.ok(/-- 3 rows/.test(schemaOut), 'no-arg CLI prints per-table row counts (skirmishes: 3)');

  var wrote = true;
  try {
    cp.execFileSync(process.execPath, [cli, '--db', dbFile, "DELETE FROM skirmishes"],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { wrote = false; }
  assert.ok(!wrote, 'CLI connection is read-only (DELETE rejected)');
});

/* ---------- run identity + trace (WOA-032, SPEC §7 / §4) ---------- */
// Separate handle/file from the counts-pinned assertions above (the CLI
// section just asserted exact row counts on dbFile — don't perturb it).
test('run identity + trace (WOA-032)', function () {
  var dbFile2 = path.join(tmpDir, 'runs.db');
  h2 = db.open(dbFile2);

  runIdA = db.insertRun(h2, {
    version: '9.9-test', kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 5, tool: 'db.test.js',
    deck: 'default', mapset: 'core7', seedBase: 7919, label: 'run A'
  });
  var rowA = h2.db.prepare('SELECT * FROM runs WHERE id = ?').get(runIdA);
  assert.ok(rowA.deck === 'default' && rowA.mapset === 'core7' && rowA.seed_base === 7919 && rowA.label === 'run A',
    'runs row carries deck/mapset/seed_base/label (SPEC §7)');
  assert.ok(rowA.baseline === 0, 'baseline defaults to 0 when not requested');

  st2 = E.simSkirmish(E.MAPS[0], 4242, 'red', 'normal', 'normal');
  skirmishIdA = db.insertSkirmish(h2, runIdA, st2, 'red', { seed: 4242 });
  var bA = h2.db.prepare('SELECT run_id, trace FROM skirmishes WHERE id = ?').get(skirmishIdA);
  assert.ok(bA.run_id === runIdA, 'skirmish row references its run id (run_id column)');
  var trace = JSON.parse(bA.trace);
  assert.ok(trace && typeof trace === 'object', 'skirmishes.trace is valid JSON');
  ['v', 'map', 'seed', 'fp', 'winner', 'winType', 'turns', 'trace', 'units'].forEach(function (k) {
    assert.ok(k in trace, 'trace envelope has "' + k + '" (SPEC §4 shape)');
  });
  assert.ok(Array.isArray(trace.trace) && trace.trace.length === st2.playLog.length,
    'trace.trace = st.playLog verbatim (' + trace.trace.length + ' entries)');
  assert.ok(JSON.stringify(trace.units) === JSON.stringify(st2.unitMetrics),
    'trace.units = st.unitMetrics verbatim');
  assert.ok(Object.keys(trace.units).indexOf('infantry') >= 0,
    'unitMetrics keyed by FULL unit-type name "infantry" (WOA-031 feed-forward), not "inf" shorthand');
});

/* ---------- hexes_red/hexes_blue: known-units column mapping (WOA-038) ---------- */
test('hex-ownership tally (WOA-038)', function () {
  var stHex = JSON.parse(JSON.stringify(st2)); stHex.match = st2.match;
  stHex.units = { // a deliberately uneven, hand-known split: 3 red hexes, 1 blue hex
    '0,0': { type: 'infantry', owner: 'red' },
    '1,0': { type: 'infantry', owner: 'red' },
    '2,0': { type: 'cavalry', owner: 'red' },
    '-1,0': { type: 'infantry', owner: 'blue' }
  };
  var skirmishIdHex = db.insertSkirmish(h2, runIdA, stHex, 'red', { seed: 9001 });
  var bHex = h2.db.prepare('SELECT hexes_red, hexes_blue FROM skirmishes WHERE id = ?').get(skirmishIdHex);
  assert.ok(bHex.hexes_red === 3 && bHex.hexes_blue === 1,
    'hexes_red/hexes_blue = 3/1 for a hand-built 4-unit board (' + bHex.hexes_red + '/' + bHex.hexes_blue + ')');

  var stEmpty = JSON.parse(JSON.stringify(st2)); stEmpty.match = st2.match; stEmpty.units = {};
  var skirmishIdEmpty = db.insertSkirmish(h2, runIdA, stEmpty, 'red', { seed: 9002 });
  var bEmpty = h2.db.prepare('SELECT hexes_red, hexes_blue FROM skirmishes WHERE id = ?').get(skirmishIdEmpty);
  assert.ok(bEmpty.hexes_red === 0 && bEmpty.hexes_blue === 0,
    'an empty board tallies 0/0 — a REAL tie, still stored as numbers, not NULL');

  // Legacy rows (written before this ticket) never had hexes_red/hexes_blue
  // populated — simulate one with a direct INSERT that omits the columns
  // entirely, and confirm listSkirmishes surfaces NULL rather than 0
  // (foldSkirmishes' "a missing pair is not a fabricated 0/0 tie" contract).
  h2.db.prepare(
    'INSERT INTO skirmishes (run_id, version, map, winner, first_player, turns) VALUES (?,?,?,?,?,?)'
  ).run(runIdA, '9.9-test', E.MAPS[0].name, 'red', 'red', 10);
  var legacyRows = db.listSkirmishes(h2, runIdA).filter(function (r) { return r.hexesRed == null; });
  assert.ok(legacyRows.length === 1 && legacyRows[0].hexesBlue == null,
    'a pre-WOA-038 row (hexes columns never written) round-trips as NULL, not 0');
});

/* ---------- slimSkirmishState (WOA-041: the --parallel worker contract) ---------- */
// balance-report's --parallel workers ship slimSkirmishState(st) through a
// JSON pipe to the parent, which calls insertSkirmish on the other side. Pin
// that exact trip: the slim state must land a skirmishes row identical to the
// full state's (same seed/fp), plus the same card_plays and timeline rows.
test('slimSkirmishState (WOA-041)', function () {
  var slimSt = JSON.parse(JSON.stringify(db.slimSkirmishState(st2))); // the worker->parent stdout trip
  var skirmishIdSlim = db.insertSkirmish(h2, runIdA, slimSt, 'red', { seed: 4242 });
  var fullRow = h2.db.prepare('SELECT * FROM skirmishes WHERE id = ?').get(skirmishIdA);
  var slimRow = h2.db.prepare('SELECT * FROM skirmishes WHERE id = ?').get(skirmishIdSlim);
  var driftCols = Object.keys(fullRow).filter(function (k) {
    return k !== 'id' && String(fullRow[k]) !== String(slimRow[k]);
  });
  assert.ok(driftCols.length === 0,
    'a JSON-round-tripped slim state lands an identical skirmishes row (drift: ' + (driftCols.join(',') || 'none') + ')');
  var cpSlim = h2.db.prepare('SELECT COUNT(*) c FROM card_plays WHERE skirmish_id = ?').get(skirmishIdSlim).c;
  assert.ok(cpSlim === st2.playLog.length, 'slim state lands one card_plays row per playLog entry (' + cpSlim + ')');
  var tlFull = h2.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(skirmishIdA).c;
  var tlSlim = h2.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(skirmishIdSlim).c;
  assert.ok(tlSlim === tlFull && tlSlim > 0, 'slim state lands the same timeline rows (' + tlSlim + ')');
});

/* ---------- baseline uniqueness (WOA-032, SPEC §7) ---------- */
test('baseline uniqueness (WOA-032)', function () {
  var vBase = '9.9-baseline-test';
  var runX = db.insertRun(h2, { version: vBase, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  assert.ok(h2.db.prepare('SELECT baseline FROM runs WHERE id = ?').get(runX).baseline === 1,
    'first baseline pin for a fresh version sets baseline=1');

  var runY = db.insertRun(h2, { version: vBase, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var flagsAfterY = h2.db.prepare('SELECT id, baseline FROM runs WHERE version = ? ORDER BY id').all(vBase);
  assert.ok(flagsAfterY.filter(function (r) { return r.baseline === 1; }).length === 1,
    'exactly one baseline=1 row after a SECOND pin (pinning-twice, pin #1)');
  assert.ok(flagsAfterY.filter(function (r) { return r.id === runY; })[0].baseline === 1 &&
     flagsAfterY.filter(function (r) { return r.id === runX; })[0].baseline === 0,
    'the newer run (Y) is now baseline; the older one (X) was cleared');

  db.setBaseline(h2, runX); // pinning-twice, pin #2: promote X back over Y via the standalone helper
  var flagsAfterX = h2.db.prepare('SELECT id, baseline FROM runs WHERE version = ? ORDER BY id').all(vBase);
  assert.ok(flagsAfterX.filter(function (r) { return r.baseline === 1; }).length === 1,
    'exactly one baseline=1 row after re-pinning via setBaseline (pinning-twice, pin #2)');
  assert.ok(flagsAfterX.filter(function (r) { return r.id === runX; })[0].baseline === 1 &&
     flagsAfterX.filter(function (r) { return r.id === runY; })[0].baseline === 0,
    'setBaseline(runX) promotes X and clears Y');

  // a pin scoped to ONE version must never touch another version's flag
  db.insertRun(h2, { version: '9.9-other-version', kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var stillX = h2.db.prepare('SELECT baseline FROM runs WHERE id = ?').get(runX).baseline;
  assert.ok(stillX === 1, 'pinning a baseline on a DIFFERENT version leaves this version’s baseline untouched');

  // NULL-version runs: `version IS ?` must clear NULL-version baselines too (not just non-NULL, "= NULL" never matches in SQL)
  db.insertRun(h2, { kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true }); // version omitted -> NULL
  var nullB = db.insertRun(h2, { kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var nullFlags = h2.db.prepare('SELECT id, baseline FROM runs WHERE version IS NULL ORDER BY id').all();
  assert.ok(nullFlags.filter(function (r) { return r.baseline === 1; }).length === 1,
    'NULL-version runs also keep exactly one baseline (IS, not =, comparison)');
  assert.ok(nullFlags.filter(function (r) { return r.id === nullB; })[0].baseline === 1,
    'the later NULL-version pin wins, the earlier one cleared');

  db.close(h2);
});
