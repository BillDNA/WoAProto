#!/usr/bin/env node
/* dev/sweep.js — the one reusable parallel balance-sweep orchestrator.

   The engine's current-board state is module-global, so in-process interleaving
   is unsafe — parallelism is process-per-batch: each worker require()s a fresh
   engine. The unit of parallel work is a (map, game-batch) drained from a flat
   queue by a fixed worker pool (concurrency capped at `workers`), so throughput
   scales with cores REGARDLESS of map count: a single map × huge N still fans out
   across every worker.

   Order-independence — the properties that make a fan-out byte-identical to a
   serial run on the same seeds:
     - games are independently seeded off the ABSOLUTE index (balanceSeed/balanceFP
       via balanceMap's gStart), so a batch's skirmishes match the same games in a
       full-map serial run;
     - the per-map aggregate fold (report-model addAgg) is commutative, so batches
       fold back in any completion order;
     - every skirmish carries its own g, so the parent replays them in serial order
       — maps in index order, g ascending within a map — DB rows insert in exactly
       the order the serial path uses (ids included). Buffering streams: a map is
       flushed as soon as it AND every earlier map have finished, so peak buffered
       skirmishes track how far completion runs ahead of the flush frontier, not the
       whole sweep.

   The parent stays the SOLE woa.db writer: workers ship slim skirmish states back
   over stdout and the parent persists them (no cross-process SQLite contention).
   This module owns the pool + queue + fold + ordering only; the caller owns db.js
   (via onSkirmish) and map shape (one implementation per fact). */
'use strict';

var cp = require('child_process');
var path = require('path');
var LAB = require('./lab-config.js'); // dev-lab home; owns the pool's core-reserve knob

// Default parallel worker count: every core but the reserve (LAB.sweep.workerReserve).
// The one owner — balance.js and balance-report.js both read it here (no per-file copy).
function defaultWorkers() {
  var os = require('os');
  var cores = os.availableParallelism ? os.availableParallelism() : 4;
  return Math.max(1, cores - LAB.sweep.workerReserve);
}

// Worker: require()s a fresh engine (+ --battalion/--units preload), runs one
// contiguous game slice of ONE map, and serializes {agg, skirmishes:[{g, st}]}
// to stdout. g is the ABSOLUTE 1-based index (balanceMap emits gStart+i+1); st is
// slimmed to exactly what db.js insertSkirmish reads. When collect (argv[10]) is
// "0" the parent has no DB writer, so the worker skips the slim/collect work
// entirely and ships an empty skirmishes array. argv (node -e SCRIPT ...args):
// [1]=enginePath [2]=mapName [3]=gLen [4]=diffRed [5]=diffBlue [6]=seedBase
// [7]=battalionId [8]=unitsId [9]=gStart [10]=collect
var WORKER =
  'var path=require("path");var battalionId=process.argv[7]||"",unitsId=process.argv[8]||"",collect=process.argv[10]!=="0";' +
  'if(battalionId||unitsId){var fs=require("fs");' +
  'global.WOA_CONTENT={maps:[],cards:[],battalions:[],mapsets:[],units:[],commanders:[]};' +
  'require(path.join(path.dirname(process.argv[1]),"content","kinds.js")).forEach(function(kind){var dir=path.join(path.dirname(process.argv[1]),"content",kind);' +
  'try{fs.readdirSync(dir).filter(function(f){return /\\.js$/.test(f)}).sort().forEach(function(f){require(path.join(dir,f))})}catch(e){}});' +
  'if(battalionId)global.WOA_CONTENT.battalions.forEach(function(d){d.active=(d.id===battalionId)});' +
  'if(unitsId)global.WOA_CONTENT.units.forEach(function(u){u.active=(u.id===unitsId)});}' +
  'var E=require(process.argv[1]);var SIM=require(path.join(path.dirname(process.argv[1]),"sim.js"));var m=E.MAPS.filter(function(x){return x.name===process.argv[2]})[0];' +
  'var slim=null;if(collect){try{slim=require(path.join(path.dirname(process.argv[1]),"..","dev","db.js")).slimSkirmishState}catch(e){}}' +
  'var skirmishes=[];' +
  'var agg=SIM.balanceMap(m,+process.argv[3],{diffRed:process.argv[4],diffBlue:process.argv[5],seedBase:+process.argv[6],gStart:+process.argv[9],' +
  'onGame:slim&&function(g,nn,st){skirmishes.push({g:g,st:slim(st)})}});' +
  'process.stdout.write(JSON.stringify({agg:agg,skirmishes:skirmishes}));';

