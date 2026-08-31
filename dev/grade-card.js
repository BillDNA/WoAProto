#!/usr/bin/env node
/* War of Attrition — the fresh GRADER's hands for the CARD kind (#166, spec §8 A3, §4.1).
 *
 * The loop grades authored cards with `review-with-rubric` against `card-rubric`, run as a
 * FRESH subagent that is NEVER the author session — nothing marks its own homework (spec §2).
 * That subagent is the grader's BRAIN (it reads the rubric + the card and writes prose); THIS
 * file is its HANDS — the deterministic transport that (a) hands the subagent its brief and
 * (b) takes the prose findings back, validates their SHAPE, and records them onto the authored
 * feed so the Workbench renders them under the card.
 *
 * A finding is POSITION (where the card sits) + VELOCITY (the fix that moves it toward good),
 * PROSE, per axis, keyed by the card-rubric axis ids (game/card-rubric-axes.js). It is an AIM,
 * not a gate: this file CANNOT bounce a card — there is no reject path, and it REFUSES to record
 * anything shaped like a verdict (a score, band, enum, PASS/FAIL). If a rubric read ever reduces
 * to pass/fail it has stopped being a rubric (review-with-rubric "Do not"); the balance band that
 * *does* flag lives in report-model.js / docs/balance, never here.
 *
 * The keyed per-axis shape is the render contract #163's "machine-readable output" points at
 * (#166 AC "Findings are structured per-axis"): each finding carries { axis, title, setFit,
 * position, velocity } so the feed can label every axis and pull the set-fit finding out
 * distinctly (#177) without pattern-matching prose.
 *
 * Findings attach to the SAME logs/authored/latest.json the Author wrote (via author-card.js's
 * readFeed/writeFeed — one feed impl): the record for a card gains a `findings` block, and an
 * optional one-fix-pass outcome the Author takes toward the aim (the card proceeds regardless).
 *
 * CLI (the grade-card skill / loop driver drive these):
 *   node dev/grade-card.js axes                              # print the keyed axis list
 *   node dev/grade-card.js brief [--card <id>]               # the fresh-subagent grading brief
 *   node dev/grade-card.js record <id> --findings <f.json|-> [--fix-pass "<what changed>"]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const A = require(path.join(ROOT, 'dev', 'author-card.js'));   // one feed impl (read/write latest.json)
const AX = require(path.join(ROOT, 'game', 'card-rubric-axes.js'));
const RUBRIC = 'docs/rubrics/card-rubric.md';

// Keys that would make a "finding" into a verdict — the exact shapes review-with-rubric forbids.
// A grader that writes any of these is graded-its-homework-as-a-gate; we refuse to record it.
const VERDICT_KEYS = ['score', 'band', 'verdict', 'grade', 'rating', 'pass', 'fail', 'enum', 'points', 'value'];

/* Validate one grader's findings object into the recorded shape, or throw with why. Prose-only,
   keyed by known axis ids, set-fit present (the whole point of #163/#166 — a grade that skips
   catalog-fit isn't this rubric's grade), at least two axes (set-fit alone isn't a review).
   Returns { gradedAt, grader, axes:[{axis,title,setFit,position,velocity}], fixPass? }. */
function normalizeFindings(raw, opts) {
  opts = opts || {};
  if (!raw || typeof raw !== 'object') throw new Error('findings must be a JSON object');
  const axesIn = raw.axes || raw.findings;   // accept either key the subagent might use
  if (!Array.isArray(axesIn) || !axesIn.length) throw new Error('findings.axes must be a non-empty array of per-axis findings');

  const seen = {};
  const axes = axesIn.map(function (f, i) {
    if (!f || typeof f !== 'object') throw new Error('axis finding #' + (i + 1) + ' must be an object');
    const bad = Object.keys(f).filter(function (k) { return VERDICT_KEYS.indexOf(k) >= 0; });
    if (bad.length) throw new Error('axis finding "' + (f.axis || i) + '" carries verdict field(s) [' + bad.join(', ') +
      '] — a rubric read is findings, never a score/band/pass-fail (review-with-rubric). Recast it as prose.');
    if (!AX.isAxisId(f.axis)) throw new Error('unknown axis id "' + f.axis + '" — one of: ' +
      AX.CARD_RUBRIC_AXES.map(function (a) { return a.id; }).join(', '));
    if (seen[f.axis]) throw new Error('axis "' + f.axis + '" appears twice — one finding per axis');
    seen[f.axis] = 1;
    const position = prose(f.position, f.axis, 'position');
    const velocity = prose(f.velocity, f.axis, 'velocity');
    const meta = AX.CARD_RUBRIC_AXIS_BY_ID[f.axis];
    return { axis: f.axis, title: meta.title, setFit: meta.setFit, position: position, velocity: velocity };
  });

  if (axes.length < 2) throw new Error('a review needs at least two axes (forest, not one tree) — got ' + axes.length);
  if (!seen[AX.SET_FIT_AXIS_ID]) throw new Error('missing the set-fit axis "' + AX.SET_FIT_AXIS_ID +
    '" — this rubric grades catalog-fit (#163); every grade names where the card sits against its peers');

  const out = { gradedAt: new Date().toISOString(), grader: raw.grader || 'fresh-subagent', axes: axes };
  const fx = opts.fixPass != null ? opts.fixPass : raw.fixPass;
  if (fx) out.fixPass = normalizeFixPass(fx);
  return out;
}

// A finding coordinate must be a described sentence, never a number masquerading as prose.
function prose(v, axis, which) {
  if (typeof v !== 'string' || !v.trim()) throw new Error('axis "' + axis + '" needs a ' + which + ' (a described sentence)');
  if (/^\s*[-+]?\d+(\.\d+)?\s*(\/\s*\d+)?\s*$/.test(v)) throw new Error('axis "' + axis + '" ' + which + ' is a bare number — findings are prose, not a band');
  return v.trim();
}

