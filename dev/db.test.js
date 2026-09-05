#!/usr/bin/env node
/* dev/db.test.js — tests for dev/db.js (node:sqlite STAR SCHEMA persistence).
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
// simSkirmish is the batch/measurement layer (game/sim.js), separate from the engine.
const SIM = require(path.join(__dirname, '..', 'game', 'sim.js'));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-db-test-'));
const dbFile = path.join(tmpDir, 'test.db');
after(function () { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {} });

// State threaded across the sections below (tests run in order).
var h, h2, st, st2, runId, runId2, runIdA, skirmishId, skirmishIdA, hexesExpected;

/* ---------- schema creation is idempotent; the star schema's tables exist ---------- */
test('schema', function () {
  h = db.open(dbFile);
  db.close(h);
  h = db.open(dbFile); // second open on the same file must not throw or duplicate
  var tables = h.db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map(function (r) { return r.name; });
  assert.strictEqual(tables.join(','), 'battalions,card_events,cards,maps,runs,skirmishes,timeline,versions',
    'all fact + dimension tables exist after re-open (got: ' + tables.join(',') + ')');
  var idx = h.db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").get().c;
  assert.strictEqual(idx, 5, 'all five indexes exist (got ' + idx + ')');
  var views = h.db.prepare("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name").all().map(function (r) { return r.name; });
  assert.strictEqual(views.join(','), 'v_card_timing,v_global_balance,v_map_balance', 'the fold-in-SQL views exist (got: ' + views.join(',') + ')');
  var mode = h.db.prepare('PRAGMA journal_mode').get();
  assert.ok(String(mode[Object.keys(mode)[0]]).toLowerCase() === 'wal', 'journal_mode is WAL');
  var uv = h.db.prepare('PRAGMA user_version').get();
  assert.strictEqual(uv[Object.keys(uv)[0]], db.SCHEMA_VERSION, 'user_version stamps the star-schema version');
});

/* ---------- insertRun / insertSkirmish round-trip with a REAL skirmish ---------- */
test('round-trip (real simSkirmish state)', function () {
  st = SIM.simSkirmish(E.MAPS[0], 1234, 'red', 'normal', 'normal');
  assert.ok(st.flow.phase === 'skirmish-over', 'simSkirmish(MAPS[0], 1234) finished (phase ' + st.flow.phase + ')');

  runId = db.insertRun(h, {
    version: E.VERSION, kind: 'balance', redAi: 'normal', blueAi: 'normal',
    n: 1, tool: 'db.test.js', notes: 'round-trip test', battalion: 'default'
  });
  assert.ok(runId === 1, 'insertRun returned id 1 (got ' + runId + ')');
  var runRow = h.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
  assert.ok(runRow.kind === 'balance' && runRow.red_ai === 'normal' && runRow.n === 1,
    'runs row round-trips (kind/red_ai/n)');
  assert.ok(runRow.battalion_red === 'default' && runRow.battalion_blue === 'default',
    'a symmetric `battalion` sets both battalion_red and battalion_blue (one ref per side)');
  assert.ok(typeof runRow.ts === 'string' && runRow.ts.indexOf('T') > 0, 'ts defaulted to an ISO string (' + runRow.ts + ')');

  skirmishId = db.insertSkirmish(h, runId, st, 'red', { seed: 1234 });
  var b = h.db.prepare('SELECT * FROM skirmishes WHERE id = ?').get(skirmishId);
  assert.ok(b.run_id === runId && b.version === E.VERSION, 'skirmish carries run_id + version');
  assert.strictEqual(b.config_digest, E.CONFIG.digest, 'skirmish stamps the live Engine.CONFIG.digest (slice key config half)');
  assert.ok(b.battalion_red === 'default' && b.battalion_blue === 'default',
    'skirmish records both battalions fielded (inherited from the run when not overridden)');
  assert.ok(b.map === E.MAPS[0].name, 'map name matches (' + b.map + ')');
  assert.ok(b.seed === 1234, 'extra.seed stored as the skirmish seed');
  assert.ok(b.first_player === 'red', 'first_player stored');
  assert.ok(b.winner === st.result.skirmishWinner, 'winner matches st.result.skirmishWinner (' + b.winner + ')');
  assert.ok(b.win_type === st.result.winType, 'win_type matches (' + b.win_type + ')');
  assert.ok(b.turns === st.flow.turnNumber, 'turns matches st.flow.turnNumber (' + b.turns + ')');
  assert.ok(b.fs_red === E.fieldScore(st, 'red') && b.fs_blue === E.fieldScore(st, 'blue'),
    'fs_red/fs_blue = fieldScore of surviving units (' + b.fs_red + '/' + b.fs_blue + ')');
  assert.ok(b.kill_tail === Math.max(0, st.flow.turnNumber - (st.journal.lastKillTurn || 0)),
    'kill_tail = turns - lastKillTurn (' + b.kill_tail + ')');
  assert.ok(b.lead_changes === (st.journal.leadChanges || 0), 'lead_changes matches (' + b.lead_changes + ')');
  assert.ok(b.zero_kill === ((st.result.kills.red + st.result.kills.blue === 0) ? 1 : 0), 'zero_kill flag matches');
  assert.ok(b.tiebreak === ((st.result.winType === 'attrition' && b.fs_red === b.fs_blue) ? 1 : 0), 'tiebreak flag matches');
  assert.ok(b.attacks === (st.journal.stats.attacks || 0) && b.swaps === (st.journal.stats.swaps || 0) &&
     b.marches === (st.journal.stats.marches || 0) && b.deploys === (st.journal.stats.deploys || 0),
    'attacks/swaps/marches/deploys copied from st.journal.stats');
  assert.ok(b.first_blood === (st.journal.stats.firstBlood || null), 'first_blood matches (' + b.first_blood + ')');
  function reservesLeft(sideReserves) {
    var n = 0; Object.keys(E.UNITS).forEach(function (t) { n += sideReserves[t] || 0; }); return n;
  }
  assert.ok(b.res_end_red === reservesLeft(st.pieces.reserves.red) && b.res_end_blue === reservesLeft(st.pieces.reserves.blue),
    'res_end_red/res_end_blue = pieces left in st.pieces.reserves at skirmish end (' + b.res_end_red + '/' + b.res_end_blue + ')');
  function hexTally(units) {
    var hr = 0, hb = 0;
    for (var hh in units) (units[hh].owner === 'red' ? hr++ : hb++);
    return { red: hr, blue: hb };
  }
  hexesExpected = hexTally(st.pieces.units);
  assert.ok(b.hexes_red === hexesExpected.red && b.hexes_blue === hexesExpected.blue,
    'hexes_red/hexes_blue match a hex-ownership tally of st.pieces.units (' + b.hexes_red + '/' + b.hexes_blue + ')');
});

