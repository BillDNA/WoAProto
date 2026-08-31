/* dev/proto/fixtures/ui-review/fake-transport-pixels.js — a PIXEL-AWARE deterministic transport.
 *
 * fake-transport.js scrapes the fixture HTML *text* the fake capture returns — so it can only run
 * paired with fake capture, and it can NOT consume the real PNG *pixels* that Playwright capture
 * produces. That gap is exactly why nothing ever exercised the real capture -> Phase 1 -> Phase 2
 * handoff (the 80% seam: real halves that were never run together). This transport closes it: it
 * consumes the REAL capture/drive PNG buffers, confirms real pixels actually flowed through each leg,
 * and passes Phase 1 on that basis so the integration test drives the real handoff with NO live model.
 *
 * It is NOT the anti-80% coverage oracle (fake-transport.js owns that, on text) — it only asserts
 * "real pixels reached this leg", which is what the wiring test needs.
 */
'use strict';
function isRealPng(buf) { return !!(buf && buf.length > 1000 && buf.slice(1, 4).toString() === 'PNG'); }

function ask(request) {
  if (request.phase === 'describe') {
    const after = (request.images || []).filter(function (i) { return i.role === 'after'; })[0];
    const buf = after && after.buf;
    // Describe by the image's OWN facts (its byte length / PNG magic), never any HTML text — this only
    // says something real if the real after pixels were handed in.
    return Promise.resolve({ text: 'after render: ' + (buf ? buf.length : 0) + ' bytes, png=' + isRealPng(buf), finishReason: 'stop' });
  }
  if (request.phase === 'compare') {
    const target = (request.images || [])[0];
    // Clear Phase 1 ONLY if a real target PNG actually reached the comparator — i.e. real capture is
    // wired all the way through. No pixels -> a bounce, so the wiring failing reds the test.
    const bounces = isRealPng(target && target.buf) ? []
      : [{ kind: 'no-pixels', ref: 'target', why: 'comparator received no real target pixels — capture not wired through' }];
    return Promise.resolve({ text: JSON.stringify({ bounces: bounces }), finishReason: 'stop' });
  }
  if (request.phase === 'rubric') {
    // Phase 2 reached: emit findings-only, one per ui-rubric axis read + one per ticket goal.
    const axes = (request.axesRead || []).map(function (a) {
      return { axis: a, source: 'rubric', position: 'read from the captured + driven stills', velocity: 'push the live control louder' };
    });
    (request.goals || []).forEach(function (g) {
      axes.push({ axis: g, source: 'goal', position: 'approached partway', velocity: 'tighten toward the goal' });
    });
    return Promise.resolve({ text: JSON.stringify({ reviewer: 'fresh-rubric', axes: axes }), finishReason: 'stop' });
  }
  return Promise.resolve({ text: '', finishReason: 'error' });
}

module.exports = { ask: ask };
