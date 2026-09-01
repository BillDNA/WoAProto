#!/usr/bin/env node
/* dev/fixtures/fake-loop-session.js — the FAITHFUL deterministic stand-in for the
 * content-loop session the server spawns (#168 foundation, ADR-0004 §1).
 *
 * It is NOT a stub that skips the seam: it is a real child process the server spawns in
 * tests over the REAL transport — dev/run-record.js written to --rec-dir, the same file the
 * server tails and GET /api/runloop reads. It emits the real per-iteration progress markers
 * (author -> grade -> balance -> feels -> commit), one stage per tick, so a mid-iteration
 * pause (SIGSTOP freezes the interval) genuinely freezes progress and SIGCONT resumes the
 * SAME process at the SAME iteration. It honors the real control signals and the real
 * --stop wall. What it does NOT do is call the LLM brains or the Engine sweep — only the
 * slow real halves are elided; the transport the ACs assert against is real.
 *
 * Flags (a subset of dev/content-loop.js's, byte-compatible where they overlap):
 *   --run-id <id>   --rec-dir <dir>   --stop <+Ns|iso>   --non-interactive
 *   --iter-ms <ms>  tick interval (default 60)      --iters <n>  hard iteration cap
 */
'use strict';

const path = require('path');
const RR = require(path.join(__dirname, '..', 'run-record.js'));

const argv = process.argv.slice(2);
const flag = function (name, def) { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const has = function (name) { return argv.indexOf('--' + name) >= 0; };

const runId = flag('run-id', 'fake-run-' + Date.now());
const recDir = flag('rec-dir', null);
const iterMs = Math.max(1, +flag('iter-ms', 60) | 0);
const maxIters = +flag('iters', 0) | 0;

// The real content loop's stop-datetime wall, same relative/iso grammar.
function parseStopAt(v, now) {
  now = now || Date.now();
  if (v == null || v === '') return 0;
  const rel = String(v).match(/^\+(\d+)\s*([smh])$/i);
  if (rel) { const k = { s: 1e3, m: 6e4, h: 36e5 }[rel[2].toLowerCase()]; return now + (+rel[1]) * k; }
  const t = Date.parse(v);
  return isNaN(t) ? 0 : t;
}
const stopAtMs = parseStopAt(flag('stop', '+30m'));

const STAGES = ['author', 'grade', 'balance', 'feels', 'commit'];

const rec = RR.open({ runId: runId, kind: 'card', dir: recDir, config: {
  nudge: 'stand-in', temperature: 'standard', tolerance: 'card',
  stopAt: stopAtMs ? new Date(stopAtMs).toISOString() : '', questionnaire: 'default'
} });

let iter = 0, stageIx = 0, stopped = false;

function finishRun(state) {
  if (stopped) return;
  stopped = true;
  RR.finish(rec, state || 'done');
  process.exit(0);
}

// SIGTERM = graceful stop (the real loop records 'stopped'); SIGSTOP/SIGCONT are OS-level
// (uncatchable) — the interval simply stops firing while stopped, so continuity is real.
process.on('SIGTERM', function () { finishRun('stopped'); });

function newIteration() {
  iter += 1;
  stageIx = 0;
  RR.startIteration(rec, iter);
}

const timer = setInterval(function () {
  // the ONLY hard wall — no new iteration past the stop-datetime
  if (stopAtMs && Date.now() >= stopAtMs && (stageIx === 0)) { clearInterval(timer); return finishRun('done'); }
  if (iter === 0) newIteration();

  const name = STAGES[stageIx];
  // set BEFORE the "work" so the tailed record shows "author running now" live, then mark it
  RR.setStage(rec, { iter: iter, name: name });
  RR.markStage(rec, iter, name);
  process.stdout.write('LOOP_STAGE ' + JSON.stringify({ iter: iter, stage: name }) + '\n');
  if (name === 'author') RR.recordAuthored(rec, iter, [{ id: 'standin_' + iter, name: 'Stand-in ' + iter, action: 'add', note: 'faithful stand-in card' }]);

  stageIx += 1;
  if (stageIx >= STAGES.length) {
    RR.finishIteration(rec, iter, { commit: 'standin-sha-' + iter });
    if (maxIters && iter >= maxIters) { clearInterval(timer); return finishRun('done'); }
    if (stopAtMs && Date.now() >= stopAtMs) { clearInterval(timer); return finishRun('done'); }
    newIteration();
  }
}, iterMs);