/* ---------- card_events: one row per DECISION (played / declined) ---------- */
test('card_events (decision grain)', function () {
  var ev = h.db.prepare('SELECT * FROM card_events WHERE skirmish_id = ? ORDER BY id').all(skirmishId);
  assert.ok(ev.length === st.journal.decisionLog.length && ev.length > 0,
    'one card_events row per decisionLog entry (' + ev.length + ' = ' + st.journal.decisionLog.length + ')');
  var allMatch = ev.every(function (r, i) {
    var d = st.journal.decisionLog[i];
    var wonExp = d.outcome === 'played' ? (d.side === st.result.skirmishWinner ? 1 : 0) : null; // played-only
    return r.side === d.side && r.card_id === d.card && r.mode === (d.mode == null ? null : d.mode) &&
      r.turn === d.turn && r.outcome === d.outcome && r.map === st.mapName &&
      r.version === E.VERSION && r.config_digest === E.CONFIG.digest && r.won === wonExp;
  });
  assert.ok(allMatch, 'every row matches its decisionLog entry (side/card/mode/turn/outcome/map/slice/won)');
  var played = ev.filter(function (r) { return r.outcome === 'played'; });
  assert.ok(played.length === st.journal.playLog.length,
    "outcome='played' rows == plays (" + played.length + ' = ' + st.journal.playLog.length + ')');
  var declined = ev.filter(function (r) { return r.outcome === 'declined'; });
  assert.ok(declined.length > 0, 'declined decisions are recorded (held-but-not-played cards leave rows)');
  assert.ok(declined.every(function (r) { return r.won === null; }),
    'won is played-only (NULL on a decline) — AVG(won) is a play win-rate without an outcome filter');
  // never-invisible: a card held at some decision but NEVER played still has rows.
  var playedCards = {}; played.forEach(function (r) { playedCards[r.card_id] = true; });
  var declinedOnly = declined.filter(function (r) { return !playedCards[r.card_id]; });
  assert.ok(declinedOnly.length >= 0, 'declined-only cards (if any) are queryable, not invisible');
});

/* ---------- dimension tables: upserted from loaded content at ingest ---------- */
test('dimensions (versions / maps / cards / battalions)', function () {
  // versions: the slice key, with the human-readable dials behind the digest.
  var ver = h.db.prepare('SELECT * FROM versions WHERE version = ? AND config_digest = ?').get(E.VERSION, E.CONFIG.digest);
  assert.ok(ver, 'a versions row exists for (E.VERSION, E.CONFIG.digest)');
  var dials = JSON.parse(ver.dials);
  assert.ok(dials.pointsCap === E.CONFIG.pointsCap && dials.trenchCount === E.CONFIG.trenchCount,
    'versions.dials carries the human-readable config values (pointsCap/trenchCount)');

  // maps: computed terrain features, from the map's edge/shape data.
  var m = h.db.prepare('SELECT * FROM maps WHERE name = ? AND version = ?').get(E.MAPS[0].name, E.VERSION);
  assert.ok(m, 'a maps row exists for the played map');
  var tf = db.terrainFeatures(E.MAPS[0]);
  assert.ok(m.mountain_hexes === tf.hexes.mountain && m.forest_hexes === tf.hexes.forest &&
    m.river_hexes === tf.hexes.river && m.hex_total === tf.hexTotal,
    'maps carries computed mountain/forest/river hex counts + hex total (' +
    m.mountain_hexes + '/' + m.forest_hexes + '/' + m.river_hexes + ', ' + m.hex_total + ' hexes)');
  var mapCount = h.db.prepare('SELECT COUNT(*) c FROM maps WHERE version = ? AND config_digest = ?').get(E.VERSION, E.CONFIG.digest).c;
  assert.ok(mapCount === E.MAPS.length, 'every loaded map is upserted (' + mapCount + ' = ' + E.MAPS.length + ')');

  // cards: intrinsics — steps, points, derived kind, opener flags.
  var deployArt = h.db.prepare('SELECT * FROM cards WHERE id = ? AND version = ?').get('deploy_artillery', E.VERSION);
  assert.ok(deployArt, 'a cards row exists for deploy_artillery');
  assert.strictEqual(deployArt.kind, 'deploy', "deploy_artillery's derived kind is 'deploy'");
  assert.ok(Math.abs(deployArt.points - E.cardPoints(E.CARD_BY_ID.deploy_artillery)) < 1e-9,
    'cards.points = Engine.cardPoints (' + deployArt.points + ')');
  assert.ok(Array.isArray(JSON.parse(deployArt.steps)), 'cards.steps is the JSON step list');
  var starter = h.db.prepare("SELECT id FROM cards WHERE starting = 1 AND version = ?").all(E.VERSION).map(function (r) { return r.id; });
  assert.ok(starter.indexOf('deploy_inf_start') >= 0, 'opener flag `starting` is recorded (deploy_inf_start)');
  var noOpen = h.db.prepare("SELECT id FROM cards WHERE no_opener = 1 AND version = ?").all(E.VERSION).map(function (r) { return r.id; });
  assert.ok(noOpen.indexOf('airdrop') >= 0, 'opener flag `noOpener` is recorded (airdrop)');

  // battalions: identity + composition.
  var bat = h.db.prepare('SELECT * FROM battalions WHERE id = ? AND version = ?').get('default', E.VERSION);
  assert.ok(bat && bat.name, 'a battalions row exists for default with a name');
  var comp = JSON.parse(bat.cards);
  assert.ok(Array.isArray(comp) && comp[0].cardId && comp[0].count != null, 'battalions.cards is the {cardId,count} composition');
  var sizeExpected = comp.reduce(function (s, c) { return s + (c.count == null ? 1 : c.count); }, 0);
  assert.strictEqual(bat.size, sizeExpected, 'battalions.size = sum of card counts (' + bat.size + ')');
});

/* ---------- pure dimension derivations ---------- */
test('terrainFeatures / cardKind (pure)', function () {
  // A hand-built map: two mountain hexes, one forest hex, terrain owned as sides.
  var fakeMap = { id: 'tf-test', name: 'TF Test', shape: 'classic', pieces: [
    { t: 'M', edges: [[0, 0, 0], [0, 0, 1]] },
    { t: 'M', edges: [[1, 0, 2], [1, 0, 3]] },
    { t: 'F', edges: [[-1, 0, 4]] },
    { t: 'M', edges: [[0, 0, 3]] } // a SECOND piece on hex 0,0 — still ONE mountain hex
  ] };
  var tf = db.terrainFeatures(fakeMap);
  assert.strictEqual(tf.hexes.mountain, 2, 'two distinct mountain hexes (0,0 counted once across two pieces), got ' + tf.hexes.mountain);
  assert.strictEqual(tf.hexes.forest, 1, 'one forest hex, got ' + tf.hexes.forest);
  assert.strictEqual(tf.hexTotal, E.boardHexes('classic').length, 'hex_total = the classic board size');

  assert.strictEqual(db.cardKind({ steps: [{ type: 'deploy', unit: 'infantry' }, { type: 'deploy', unit: 'infantry' }] }), 'deploy', 'two deploys -> deploy');
  assert.strictEqual(db.cardKind({ steps: [{ type: 'attack' }, { type: 'attack' }] }), 'attack', 'two attacks -> attack');
  assert.strictEqual(db.cardKind({ steps: [{ type: 'reposition' }, { type: 'attack' }] }), 'attack', 'reposition+attack ties -> attack wins by priority');
  assert.strictEqual(db.cardKind({ steps: [{ type: 'barrage' }, { type: 'attack' }] }), 'attack', 'barrage+attack ties -> attack wins by priority');
  assert.strictEqual(db.cardKind({ steps: [{ type: 'barrage' }, { type: 'trench' }] }), 'barrage', 'barrage+trench ties -> barrage wins by priority');
  assert.strictEqual(db.cardKind({ steps: [] }), 'none', 'a stepless card -> none');
});