// The one-fix-pass outcome: the Author's single move toward the aim (the card proceeds either way).
function normalizeFixPass(fx) {
  if (typeof fx === 'string') return { applied: true, note: fx.trim() };
  if (fx && typeof fx === 'object') return { applied: fx.applied !== false, note: String(fx.note || '').trim() };
  throw new Error('fixPass must be a string or { applied, note }');
}

/* Attach findings to the authored feed record for `id`. Grades the LAST non-remove record for
   that card (the card as it currently stands after add/edit) — the card the grader just read.
   Throws if the id was never authored this run (a grader can only grade what the Author wrote). */
function recordFindings(id, findings, opts) {
  opts = opts || {};
  const feed = A.readFeed(opts.feedFile);
  const cards = feed.cards || [];
  let idx = -1;
  for (let i = cards.length - 1; i >= 0; i--) {
    if (cards[i] && cards[i].card && cards[i].card.id === id && cards[i].action !== 'remove') { idx = i; break; }
  }
  if (idx < 0) throw new Error('no authored card "' + id + '" in the feed — the grader grades what the Author wrote (run author-card.js first)');
  cards[idx].findings = normalizeFindings(findings, opts);
  feed.gradedAt = cards[idx].findings.gradedAt;
  A.writeFeed(feed, opts.feedFile);
  return cards[idx];
}

// The fresh-subagent brief: review-with-rubric's method, filled for the card kind, plus the
// keyed-output + record instruction the loop's transport needs back. The loop driver hands this
// to the Agent tool as a general-purpose subagent that is NOT the author session.
function briefFor(target, ids) {
  return [
    'You are a FRESH grader — you did not author this card. Review only; do not edit files.',
    '',
    'Load and follow the `review-with-rubric` skill. Review ' + target + ' with `' + RUBRIC + '`.',
    'Read in full: ' + RUBRIC + ', the target card file(s), the peer rubrics in docs/rubrics/ for',
    'voice, logs/reports/analysis/1.1/2026-07-16-1.1-analysis.md for register, and CONTEXT.md.',
    'Walk each axis for POSITION (where the card sits) and VELOCITY (the fix that moves it toward',
    'good). Findings are an AIM, not a gate: no PASS/FAIL, no score, no band. You cannot reject the',
    'card — the loop proceeds regardless. Cover the set-fit axis (catalog-fit, #163) plus the',
    'per-card axes that most change position/velocity — the forest, not the trees.',
    '',
    'Emit the findings as this keyed JSON (per axis: prose position + velocity, no numbers), for',
    'the axis ids ' + ids.join(', ') + ' (set-fit is required):',
    '  { "grader": "fresh-subagent", "axes": [',
    '    { "axis": "set-fit", "position": "…where it sits vs its Catalog peers…", "velocity": "…the fix…" },',
    '    { "axis": "<per-card axis id>", "position": "…", "velocity": "…" } ] }',
    '',
    'Then record it (the transport re-validates the shape and refuses anything verdict-like):',
    '  node dev/grade-card.js record <cardId> --findings <that-json-file>',
    'The Author then takes ONE fix pass toward the aim; the card proceeds either way.'
  ].join('\n');
}

// Which cards this run authored (last non-remove record per id) — the brief's default target.
function authoredIds(opts) {
  const feed = A.readFeed((opts || {}).feedFile);
  const ids = [];
  (feed.cards || []).forEach(function (r) {
    if (r && r.card && r.action !== 'remove' && ids.indexOf(r.card.id) < 0) ids.push(r.card.id);
  });
  return ids;
}

module.exports = { normalizeFindings, recordFindings, briefFor, authoredIds, VERDICT_KEYS, RUBRIC };

// ---------------------------------------------------------------- CLI
if (require.main === module) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  function flag(name) { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; }
  const axisIds = AX.CARD_RUBRIC_AXES.map(function (a) { return a.id; });
  try {
    if (cmd === 'axes') {
      AX.CARD_RUBRIC_AXES.forEach(function (a) {
        console.log((a.setFit ? '* ' : '  ') + a.id.padEnd(26) + '[' + a.group + ']  ' + a.title);
      });
      console.log('\n(* = the set-fit axis the feed pulls out distinctly)');
    } else if (cmd === 'brief') {
      const one = flag('card');
      const ids = one ? [one] : authoredIds();
      const target = one ? ('game/content/cards/' + one + '.js')
        : (ids.length ? ids.map(function (i) { return 'game/content/cards/' + i + '.js'; }).join(', ')
          : 'the card(s) the Author just wrote (none in the feed yet — run author-card.js first)');
      console.log(briefFor(target, axisIds));
    } else if (cmd === 'record') {
      const id = argv[1];
      if (!id || id.startsWith('--')) throw new Error('record needs a card id: grade-card.js record <id> --findings <f.json|->');
      const src = flag('findings');
      if (!src) throw new Error('record needs --findings <file.json|-> (- reads stdin)');
      const json = src === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(src, 'utf8');
      const rec = recordFindings(id, JSON.parse(json), { fixPass: flag('fix-pass') });
      const setFit = rec.findings.axes.filter(function (a) { return a.setFit; })[0];
      console.log('GRADED ' + id + '  ' + rec.findings.axes.length + ' axis finding(s)' +
        (setFit ? ', set-fit noted' : '') + (rec.findings.fixPass ? ', one fix pass recorded' : '') +
        '  -> logs/authored/latest.json');
    } else {
      console.error('usage: node dev/grade-card.js axes|brief|record  (see file header)');
      process.exit(1);
    }
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}
