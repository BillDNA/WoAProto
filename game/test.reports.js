/* Auto-split from game/test.js (ADR-0003: node:test). Subsystem: reports.
   Frozen-API entry game/test.js delegates here; run this file directly with
   `node game/test.reports.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('./test.helpers.js');
const assert = require('node:assert');

test('report-model: bands as data + trace folds', () => {
(function () {
  var R = require('./report-model.js');
  function near(a, b) { return Math.abs(a - b) < 1e-9; }

  // ---- band table unifies with balanceScore (scored set is 8; the guard set is
  // Attack%/Swap% share alongside First-blood→win) ----
  assert.ok(R.BANDS.filter(function (b) { return b.feedsScore; }).length === 8, 'BANDS has the 8 scored metrics (feedsScore:true)');
  assert.ok(R.BANDS.filter(function (b) { return !b.feedsScore; }).length === 3, 'BANDS has 3 guard metrics (First-blood→win + Attack%/Swap% share)');
  assert.ok(R.BANDS.some(function (b) { return b.key === 'attackShare'; }) && R.BANDS.some(function (b) { return b.key === 'swapShare'; }),
    'Attack%/Swap% share bands present');
  assert.ok(R.BANDS.every(function (b) { return 'lo' in b && 'hi' in b && 'weight' in b && 'feedsScore' in b; }),
    'each band row carries {lo, hi, weight, feedsScore}');
  // Tie%/Drag divide by the ATTRITION slice, not `done`. attritionEndings 80 ≠
  // done 100 proves the denominator switched; attritionKillTail 280 (not the
  // pooled killTail 300) proves Drag reads the sliced kill-tail.
  var sc = { redWins: 60, firstWins: 50, hqWins: 5, zeroKill: 10, tiebreak: 20,
    attritionEndings: 80, attritionKillTail: 280, killTail: 300,
    leadChanges: 100, controlGames: 100, controlWins: 60, firstBloodGames: 40, firstBloodWins: 30 };
  // Red (60→out5) 5 + 1st (50) 0 + HQ (5→out5×.5) 2.5 + 0kill (10→out5×.6) 3
  //  + Tie (20/80=25→out7×.3) 2.1 + Drag (280/80=3.5→out.5×4) 2.0 + Swings (1→out1×6) 6
  //  + Control (60→out10×.5) 5 = 25.6
  assert.ok(near(R.balanceScore(sc, 100), 25.6), 'balanceScore folds the band table to the hand-computed 25.6 (was ' + R.balanceScore(sc, 100) + ')');
  // Tie%/Drag read the attrition slice: with the SAME pooled counts but the slice
  // denominator == done, tie 20/100=20→out2×.3=.6 and drag 300/100=3→out0, total shifts.
  var scPooledLike = Object.assign({}, sc, { attritionEndings: 100, attritionKillTail: 300 });
  assert.ok(near(R.balanceScore(scPooledLike, 100), 5 + 2.5 + 3 + 0.6 + 0 + 6 + 5),
    'Tie%/Drag denominator is attritionEndings (slice=100 gives tie .6 + drag 0, total 22.1)');
  // no attrition endings at all → tie/drag val() is null → they score 0 (not NaN)
  var scNoAttr = Object.assign({}, sc, { attritionEndings: 0, attritionKillTail: 0 });
  var tieBand = R.BANDS.filter(function (b) { return b.key === 'tie'; })[0];
  assert.ok(tieBand.val(scNoAttr) === null && R.bandN(tieBand, scNoAttr, 100) === 0, 'Tie% val()/nFor = null/0 when there are no attrition endings');
  assert.ok(near(R.balanceScore(scNoAttr, 100), 25.6 - 2.1 - 2.0), 'a set with no attrition endings drops the Tie+Drag terms (null scores 0)');
  // the guard bands (First-blood→win, Attack%/Swap% share) must NOT move the score
  var scGuardBad = Object.assign({}, sc, { firstBloodWins: 0, attacks: 0, swaps: 999, marches: 0, deploys: 1 }); // wild shares + first-blood 0%
  assert.ok(near(R.balanceScore(scGuardBad, 100), 25.6), 'feedsScore:false guard bands never touch balanceScore');
  // control guard: controlGames == 0 drops the control term entirely
  assert.ok(near(R.balanceScore(Object.assign({}, sc, { controlGames: 0, controlWins: 0 }), 100), 20.6),
    'controlGames == 0 skips the control term (25.6 - 5 = 20.6)');
  // Attack%/Swap% share val() = pct over all four action counts
  var shareAgg = { attacks: 30, swaps: 20, marches: 10, deploys: 40 }; // total 100 actions
  var atkBand = R.BANDS.filter(function (b) { return b.key === 'attackShare'; })[0];
  var swpBand = R.BANDS.filter(function (b) { return b.key === 'swapShare'; })[0];
  assert.ok(atkBand.val(shareAgg) === 30 && swpBand.val(shareAgg) === 20, 'Attack%/Swap% share = count / (attacks+swaps+marches+deploys)');
  assert.ok(atkBand.val({ attacks: 0, swaps: 0, marches: 0, deploys: 0 }) === null, 'share val() = null when no actions were taken');

  // ---- bands(metric, temperature): closed edges widen 20%/40%, open edges stay open ----
  assert.ok(near(R.bands('red', 'T0').lo, 45) && near(R.bands('red', 'T0').hi, 55), 'T0 = stored edges (Red 45–55)');
  assert.ok(near(R.bands('red', 'T1').lo, 43) && near(R.bands('red', 'T1').hi, 57), 'T1 widens both closed edges 20% of width (Red 43–57)');
  assert.ok(near(R.bands('red', 'T2').lo, 41) && near(R.bands('red', 'T2').hi, 59), 'T2 widens both closed edges 40% of width (Red 41–59)');
  assert.ok(near(R.bands('zeroKill', 'T1').lo, -1) && near(R.bands('zeroKill', 'T1').hi, 6), '0kill lo=0 is a CLOSED edge, widens to -1 at T1');
  assert.ok(R.bands('swings', 'T1').hi === null && near(R.bands('swings', 'T1').lo, 1.6), 'Swings hi=null stays OPEN; closed lo 2.0 → 1.6 at T1 (half-open: |edge| basis)');
  assert.ok(R.bands('swings', 'T2').hi === null && near(R.bands('swings', 'T2').lo, 1.2), 'Swings lo 2.0 → 1.2 at T2');
  assert.ok(R.bands('firstBlood', 'T0').feedsScore === false, 'bands() carries feedsScore (guard band = false)');

  // ---- generalized bands(metric, grace): legacy T0/T1/T2 alias hold/nudge/bold on ONE path ----
  ['red', 'zeroKill', 'swings', 'tie', 'control', 'hq'].forEach(function (k) {
    ['T0:hold', 'T1:nudge', 'T2:bold'].forEach(function (pair) {
      var legacy = R.bands(k, pair.split(':')[0]), grace = R.bands(k, pair.split(':')[1]);
      assert.ok(legacy.lo === grace.lo && legacy.hi === grace.hi,
        k + ' ' + pair + ' resolve identically (' + legacy.lo + '/' + legacy.hi + ')');
    });
  });
  // RANGES is the seeded per-axis ± table (nudge = 0.2×width, bold = 0.4×width)
  assert.ok(near(R.RANGES.red.nudge, 2) && near(R.RANGES.red.bold, 4), 'RANGES seeds Red% ± from own width (10): nudge 2, bold 4');
  assert.ok(near(R.RANGES.swings.nudge, 0.4), 'RANGES seeds half-open Swings ± from |edge| (2.0): nudge 0.4');
  // bypass = never rejects: both edges open, so nothing is ever out-of-band
  var byp = R.bands('red', 'bypass');
  assert.ok(byp.lo === null && byp.hi === null && R.outBand(999, byp.lo, byp.hi, byp.weight) === 0, 'bypass opens both edges → outBand always 0 (never rejects)');
  // default grace (missing/unknown) = hold = stored edges
  assert.ok(near(R.bands('red').lo, 45) && near(R.bands('red', 'wat').lo, 45), 'unknown/absent grace falls back to hold (stored edges)');

  // ---- trace folds on a hand-built fixture with known answers ----
  var env = {
    turns: 8,
    trace: [
      { p: 'red', id: 'A', turn: 1, a: 'deploy', u: 'infantry' },
      { p: 'blue', id: 'B', turn: 2, a: 'deploy', u: 'cavalry' },
      { p: 'red', id: 'C', turn: 3, a: 'attack', k: 1, ld: 'red' },   // first contact
      { p: 'blue', id: 'A', turn: 4, a: 'deploy', u: 'infantry', ld: 'red' },
      { p: 'red', id: 'D', turn: 5, a: 'swap', ld: 'blue' },          // flip red→blue
      { p: 'blue', id: 'C', turn: 6, a: 'attack', k: 2, ld: 'blue' },
      { p: 'red', id: 'E', turn: 7, a: 'march', ld: 'red' },          // flip blue→red (last flip)
      { p: 'blue', id: 'C', turn: 8, a: 'attack', ld: 'red' }
    ],
    units: { infantry: { dep: [1, 4], atk: 0, abs: 0, kill: 0, die: 0 },
      cavalry: { dep: [2], atk: 0, abs: 0, kill: 0, die: 0 },
      artillery: { dep: [], atk: 0, abs: 0, kill: 0, die: 0 } },
    fs: [[0, 0], [1, 0], [3, 0], [3, 2], [1, 4], [2, 4], [5, 4], [5, 5]]
  };
  assert.ok(R.firstContactTurn(env) === 3, 'firstContactTurn = turn of first a:attack (3)');
  assert.ok(R.firstContactTurn({ trace: [{ turn: 1, a: 'deploy' }] }) === null, 'firstContactTurn = null when no attack');
  assert.ok(near(R.deployInterleave(env), 1 / 3), 'deployInterleave: 1 of 3 deploys (turn 4) is after contact turn 3 → 1/3 (from units.dep, not the a-stream)');
  assert.ok(R.deployInterleave({ units: { inf: { dep: [1, 2] } }, trace: [{ turn: 1, a: 'deploy' }], turns: 3 }) === 0, 'deployInterleave = 0 when there is no contact');
  assert.ok(near(R.settlePoint(env), 87.5), 'settlePoint: last lead flip at turn 7 of 8 → 87.5%');
  assert.ok(R.settlePoint({ turns: 5, trace: [{ turn: 1, ld: 'red' }, { turn: 2, ld: 'red' }] }) === 0, 'settlePoint = 0 when the lead never flips');
  var lanes = R.actionOctileLanes(env);
  assert.ok(lanes.length === 8, 'actionOctileLanes returns 8 octiles');
  assert.ok(near(lanes[0].deploy, 1) && near(lanes[2].attack, 1) && near(lanes[4].swap, 1) && near(lanes[6].march, 1),
    'octile lanes place each action in its turn-octile at 1 play/turn');
  assert.ok(near(lanes[2].deploy, 0) && near(lanes[2].swap, 0), 'non-firing lanes read 0 in that octile');
  var vp = R.vpDiffTrack(env);
  assert.ok(JSON.stringify(vp.track) === JSON.stringify([0, 1, 3, 1, 3, 2, 1, 0]) && vp.peak === 3 && vp.final === 0,
    '|VP-diff| track = |red-blue| per turn (peak 3, final 0)');
  assert.ok(R.vpDiffTrack({ turns: 3, trace: [] }) === null, 'vpDiffTrack = null when env.fs is absent (caller greys it)');

  // ---- envelopeFromRow attaches the DB-sibling fs (GET /api/skirmishes joins the
  // timeline table onto the row; row.fs sits beside row.trace, not inside the
  // trace blob, since dev/db.js's insertSkirmish never put it there) ----
  var dbRow = { trace: JSON.stringify({ turns: 3, trace: [] }), fs: [[1, 0], [2, 0], [2, 1]] };
  var envFromRow = R.envelopeFromRow(dbRow);
  assert.ok(R.vpDiffTrack(envFromRow) !== null, 'envelopeFromRow folds row.fs into the parsed envelope, so vpDiffTrack sees it');
  assert.ok(R.vpDiffTrack(envFromRow).peak === 2, 'the attached fs really is what vpDiffTrack reads (|1-0|,|2-0|,|2-1| -> peak 2)');
  assert.ok(R.vpDiffTrack(R.envelopeFromRow({ trace: JSON.stringify({ turns: 3, trace: [] }) })) === null,
    'a row with no fs (older DB rows before this ticket) still yields vpDiffTrack = null');
  var q = R.cardPlayTurnQuartiles(env);
  assert.ok(q.C.n === 3 && near(q.C.median, 0.75) && near(q.C.q1, 0.5625) && near(q.C.q3, 0.875),
    'cardPlayTurnQuartiles: card C plays at turns 3,6,8/8 → median 0.75, q1 0.5625, q3 0.875');
  assert.ok(q.B.n === 1 && near(q.B.median, 0.25) && near(q.A.median, 0.3125),
    'single-play card = its own normalized time; card A (turns 1,4) median 0.3125');

  // ---- per-card DB-rows aggregate + the Win% doctrine slice ----
  var cardEnv1 = {
    winner: 'red', winType: 'hq', turns: 6,
    trace: [
      { p: 'red',  id: 'A', mode: 'normal',     turn: 1, seen: 1 },              // red wins, normal, first-sight
      { p: 'blue', id: 'A', mode: 'normal',     turn: 2, seen: 2 },              // 2nd copy, blue loses, not first-sight
      { p: 'red',  id: 'B', mode: 'attack',     turn: 3, seen: 1 },              // simple fallback, red wins
      { p: 'blue', id: 'B', mode: 'normal',     turn: 4, seen: 1, noop: true },  // normal but noop
      { p: 'red',  id: 'C', mode: 'reposition', turn: 5, seen: 3 }               // simple fallback, red wins
    ]
  };
  var cardEnv2 = { winner: 'blue', winType: 'attrition', turns: 4,
    trace: [{ p: 'blue', id: 'A', mode: 'normal', turn: 1, seen: 1 }] };
  var CA1 = R.cardAggFromEnvelopes([cardEnv1]);
  assert.ok(CA1.A.plays === 2 && CA1.A.wins === 1 && CA1.A.simple === 0 && CA1.A.firstSight === 1 && CA1.A.seenSum === 3,
    'cardAggFromEnvelopes: card A pools both copies (2 plays, 1 win, 0 simple, 1 first-sight, seenSum 3)');
  assert.ok(CA1.B.plays === 2 && CA1.B.wins === 1 && CA1.B.simple === 1 && CA1.B.noop === 1,
    'cardAggFromEnvelopes: card B mixes a simple fallback (mode attack) and a noop normal play');
  assert.ok(CA1.C.plays === 1 && CA1.C.simple === 1 && CA1.C.firstSight === 0,
    'cardAggFromEnvelopes: card C is a simple reposition, seen 3 -> not first-sight');
  var CA12 = R.cardAggFromEnvelopes([cardEnv1, cardEnv2]);
  assert.ok(CA12.A.plays === 3 && CA12.A.wins === 2, 'cardAggFromEnvelopes pools ALL endings (attrition env counted too) -> 3 plays, 2 wins');
  var WS1 = R.cardHqWinSlice([cardEnv1]);
  assert.ok(WS1.A.plays === 2 && WS1.A.wins === 1, 'cardHqWinSlice: card A both normal plays counted (HQ ending), 1 win (red)');
  assert.ok(WS1.B.plays === 1 && WS1.B.wins === 0, 'cardHqWinSlice: card B only its NORMAL play counts (mode attack excluded), blue play -> 0 wins');
  assert.ok(WS1.C === undefined, 'cardHqWinSlice: card C excluded entirely (mode reposition, no normal play this skirmish)');
  var WS12 = R.cardHqWinSlice([cardEnv1, cardEnv2]);
  assert.ok(WS12.A.plays === 2 && WS12.A.wins === 1, 'cardHqWinSlice ignores the attrition-ending envelope entirely (unchanged from HQ-only)');
  assert.ok(typeof R.cardAggFromEnvelopes === 'function' && typeof R.cardHqWinSlice === 'function',
    'card folds exported on the shared surface');
  // pre-#89 traces (no `declined`) fold to zero declines, appears == plays
  assert.ok(CA1.A.declines === 0 && CA1.A.appears === CA1.A.plays,
    'cardAggFromEnvelopes: legacy trace without declined -> declines 0, appears == plays');

  // ---- #89 in-hand-declined signal (held-but-passed-over, turn-stamped) ----
  var declEnv = { winner: 'red', winType: 'hq', turns: 4, trace: [
    { p: 'red', id: 'A', mode: 'normal', turn: 1, seen: 1, declined: ['D', 'E'] }, // D,E held
    { p: 'red', id: 'A', mode: 'normal', turn: 2, seen: 2, declined: ['D'] },       // D still held
    { p: 'red', id: 'D', mode: 'normal', turn: 3, seen: 2, declined: ['E'] }        // D played; E held, never played
  ] };
  var DA = R.cardAggFromEnvelopes([declEnv]);
  assert.ok(DA.A.declines === 0 && DA.A.appears === 2, 'decline: A always played -> 0 declines, appears 2');
  assert.ok(DA.D.plays === 1 && DA.D.declines === 2 && DA.D.appears === 3, 'decline: D passed over twice then played -> decline-rate 2/3');
  assert.ok(DA.E.plays === 0 && DA.E.declines === 2 && DA.E.appears === 2, 'decline: E seen twice, never played -> strictly-dominated signal (decline-rate 1.0)');
  var DO = R.cardDeclineByOctile(declEnv);
  assert.deepStrictEqual(DO.D, [1, 0, 1, 0, 0, 0, 0, 0], 'cardDeclineByOctile: D declined in octiles 0 and 2');
  assert.deepStrictEqual(DO.E, [1, 0, 0, 0, 1, 0, 0, 0], 'cardDeclineByOctile: E declined in octiles 0 and 4 (phase-conditioned)');
  assert.deepStrictEqual(R.cardDeclineByOctile(cardEnv1), {}, 'cardDeclineByOctile: pre-#89 trace yields no decline rows');

  // ---- per-unit-type fold: unitsAggFromEnvelopes on a hand-built two-skirmish
  // fixture with known answers, incl. the dep[]/dieT[] lifespan pairing (real
  // deaths + a right-censored survivor per skirmish) ----
  var unitEnv1 = { turns: 10, units: {
    infantry: { dep: [1, 3], atk: 4, abs: 2, kill: 3, die: 1, dieT: [5] },   // pair (1,5)->4; dep 3 survives -> 10-3=7
    cavalry:  { dep: [2],    atk: 1, abs: 3, kill: 0, die: 1, dieT: [6] }    // pair (2,6)->4
  } };
  var unitEnv2 = { turns: 8, units: {
    infantry:  { dep: [1, 2, 4], atk: 2, abs: 1, kill: 1, die: 2, dieT: [3, 7] }, // pairs (1,3)->2,(2,7)->5; dep 4 survives -> 8-4=4
    artillery: { dep: [1],       atk: 0, abs: 2, kill: 0, die: 0, dieT: [] }      // no death; dep 1 survives -> 8-1=7
  } };
  var UA = R.unitsAggFromEnvelopes([unitEnv1, unitEnv2]);
  assert.ok(UA.hasUnits === true && UA.hasDieT === true, 'unitsAggFromEnvelopes: fixture has units + dieT capture');
  var uInf = UA.types.infantry;
  assert.ok(uInf.n === 2, 'infantry skirmishesFielded = 2 (fielded in both skirmishes), got ' + uInf.n);
  assert.ok(uInf.atk === 6 && uInf.abs === 3 && uInf.kill === 4 && uInf.die === 3,
    'infantry atk/abs/kill/die sum across skirmishes (6/3/4/3), got ' + uInf.atk + '/' + uInf.abs + '/' + uInf.kill + '/' + uInf.die);
  assert.ok(near(uInf.depMedian, 0.25), 'infantry depMedian: pooled normalized dep turns [.1,.125,.25,.3,.5] -> median .25, got ' + uInf.depMedian);
  assert.ok(near(uInf.roleY, 100 * 6 / 9), 'infantry roleY = 100*atk/(atk+abs) = ' + (100 * 6 / 9).toFixed(2) + ', got ' + uInf.roleY);
  assert.ok(near(uInf.breakthrough, 1.5), 'infantry breakthrough = abs/skirmishesFielded = 3/2 = 1.5, got ' + uInf.breakthrough);
  assert.ok(near(uInf.exchange, 4 / 3), 'infantry exchange = kill/die = 4/3, got ' + uInf.exchange);
  // lifespans pooled: skirmish1 [4 (real), 7 (censored)] + skirmish2 [2,5 (real), 4 (censored)] -> sorted [2,4,4,5,7] -> median 4
  assert.ok(uInf.lifespanN === 5 && near(uInf.lifespan, 4), 'infantry lifespan: 5 paired observations, median 4, got n=' + uInf.lifespanN + ' median=' + uInf.lifespan);
  var uCav = UA.types.cavalry;
  assert.ok(uCav.n === 1 && near(uCav.breakthrough, 3) && uCav.exchange === 0,
    'cavalry: fielded 1 skirmish, breakthrough 3/1=3, exchange 0/1=0, got n=' + uCav.n + ' breakthrough=' + uCav.breakthrough + ' exchange=' + uCav.exchange);
  assert.ok(uCav.lifespanN === 1 && near(uCav.lifespan, 4), 'cavalry lifespan: single real death (2,6) -> 4, got ' + uCav.lifespan);
  var uArt = UA.types.artillery;
  assert.ok(uArt.exchange === null, 'artillery exchange = null when die = 0 (not a fabricated 0), got ' + uArt.exchange);
  assert.ok(uArt.lifespanN === 1 && near(uArt.lifespan, 7), 'artillery lifespan: one censored survivor (dep 1, turns 8) -> 7, got ' + uArt.lifespan);

  // legacy row: units block with NO dieT key on any type
  var legacyUnitEnv = { turns: 5, units: { infantry: { dep: [1], atk: 1, abs: 0, kill: 0, die: 0 } } };
  var UAlegacy = R.unitsAggFromEnvelopes([legacyUnitEnv]);
  assert.ok(UAlegacy.hasUnits === true && UAlegacy.hasDieT === false, 'a units block with no dieT array on any type reads hasDieT = false (legacy, "predates capture")');
  assert.ok(UAlegacy.types.infantry.lifespan === null && UAlegacy.types.infantry.lifespanN === 0,
    'legacy row: lifespan stays null (not a fabricated 0) when dieT was never captured');
  assert.ok(typeof R.unitsAggFromEnvelopes === 'function', 'unit fold exported on the shared surface');

  // ---- per-hex lenses: occupancy / flips / kills folded from the trace's
  // h-stream, on a hand-built fixture with known answers ----
  var henv = { turns: 4, trace: [
    { p: 'red',  turn: 1, a: 'deploy', h: '0,0' },        // red takes 0,0
    { p: 'blue', turn: 2, a: 'deploy', h: '1,0' },        // blue takes 1,0
    { p: 'red',  turn: 3, a: 'attack', h: '1,0', k: 1 },  // red kills at 1,0 -> flip blue->red + 1 kill
    { p: 'red',  turn: 4, a: 'swap',   h: '0,0' }         // touch: no flip, no kill
  ] };
  var HL = R.hexLenses(henv);
  // occupancy credited AFTER each play: 0,0 held turns 1-4 = 4/4 = 1.0;
  // 1,0 held from turn 2 (deploy) through 4 = 3/4 = 0.75.
  assert.ok(near(HL.hexes['0,0'].occ, 1) && near(HL.hexes['1,0'].occ, 0.75), 'hexLenses occupancy = held-turns / plays (0,0 held all 4, 1,0 held 3 of 4)');
  assert.ok(HL.hexes['1,0'].flips === 1 && HL.hexes['1,0'].kills === 1, 'a killing attack flips the skirmish hex to the attacker and tallies the kill');
  assert.ok(HL.hexes['0,0'].flips === 0 && HL.hexes['0,0'].kills === 0, 'a same-owner swap is a touch — no flip, no kill');
  // dead hex: a whiffed attack (no k) touches a hex but never holds it -> occ 0
  var denv = { turns: 3, trace: [
    { p: 'red',  turn: 1, a: 'deploy', h: '0,0' },
    { p: 'blue', turn: 2, a: 'attack', h: '5,5' },  // k absent -> touched, never held
    { p: 'red',  turn: 3, a: 'deploy', h: '0,0' }
  ] };
  assert.ok(near(R.hexLenses(denv).hexes['5,5'].occ, 0), 'a whiffed attack (no kill) touches a hex but never holds it');
  var HF = R.foldHexLenses([henv, henv]);
  assert.ok(HF.n === 2 && HF.hexes['1,0'] && near(HF.hexes['1,0'].flips, 1) && near(HF.hexes['1,0'].kills, 1),
    'foldHexLenses averages flips/kills as per-skirmish rates across the run');
  assert.ok(HF.hexes['1,0'].avenue === true, 'foldHexLenses: top-quartile flips -> avenue-of-attack');
  var DF = R.foldHexLenses([denv]);
  assert.ok(DF.hexes['5,5'].dead === true && DF.hexes['0,0'].dead === false, 'foldHexLenses: dead hex = avg occupancy < 5%');

  // ---- consumable from node here; browser gets the same WOA_REPORT global (dual export) ----
  assert.ok(typeof R.bands === 'function' && typeof R.actionOctileLanes === 'function' && typeof R.BANDS === 'object',
    'folds + band table exported on the shared WOA_REPORT surface');
  assert.ok(typeof R.hexLenses === 'function' && typeof R.foldHexLenses === 'function', 'hex lenses exported on the shared surface');
})();
});

test('report-model: foldSkirmishes control% from hexesRed/hexesBlue', () => {
(function () {
  var R = require('./report-model.js');
  // A mixed row set: real control skirmishes (some ties), plus legacy rows with
  // hexesRed/hexesBlue never written -> NULL (one row with only ONE side null to
  // prove the guard needs BOTH, not either).
  var rows = [
    { winner: 'red',  hexesRed: 6,    hexesBlue: 3 },    // control: red held more, red won -> WIN
    { winner: 'blue', hexesRed: 6,    hexesBlue: 3 },    // control: red held more, blue won -> not a win
    { winner: 'blue', hexesRed: 3,    hexesBlue: 6 },    // control: blue held more, blue won -> WIN
    { winner: 'red',  hexesRed: 5,    hexesBlue: 5 },    // a REAL hex tie -> not a control game (matches balanceAdd)
    { winner: 'red',  hexesRed: null, hexesBlue: null }, // legacy row -> excluded, not 0/0
    { winner: 'blue', hexesRed: 4,    hexesBlue: null }  // malformed/partial -> excluded (needs BOTH non-null)
  ];
  var f = R.foldSkirmishes(rows);
  assert.ok(f.done === 6, 'done = rows.length regardless of control data (6)');
  assert.ok(f.agg.controlGames === 3, 'controlGames counts only rows with both hexes non-null and unequal (3, got ' + f.agg.controlGames + ')');
  assert.ok(f.agg.controlWins === 2, 'controlWins counts winner-held-more-hexes among those (2, got ' + f.agg.controlWins + ')');

  // The Overview band board reads this straight through BANDS' control row —
  // pct(2,3) = 67%, n=3 (bandN), not the "n=0" placeholder foldSkirmishes used
  // to be stuck at before hexesRed/hexesBlue existed as stored columns.
  var controlBand = R.BANDS.filter(function (b) { return b.key === 'control'; })[0];
  assert.ok(controlBand.val(f.agg, f.done) === 67, 'control band val() = 67% off the folded agg (got ' + controlBand.val(f.agg, f.done) + ')');
  assert.ok(R.bandN(controlBand, f.agg, f.done) === 3, 'control band n = controlGames (3), not the row count (6)');

  // All-legacy rows (no run has ever recorded control data) still render the
  // ordinary small-n path, not a fabricated 0/0 tie.
  var legacyOnly = R.foldSkirmishes([{ winner: 'red' }, { winner: 'blue', hexesRed: null, hexesBlue: null }]);
  assert.ok(legacyOnly.agg.controlGames === 0, 'an all-legacy row set folds to controlGames = 0');
  assert.ok(controlBand.val(legacyOnly.agg, legacyOnly.done) === null, 'control band val() = null (not 0) when no row carries control data');
})();
});

test('report-model: cross-skirmish drill-down folds (Maps pane)', () => {
(function () {
  var R = require('./report-model.js');
  function near(a, b) { return Math.abs(a - b) < 1e-9; }

  // The same hand-built envelope the trace-fold tests above pin (known lanes +
  // |VP-diff| track [0,1,3,1,3,2,1,0]), reused as the fold input here.
  var env = {
    turns: 8,
    trace: [
      { p: 'red', id: 'A', turn: 1, a: 'deploy', u: 'infantry' },
      { p: 'blue', id: 'B', turn: 2, a: 'deploy', u: 'cavalry' },
      { p: 'red', id: 'C', turn: 3, a: 'attack', k: 1, ld: 'red' },
      { p: 'blue', id: 'A', turn: 4, a: 'deploy', u: 'infantry', ld: 'red' },
      { p: 'red', id: 'D', turn: 5, a: 'swap', ld: 'blue' },
      { p: 'blue', id: 'C', turn: 6, a: 'attack', k: 2, ld: 'blue' },
      { p: 'red', id: 'E', turn: 7, a: 'march', ld: 'red' },
      { p: 'blue', id: 'C', turn: 8, a: 'attack', ld: 'red' }
    ],
    units: { infantry: { dep: [1, 4], atk: 0, abs: 0, kill: 0, die: 0 },
      cavalry: { dep: [2], atk: 0, abs: 0, kill: 0, die: 0 },
      artillery: { dep: [], atk: 0, abs: 0, kill: 0, die: 0 } },
    fs: [[0, 0], [1, 0], [3, 0], [3, 2], [1, 4], [2, 4], [5, 4], [5, 5]]
  };

  // ---- envelopesForMap: filters by map name, drops rows that don't parse ----
  var rows = [
    { map: 'Frontier', trace: JSON.stringify({ turns: 3, trace: [] }), fs: [[1, 0]] },
    { map: 'The Void', trace: JSON.stringify({ turns: 3, trace: [] }), fs: [[1, 0]] },
    { map: 'Frontier', trace: 'not json', fs: [] }          // malformed -> envelopeFromRow null -> dropped
  ];
  assert.ok(R.envelopesForMap(rows, 'Frontier').length === 1, 'envelopesForMap filters by map + drops the unparseable Frontier row (1 of 2)');
  assert.ok(R.envelopesForMap(rows, 'The Void').length === 1, 'envelopesForMap picks the other map');
  assert.ok(R.envelopesForMap(rows, 'Nowhere').length === 0, 'envelopesForMap = [] for a map with no rows');

  // ---- laneAvg: averaging one envelope == that envelope's octile lanes; two
  // identical envelopes == the same (proves the per-octile averaging loop) ----
  assert.ok(R.laneAvg([]) === null, 'laneAvg([]) = null (no skirmishes -> caller renders "none")');
  var one = R.laneAvg([env]), octs = R.actionOctileLanes(env);
  var reshapeOk = true, avgOk = true, two = R.laneAvg([env, env]);
  ['deploy', 'attack', 'swap', 'march'].forEach(function (a) {
    for (var i = 0; i < 8; i++) {
      if (!near(one[a][i], octs[i][a])) reshapeOk = false;
      if (!near(two[a][i], one[a][i])) avgOk = false;
    }
  });
  assert.ok(reshapeOk, 'laneAvg([env]) reshapes actionOctileLanes into per-lane octile arrays, value-for-value');
  assert.ok(avgOk, 'laneAvg of two identical envelopes equals one (averaging is stable)');

  // ---- vpDiffAvg: resample [0,1,3,1,3,2,1,0] onto 9 points over normalized
  // time (linear interp), hand-computed independently of the implementation ----
  var vd = R.vpDiffAvg([env], 8);
  var expect = [0, 0.875, 2.5, 1.75, 2, 2.625, 1.75, 0.875, 0];
  var ptsOk = vd.points.length === 9 && vd.points.every(function (v, i) { return near(v, expect[i]); });
  assert.ok(ptsOk, '|VP-diff| resample matches the hand-computed 9-point interpolation (got ' + JSON.stringify(vd.points.map(function (v) { return +v.toFixed(3); })) + ')');
  assert.ok(vd.n === 1 && vd.total === 1, 'vpDiffAvg counts n=1/total=1 for one fs-carrying envelope');
  var both = R.vpDiffAvg([env, env], 8);
  assert.ok(both.points.every(function (v, i) { return near(v, expect[i]); }) && both.n === 2 && both.total === 2, 'two identical tracks average to the same points, n=2/total=2');
  // an envelope with no fs is skipped from the average but still counted in total
  var envNoFs = { turns: 3, trace: [] };
  assert.ok(R.vpDiffAvg([envNoFs]) === null, 'vpDiffAvg = null when NO envelope carries fs');
  var mixed = R.vpDiffAvg([env, envNoFs], 8);
  assert.ok(mixed.n === 1 && mixed.total === 2, 'a mix folds only the fs-carrying track (n=1) but reports total=2');
})();
});

test('chart-model: buildMapDrillModel (Maps pane display model)', () => {
(function () {
  var C = require('./ui/chart-model.js');
  function row(map) { return { map: map, winner: 'red', trace: JSON.stringify({ turns: 3, trace: [] }), fs: [[1, 0], [2, 0], [2, 1]] }; }
  var rowsA = [row('Frontier'), row('Frontier'), row('The Void')];
  var rowsB = [row('Frontier')];

  assert.ok(C.buildMapDrillModel([], [], null, 'B') === null, 'buildMapDrillModel = null when neither run has rows');

  var m = C.buildMapDrillModel(rowsA, rowsB, null, 'B');
  assert.ok(JSON.stringify(m.mapList) === JSON.stringify(['Frontier', 'The Void']), 'mapList = sorted union of both runs (Frontier, The Void)');
  assert.ok(m.mapName === 'Frontier' && m.idx === 0, 'null focus falls back to the first map (idx 0)');
  assert.ok(m.envA.length === 2 && m.envB.length === 1, 'envelopes are filtered to the focused map per run (A=2, B=1)');

  // the builder never touches DASH — it returns the resolved focus so the caller
  // can persist it (this test runs in node, where no DASH global exists at all).
  assert.ok(C.buildMapDrillModel(rowsA, rowsB, 'Nowhere', 'B').mapName === 'Frontier', 'a stale focus (not in mapList) resolves back to the first map');
  var mv = C.buildMapDrillModel(rowsA, rowsB, 'The Void', 'B');
  assert.ok(mv.mapName === 'The Void' && mv.idx === 1 && mv.envA.length === 1, 'an explicit valid focus is honoured');

  // the A|B|A/B toggle is resolved in the model, not the renderer
  assert.ok(m.tempo.solidLabel === 'B' && m.tempo.solidEnv === m.envB && m.tempo.ghostEnv === null && m.hex.ghost === null, "abMode 'B': run B solid, no ghost");
  var ma = C.buildMapDrillModel(rowsA, rowsB, 'Frontier', 'A');
  assert.ok(ma.tempo.solidLabel === 'A' && ma.tempo.solidEnv === ma.envA, "abMode 'A': run A solid");
  var mab = C.buildMapDrillModel(rowsA, rowsB, 'Frontier', 'AB');
  assert.ok(mab.tempo.ghostEnv === mab.envA && mab.hex.ghost === mab.hex.foldA, "abMode 'AB': run A is the ghost overlay");
})();
});

test('report-model: mapScoreDumbbells (Overview per-map balance fold)', () => {
(function () {
  var R = require('./report-model.js');
  function wins(n, redFrac, map) { var a = []; for (var i = 0; i < n; i++) a.push({ map: map, winner: i < redFrac * n ? 'red' : 'blue' }); return a; }
  // A: two maps; B: only Frontier (heavily red-skewed -> worse balance score).
  var rowsA = wins(10, 0.5, 'Frontier').concat(wins(6, 0.5, 'The Void'));
  var rowsB = wins(10, 0.9, 'Frontier');

  assert.ok(R.mapScoreDumbbells([], []).length === 0, 'mapScoreDumbbells = [] when neither run has rows');
  var rows = R.mapScoreDumbbells(rowsA, rowsB);
  assert.ok(rows.length === 2, 'one dumbbell per map in the union (Frontier, The Void)');

  // scores + done match an INDEPENDENT recompute via the public foldSkirmishes/balanceScore.
  var frontier = rows.filter(function (r) { return r.map === 'Frontier'; })[0];
  var gAf = R.foldSkirmishes(rowsA.filter(function (r) { return r.map === 'Frontier'; }));
  var gBf = R.foldSkirmishes(rowsB);
  assert.ok(frontier.doneA === 10 && frontier.doneB === 10, 'Frontier done counts are per-run skirmish totals (A=10, B=10)');
  assert.ok(frontier.scoreA === R.balanceScore(gAf.agg, gAf.done) && frontier.scoreB === R.balanceScore(gBf.agg, gBf.done),
    'Frontier scoreA/scoreB equal the independent foldSkirmishes+balanceScore recompute');

  // The Void was played by A only -> scoreB null, doneB 0.
  var theVoid = rows.filter(function (r) { return r.map === 'The Void'; })[0];
  assert.ok(theVoid.scoreB === null && theVoid.doneB === 0 && theVoid.scoreA != null, 'a map only run A played scores B null / done 0, A real');

  // sorted worst-first on B: Frontier (B skewed 90% red, high score) ahead of The Void (no B score -> sinks).
  assert.ok(rows[0].map === 'Frontier', 'sorted worst-first on B: the B-regressed map leads');
})();
});

test('chart-model: ovFmt / ovTrackDomain / ovPos (Overview presentation math)', () => {
(function () {
  var C = require('./ui/chart-model.js');
  function near(a, b) { return Math.abs(a - b) < 1e-9; }
  // ovFmt: percent keys round to N%, non-percent keys go through f1, null -> n/a.
  assert.ok(C.ovFmt('red', 49.6) === '50%', 'ovFmt rounds a percent key to a whole %');
  assert.ok(C.ovFmt('drag', 2.34) === '2.3', 'ovFmt sends a non-percent key (drag) through f1');
  assert.ok(C.ovFmt('red', null) === 'n/a', 'ovFmt = n/a for a null value');

  // ovPos: linear map lo..hi -> 0..100, clamped, null passthrough.
  assert.ok(C.ovPos({ lo: 36.5, hi: 63.5 }, 50) === 50, 'ovPos maps the domain midpoint to 50%');
  assert.ok(C.ovPos({ lo: 0, hi: 10 }, 20) === 100, 'ovPos clamps above-domain to 100%');
  assert.ok(C.ovPos({ lo: 0, hi: 10 }, -5) === 0, 'ovPos clamps below-domain to 0%');
  assert.ok(C.ovPos({ lo: 0, hi: 1 }, null) === null, 'ovPos passes null through');

  // ovTrackDomain (percent key 'red', T2 band 41..59): in-band values leave the
  // band-driven domain 41-4.5 .. 59+4.5 (25% pad); an out-of-band value extends it.
  var redRow = require('./report-model.js').BANDS.filter(function (b) { return b.key === 'red'; })[0];
  var d = C.ovTrackDomain(redRow, 50, 52);
  assert.ok(near(d.lo, 36.5) && near(d.hi, 63.5), 'ovTrackDomain brackets the T2 band with 25% padding when A/B sit inside it');
  var dOut = C.ovTrackDomain(redRow, 50, 70);
  assert.ok(dOut.hi >= 70 && dOut.hi <= 100, 'ovTrackDomain stretches to include an out-of-band value (still clamped to 100 for a %)');
})();
});

test('chart-model: buildOverviewModel (Overview display model)', () => {
(function () {
  var C = require('./ui/chart-model.js');
  var R = require('./report-model.js');
  function wins(n, redFrac, map) { var a = []; for (var i = 0; i < n; i++) a.push({ map: map, winner: i < redFrac * n ? 'red' : 'blue' }); return a; }
  // fleet SMALL_N is 240, so use 300 rows/run to clear the small-n gate and let breaches count.
  var rowsA = wins(300, 0.5, 'Frontier');
  var rowsB = wins(300, 0.9, 'Frontier');
  var m = C.buildOverviewModel(rowsA, rowsB, 'T2');

  // aggregates + band partition match the public fold / BANDS split.
  var gA = R.foldSkirmishes(rowsA), gB = R.foldSkirmishes(rowsB);
  assert.ok(m.aggA.done === gA.done && m.aggB.done === gB.done, 'aggA/aggB are the public foldSkirmishes of each run');
  assert.ok(m.scoredRows.length === R.BANDS.filter(function (b) { return b.feedsScore; }).length &&
    m.guardRows.length === R.BANDS.filter(function (b) { return !b.feedsScore; }).length, 'scoredRows/guardRows partition BANDS by feedsScore');

  // verdict: run B skewed 90% red breaches Red% high (>59 at T2). Small-n excluded — n=300 clears it.
  var keys = m.verdict.breaches.map(function (b) { return b.key; });
  assert.ok(keys.indexOf('red') >= 0, 'verdict flags the Red% breach when run B is red-skewed past the T2 band');
  assert.ok(m.verdict.breaches.filter(function (b) { return b.key === 'red'; })[0].val === '90%', 'the breach carries the ovFmt-formatted run-B value (90%)');
  assert.ok(m.verdict.temperature === 'T2', 'verdict echoes the selected temperature');

  // a small-n run raises no breaches (the fleet gate).
  var small = C.buildOverviewModel(wins(10, 0.5, 'Frontier'), wins(10, 0.9, 'Frontier'), 'T2');
  assert.ok(small.verdict.breaches.length === 0, 'small-n (< 240) run B raises no breaches');

  // dumbbells + pacing are the wired-in folds.
  assert.ok(m.dumbbells.length === 1 && m.dumbbells[0].map === 'Frontier', 'dumbbells = the mapScoreDumbbells fold');
  assert.ok(m.pacing.interleave.nbins === 6 && m.pacing.interleave.nA === 0, 'pacing carries the 6-bin interleave histogram (nA=0 here, rows have no trace)');
})();
});

test('report-model: Cards-pane folds (cardRunView / cardFleetFireTimes)', () => {
(function () {
  var R = require('./report-model.js');
  function near(a, b) { return Math.abs(a - b) < 1e-9; }
  var CARDS = [{ id: 'raid', name: 'Raid' }, { id: 'hold', name: 'Hold' }];

  // Two run-A skirmish rows: an HQ-ending win for red, and an attrition win for
  // blue. raid played 3× total (twice in A1, once in A2), hold 2× (one of them a
  // 'simple' resolution). Hand-computed slices below are independent of the impl.
  function row(env) { return { trace: JSON.stringify(env) }; }
  var rowsA = [
    row({ winner: 'red', winType: 'hq', turns: 4, trace: [
      { id: 'raid', p: 'red', turn: 1, mode: 'normal', seen: 1 },
      { id: 'raid', p: 'blue', turn: 3, mode: 'normal', seen: 2 },
      { id: 'hold', p: 'red', turn: 2, mode: 'simple', seen: 1 }
    ] }),
    row({ winner: 'blue', winType: 'attrition', turns: 2, trace: [
      { id: 'raid', p: 'blue', turn: 1, mode: 'normal', seen: 1 },
      { id: 'hold', p: 'blue', turn: 2, mode: 'normal', seen: 1 }
    ] })
  ];

  // ---- cardRunView: parses rows -> envs, folds cardRows + the win slice ----
  var A = R.cardRunView(rowsA, CARDS);
  assert.ok(A.envs.length === 2, 'cardRunView parses both rows into envelopes');
  assert.ok(A.byId.raid.plays === 3 && A.byId.raid.sight === 67, 'raid: 3 plays, 1st-sight % pooled (2/3 = 67)');
  // winHq is the HQ-capture × non-simple slice: only A1 (winType hq) counts; raid
  // fired twice there (red win + blue loss), hold's play was 'simple' -> excluded.
  assert.ok(A.byId.raid.winHq === 50 && A.byId.raid.winHqN === 2, 'raid winHq = 50% over n=2 (HQ × non-simple slice)');
  assert.ok(A.byId.hold.winHq === null && A.byId.hold.winHqN === 0, 'hold winHq = null (never played non-simple in an HQ ending)');

  // malformed / empty rows drop cleanly (envelopeFromRow returns null)
  assert.ok(R.cardRunView([{ trace: 'not json' }], CARDS).envs.length === 0, 'cardRunView drops an unparseable row');

  // ---- cardFleetFireTimes: pools each skirmish's per-card MEDIAN, re-quantiles ----
  var fireA = R.cardFleetFireTimes(A.envs);
  // raid medians: A1 [.25,.75]->.5, A2 [.5]->.5  => pooled [.5,.5] flat
  assert.ok(near(fireA.raid.q1, 0.5) && near(fireA.raid.median, 0.5) && near(fireA.raid.q3, 0.5), 'raid fleet fire-times flat at 0.5 (both skirmish medians = 0.5)');
  // hold medians: A1 [.5]->.5, A2 [1]->1 => pooled [.5,1]: q1 .625 / med .75 / q3 .875
  assert.ok(near(fireA.hold.q1, 0.625) && near(fireA.hold.median, 0.75) && near(fireA.hold.q3, 0.875), 'hold fleet fire-times = hand-computed quartiles of [0.5, 1.0]');
})();
});

test('chart-model: buildCardsModel (Cards pane display model)', () => {
(function () {
  var C = require('./ui/chart-model.js');
  var CARDS = [{ id: 'raid', name: 'Raid' }, { id: 'hold', name: 'Hold' }];
  function row(env) { return { trace: JSON.stringify(env) }; }
  var rowsA = [
    row({ winner: 'red', winType: 'hq', turns: 4, trace: [
      { id: 'raid', p: 'red', turn: 1, mode: 'normal', seen: 1 },
      { id: 'raid', p: 'blue', turn: 3, mode: 'normal', seen: 2 },
      { id: 'hold', p: 'red', turn: 2, mode: 'simple', seen: 1 }
    ] }),
    row({ winner: 'blue', winType: 'attrition', turns: 2, trace: [
      { id: 'raid', p: 'blue', turn: 1, mode: 'normal', seen: 1 },
      { id: 'hold', p: 'blue', turn: 2, mode: 'normal', seen: 1 }
    ] })
  ];
  var rowsB = [row({ winner: 'blue', winType: 'hq', turns: 2, trace: [
    { id: 'raid', p: 'blue', turn: 1, mode: 'normal', seen: 1 }
  ] })];

  var m = C.buildCardsModel(rowsA, rowsB, CARDS);
  // rows: both cards have plays (raid A=3/B=1, hold A=2/B=0) so both survive
  assert.ok(m.rows.length === 2 && m.rows[0].id === 'raid' && m.rows[1].id === 'hold', 'rows = both played cards, in card-list order');
  assert.ok(m.rows[0].a.plays === 3 && m.rows[0].b.plays === 1, 'raid carries per-run a/b views (A=3, B=1)');
  assert.ok(m.rows[1].b.plays === 0, 'hold\'s run-B view is a zero-play row (cardRows emits every card)');
  // quadrant coverage: only raid is in the HQ × non-simple slice for either run -> 1 eligible, 1 omitted
  assert.ok(m.quadEligible === 1 && m.omitted === 1, 'quadEligible=1 / omitted=1 (only raid ever in the HQ × non-simple slice)');
  // maxPlays drives bubble radius: max over max(a,b) per card = raid's 3
  assert.ok(m.maxPlays === 3, 'maxPlays = 3 (raid, the most-played card across runs)');
  // fire-time strips input is wired per run
  assert.ok(m.fireA.raid && m.fireB.raid && m.fireA.hold && !m.fireB.hold, 'fireA/fireB carry each run\'s fleet fire-times (hold absent from B)');

  // cards with no plays in either run drop out entirely
  var empty = C.buildCardsModel([], [], CARDS);
  assert.ok(empty.rows.length === 0 && empty.maxPlays === 1 && empty.quadEligible === 0, 'no rows -> empty model (maxPlays floor 1, nothing eligible)');
})();
});

test('report-model: unitsAggFromRows (Units pane per-run fold)', () => {
(function () {
  var R = require('./report-model.js');
  // One skirmish, 10 turns: infantry deploys T2, dies T8 (lifespan 6); cavalry
  // deploys T3, never dies. Hand-fold below is independent of the loop.
  var env = { turns: 10, units: {
    infantry: { dep: [2], atk: 4, abs: 6, kill: 2, die: 2, dieT: [8] },
    cavalry: { dep: [3], atk: 6, abs: 0, kill: 1, die: 0 } } };
  var rows = [
    { map: 'X', trace: JSON.stringify(env) },
    { map: 'X', trace: 'not json' }        // unparseable -> envelopeFromRow null -> dropped
  ];
  var A = R.unitsAggFromRows(rows), inf = A.types.infantry, cav = A.types.cavalry;
  assert.ok(inf.n === 1 && inf.atk === 4 && inf.abs === 6 && inf.kill === 2 && inf.die === 2, 'infantry folds n=1 with raw atk/abs/kill/die (unparseable row dropped)');
  assert.ok(inf.depMedian === 0.2 && inf.roleY === 40 && inf.breakthrough === 6 && inf.exchange === 1 && inf.lifespan === 6, 'infantry derived: depMedian .2, roleY 40%, breakthrough 6, exchange 1.0, lifespan 6');
  assert.ok(cav.roleY === 100 && cav.breakthrough === 0 && cav.exchange === null && cav.lifespan === null, 'cavalry: all-attack roleY 100%, no deaths -> exchange/lifespan null');
  assert.ok(A.hasDieT === true, 'hasDieT true when any type carries dieT');
  assert.ok(R.unitsAggFromRows([]).hasDieT === false && Object.keys(R.unitsAggFromRows([]).types).length === 0, 'empty rows -> no types, hasDieT false');
})();
});

test('chart-model: buildUnitsModel + unLinearDomain/unPos (Units pane)', () => {
(function () {
  var C = require('./ui/chart-model.js');
  function near(a, b) { return Math.abs(a - b) < 1e-9; }
  var env = { turns: 10, units: {
    infantry: { dep: [2], atk: 4, abs: 6, kill: 2, die: 2, dieT: [8] },
    cavalry: { dep: [3], atk: 6, abs: 0, kill: 1, die: 0 } } };
  var rowsA = [{ map: 'X', trace: JSON.stringify(env) }];

  var m = C.buildUnitsModel(rowsA, []);
  assert.ok(m.rows.length === 2, 'only fielded types make rows (artillery, never deployed, is dropped)');
  assert.ok(m.rows[0].type === 'infantry' && m.rows[0].idx === 0 && m.rows[0].name === 'Infantry', 'row 0 = infantry, idx 0 (ENG.UNITS order), engine name');
  assert.ok(m.rows[1].type === 'cavalry' && m.rows[1].idx === 1, 'row 1 = cavalry, idx 1 preserved for the palette');
  assert.ok(m.rows[0].a && m.rows[0].a.n === 1 && m.rows[0].b === null, 'run A fold present on .a, empty run B -> .b null');
  assert.ok(m.hasDieT === true && m.rows[0].color === undefined, 'hasDieT surfaced; model carries NO colour (palette is the renderer\'s job)');
  assert.ok(C.buildUnitsModel([], []).rows.length === 0, 'no rows either run -> empty rows');

  // unLinearDomain: floor at 1, +15% headroom over the largest real value.
  assert.ok(JSON.stringify(C.unLinearDomain([])) === JSON.stringify({ lo: 0, hi: 1.15 }), 'unLinearDomain([]) floors hi at 1 -> {0, 1.15}');
  var dom = C.unLinearDomain([6, 0, null]);
  assert.ok(dom.lo === 0 && near(dom.hi, 6.9), 'unLinearDomain sizes hi to max(6)*1.15 = 6.9, ignoring null');
  // unPos: linear map into [0,100], clamped, null-passthrough.
  assert.ok(C.unPos(dom, null) === null && near(C.unPos(dom, 6), 6 / 6.9 * 100), 'unPos: null passes through, 6 maps to 86.96%');
  assert.ok(C.unPos(dom, 100) === 100 && C.unPos(dom, -5) === 0, 'unPos clamps out-of-domain values to [0,100]');
})();
});

test('loop-config: tolerance profiles parse + hard-flag Red%/1st%', () => {
(function () {
  var R = require('./report-model.js');
  var T = require('./content/tolerances.js');   // load asserts on its own; requiring proves it parses

  // the three #94 default profiles exist, each a { name, tolerances } object (no dead step field)
  ['card', 'map', 'ai'].forEach(function (k) {
    var p = T.profiles[k];
    assert.ok(p && p.name && p.tolerances, 'profile "' + k + '" is a {name, tolerances} object');
    assert.ok(!('step' in p), 'profile "' + k + '" carries no dead step field (#164)');
    // every loosened key is a real BANDS metric with a valid grace class
    Object.keys(p.tolerances).forEach(function (m) {
      assert.ok(R.BANDS.some(function (b) { return b.key === m; }), k + '.tolerances.' + m + ' is a BANDS key');
      assert.ok(T.GRACE.indexOf(p.tolerances[m]) >= 0, k + '.tolerances.' + m + ' has a valid grace');
    });
    // Red%/1st% are always locked flags: absent (⇒ hold) or explicitly hold, never loosened
    T.HARD_FLAGGED.forEach(function (g) {
      assert.ok(!(g in p.tolerances) || p.tolerances[g] === 'hold', k + ' does not loosen locked-flag ' + g + '%');
    });
  });
  // #94 mapping spot-checks (loosened cells default nudge)
  assert.ok(T.profiles.card.tolerances.swings === 'nudge' && !('tie' in T.profiles.card.tolerances), 'Card loosens Swings, not Tie%');
  assert.ok(T.profiles.map.tolerances.tie === 'nudge' && !('swings' in T.profiles.map.tolerances), 'Map loosens Tie%, not Swings');
  assert.ok(T.profiles.ai.tolerances.control === 'nudge' && !('zeroKill' in T.profiles.ai.tolerances), 'AI loosens Control%, not 0kill%');

  // the exported load gate (same code the defaults pass) rejects loosening a locked-flag metric
  assert.throws(function () { T.validate({ name: 'X', tolerances: { first: 'nudge' } }); },
    /locked flag/, 'the schema gate rejects loosening 1st% (default mode)');
  assert.throws(function () { T.validate({ name: 'X', tolerances: { red: 'nudge' } }); },
    /locked flag/, 'the schema gate rejects loosening Red% in default mode');
  assert.throws(function () { T.validate({ name: 'X', tolerances: { hq: 'wat' } }); },
    /unknown grace/, 'the schema gate rejects an unknown grace class');
  assert.throws(function () { T.validate({ name: 'X', tolerances: { hqq: 'nudge' } }); },
    /not a band metric key/, 'the schema gate rejects a typo\'d metric key');
  assert.ok(T.validate({ name: 'Asym', tolerances: { red: 'hold', hq: 'nudge' } }), 'a valid custom profile passes the gate');
  // Red% is the ONE manual-loosen for asymmetric runs; 1st% is never loosenable
  assert.ok(T.validate({ name: 'Asym', tolerances: { red: 'nudge' } }, null, { asymmetric: true }), 'opts.asymmetric permits the manual Red% loosen');
  assert.throws(function () { T.validate({ name: 'Asym', tolerances: { first: 'nudge' } }, null, { asymmetric: true }); },
    /locked flag/, '1st% stays a locked flag even in asymmetric mode');
})();
});

test('report-model: foldPanel takes worst-case per metric (never a mean), balance hard-flagged', () => {
(function () {
  var R = require('./report-model.js');
  var TEMPS = require('./content/tolerances.js');
  // Synthetic panel — three "personalities", done=100 so redWins etc. read as %.
  // attritionEndings/controlGames left 0 so tie/drag/control fall out (null) — a
  // smoke-check of the fold, not a pinned sweep.
  function row(name, red, first, hq) {
    return { name: name, done: 100, agg: { redWins: red, firstWins: first, hqWins: hq,
      zeroKill: 2, leadChanges: 300, attritionEndings: 0, controlGames: 0, attacks: 0, swaps: 0, marches: 0, deploys: 0 } };
  }
  // Red% mean = (30+55+50)/3 = 45, INSIDE the 45–55 hold band — but member A sits
  // at 30, out. Worst-case must still fail; a mean would hide it. That's the point.
  var rows = [row('A', 30, 50, 5), row('B', 55, 50, 60), row('C', 50, 50, 20)];
  var pf = R.foldPanel(rows, TEMPS.profiles.card);   // card loosens hq → nudge

  assert.ok(!pf.flag.inBand, 'balance flag raised on the worst member even though the Red% mean is in band');
  var redFail = pf.flag.members.filter(function (f) { return f.key === 'red'; })[0];
  assert.ok(redFail && redFail.name === 'A' && redFail.val === 30, 'the flag names member A (Red% 30), the worst case — not the 45 mean');
  assert.ok(!pf.flag.members.some(function (f) { return f.key === 'first'; }), '1st% (all 50, in band) does not flag');

  assert.ok(pf.metrics.red.flagged && !pf.metrics.hq.flagged, 'red/first are hard-flagged; hq is exploratory');
  assert.strictEqual(pf.metrics.hq.grace, 'nudge', 'hq carries the loosened (nudge) grace from the card profile');
  // hq nudge band = 10±? → 4–46 (0.2 × 30 width); member B at 60 breaks it.
  var hqOver = pf.overfit.filter(function (o) { return o.key === 'hq'; })[0];
  assert.ok(hqOver && hqOver.name === 'B', 'overfit finding surfaces hq breaking against member B');
  assert.strictEqual(pf.metrics.hq.spread, 55, 'hq spread is max−min (60−5), the "no two members share a read" signal');
  assert.ok(!pf.overfit.some(function (o) { return o.key === 'red' || o.key === 'first'; }), 'balance never appears as an overfit finding (it is a flag, not a spread)');

  // An all-fair panel with hq in its loosened band passes clean.
  var clean = R.foldPanel([row('A', 50, 50, 20), row('B', 48, 52, 25), row('C', 52, 49, 15)], TEMPS.profiles.card);
  assert.ok(clean.flag.inBand && !clean.overfit.length, 'a fair, in-band panel passes with no overfit finding');

  // Two-sided break: A below the floor (30), B above the ceiling (72). BOTH named —
  // reporting only the single worst would hide half the balance break.
  var twoSided = R.foldPanel([row('A', 30, 50, 20), row('B', 72, 50, 20)], TEMPS.profiles.card);
  var redFails = twoSided.flag.members.filter(function (f) { return f.key === 'red'; }).map(function (f) { return f.name; });
  assert.ok(redFails.indexOf('A') >= 0 && redFails.indexOf('B') >= 0, 'both opposite-direction Red% breaks (A low, B high) are named');

  // A personality with no finished games (done=0) is dropped, not read as a real 0%.
  var withDead = R.foldPanel([row('A', 50, 50, 20), { name: 'dead', done: 0, agg: {} }], TEMPS.profiles.card);
  assert.ok(withDead.flag.inBand, 'a done=0 personality is dropped (no data), not a fabricated 0% balance flag');
  assert.ok(!withDead.metrics.red.samples.some(function (s) { return s.name === 'dead'; }), 'the no-data personality contributes no samples');
})();
});

test('report-model: reportMarkdown surfaces calibratePoints suggestions (#156)', () => {
(function () {
  var R = require('./report-model.js');
  // Minimal report model: a zeroed G (all Overall denominators safe) with a seeded
  // card fold. Two attack cards out-win their price share (Dominant, resid ≥ 2) and
  // share step.attack with no single-card domination → a shared RAISE move; a third
  // card is fairly priced. cardPoints supplied so cardRows computes resid.
  function model(cards, cardAgg, points) {
    var G = R.foldGlobal([]);          // zeroed totals + empty G.cards
    G.cards = cardAgg;
    return { style: 'report', title: 't', version: '1.2', metaTail: 'x',
      rows: [], G: G, cards: cards, cardPoints: function (c) { return points[c.id]; } };
  }
  var agg = function (hqWins) {
    return { plays: 20, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 20, hqWins: hqWins };
  };
  var cards = [
    { id: 'A', name: 'CardA', steps: [{ type: 'attack' }] },
    { id: 'B', name: 'CardB', steps: [{ type: 'attack' }] },
    { id: 'Z', name: 'CardZ', steps: [{ type: 'reposition' }] }
  ];
  // hqWins 20/20/2, points 5 each → resid_A/B ≈ +2.1 (Dominant), resid_Z ≈ −4.3 (Weakly, excluded).
  var md = R.reportMarkdown(model(cards, { A: agg(20), B: agg(20), Z: agg(2) }, { A: 5, B: 5, Z: 5 }));
  assert.ok(md.indexOf('## Calibration suggestions') >= 0, 'the calibration section renders');
  assert.ok(/`step\.attack` raise \+0\.5/.test(md), 'the shared step.attack raise move is surfaced with its magnitude');
  assert.ok(md.indexOf('_No calibration suggestions this run._') < 0, 'a mispriced pool does NOT show the empty line');

  // A fairly-priced pool (resid ≈ 0, no card Dominant) → explicit no-suggestions line.
  var clean = R.reportMarkdown(model(
    [{ id: 'A', name: 'CardA', steps: [{ type: 'attack' }] }, { id: 'B', name: 'CardB', steps: [{ type: 'attack' }] }],
    { A: agg(10), B: agg(10) }, { A: 5, B: 5 }));
  assert.ok(clean.indexOf('## Calibration suggestions') >= 0, 'the section renders for a clean pool too');
  assert.ok(clean.indexOf('_No calibration suggestions this run._') >= 0, 'a clean pool shows the explicit no-suggestions line');
})();
});

test('loop-config: debrief questionnaire is an ordered id+text table with feel + reflex', () => {
(function () {
  var Q = require('./content/questionnaire.js');   // load asserts on its own; requiring proves it parses
  assert.ok(Array.isArray(Q.questions) && Q.questions.length, 'questionnaire is a non-empty ordered list');
  var ids = Q.questions.map(function (q) { return q.id; });
  assert.ok(ids.indexOf('feel') >= 0, 'the feel question is an entry');
  assert.ok(ids.indexOf('reflex') >= 0, 'the reflex question is an entry');
  Q.questions.forEach(function (q) { assert.ok(q.id && typeof q.text === 'string' && q.text.trim(), 'every row has id + non-empty text'); });
  // the exported gate rejects a malformed / duplicate-id table
  assert.throws(function () { Q.validate([{ id: 'a', text: '' }]); }, /id \+ text/, 'gate rejects an empty question text');
  assert.throws(function () { Q.validate([{ id: 'a', text: 'x' }, { id: 'a', text: 'y' }]); }, /duplicate id/, 'gate rejects a duplicate id');
})();
});