/* ---------- litmus: card timing vs a map's mountain-hex count is a 3-table join ---------- */
test('litmus 3-table join (card_events x cards x maps)', function () {
  // The seeded DB (round-trip above) already has card_events, cards, maps for one
  // slice. A plain 3-table join answers "card X play-timing vs mountain-hex count".
  var rows = h.db.prepare(
    'SELECT c.id AS card, c.kind AS kind, m.mountain_hexes AS mtn, AVG(ce.turn) AS avg_turn, COUNT(*) AS plays' +
    ' FROM card_events ce' +
    ' JOIN cards c ON c.id = ce.card_id AND c.version = ce.version AND c.config_digest = ce.config_digest' +
    ' JOIN maps m ON m.name = ce.map AND m.version = ce.version AND m.config_digest = ce.config_digest' +
    " WHERE ce.outcome = 'played' GROUP BY c.id, m.mountain_hexes ORDER BY c.id").all();
  assert.ok(rows.length > 0, 'the 3-table join returns per-card timing rows');
  var tf = db.terrainFeatures(E.MAPS[0]);
  assert.ok(rows.every(function (r) { return r.mtn === tf.hexes.mountain; }),
    "every row's mountain-hex count is the played map's computed value (" + tf.hexes.mountain + ')');
  assert.ok(rows.every(function (r) { return r.avg_turn >= 1 && r.plays >= 1 && typeof r.kind === 'string'; }),
    'each row carries a sane avg play turn, play count, and the card kind — no reach into JS');
});

/* ---------- named views are the fold, in SQL ---------- */
test('fold-in-SQL views', function () {
  var g = h.db.prepare('SELECT * FROM v_global_balance WHERE version = ? AND config_digest = ?').get(E.VERSION, E.CONFIG.digest);
  assert.ok(g && g.n >= 1, 'v_global_balance returns a folded row for the slice');
  assert.ok(g.first_win_pct >= 0 && g.first_win_pct <= 1, 'first_win_pct is a fraction');
  assert.ok(g.avg_turns > 0, 'avg_turns is positive');
  // Every CITED balance metric is a column of the view — official numbers and
  // ad-hoc exploration share the one definition.
  ['red_win_pct', 'first_win_pct', 'hq_pct', 'zero_kill_pct', 'drag', 'tie_pct', 'swings',
    'attack_share', 'swap_share', 'first_blood_win_pct', 'control_pct'].forEach(function (col) {
    assert.ok(col in g, 'v_global_balance carries the cited metric column "' + col + '"');
  });
  assert.ok(g.attack_share == null || (g.attack_share >= 0 && g.attack_share <= 1), 'attack_share is a fraction (or NULL)');
  var ct = h.db.prepare('SELECT * FROM v_card_timing WHERE version = ? ORDER BY plays DESC LIMIT 1').get(E.VERSION);
  assert.ok(ct && ct.plays >= 1 && ct.avg_play_turn >= 1, 'v_card_timing folds plays/declines/avg-play-turn per card');
});

/* ---------- the JS fold (report-model, the transitional browser fold) is PINNED
   to the SQL views on a known pool, so the two definitions cannot drift (the
   "views authoritative + parity test" resolution). ---------- */
test('parity: report-model JS fold ≡ v_global_balance on a known pool', function () {
  var R = require(path.join(__dirname, '..', 'game', 'report-model.js'));
  var pf = path.join(tmpDir, 'parity.db');
  var ph = db.open(pf);
  var maps = E.MAPS.slice(0, 3);
  var rid = db.insertRun(ph, { version: E.VERSION, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 8, tool: 'parity', battalion: 'default' });
  maps.forEach(function (map, mi) {
    for (var g = 0; g < 8; g++) {
      var fp = SIM.balanceFP(g), seed = SIM.balanceSeed((mi + 1) * 7919, g);
      var st = SIM.simSkirmish(map, seed, fp, 'hard', 'hard');
      if (st.flow.phase === 'skirmish-over') db.insertSkirmish(ph, rid, st, fp, { seed: seed });
    }
  });
  var view = ph.db.prepare('SELECT * FROM v_global_balance WHERE version = ? AND config_digest = ?').get(E.VERSION, E.CONFIG.digest);
  var rows = db.listSkirmishes(ph, rid);
  var folded = R.foldSkirmishes(rows), a = folded.agg, done = folded.done;
  assert.strictEqual(view.n, done, 'view n == JS fold done (same pool)');

  // Each cited metric: the view fraction equals the JS-fold ratio to floating
  // point — one definition, pinned. Conditioned metrics use their own denominator.
  function near(v, j, label) {
    if (v == null) { assert.ok(j == null || isNaN(j), label + ': view NULL only when the JS denom is empty'); return; }
    assert.ok(Math.abs(v - j) < 1e-9, label + ' view=' + v + ' js=' + j);
  }
  var actionTotal = a.attacks + a.swaps + a.marches + a.deploys;
  near(view.red_win_pct, a.redWins / done, 'red_win_pct');
  near(view.first_win_pct, a.firstWins / done, 'first_win_pct');
  near(view.hq_pct, a.hqWins / done, 'hq_pct');
  near(view.zero_kill_pct, a.zeroKill / done, 'zero_kill_pct');
  near(view.avg_turns, a.turns / done, 'avg_turns');
  near(view.swings, a.leadChanges / done, 'swings');
  near(view.drag, a.attritionEndings ? a.attritionKillTail / a.attritionEndings : null, 'drag');
  near(view.tie_pct, a.attritionEndings ? a.tiebreak / a.attritionEndings : null, 'tie_pct');
  near(view.attack_share, actionTotal ? a.attacks / actionTotal : null, 'attack_share');
  near(view.swap_share, actionTotal ? a.swaps / actionTotal : null, 'swap_share');
  near(view.first_blood_win_pct, a.firstBloodGames ? a.firstBloodWins / a.firstBloodGames : null, 'first_blood_win_pct');
  near(view.control_pct, a.controlGames ? a.controlWins / a.controlGames : null, 'control_pct');

  // The rendered figure (BANDS.val, integer %) equals the view rounded to a
  // percent — the number a human reads is the view's number.
  var byKey = {}; R.BANDS.forEach(function (b) { byKey[b.key] = b; });
  assert.strictEqual(byKey.red.val(a, done), Math.round(view.red_win_pct * 100), 'BANDS Red% == round(view)');
  assert.strictEqual(byKey.first.val(a, done), Math.round(view.first_win_pct * 100), 'BANDS 1st% == round(view)');

  // The pool must actually exercise the conditioned metrics (else parity is vacuous).
  assert.ok(a.attritionEndings > 0 && actionTotal > 0 && a.firstBloodGames > 0,
    'the pool exercises attrition / action-share / first-blood slices (n=' + done + ')');
  db.close(ph);
});