// Split each map's n games into contiguous batches, flattened across all maps.
// chunksPerMap aims for ~2 batches/worker (load balancing when maps finish
// unevenly) but never fragments below MIN_BATCH games — a tiny n stays one batch,
// so a small run is still byte-identical and pays no extra spawn cost. n <= 0
// yields no batches for that map (the reusable API's zero-game case).
function planBatches(mapCount, n, workers) {
  var MIN_BATCH = 8, LOAD = 2;
  var maxChunksByN = Math.max(1, Math.floor(n / MIN_BATCH));
  var chunksPerMap = Math.max(1, Math.min(maxChunksByN, Math.round((Math.max(1, workers) * LOAD) / Math.max(1, mapCount))));
  var batches = [];
  for (var mi = 0; mi < mapCount; mi++) {
    var base = Math.floor(n / chunksPerMap), extra = n % chunksPerMap, g = 0;
    for (var c = 0; c < chunksPerMap; c++) {
      var len = base + (c < extra ? 1 : 0);
      if (len <= 0) continue;
      batches.push({ mapIndex: mi, gStart: g, gLen: len });
      g += len;
    }
  }
  return batches;
}

/* runParallelSweep(opts) => Promise<agg[]>  (indexed by mapIndex; a map with no
   games returns balanceNew(0), matching serial balanceMap(map, 0, ...))
   opts:
     enginePath   absolute path to game/engine.js
     maps         [{ name }]  (the map objects; only .name is read here)
     n            games per map
     diffRed, diffBlue   AI presets / maps.js ai row ids
     battalion, units  optional --battalion / --units ids to preload in each worker
     workers      worker-pool size (concurrency cap)
     seedBaseFor  (mapIndex) => seedBase  (the per-map seed base)
     onProgress   optional (batch) => void, fired as each batch completes
     onSkirmish   optional (mapIndex, g1, slimState) => void — g1 is 1-based;
                  called in serial order (maps ascending, g ascending). Omit it
                  and the workers skip skirmish collection entirely. */
function runParallelSweep(opts) {
  var R = require(path.join(__dirname, '..', 'game', 'report-model.js'));
  var SIM = require(path.join(__dirname, '..', 'game', 'sim.js'));
  var maps = opts.maps, workers = Math.max(1, opts.workers || 1);
  var collect = !!opts.onSkirmish;
  var batches = planBatches(maps.length, opts.n, workers);
  // Seed each map with an EMPTY aggregate (n=0) so batch aggs fold in commutatively
  // without double-counting n, and a zero-batch map still returns a valid agg.
  var aggs = maps.map(function () { return SIM.balanceNew(0); });
  var buf = maps.map(function () { return []; });          // per-map skirmish buffer
  var batchesLeft = maps.map(function () { return 0; });
  batches.forEach(function (b) { batchesLeft[b.mapIndex]++; });
  var flushed = 0;                                          // next map index awaiting flush
  function flushReady() {
    // A map flushes once it AND every earlier map have drained — keeps insertion
    // in strict serial order while freeing each map's buffer as the frontier moves.
    while (flushed < maps.length && batchesLeft[flushed] === 0) {
      var mi = flushed++;
      if (collect && buf[mi]) {
        buf[mi].sort(function (x, y) { return x.g - y.g; });
        buf[mi].forEach(function (s) { opts.onSkirmish(mi, s.g, s.st); });
      }
      buf[mi] = null;
    }
  }
  return new Promise(function (resolve, reject) {
    var next = 0, pending = batches.length, failed = false, children = new Set();
    if (!pending) { flushReady(); return resolve(aggs); }
    function fail(e) {
      if (failed) return;
      failed = true;
      children.forEach(function (c) { try { c.kill(); } catch (e2) {} });
      reject(e);
    }
    function launch() {
      if (failed || next >= batches.length) return;
      var b = batches[next++], map = maps[b.mapIndex], seedBase = opts.seedBaseFor(b.mapIndex);
      var child = cp.execFile(process.execPath,
        ['-e', WORKER, opts.enginePath, map.name, String(b.gLen), opts.diffRed, opts.diffBlue,
          String(seedBase), opts.battalion || '', opts.units || '', String(b.gStart), collect ? '1' : '0'],
        { maxBuffer: 256e6 }, function (err, stdout) {
          children.delete(child);
          if (failed) return;
          if (err) return fail(err);
          var out;
          try { out = JSON.parse(stdout); }
          catch (e) { return fail(e); }
          R.addAgg(aggs[b.mapIndex], out.agg);
          if (collect && out.skirmishes) buf[b.mapIndex].push.apply(buf[b.mapIndex], out.skirmishes);
          batchesLeft[b.mapIndex]--;
          flushReady();
          if (opts.onProgress) opts.onProgress(b);
          if (--pending === 0) return resolve(aggs);
          launch();
        });
      children.add(child);
    }
    for (var w = 0; w < Math.min(workers, batches.length); w++) launch();
  });
}

module.exports = { runParallelSweep: runParallelSweep, planBatches: planBatches, defaultWorkers: defaultWorkers };
