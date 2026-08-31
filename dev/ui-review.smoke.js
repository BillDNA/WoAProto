#!/usr/bin/env node
/* dev/ui-review.smoke.js — the "run it for real once" gate for dev/ui-review.js (ADR-0004).
 *
 * The suite exercises the pipeline with fake/pixel-aware transports (deterministic, no model). This
 * smoke runs the WHOLE thing LIVE: real Playwright capture + drive AND the real `claude -p` vision
 * model, end to end, so a human can confirm a Phase-1 pass actually reaches Phase 2 and records rubric
 * findings against a real screen. It is NOT part of `npm test` — it needs a live model and a browser —
 * it is run by hand (and its output pasted onto the PR) whenever the review pipeline changes.
 *
 *   node dev/ui-review.smoke.js [review-spec.json]   # default: the self-consistent ui-review fixtures
 *
 * A bounce here is a legitimate outcome (the real blind reviewer judged the after short of the target);
 * it still proves Phase 1 ran live. To watch the Phase-1 -> Phase-2 HANDOFF, point it at a spec whose
 * after matches its target (the default fixtures do) so Phase 1 passes and Phase 2 runs.
 */
'use strict';
const path = require('path');
const U = require(path.join(__dirname, 'ui-review.js'));

const ROOT = path.join(__dirname, '..');
const specRef = process.argv[2] || path.join(ROOT, 'dev/proto/fixtures/ui-review/spec-good.json');

function trunc(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + ' …[' + s.length + ' chars]' : s; }

(async function () {
  const spec = U.loadSpec(specRef);
  console.log('LIVE smoke — real Playwright capture + drive, real `claude -p` vision model');
  console.log('  spec:', specRef, '| ticket', spec.ticket, '| ' + spec.acs.length + ' ACs, ' + spec.goals.length + ' goals\n');
  const t0 = Date.now();
  // No injected transports -> the REAL defaultCapture / defaultDrive / defaultAsk run.
  const res = await U.review(spec, {});
  await U.closeBrowser();
  const v = res.verdict;

  console.log('── Phase 1 (the gate) ──────────────────────────────');
  console.log('  ran against target:', v.ranAgainstTarget, '| pass:', v.pass, '| exit code:', res.code);
  console.log('  blind description:', trunc(v.description, 240));
  if (!v.pass) v.bounces.forEach(function (b) { console.log('  BOUNCE [' + b.kind + '] ' + b.ref + ' — ' + b.why); });

  console.log('\n── Phase 2 (the aim) ───────────────────────────────');
  if (!v.pass) {
    console.log('  did NOT run — Phase 1 bounced (as designed; Phase 2 only runs on a clean pass).');
  } else if (!v.rubric) {
    console.log('  MISSING — Phase 1 passed but no rubric block was recorded (the phases are not wired!).');
  } else if (!v.rubric.axes.length) {
    console.log('  ran, no structured findings:', v.rubric.note || '(none)');
  } else {
    console.log('  ran; ' + v.rubric.axes.length + ' finding(s) recorded (findings only, no gate):');
    v.rubric.axes.forEach(function (a) {
      console.log('   • [' + a.source + '] ' + trunc(a.axis, 60));
      console.log('       position: ' + trunc(a.position, 160));
      console.log('       velocity: ' + trunc(a.velocity, 160));
    });
  }
  console.log('\n  artifacts -> ' + res.outDir + '  (' + Math.round((Date.now() - t0) / 1000) + 's)');
  // The smoke's own signal: reached Phase 2 with findings on a passing review.
  const reachedPhase2 = v.pass && v.rubric && v.rubric.axes.length > 0;
  console.log(reachedPhase2 ? '\nSMOKE OK — the live Phase-1 pass reached Phase 2 and recorded findings.'
    : '\nSMOKE — Phase 2 not reached this run (see above).');
  process.exit(0);
})().catch(function (e) { console.error('smoke error:', e && e.message || e); process.exit(2); });