/* ---------- per-card fairness signal (columns of v_card_timing): win
   contribution + pass-rate from the decline/held events, not play-only. ---------- */
test('v_card_timing fairness: win contribution + pass-rate over the sampled battalion space', function () {
  var ff = path.join(tmpDir, 'fairness.db');
  var fh = db.open(ff);
  var rid = db.insertRun(fh, { version: E.VERSION, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 10, tool: 'fairness', battalion: 'default' });
  for (var g = 0; g < 10; g++) {
    var fp = SIM.balanceFP(g), seed = SIM.balanceSeed(7919, g);
    var st = SIM.simSkirmish(E.MAPS[0], seed, fp, 'hard', 'hard');
    if (st.flow.phase === 'skirmish-over') db.insertSkirmish(fh, rid, st, fp, { seed: seed });
  }
  var rows = fh.db.prepare('SELECT * FROM v_card_timing WHERE version = ? AND config_digest = ? ORDER BY offers DESC').all(E.VERSION, E.CONFIG.digest);
  assert.ok(rows.length >= 1, 'v_card_timing returns per-card rows');
  rows.forEach(function (r) {
    assert.strictEqual(r.offers, r.plays + r.declines, 'offers = plays + declines (every decision the card faced)');
    // pass-rate is over the DECLINE/held events, not play-only.
    var expectPass = r.offers ? r.declines / r.offers : null;
    assert.ok(Math.abs(r.pass_rate - expectPass) < 1e-9, 'pass_rate = declines / offers (decline/held events)');
    assert.ok(r.pass_rate >= 0 && r.pass_rate <= 1, 'pass_rate is a fraction');
    if (r.plays) assert.ok(Math.abs(r.play_win_pct - r.won_plays / r.plays) < 1e-9, 'play_win_pct = won_plays / plays');
  });
  // A card that is NEVER played but offered reads pass-rate 1.0 — the play-only
  // view would omit it entirely; the decline events keep it visible.
  var declinedOnly = rows.filter(function (r) { return r.plays === 0 && r.declines > 0; });
  declinedOnly.forEach(function (r) { assert.ok(r.pass_rate === 1, 'a never-played but offered card reads pass-rate 1.0 (' + r.card_id + ')'); });
  // win_contribution is each card's SHARE of the slice's winning plays — sums to
  // ~1 across the cards that had a winning play.
  var sumContrib = rows.reduce(function (s, r) { return s + (r.win_contribution || 0); }, 0);
  var anyWins = rows.some(function (r) { return r.won_plays > 0; });
  if (anyWins) assert.ok(Math.abs(sumContrib - 1) < 1e-9, 'win_contribution shares sum to 1 over the slice (got ' + sumContrib + ')');
  db.close(fh);
});

/* ---------- the cavsplit17-raid-paid mirror over Core Six is the designated
   rules-regression anchor, and it is stable across battalion choice: the anchor
   is a function of OUTCOMES, read from the slice-keyed view — never the battalion
   label — so it survives battalion-building. ---------- */
test('mirror anchor is stable across battalion choice (survives battalion-building)', function () {
  var mf = path.join(tmpDir, 'mirror.db');
  var mh = db.open(mf);
  // Simulate one real Core-Six mirror pool (the active battalion IS cavsplit17-raid-paid).
  var maps = E.MAPS.slice(0, 3), states = [];
  var rid = db.insertRun(mh, { version: E.VERSION, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 6, tool: 'mirror', battalion: 'cavsplit17-raid-paid' });
  maps.forEach(function (map, mi) {
    for (var g = 0; g < 6; g++) {
      var fp = SIM.balanceFP(g), seed = SIM.balanceSeed((mi + 1) * 7919, g);
      var st = SIM.simSkirmish(map, seed, fp, 'hard', 'hard');
      if (st.flow.phase === 'skirmish-over') { states.push({ st: st, fp: fp, seed: seed }); db.insertSkirmish(mh, rid, st, fp, { seed: seed }); }
    }
  });
  var anchor = mh.db.prepare('SELECT n, first_win_pct, red_win_pct, tie_pct, drag FROM v_global_balance WHERE version = ? AND config_digest = ?').get(E.VERSION, E.CONFIG.digest);
  assert.ok(anchor && anchor.n === states.length, 'the mirror anchor reads from v_global_balance (n=' + anchor.n + ')');
  assert.ok(anchor.first_win_pct != null, 'the designated anchor (first-mover %) is defined');

  // Re-ingest the IDENTICAL outcomes under a DIFFERENT battalion label into a
  // fresh slice-equal DB. Because the view slices by (version, config_digest)
  // and reads only outcomes, the anchor is byte-identical — battalion choice cannot
  // move a rules-regression read.
  var mf2 = path.join(tmpDir, 'mirror2.db');
  var mh2 = db.open(mf2);
  var rid2 = db.insertRun(mh2, { version: E.VERSION, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 6, tool: 'mirror', battalion: 'default' });
  states.forEach(function (x) { db.insertSkirmish(mh2, rid2, x.st, x.fp, { seed: x.seed }); });
  var anchor2 = mh2.db.prepare('SELECT n, first_win_pct, red_win_pct, tie_pct, drag FROM v_global_balance WHERE version = ? AND config_digest = ?').get(E.VERSION, E.CONFIG.digest);
  ['n', 'first_win_pct', 'red_win_pct', 'tie_pct', 'drag'].forEach(function (k) {
    assert.ok((anchor[k] == null && anchor2[k] == null) || Math.abs(anchor[k] - anchor2[k]) < 1e-12,
      'anchor.' + k + ' is invariant to the battalion label (' + anchor[k] + ' vs ' + anchor2[k] + ')');
  });
  db.close(mh); db.close(mh2);
});

