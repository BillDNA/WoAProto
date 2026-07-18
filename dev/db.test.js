#!/usr/bin/env node
/* dev/db.test.js — tests for dev/db.js (node:sqlite persistence layer).
   Zero deps; uses a temp DB under os.tmpdir(). Run: node dev/db.test.js
   Exit 0 = all green, 1 = something failed. */
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var cp = require('child_process');

var db = require(path.join(__dirname, 'db.js'));
var E = require(path.join(__dirname, '..', 'game', 'engine.js'));

var passes = 0, failures = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log('  ok  - ' + msg); }
  else { failures++; console.error('  FAIL - ' + msg); }
}
function section(name) { console.log('\n' + name); }

var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-db-test-'));
var dbFile = path.join(tmpDir, 'test.db');

try {
  /* ---------- schema creation is idempotent ---------- */
  section('schema');
  var h = db.open(dbFile);
  db.close(h);
  h = db.open(dbFile); // second open on the same file must not throw or duplicate
  var tables = h.db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map(function (r) { return r.name; });
  ok(tables.join(',') === 'battles,card_plays,runs,timeline',
    'all four tables exist after re-open (got: ' + tables.join(',') + ')');
  var idx = h.db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").get().c;
  ok(idx === 4, 'all four indexes exist (got ' + idx + ')');
  var mode = h.db.prepare('PRAGMA journal_mode').get();
  ok(String(mode[Object.keys(mode)[0]]).toLowerCase() === 'wal', 'journal_mode is WAL');

  /* ---------- insertRun / insertBattle round-trip with a REAL battle ---------- */
  section('round-trip (real simBattle state)');
  var st = E.simBattle(E.MAPS[0], 1234, 'red', 'normal', 'normal');
  ok(st.phase === 'battle-over', 'simBattle(MAPS[0], 1234) finished (phase ' + st.phase + ')');

  var runId = db.insertRun(h, {
    version: E.VERSION, kind: 'balance', redAi: 'normal', blueAi: 'normal',
    n: 1, tool: 'db.test.js', notes: 'round-trip test'
  });
  ok(runId === 1, 'insertRun returned id 1 (got ' + runId + ')');
  var runRow = h.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
  ok(runRow.kind === 'balance' && runRow.red_ai === 'normal' && runRow.n === 1,
    'runs row round-trips (kind/red_ai/n)');
  ok(typeof runRow.ts === 'string' && runRow.ts.indexOf('T') > 0, 'ts defaulted to an ISO string (' + runRow.ts + ')');

  var battleId = db.insertBattle(h, runId, st, 'red', { seed: 1234 });
  var b = h.db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId);
  ok(b.run_id === runId && b.version === E.VERSION, 'battle carries run_id + version');
  ok(b.map === E.MAPS[0].name, 'map name matches (' + b.map + ')');
  ok(b.seed === 1234, 'extra.seed stored as the battle seed');
  ok(b.first_player === 'red', 'first_player stored');
  ok(b.winner === st.battleWinner, 'winner matches st.battleWinner (' + b.winner + ')');
  ok(b.win_type === st.winType, 'win_type matches (' + b.win_type + ')');
  ok(b.turns === st.turnNumber, 'turns matches st.turnNumber (' + b.turns + ')');
  ok(b.fs_red === E.fieldScore(st, 'red') && b.fs_blue === E.fieldScore(st, 'blue'),
    'fs_red/fs_blue = fieldScore of surviving units (' + b.fs_red + '/' + b.fs_blue + ')');
  ok(b.kill_tail === Math.max(0, st.turnNumber - (st.lastKillTurn || 0)),
    'kill_tail = turns - lastKillTurn (' + b.kill_tail + ')');
  ok(b.lead_changes === (st.leadChanges || 0), 'lead_changes matches (' + b.lead_changes + ')');
  ok(b.zero_kill === ((st.vp.red + st.vp.blue === 0) ? 1 : 0), 'zero_kill flag matches');
  ok(b.tiebreak === ((st.winType === 'attrition' && b.fs_red === b.fs_blue) ? 1 : 0), 'tiebreak flag matches');
  ok(b.attacks === (st.stats.attacks || 0) && b.swaps === (st.stats.swaps || 0) &&
     b.marches === (st.stats.marches || 0) && b.deploys === (st.stats.deploys || 0),
    'attacks/swaps/marches/deploys copied from st.stats');
  ok(b.first_blood === (st.stats.firstBlood || null), 'first_blood matches (' + b.first_blood + ')');
  // WOA-016: reserve-held-at-end, computed independently here from st.reserves
  // to prove db.js's own reservesLeft() reads the same source of truth.
  function reservesLeft(sideReserves) {
    var n = 0; Object.keys(E.UNITS).forEach(function (t) { n += sideReserves[t] || 0; }); return n;
  }
  ok(b.res_end_red === reservesLeft(st.reserves.red) && b.res_end_blue === reservesLeft(st.reserves.blue),
    'res_end_red/res_end_blue = pieces left in st.reserves at battle end (' + b.res_end_red + '/' + b.res_end_blue + ')');

  /* ---------- card_plays ---------- */
  section('card_plays');
  var plays = h.db.prepare('SELECT * FROM card_plays WHERE battle_id = ? ORDER BY id').all(battleId);
  ok(plays.length === st.playLog.length,
    'one card_plays row per playLog entry (' + plays.length + ' = ' + st.playLog.length + ')');
  var allMatch = plays.every(function (r, i) {
    var e = st.playLog[i];
    return r.side === e.p && r.card_id === e.id && r.mode === e.mode &&
      r.turn === e.turn && r.seen === e.seen && r.noop === (e.noop ? 1 : 0) &&
      r.won === (e.p === st.battleWinner ? 1 : 0);
  });
  ok(allMatch, 'every row matches its playLog entry (side/card/mode/turn/seen/noop/won)');
  var wonRows = h.db.prepare('SELECT COUNT(*) c FROM card_plays WHERE battle_id = ? AND won = 1').get(battleId).c;
  var wonExpected = st.playLog.filter(function (e) { return e.p === st.battleWinner; }).length;
  ok(wonRows === wonExpected, 'won=1 count equals winner-side plays (' + wonRows + ')');

  /* ---------- timeline: real battles carry one; absence is tolerated ---------- */
  section('timeline');
  // simBattle states carry fsTimeline since the V1 seams commit — a real battle
  // should have produced per-turn rows above.
  var tl0 = h.db.prepare('SELECT COUNT(*) c FROM timeline WHERE battle_id = ?').get(battleId).c;
  ok(tl0 === (st.fsTimeline ? st.fsTimeline.length : 0) && tl0 > 0,
    'a real battle lands its per-turn timeline (' + tl0 + ' rows)');
  var noTl = JSON.parse(JSON.stringify(st)); noTl.match = st.match; delete noTl.fsTimeline;
  var battleId0 = db.insertBattle(h, runId, noTl, 'red', { seed: 1234 });
  var tlAbsent = h.db.prepare('SELECT COUNT(*) c FROM timeline WHERE battle_id = ?').get(battleId0).c;
  ok(tlAbsent === 0, 'a state without fsTimeline (pre-V1 save) -> zero rows, tolerated silently');

  st.fsTimeline = [[2, 2], [4, 2], [4, 5]]; // synthetic, to pin the column mapping
  var battleId2 = db.insertBattle(h, runId, st, 'blue', { seed: 1234 });
  var tl = h.db.prepare('SELECT turn, fs_red, fs_blue FROM timeline WHERE battle_id = ? ORDER BY turn').all(battleId2);
  ok(tl.length === 3, 'synthetic 3-entry fsTimeline -> 3 rows (got ' + tl.length + ')');
  ok(tl[0].turn === 1 && tl[2].turn === 3, 'timeline turns are 1-based (index 0 = turn 1)');
  ok(tl[1].fs_red === 4 && tl[1].fs_blue === 2 && tl[2].fs_blue === 5, 'fs values land in the right columns');
  delete st.fsTimeline;

  /* ---------- unfinished states are rejected (transaction leaves no debris) ---------- */
  section('guards');
  var threw = false;
  try { db.insertBattle(h, runId, { phase: 'choose-card' }, 'red'); } catch (e) { threw = true; }
  ok(threw, 'insertBattle throws on a non-finished state');
  var threwKind = false;
  try { db.insertRun(h, { version: E.VERSION, kind: 'nonsense' }); } catch (e) { threwKind = true; }
  ok(threwKind, 'insertRun rejects an unknown kind');
  ok(h.db.prepare('SELECT COUNT(*) c FROM battles').get().c === 3, 'failed inserts left no battles rows');

  /* ---------- a GROUP BY through the same handle ---------- */
  section('GROUP BY via the handle');
  var g = h.db.prepare('SELECT map, COUNT(*) n, AVG(turns) avg_turns FROM battles GROUP BY map').all();
  ok(g.length === 1 && g[0].map === E.MAPS[0].name, 'one map group (' + (g[0] && g[0].map) + ')');
  ok(g[0].n === 3, 'all three battles counted (n=' + g[0].n + ')');
  ok(g[0].avg_turns === st.turnNumber, 'AVG(turns) is sane (' + g[0].avg_turns + ')');

  db.close(h);

  /* ---------- db-query.js CLI against the temp db ---------- */
  section('db-query.js CLI');
  var cli = path.join(__dirname, 'db-query.js');
  var out = cp.execFileSync(process.execPath,
    [cli, '--db', dbFile, 'SELECT map, COUNT(*) n, AVG(turns) avg_turns FROM battles GROUP BY map'],
    { encoding: 'utf8' });
  ok(out.indexOf('map') >= 0 && out.indexOf('avg_turns') >= 0, 'CLI prints the column header');
  ok(out.indexOf(E.MAPS[0].name) >= 0, 'CLI prints the map row (' + E.MAPS[0].name + ')');
  ok(/\(1 row\)/.test(out), 'CLI prints the row count');

  var schemaOut = cp.execFileSync(process.execPath, [cli, '--db', dbFile], { encoding: 'utf8' });
  ok(schemaOut.indexOf('CREATE TABLE') >= 0 && schemaOut.indexOf('battles') >= 0,
    'no-arg CLI prints the schema');
  ok(/-- 3 rows/.test(schemaOut), 'no-arg CLI prints per-table row counts (battles: 3)');

  var wrote = true;
  try {
    cp.execFileSync(process.execPath, [cli, '--db', dbFile, "DELETE FROM battles"],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { wrote = false; }
  ok(!wrote, 'CLI connection is read-only (DELETE rejected)');

  /* ---------- run identity + trace (WOA-032, SPEC §7 / §4) ---------- */
  // Separate handle/file from the counts-pinned assertions above (the CLI
  // section just asserted exact row counts on dbFile — don't perturb it).
  section('run identity + trace (WOA-032)');
  var dbFile2 = path.join(tmpDir, 'runs.db');
  var h2 = db.open(dbFile2);

  var runIdA = db.insertRun(h2, {
    version: '9.9-test', kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 5, tool: 'db.test.js',
    deck: 'default', mapset: 'core7', seedBase: 7919, label: 'run A'
  });
  var rowA = h2.db.prepare('SELECT * FROM runs WHERE id = ?').get(runIdA);
  ok(rowA.deck === 'default' && rowA.mapset === 'core7' && rowA.seed_base === 7919 && rowA.label === 'run A',
    'runs row carries deck/mapset/seed_base/label (SPEC §7)');
  ok(rowA.baseline === 0, 'baseline defaults to 0 when not requested');

  var st2 = E.simBattle(E.MAPS[0], 4242, 'red', 'normal', 'normal');
  var battleIdA = db.insertBattle(h2, runIdA, st2, 'red', { seed: 4242 });
  var bA = h2.db.prepare('SELECT run_id, trace FROM battles WHERE id = ?').get(battleIdA);
  ok(bA.run_id === runIdA, 'battle row references its run id (run_id column)');
  var trace = JSON.parse(bA.trace);
  ok(trace && typeof trace === 'object', 'battles.trace is valid JSON');
  ['v', 'map', 'seed', 'fp', 'winner', 'winType', 'turns', 'trace', 'units'].forEach(function (k) {
    ok(k in trace, 'trace envelope has "' + k + '" (SPEC §4 shape)');
  });
  ok(Array.isArray(trace.trace) && trace.trace.length === st2.playLog.length,
    'trace.trace = st.playLog verbatim (' + trace.trace.length + ' entries)');
  ok(JSON.stringify(trace.units) === JSON.stringify(st2.unitMetrics),
    'trace.units = st.unitMetrics verbatim');
  ok(Object.keys(trace.units).indexOf('infantry') >= 0,
    'unitMetrics keyed by FULL unit-type name "infantry" (WOA-031 feed-forward), not "inf" shorthand');

  /* ---------- baseline uniqueness (WOA-032, SPEC §7) ---------- */
  section('baseline uniqueness (WOA-032)');
  var vBase = '9.9-baseline-test';
  var runX = db.insertRun(h2, { version: vBase, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  ok(h2.db.prepare('SELECT baseline FROM runs WHERE id = ?').get(runX).baseline === 1,
    'first baseline pin for a fresh version sets baseline=1');

  var runY = db.insertRun(h2, { version: vBase, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var flagsAfterY = h2.db.prepare('SELECT id, baseline FROM runs WHERE version = ? ORDER BY id').all(vBase);
  ok(flagsAfterY.filter(function (r) { return r.baseline === 1; }).length === 1,
    'exactly one baseline=1 row after a SECOND pin (pinning-twice, pin #1)');
  ok(flagsAfterY.filter(function (r) { return r.id === runY; })[0].baseline === 1 &&
     flagsAfterY.filter(function (r) { return r.id === runX; })[0].baseline === 0,
    'the newer run (Y) is now baseline; the older one (X) was cleared');

  db.setBaseline(h2, runX); // pinning-twice, pin #2: promote X back over Y via the standalone helper
  var flagsAfterX = h2.db.prepare('SELECT id, baseline FROM runs WHERE version = ? ORDER BY id').all(vBase);
  ok(flagsAfterX.filter(function (r) { return r.baseline === 1; }).length === 1,
    'exactly one baseline=1 row after re-pinning via setBaseline (pinning-twice, pin #2)');
  ok(flagsAfterX.filter(function (r) { return r.id === runX; })[0].baseline === 1 &&
     flagsAfterX.filter(function (r) { return r.id === runY; })[0].baseline === 0,
    'setBaseline(runX) promotes X and clears Y');

  // a pin scoped to ONE version must never touch another version's flag
  db.insertRun(h2, { version: '9.9-other-version', kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var stillX = h2.db.prepare('SELECT baseline FROM runs WHERE id = ?').get(runX).baseline;
  ok(stillX === 1, 'pinning a baseline on a DIFFERENT version leaves this version’s baseline untouched');

  // NULL-version runs: `version IS ?` must clear NULL-version baselines too (not just non-NULL, "= NULL" never matches in SQL)
  db.insertRun(h2, { kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true }); // version omitted -> NULL
  var nullB = db.insertRun(h2, { kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var nullFlags = h2.db.prepare('SELECT id, baseline FROM runs WHERE version IS NULL ORDER BY id').all();
  ok(nullFlags.filter(function (r) { return r.baseline === 1; }).length === 1,
    'NULL-version runs also keep exactly one baseline (IS, not =, comparison)');
  ok(nullFlags.filter(function (r) { return r.id === nullB; })[0].baseline === 1,
    'the later NULL-version pin wins, the earlier one cleared');

  db.close(h2);
} catch (e) {
  failures++;
  console.error('\nUNEXPECTED ERROR: ' + (e && e.stack || e));
} finally {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
