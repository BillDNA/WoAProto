/* dev/proto/fixtures/ui-review/fake-transport.js — a DETERMINISTIC stand-in for the two things
 * ui-review.js reaches out to: Playwright (capture) and the `claude -p` vision LLM (ask). It exists
 * so the EXIT-CODE SEAM (the ticket's contract) can be exercised against fixtures without a browser
 * or a live, non-deterministic model — the CLI loads it when WOA_UI_REVIEW_CAPTURE / _ASK point here.
 *
 * It is a stand-in for the LLM's JUDGMENT, not a re-implementation of the gate: the plumbing under
 * test (capture -> blind describe -> compare -> decide -> exit code) is real; only the describer's
 * eyes and the comparator's opinion are faked, and they are derived from the FIXTURE CONTENT so the
 * good/bad/no-target fixtures each drive a real branch rather than a per-test hard-coded answer.
 *
 * Convention the fixtures use so a text stand-in can stay honest about coverage:
 *   - a rendered element carries  data-el="<role>"  (the target's roster of elements)
 *   - an acceptance criterion carries a  [<token>]  marker naming the element it needs
 * capture() returns the file's TEXT as the "screenshot" buffer; the fake describer echoes the AFTER
 * text (what it "sees"); the fake comparator bounces on any target data-el or AC [token] that the
 * AFTER text does not contain — exactly the omissions the real blind review is meant to catch.
 */
'use strict';
const fs = require('fs');

// Fake capture: the "pixels" are the file's text. A missing file -> null (an absent capture).
function capture(htmlPathAbs) {
  if (!htmlPathAbs || !fs.existsSync(htmlPathAbs)) return Promise.resolve(null);
  return Promise.resolve(Buffer.from(fs.readFileSync(htmlPathAbs, 'utf8'), 'utf8'));
}

// Fake ask: describe -> echo the AFTER buffer's text; compare -> coverage bounces from fixture tokens.
function ask(request) {
  if (request.phase === 'describe') {
    const after = (request.images || []).filter(function (i) { return i.role === 'after'; })[0];
    return Promise.resolve({ text: after && after.buf ? after.buf.toString() : '', finishReason: 'stop' });
  }
  if (request.phase === 'compare') {
    const desc = request.description || '';
    const bounces = [];
    (request.acs || []).forEach(function (ac) {
      const m = ac.match(/\[([a-z0-9_-]+)\]/i);
      if (m && desc.indexOf(m[1]) < 0) bounces.push({ kind: 'ac', ref: ac, why: 'not evidenced in the blind description' });
    });
    const target = (request.images || [])[0];
    const text = target && target.buf ? target.buf.toString() : '';
    const els = [];
    const re = /data-el="([a-z0-9_-]+)"/g;
    let mm;
    while ((mm = re.exec(text))) els.push(mm[1]);
    els.forEach(function (el) {
      if (desc.indexOf('data-el="' + el + '"') < 0) {
        bounces.push({ kind: 'target-element', ref: el, why: 'target element omitted from the after-description' });
      }
    });
    return Promise.resolve({ text: JSON.stringify({ bounces: bounces }), finishReason: 'stop' });
  }
  if (request.phase === 'rubric') {
    // Phase 2 is the AIM. Stand in for the rubric grader's judgment: emit FINDINGS ONLY, one per
    // ui-rubric axis Phase 2 read and one per ticket goal (source-tagged), so the good fixture drives
    // the real findings-only branch. Set WOA_UI_REVIEW_FAKE_RUBRIC=verdict to stand in for a grader
    // that tried to GATE (a score/band/pass-fail) — the guard in ui-review.js must reject that.
    if (process.env.WOA_UI_REVIEW_FAKE_RUBRIC === 'verdict') {
      return Promise.resolve({ text: JSON.stringify({ verdict: 'PASS', score: 9, axes: [] }), finishReason: 'stop' });
    }
    const axes = (request.axesRead || []).map(function (a) {
      return { axis: a, source: 'rubric', position: 'observed: "' + a + '" reads coherently across the stills',
        velocity: 'sign the live control louder and quiet the inert marks' };
    });
    (request.goals || []).forEach(function (g) {
      axes.push({ axis: g, source: 'goal', position: 'we approach "' + g + '" only partway',
        velocity: 'tighten the screen toward that goal' });
    });
    return Promise.resolve({ text: JSON.stringify({ reviewer: 'fresh-rubric', axes: axes }), finishReason: 'stop' });
  }
  return Promise.resolve({ text: '', finishReason: 'error' });
}

// Fake drive: a deterministic, browserless stand-in for Phase 2's Playwright interaction capture —
// no interaction stills, so the CLI seam runs without a browser. The real drive is exercised by the
// Playwright-gated test against defaultDrive.
function drive() { return Promise.resolve([]); }

module.exports = { capture: capture, ask: ask, drive: drive };