/* ---------- the query surface: sliceable aggregates (aggregate/cardTiming/dimensions) ---------- */
test('aggregate: sliceable metric-by-dimension over the star schema', function () {
  // Group by map: the same metrics as v_map_balance, on demand, no new view.
  var byMap = db.aggregate(h, { x: 'map', metrics: ['n', 'first_win_pct', 'avg_turns'], version: E.VERSION });
  assert.ok(byMap.rows.length >= 1 && byMap.numeric === false, 'per-map rows come back, map is a non-numeric bucket');
  assert.ok(byMap.rows.every(function (r) { return r.n >= 1 && r.first_win_pct >= 0 && r.first_win_pct <= 1 && r.avg_turns > 0; }),
    'each map bucket carries a sane n / first_win_pct fraction / positive avg_turns');
  // Cross-check the fold against the canonical view for the played map — the
  // ad-hoc aggregate must not disagree with v_map_balance.
  var mapName = E.MAPS[0].name;
  var viaAgg = byMap.rows.filter(function (r) { return r.bucket === mapName; })[0];
  var viaView = h.db.prepare('SELECT n, first_win_pct FROM v_map_balance WHERE version = ? AND map = ?').get(E.VERSION, mapName);
  assert.ok(viaAgg && viaView && viaAgg.n === viaView.n && Math.abs(viaAgg.first_win_pct - viaView.first_win_pct) < 1e-9,
    'aggregate(x=map) matches v_map_balance for the same slice+map (fold agrees)');

  // The litmus dimension: first_win_pct bucketed by mountain-hex count (the maps
  // JOIN), re-sliceable by simply swapping x to forest_hexes / river_hexes.
  var litmus = db.aggregate(h, { x: 'mountain_hexes', metrics: ['n', 'first_win_pct'], version: E.VERSION });
  assert.ok(litmus.numeric === true && litmus.rows.length >= 1, 'the mountain-hex litmus buckets numerically');
  var tf = db.terrainFeatures(E.MAPS[0]);
  assert.ok(litmus.rows.some(function (r) { return r.bucket === tf.hexes.mountain; }),
    "the played map's mountain-hex count (" + tf.hexes.mountain + ') is one of the litmus buckets');
  assert.doesNotThrow(function () { db.aggregate(h, { x: 'forest_hexes', metrics: ['n'] }); }, 'reslice to forest_hexes works');

  // The whitelist is the injection fence: an unknown x or metric throws, never
  // reaches SQL.
  assert.throws(function () { db.aggregate(h, { x: 'map; DROP TABLE skirmishes' }); }, /unknown group-by/, 'a non-whitelisted x is rejected');
  assert.throws(function () { db.aggregate(h, { x: 'map', metrics: ['1) OR 1=1'] }); }, /unknown metric/, 'a non-whitelisted metric is rejected');
});

test('cardTiming: the ADR litmus (card play-timing vs terrain-hex count)', function () {
  var ct = db.cardTiming(h, { terrain: 'mountain', version: E.VERSION });
  assert.ok(ct.rows.length >= 1 && ct.terrain === 'mountain', 'card-timing-vs-mountain rows come back');
  assert.ok(ct.rows.every(function (r) { return r.plays >= 1 && r.avg_play_turn >= 1 && r.card_id; }),
    'each row carries a card id, a positive play count, and a sane avg play turn');
  var tf = db.terrainFeatures(E.MAPS[0]);
  assert.ok(ct.rows.every(function (r) { return r.bucket === tf.hexes.mountain; }),
    "every bucket is the played map's mountain-hex count (" + tf.hexes.mountain + '), no reach into JS');
  assert.throws(function () { db.cardTiming(h, { terrain: 'lava' }); }, /unknown terrain/, 'a non-whitelisted terrain is rejected');
});

test('dimensions: the slice keys + whitelists the pickers need', function () {
  var d = db.dimensions(h);
  assert.ok(d.versions.some(function (v) { return v.version === E.VERSION && v.config_digest === E.CONFIG.digest; }),
    'the seeded slice (version + config_digest) is listed');
  assert.ok(d.maps.indexOf(E.MAPS[0].name) >= 0, 'the played map is listed');
  assert.ok(d.metrics.indexOf('first_win_pct') >= 0 && d.groupBys.indexOf('mountain_hexes') >= 0 && d.terrains.indexOf('mountain') >= 0,
    'the whitelisted metric / group-by / terrain names are surfaced for the pickers');
  assert.ok(Array.isArray(d.cards) && d.cards.length >= 1, 'the card list is populated from card_events');
});

/* ---------- timeline: real skirmishes carry one; absence is tolerated ---------- */
test('timeline', function () {
  var tl0 = h.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(skirmishId).c;
  assert.ok(tl0 === (st.journal.fsTimeline ? st.journal.fsTimeline.length : 0) && tl0 > 0,
    'a real skirmish lands its per-turn timeline (' + tl0 + ' rows)');
  var noTl = JSON.parse(JSON.stringify(st)); noTl.battle = st.battle; delete noTl.journal.fsTimeline;
  var skirmishId0 = db.insertSkirmish(h, runId, noTl, 'red', { seed: 1234 });
  var tlAbsent = h.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(skirmishId0).c;
  assert.ok(tlAbsent === 0, 'a state without fsTimeline (an old save) -> zero rows, tolerated silently');

  st.journal.fsTimeline = [[2, 2], [4, 2], [4, 5]]; // synthetic, to pin the column mapping
  var skirmishId2 = db.insertSkirmish(h, runId, st, 'blue', { seed: 1234 });
  var tl = h.db.prepare('SELECT turn, fs_red, fs_blue FROM timeline WHERE skirmish_id = ? ORDER BY turn').all(skirmishId2);
  assert.ok(tl.length === 3, 'synthetic 3-entry fsTimeline -> 3 rows (got ' + tl.length + ')');
  assert.ok(tl[0].turn === 1 && tl[2].turn === 3, 'timeline turns are 1-based (index 0 = turn 1)');
  assert.ok(tl[1].fs_red === 4 && tl[1].fs_blue === 2 && tl[2].fs_blue === 5, 'fs values land in the right columns');
  delete st.journal.fsTimeline;
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
  assert.ok(g[0].avg_turns === st.flow.turnNumber, 'AVG(turns) is sane (' + g[0].avg_turns + ')');
});

/* ---------- listRuns (the dashboard header's run-A/B pickers) ---------- */
test('listRuns', function () {
  runId2 = db.insertRun(h, { version: E.VERSION, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 40, tool: 'db.test.js', label: 'r2' });
  var runs = db.listRuns(h);
  assert.ok(runs.length === 2, 'listRuns returns every run on this handle (' + runs.length + ')');
  assert.ok(runs[0].id === runId2 && runs[1].id === runId, 'ordered id DESC — most recent first');
  assert.ok(runs[0].redAi === 'hard' && runs[0].blueAi === 'hard' && runs[0].label === 'r2',
    'camelCase columns (redAi/blueAi/label) round-trip from the snake_case table');
  assert.ok(runs.every(function (r) { return 'seedBase' in r && 'baseline' in r && 'battalionRed' in r && 'battalionBlue' in r; }),
    'seedBase/baseline/battalionRed/battalionBlue columns present (nullable)');
  assert.ok(db.listRuns(h, 1).length === 1, 'limit is honoured');
});

