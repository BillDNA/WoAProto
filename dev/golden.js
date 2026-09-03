#!/usr/bin/env node
/* dev/golden.js — the refactor byte-equality net. A DETERMINISTIC 60-game set
   (10 skirmishes/map × the Core Six, hard-vs-hard, the active battalion) folded
   to a canonical transcript + sha256. A refactor that changes outcomes fails it;
   a change that legitimately moves the numbers regenerates it (--write) atomically
   with the rules-version bump (docs/reference/workflow.md).

   Pure sim -> transcript -> hash: NO DB is opened, so the nondeterministic `[db]`
   stderr never pollutes the golden stream (unlike a balance.js stdout capture).
   N-independent: exactly 10/map on a fixed seed schedule, never accumulated.

   Usage:
     node dev/golden.js            compare the live set to the committed golden; exit 1 on drift
     node dev/golden.js --write    regenerate dev/golden/core-six-60.json (numbers legitimately moved)
     node dev/golden.js --print    print the transcript, no compare

   The equivalence is asserted in the gate by dev/golden.test.js. */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var E = require(path.join(__dirname, '..', 'game', 'engine.js'));
var SIM = require(path.join(__dirname, '..', 'game', 'sim.js'));

var MAPSET = 'core7';       // "Core Six" — the frozen rules-regression mapset
var N_PER_MAP = 10;         // 10/map × 6 maps = 60 games
var GOLDEN_FILE = path.join(__dirname, 'golden', 'core-six-60.json');

// The Core Six maps, in mapset order (deterministic) — resolved by id or name.
function coreSixMaps() {
  var mset = (E.MAPSETS || []).filter(function (s) { return s.id === MAPSET; })[0];
  if (!mset) throw new Error('golden: mapset "' + MAPSET + '" not found');
  return mset.maps.map(function (ref) {
    var m = E.MAPS.filter(function (x) { return x.id === ref || x.name === ref; })[0];
    if (!m) throw new Error('golden: map "' + ref + '" (in mapset ' + MAPSET + ') not found');
    return m;
  });
}

// One skirmish -> one canonical, field-ordered transcript line. Every outcome
// fact a refactor could perturb is here; a byte change in any = a drift.
function line(map, seed, fp, f) {
  return [map.name, seed, fp, f.winner, f.winType, f.turns,
    f.fsRed, f.fsBlue, f.firstBlood || '-', f.leadChanges, f.killTail, f.zeroKill,
    f.attacks, f.swaps, f.marches, f.deploys].join('|');
}

// Run the fixed 60-game set on the balance seed schedule (offset 0, the
// --once/--fresh schedule) and return the transcript + its identity.
function compute() {
  var maps = coreSixMaps();
  var transcript = [];
  maps.forEach(function (map, mi) {
    var seedBase = (mi + 1) * 7919;   // the balance-report offset-0 per-map base
    for (var g = 0; g < N_PER_MAP; g++) {
      var fp = SIM.balanceFP(g), seed = SIM.balanceSeed(seedBase, g);
      var st = SIM.simSkirmish(map, seed, fp, 'hard', 'hard');
      transcript.push(line(map, seed, fp, SIM.skirmishFacts(st, fp)));
    }
  });
  return {
    version: E.VERSION,
    configDigest: E.CONFIG.digest,
    battalion: (E.ACTIVE_BATTALION && E.ACTIVE_BATTALION.id) || null,
    mapset: MAPSET,
    nPerMap: N_PER_MAP,
    sha256: crypto.createHash('sha256').update(transcript.join('\n')).digest('hex'),
    transcript: transcript
  };
}

function readGolden() {
  return JSON.parse(fs.readFileSync(GOLDEN_FILE, 'utf8'));
}

// First point of divergence between two runs — the header identity, then the
// first differing transcript line — so a failure names what moved.
function firstDiff(live, golden) {
  var hdr = ['version', 'configDigest', 'battalion', 'mapset', 'nPerMap'].filter(function (k) {
    return String(live[k]) !== String(golden[k]);
  }).map(function (k) { return k + ': ' + golden[k] + ' -> ' + live[k]; });
  if (hdr.length) return 'identity changed — ' + hdr.join(', ');
  var g = golden.transcript || [], l = live.transcript || [];
  if (l.length !== g.length) return 'game count ' + g.length + ' -> ' + l.length;
  for (var i = 0; i < l.length; i++) {
    if (l[i] !== g[i]) return 'game ' + (i + 1) + ' drifted:\n    was: ' + g[i] + '\n    now: ' + l[i];
  }
  return 'sha256 ' + golden.sha256 + ' -> ' + live.sha256;
}

// Compare the live set to the committed golden. Returns { ok, live, golden, diff }.
function check() {
  var live = compute();
  var golden = readGolden();
  var ok = live.sha256 === golden.sha256;
  return { ok: ok, live: live, golden: golden, diff: ok ? null : firstDiff(live, golden) };
}

function main() {
  var argv = process.argv.slice(2);
  if (argv.indexOf('--print') >= 0) {
    var c = compute();
    process.stdout.write(c.transcript.join('\n') + '\n');
    console.error('sha256: ' + c.sha256 + ' (' + c.transcript.length + ' games, ' + c.version + '/' + c.configDigest + ')');
    return;
  }
  if (argv.indexOf('--write') >= 0) {
    var w = compute();
    fs.mkdirSync(path.dirname(GOLDEN_FILE), { recursive: true });
    fs.writeFileSync(GOLDEN_FILE, JSON.stringify(w, null, 1) + '\n');
    console.log('WROTE: ' + path.relative(path.join(__dirname, '..'), GOLDEN_FILE) +
      ' (' + w.transcript.length + ' games, sha256 ' + w.sha256 + ')');
    return;
  }
  var r = check();
  if (r.ok) {
    console.log('GOLDEN OK: ' + r.golden.transcript.length + ' games byte-identical (sha256 ' + r.golden.sha256 + ')');
    return;
  }
  console.error('GOLDEN DRIFT: the 60-game set no longer matches dev/golden/core-six-60.json\n  ' + r.diff +
    '\n\nIf this is an intended rules/AI/content change, bump the rules version and\n' +
    'regenerate with `node dev/golden.js --write`. If it is a refactor, it changed outcomes — fix it.');
  process.exit(1);
}

if (require.main === module) main();
module.exports = { compute: compute, readGolden: readGolden, check: check, coreSixMaps: coreSixMaps, GOLDEN_FILE: GOLDEN_FILE };