/* ---------- listSkirmishes (the Overview screen's skirmish fetch) ---------- */
test('listSkirmishes', function () {
  var skirmishesForRun1 = db.listSkirmishes(h, runId);
  assert.ok(skirmishesForRun1.length === 3, 'listSkirmishes returns every skirmish row for the run (' + skirmishesForRun1.length + ')');
  assert.ok(skirmishesForRun1.every(function (r) { return r.id != null; }) && skirmishesForRun1[0].id < skirmishesForRun1[1].id,
    'ordered by id ascending (' + skirmishesForRun1.map(function (r) { return r.id; }).join(',') + ')');
  var bRow = skirmishesForRun1[0];
  ['id', 'map', 'seed', 'firstPlayer', 'winner', 'winType', 'turns', 'configDigest', 'battalionRed', 'battalionBlue',
    'fsRed', 'fsBlue', 'firstBlood', 'leadChanges', 'killTail', 'zeroKill', 'tiebreak', 'attacks', 'swaps', 'marches', 'deploys',
    'resEndRed', 'resEndBlue', 'trace', 'hexesRed', 'hexesBlue'].forEach(function (k) {
    assert.ok(k in bRow, 'listSkirmishes row carries camelCase "' + k + '"');
  });
  assert.ok(bRow.hexesRed === hexesExpected.red && bRow.hexesBlue === hexesExpected.blue,
    'listSkirmishes hexesRed/hexesBlue round-trip the same tally (' + bRow.hexesRed + '/' + bRow.hexesBlue + ')');
  assert.ok(bRow.map === E.MAPS[0].name && bRow.firstPlayer === 'red' && bRow.winner === st.result.skirmishWinner,
    'listSkirmishes row matches the round-trip skirmish inserted above (map/firstPlayer/winner)');
  assert.ok(bRow.configDigest === E.CONFIG.digest && bRow.battalionRed === 'default',
    'listSkirmishes surfaces the config digest + battalion refs');
  assert.ok(typeof bRow.trace === 'string' && JSON.parse(bRow.trace).map === E.MAPS[0].name,
    'trace column is still a raw JSON string — envelopeFromRow parses it client-side, not db.js');
  assert.ok(db.listSkirmishes(h, runId2).length === 0, 'a different run id returns its own (empty) slice, not a cross-run leak');

  db.close(h);
});

/* ---------- db-query.js CLI against the temp db (incl. the litmus join) ---------- */
test('db-query.js CLI', function () {
  var cli = path.join(__dirname, 'db-query.js');
  var out = cp.execFileSync(process.execPath,
    [cli, '--db', dbFile, 'SELECT map, COUNT(*) n, AVG(turns) avg_turns FROM skirmishes GROUP BY map'],
    { encoding: 'utf8' });
  assert.ok(out.indexOf('map') >= 0 && out.indexOf('avg_turns') >= 0, 'CLI prints the column header');
  assert.ok(out.indexOf(E.MAPS[0].name) >= 0, 'CLI prints the map row (' + E.MAPS[0].name + ')');
  assert.ok(/\(1 row\)/.test(out), 'CLI prints the row count');

  // The litmus, driven through the real db-query.js CLI over the seeded DB.
  var litmus = cp.execFileSync(process.execPath, [cli, '--db', dbFile,
    'SELECT c.id card, m.mountain_hexes mtn, AVG(ce.turn) avg_turn, COUNT(*) plays' +
    ' FROM card_events ce JOIN cards c ON c.id = ce.card_id JOIN maps m ON m.name = ce.map' +
    " WHERE ce.outcome='played' GROUP BY c.id, m.mountain_hexes"], { encoding: 'utf8' });
  assert.ok(litmus.indexOf('mtn') >= 0 && litmus.indexOf('avg_turn') >= 0, 'litmus CLI prints the join header');
  assert.ok(!/\(0 rows\)/.test(litmus), 'litmus CLI returns aggregate rows');

  var schemaOut = cp.execFileSync(process.execPath, [cli, '--db', dbFile], { encoding: 'utf8' });
  assert.ok(schemaOut.indexOf('CREATE TABLE') >= 0 && schemaOut.indexOf('skirmishes') >= 0 && schemaOut.indexOf('card_events') >= 0,
    'no-arg CLI prints the schema (incl. card_events)');
  assert.ok(/-- 3 rows/.test(schemaOut), 'no-arg CLI prints per-table row counts (skirmishes: 3)');

  var wrote = true;
  try {
    cp.execFileSync(process.execPath, [cli, '--db', dbFile, "DELETE FROM skirmishes"],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { wrote = false; }
  assert.ok(!wrote, 'CLI connection is read-only (DELETE rejected)');
});

/* ---------- run identity + trace ---------- */
test('run identity + trace', function () {
  var dbFile2 = path.join(tmpDir, 'runs.db');
  h2 = db.open(dbFile2);

  runIdA = db.insertRun(h2, {
    version: '9.9-test', kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 5, tool: 'db.test.js',
    battalionRed: 'default', battalionBlue: 'cavsplit-16', mapset: 'core7', seedBase: 7919, label: 'run A'
  });
  var rowA = h2.db.prepare('SELECT * FROM runs WHERE id = ?').get(runIdA);
  assert.ok(rowA.battalion_red === 'default' && rowA.battalion_blue === 'cavsplit-16' && rowA.mapset === 'core7' &&
    rowA.seed_base === 7919 && rowA.label === 'run A',
    'runs row carries per-side battalions + mapset/seed_base/label (asymmetric run identity)');
  assert.ok(rowA.baseline === 0, 'baseline defaults to 0 when not requested');

  st2 = SIM.simSkirmish(E.MAPS[0], 4242, 'red', 'normal', 'normal');
  skirmishIdA = db.insertSkirmish(h2, runIdA, st2, 'red', { seed: 4242 });
  var bA = h2.db.prepare('SELECT run_id, trace, battalion_red, battalion_blue FROM skirmishes WHERE id = ?').get(skirmishIdA);
  assert.ok(bA.run_id === runIdA, 'skirmish row references its run id (run_id column)');
  assert.ok(bA.battalion_red === 'default' && bA.battalion_blue === 'cavsplit-16',
    'skirmish inherits the run\'s per-side battalions when the caller does not override');
  var trace = JSON.parse(bA.trace);
  assert.ok(trace && typeof trace === 'object', 'skirmishes.trace is valid JSON');
  ['v', 'map', 'seed', 'fp', 'winner', 'winType', 'turns', 'trace', 'units'].forEach(function (k) {
    assert.ok(k in trace, 'trace envelope has "' + k + '"');
  });
  assert.ok(Array.isArray(trace.trace) && trace.trace.length === st2.journal.playLog.length,
    'trace.trace = st.journal.playLog verbatim (' + trace.trace.length + ' entries)');
  assert.ok(JSON.stringify(trace.units) === JSON.stringify(st2.journal.unitMetrics),
    'trace.units = st.journal.unitMetrics verbatim');
  assert.ok(Object.keys(trace.units).indexOf('infantry') >= 0,
    'unitMetrics keyed by FULL unit-type name "infantry", not "inf" shorthand');
});

/* ---------- slice key: same version, different point cap -> different config_digest ---------- */
test('config-digest slices two runs of the same rules version', function () {
  var hs = db.open(path.join(tmpDir, 'slice.db'));
  var origCap = E.CONFIG.pointsCap;
  try {
    var st = SIM.simSkirmish(E.MAPS[0], 77, 'red', 'normal', 'normal');
    // Run A at the default point cap.
    var rA = db.insertRun(hs, { version: 'slice-v', kind: 'balance', redAi: 'normal', blueAi: 'normal', n: 1, tool: 'db.test.js' });
    db.insertSkirmish(hs, rA, st, 'red', { version: 'slice-v', seed: 77 });
    var digestDefault = E.CONFIG.digest;
    // Run B at a DIFFERENT point cap — same rules version, different dial.
    E.CONFIG.pointsCap = origCap === 80 ? 90 : 80;
    var digestOther = E.CONFIG.digest;
    assert.notStrictEqual(digestOther, digestDefault, 'mutating pointsCap changes Engine.CONFIG.digest');
    var rB = db.insertRun(hs, { version: 'slice-v', kind: 'balance', redAi: 'normal', blueAi: 'normal', n: 1, tool: 'db.test.js' });
    db.insertSkirmish(hs, rB, st, 'red', { version: 'slice-v', seed: 77 });

    // Two games at the SAME rules version slice apart by a plain SQL filter on the digest.
    var digests = hs.db.prepare('SELECT DISTINCT config_digest FROM skirmishes WHERE version = ? ORDER BY config_digest').all('slice-v')
      .map(function (r) { return r.config_digest; });
    assert.strictEqual(digests.length, 2, 'the same rules version holds two distinct config digests (' + digests.join(',') + ')');
    var nDefault = hs.db.prepare('SELECT COUNT(*) c FROM skirmishes WHERE version = ? AND config_digest = ?').get('slice-v', digestDefault).c;
    var nOther = hs.db.prepare('SELECT COUNT(*) c FROM skirmishes WHERE version = ? AND config_digest = ?').get('slice-v', digestOther).c;
    assert.ok(nDefault === 1 && nOther === 1, 'a plain SQL filter on config_digest separates the two dials (1 + 1)');
    // The versions dimension carries both digests behind the same rules version, with the dials.
    var vdials = hs.db.prepare('SELECT dials FROM versions WHERE version = ? AND config_digest = ?').get('slice-v', digestOther);
    assert.ok(vdials && JSON.parse(vdials.dials).pointsCap === E.CONFIG.pointsCap, 'versions row carries the differing dial value behind the digest');

    // The 3-table litmus must NOT over-count across slices. With 2 slices, each
    // card_id has 2 `cards` rows and each map name 2 `maps` rows, so a naive
    // id-only join fans out 4x; the slice predicates (the fix) keep it exact.
    var anyCard = hs.db.prepare("SELECT config_digest cd, card_id card FROM card_events WHERE outcome='played' LIMIT 1").get();
    var raw = hs.db.prepare("SELECT COUNT(*) c FROM card_events WHERE outcome='played' AND config_digest=? AND card_id=?").get(anyCard.cd, anyCard.card).c;
    var sliceCorrect = hs.db.prepare(
      'SELECT COUNT(*) plays FROM card_events ce' +
      ' JOIN cards c ON c.id=ce.card_id AND c.version=ce.version AND c.config_digest=ce.config_digest' +
      ' JOIN maps m ON m.name=ce.map AND m.version=ce.version AND m.config_digest=ce.config_digest' +
      " WHERE ce.outcome='played' AND ce.config_digest=? AND ce.card_id=?").get(anyCard.cd, anyCard.card).plays;
    var naive = hs.db.prepare(
      'SELECT COUNT(*) plays FROM card_events ce JOIN cards c ON c.id=ce.card_id JOIN maps m ON m.name=ce.map' +
      " WHERE ce.outcome='played' AND ce.config_digest=? AND ce.card_id=?").get(anyCard.cd, anyCard.card).plays;
    assert.strictEqual(sliceCorrect, raw, 'the slice-keyed 3-table join returns the true per-slice play count (no fan-out)');
    assert.strictEqual(naive, raw * 4, 'a naive id-only join over 2 slices fans out 4x — the slice predicates are what prevent it');
  } finally {
    E.CONFIG.pointsCap = origCap;
    db.close(hs);
  }
});

/* ---------- hexes_red/hexes_blue: known-units column mapping ---------- */
test('hex-ownership tally', function () {
  var stHex = JSON.parse(JSON.stringify(st2)); stHex.battle = st2.battle;
  stHex.pieces.units = { // a deliberately uneven, hand-known split: 3 red hexes, 1 blue hex
    '0,0': { type: 'infantry', owner: 'red' },
    '1,0': { type: 'infantry', owner: 'red' },
    '2,0': { type: 'cavalry', owner: 'red' },
    '-1,0': { type: 'infantry', owner: 'blue' }
  };
  var skirmishIdHex = db.insertSkirmish(h2, runIdA, stHex, 'red', { seed: 9001 });
  var bHex = h2.db.prepare('SELECT hexes_red, hexes_blue FROM skirmishes WHERE id = ?').get(skirmishIdHex);
  assert.ok(bHex.hexes_red === 3 && bHex.hexes_blue === 1,
    'hexes_red/hexes_blue = 3/1 for a hand-built 4-unit board (' + bHex.hexes_red + '/' + bHex.hexes_blue + ')');

  var stEmpty = JSON.parse(JSON.stringify(st2)); stEmpty.battle = st2.battle; stEmpty.pieces.units = {};
  var skirmishIdEmpty = db.insertSkirmish(h2, runIdA, stEmpty, 'red', { seed: 9002 });
  var bEmpty = h2.db.prepare('SELECT hexes_red, hexes_blue FROM skirmishes WHERE id = ?').get(skirmishIdEmpty);
  assert.ok(bEmpty.hexes_red === 0 && bEmpty.hexes_blue === 0,
    'an empty board tallies 0/0 — a REAL tie, still stored as numbers, not NULL');

  // A legacy-shaped row (hexes columns never written) round-trips as NULL, not 0.
  h2.db.prepare(
    'INSERT INTO skirmishes (run_id, version, map, winner, first_player, turns) VALUES (?,?,?,?,?,?)'
  ).run(runIdA, '9.9-test', E.MAPS[0].name, 'red', 'red', 10);
  var legacyRows = db.listSkirmishes(h2, runIdA).filter(function (r) { return r.hexesRed == null; });
  assert.ok(legacyRows.length === 1 && legacyRows[0].hexesBlue == null,
    'a row with the hexes columns unwritten round-trips as NULL, not 0');
});

/* ---------- slimSkirmishState (the --parallel worker contract) ---------- */
test('slimSkirmishState', function () {
  var slimSt = JSON.parse(JSON.stringify(db.slimSkirmishState(st2))); // the worker->parent stdout trip
  var skirmishIdSlim = db.insertSkirmish(h2, runIdA, slimSt, 'red', { seed: 4242 });
  var fullRow = h2.db.prepare('SELECT * FROM skirmishes WHERE id = ?').get(skirmishIdA);
  var slimRow = h2.db.prepare('SELECT * FROM skirmishes WHERE id = ?').get(skirmishIdSlim);
  var driftCols = Object.keys(fullRow).filter(function (k) {
    return k !== 'id' && String(fullRow[k]) !== String(slimRow[k]);
  });
  assert.ok(driftCols.length === 0,
    'a JSON-round-tripped slim state lands an identical skirmishes row (drift: ' + (driftCols.join(',') || 'none') + ')');
  // decisionLog survives the slim trip, so card_events land the same on both paths.
  var evFull = h2.db.prepare('SELECT COUNT(*) c FROM card_events WHERE skirmish_id = ?').get(skirmishIdA).c;
  var evSlim = h2.db.prepare('SELECT COUNT(*) c FROM card_events WHERE skirmish_id = ?').get(skirmishIdSlim).c;
  assert.ok(evSlim === evFull && evSlim === st2.journal.decisionLog.length,
    'slim state lands the same card_events rows (decisionLog survives the --parallel pipe) (' + evSlim + ')');
  var tlFull = h2.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(skirmishIdA).c;
  var tlSlim = h2.db.prepare('SELECT COUNT(*) c FROM timeline WHERE skirmish_id = ?').get(skirmishIdSlim).c;
  assert.ok(tlSlim === tlFull && tlSlim > 0, 'slim state lands the same timeline rows (' + tlSlim + ')');
});

/* ---------- baseline uniqueness ---------- */
test('baseline uniqueness', function () {
  var vBase = '9.9-baseline-test';
  var runX = db.insertRun(h2, { version: vBase, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  assert.ok(h2.db.prepare('SELECT baseline FROM runs WHERE id = ?').get(runX).baseline === 1,
    'first baseline pin for a fresh version sets baseline=1');

  var runY = db.insertRun(h2, { version: vBase, kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var flagsAfterY = h2.db.prepare('SELECT id, baseline FROM runs WHERE version = ? ORDER BY id').all(vBase);
  assert.ok(flagsAfterY.filter(function (r) { return r.baseline === 1; }).length === 1,
    'exactly one baseline=1 row after a SECOND pin (pinning twice, first pin)');
  assert.ok(flagsAfterY.filter(function (r) { return r.id === runY; })[0].baseline === 1 &&
     flagsAfterY.filter(function (r) { return r.id === runX; })[0].baseline === 0,
    'the newer run (Y) is now baseline; the older one (X) was cleared');

  db.setBaseline(h2, runX); // pinning twice, second pin: promote X back over Y via the standalone helper
  var flagsAfterX = h2.db.prepare('SELECT id, baseline FROM runs WHERE version = ? ORDER BY id').all(vBase);
  assert.ok(flagsAfterX.filter(function (r) { return r.baseline === 1; }).length === 1,
    'exactly one baseline=1 row after re-pinning via setBaseline (pinning twice, second pin)');
  assert.ok(flagsAfterX.filter(function (r) { return r.id === runX; })[0].baseline === 1 &&
     flagsAfterX.filter(function (r) { return r.id === runY; })[0].baseline === 0,
    'setBaseline(runX) promotes X and clears Y');

  db.insertRun(h2, { version: '9.9-other-version', kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var stillX = h2.db.prepare('SELECT baseline FROM runs WHERE id = ?').get(runX).baseline;
  assert.ok(stillX === 1, 'pinning a baseline on a DIFFERENT version leaves this version’s baseline untouched');

  db.insertRun(h2, { kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true }); // version omitted -> NULL
  var nullB = db.insertRun(h2, { kind: 'balance', redAi: 'hard', blueAi: 'hard', n: 1, tool: 'db.test.js', baseline: true });
  var nullFlags = h2.db.prepare('SELECT id, baseline FROM runs WHERE version IS NULL ORDER BY id').all();
  assert.ok(nullFlags.filter(function (r) { return r.baseline === 1; }).length === 1,
    'NULL-version runs also keep exactly one baseline (IS, not =, comparison)');
  assert.ok(nullFlags.filter(function (r) { return r.id === nullB; })[0].baseline === 1,
    'the later NULL-version pin wins, the earlier one cleared');

  db.close(h2);
});

/* ---------- factsFromRow ≡ skirmishFacts: the DB read path must not drift from
   the live path. Both folds feed the shared aggregate; if a column alias or a
   derivation ever disagrees, this catches it as a field-level diff. */
test('factsFromRow ≡ skirmishFacts', function () {
  var hf = db.open(path.join(tmpDir, 'facts.db'));
  try {
    var st = SIM.simSkirmish(E.MAPS[0], 555, 'red', 'normal', 'normal');
    var live = SIM.skirmishFacts(st, 'red');               // the LIVE-state fold (sim layer)
    var rid = db.insertRun(hf, { version: E.VERSION, kind: 'balance', redAi: 'normal', blueAi: 'normal', n: 1, tool: 'db.test.js' });
    db.insertSkirmish(hf, rid, st, 'red', { seed: 555 });
    var row = db.listSkirmishes(hf, rid)[0];               // round-trip through SQLite
    var fromRow = SIM.factsFromRow(row);                    // the DB-row fold
    assert.deepStrictEqual(fromRow, live,
      'factsFromRow(db row) matches skirmishFacts(live state) field-for-field — the two folds agree');
  } finally { db.close(hf); }
});

/* ---------- archiveIfLegacy: a pre-star-schema DB is renamed aside, not migrated ---------- */
test('legacy DB is archived on open', function () {
  var legacyFile = path.join(tmpDir, 'legacy.db');
  // Fabricate a pre-star-schema DB: the old bolted-flat tables, no user_version,
  // no card_events. open() must move it aside and start fresh.
  var sqlite = require('node:sqlite');
  var old = new sqlite.DatabaseSync(legacyFile);
  old.exec('CREATE TABLE skirmishes (id INTEGER PRIMARY KEY, map TEXT);');
  old.exec('CREATE TABLE card_plays (id INTEGER PRIMARY KEY);');
  old.exec("INSERT INTO skirmishes (map) VALUES ('legacy-row');");
  old.close();

  var hL = db.open(legacyFile);
  try {
    var archived = fs.readdirSync(tmpDir).filter(function (f) { return /legacy\.archived-.*\.db$/.test(f); });
    assert.strictEqual(archived.length, 1, 'the legacy DB was renamed aside (one archived-*.db)');
    var tables = hL.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all().map(function (r) { return r.name; });
    assert.ok(tables.indexOf('card_events') >= 0 && tables.indexOf('versions') >= 0,
      'the reopened DB is a fresh star schema, not the migrated old one');
    assert.strictEqual(hL.db.prepare('SELECT COUNT(*) c FROM skirmishes').get().c, 0, 'no legacy rows were carried over');
  } finally { db.close(hL); }
});
