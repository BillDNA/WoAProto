/* dev/grade-card.test.js — the FRESH grader's findings transport (#166, spec §8 A3).
   Run: node --test dev/grade-card.test.js   (part of `npm test`).
   node:test harness (ADR-0003). Findings attach to a throwaway temp feed (opts.feedFile) so
   the real logs/authored is never touched — the tests prove the SHAPE contract (keyed per-axis
   prose, set-fit required, no verdict) and the feed attach, not that a specific card was graded. */
'use strict';

const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const G = require('./grade-card.js');
const AX = require('../game/card-rubric-axes.js');

// A feed with one authored card, mimicking what dev/author-card.js writes before the grader runs.
function seedFeed() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'woa-grade-')), 'authored.json');
  fs.writeFileSync(file, JSON.stringify({
    authoredAt: '2026-08-30T00:00:00Z', nudge: 'build out toward 30 cards', temperature: 'bold',
    cards: [{ action: 'add', card: { id: 'reserve_line', name: 'Reserve Line', points: 4, text: 'Dig in, then deploy.', steps: [{ type: 'trench' }] }, note: 'fills a gap' }]
  }, null, 2));
  return file;
}
// Two well-formed prose findings incl. the required set-fit axis.
function goodFindings() {
  return {
    grader: 'fresh-subagent', axes: [
      { axis: 'set-fit', position: 'Sits a hair from Sappers — both open on a trench.', velocity: 'Give the deploy a reason only Reserve Line offers.' },
      { axis: 'board-had-to-be-there', position: 'The trench carries the turn; the deploy rides along.', velocity: 'Tie the deploy to the trench so the sequence is the point.' }
    ]
  };
}

/* ---------- the axis module and the rubric prose are two views of ONE axis set ---------- */
// If an axis is renamed/regrouped in card-rubric.md, this pins the keyed module to it so the two
// can't drift silently (one-implementation-per-fact — the keyed ids exist only to route the
// rubric's own axes; a title here that the rubric no longer carries is a drift bug).
test('every keyed axis title appears verbatim in card-rubric.md, and set-fit is the across-the-set one', () => {
  const rubric = fs.readFileSync(path.join(__dirname, '..', 'docs', 'rubrics', 'card-rubric.md'), 'utf8');
  AX.CARD_RUBRIC_AXES.forEach(a => assert.ok(rubric.includes(a.title), 'card-rubric.md is missing axis title: ' + a.title));
  assert.strictEqual(AX.SET_FIT_AXIS_ID, 'set-fit');
  assert.strictEqual(AX.CARD_RUBRIC_AXES.filter(a => a.setFit).length, 1, 'exactly one set-fit axis');
});

/* ---------- the keyed per-axis shape (#166 AC "findings are structured per-axis") ---------- */
test('normalizeFindings: keeps prose position+velocity, keyed + stamped from the one axis source', () => {
  const out = G.normalizeFindings(goodFindings());
  assert.strictEqual(out.axes.length, 2);
  const sf = out.axes.find(a => a.axis === 'set-fit');
  assert.strictEqual(sf.setFit, true, 'set-fit axis is flagged from the canonical axis list');
  assert.strictEqual(sf.title, AX.CARD_RUBRIC_AXIS_BY_ID['set-fit'].title, 'title stamped from the one source, not the caller');
  assert.ok(typeof sf.position === 'string' && typeof sf.velocity === 'string', 'position + velocity stay prose');
  assert.strictEqual(out.grader, 'fresh-subagent');
});

test('normalizeFindings: accepts findings under an "axes" or "findings" key', () => {
  const alt = { findings: goodFindings().axes };
  assert.strictEqual(G.normalizeFindings(alt).axes.length, 2);
});

/* ---------- it CANNOT record a verdict (aim, not gate — review-with-rubric "Do not") ---------- */
G.VERDICT_KEYS.forEach(k => {
  test('normalizeFindings: refuses a "' + k + '" verdict field on a finding', () => {
    const bad = goodFindings();
    bad.axes[0][k] = k === 'pass' || k === 'fail' ? true : 3;
    assert.throws(() => G.normalizeFindings(bad), /verdict field/i, k + ' should be refused as a verdict');
  });
});

test('normalizeFindings: refuses a bare number masquerading as a position (a band, not prose)', () => {
  const bad = goodFindings();
  bad.axes[0].position = '3/5';
  assert.throws(() => G.normalizeFindings(bad), /prose/i);
});

test('normalizeFindings: refuses a TOP-LEVEL verdict field, not only a per-axis one', () => {
  const bad = goodFindings();
  bad.verdict = 'PASS';   // smuggled as a sibling of axes, not inside a finding
  assert.throws(() => G.normalizeFindings(bad), /verdict field/i);
});

test('normalizeFindings: refuses an unexpected finding field (whitelist, not a token blacklist)', () => {
  const bad = goodFindings();
  bad.axes[0].summary = 'a stray field that is not prose position/velocity';
  assert.throws(() => G.normalizeFindings(bad), /unexpected field/i);
});

/* ---------- shape floors: set-fit required, ≥2 axes, known ids, no dup ---------- */
test('normalizeFindings: requires the set-fit axis (this rubric grades catalog-fit, #163)', () => {
  const noSetFit = { axes: [
    { axis: 'board-had-to-be-there', position: 'x', velocity: 'y' },
    { axis: 'the-winner-played-it', position: 'a', velocity: 'b' }
  ] };
  assert.throws(() => G.normalizeFindings(noSetFit), /set-fit/i);
});

test('normalizeFindings: requires at least two axes (the forest, not one tree)', () => {
  const single = { axes: [{ axis: 'set-fit', position: 'x', velocity: 'y' }] };
  assert.throws(() => G.normalizeFindings(single), /at least two/i);
});

test('normalizeFindings: rejects an unknown axis id', () => {
  const bad = { axes: [
    { axis: 'set-fit', position: 'x', velocity: 'y' },
    { axis: 'made-up-axis', position: 'a', velocity: 'b' }
  ] };
  assert.throws(() => G.normalizeFindings(bad), /unknown axis id/i);
});

test('normalizeFindings: rejects the same axis twice', () => {
  const dup = { axes: [
    { axis: 'set-fit', position: 'x', velocity: 'y' },
    { axis: 'set-fit', position: 'a', velocity: 'b' }
  ] };
  assert.throws(() => G.normalizeFindings(dup), /twice/i);
});

test('normalizeFindings: records the one-fix-pass outcome (string or object)', () => {
  const s = G.normalizeFindings(goodFindings(), { fixPass: 'Deploy now lands anywhere.' });
  assert.deepStrictEqual(s.fixPass, { applied: true, note: 'Deploy now lands anywhere.' });
  const o = G.normalizeFindings(Object.assign(goodFindings(), { fixPass: { applied: false, note: 'no change needed' } }));
  assert.strictEqual(o.fixPass.applied, false);
});

/* ---------- attach onto the SAME authored feed the Author wrote (one feed impl) ---------- */
test('recordFindings: attaches findings onto the card record in the feed', () => {
  const file = seedFeed();
  const rec = G.recordFindings('reserve_line', goodFindings(), { feedFile: file, fixPass: 'Deploy now lands anywhere.' });
  assert.ok(rec.findings && rec.findings.axes.length === 2);
  const feed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(feed.cards[0].findings, 'the feed record now carries findings');
  assert.strictEqual(feed.cards[0].findings.axes.find(a => a.setFit).axis, 'set-fit');
  assert.strictEqual(feed.cards[0].findings.fixPass.note, 'Deploy now lands anywhere.');
  assert.ok(feed.cards[0].findings.gradedAt, 'the graded card carries its own gradedAt');
});

test('recordFindings: refuses to grade a card the Author never wrote', () => {
  const file = seedFeed();
  assert.throws(() => G.recordFindings('no_such_card', goodFindings(), { feedFile: file }), /no authored card/i);
});

test('recordFindings: refuses a card whose latest move was a remove (it left the catalog)', () => {
  const file = seedFeed();
  const feed = JSON.parse(fs.readFileSync(file, 'utf8'));
  feed.cards.push({ action: 'remove', card: { id: 'reserve_line', name: 'Reserve Line', points: 4, text: 'Dig in, then deploy.', steps: [{ type: 'trench' }] }, note: 'cut' });
  fs.writeFileSync(file, JSON.stringify(feed));
  assert.throws(() => G.recordFindings('reserve_line', goodFindings(), { feedFile: file }), /removed this run/i);
});

test('authoredIds: excludes an add-then-removed card (its file is gone)', () => {
  const file = seedFeed();
  const feed = JSON.parse(fs.readFileSync(file, 'utf8'));
  feed.cards.push({ action: 'add', card: { id: 'scrapped', name: 'Scrapped', points: 3, text: 'x', steps: [{ type: 'trench' }] } });
  feed.cards.push({ action: 'remove', card: { id: 'scrapped', name: 'Scrapped', points: 3, text: 'x', steps: [{ type: 'trench' }] } });
  fs.writeFileSync(file, JSON.stringify(feed));
  const ids = G.authoredIds({ feedFile: file });
  assert.ok(ids.indexOf('reserve_line') >= 0, 'a live card is still a target');
  assert.ok(ids.indexOf('scrapped') < 0, 'the add-then-removed card is not a grading target');
});

test('recordFindings: grades the latest non-remove record for the id', () => {
  const file = seedFeed();
  const feed = JSON.parse(fs.readFileSync(file, 'utf8'));
  feed.cards.push({ action: 'edit', card: { id: 'reserve_line', name: 'Reserve Line', points: 4, text: 'Reworded.', steps: [{ type: 'trench' }] }, note: 'reworded' });
  fs.writeFileSync(file, JSON.stringify(feed));
  G.recordFindings('reserve_line', goodFindings(), { feedFile: file });
  const after = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(!after.cards[0].findings, 'the earlier add record is untouched');
  assert.ok(after.cards[1].findings, 'the latest edit record is the one graded');
});

/* ---------- the brief names the fresh-not-author posture + the keyed output ---------- */
test('briefFor: instructs a fresh grader, review-with-rubric, keyed output, set-fit required', () => {
  const b = G.briefFor('game/content/cards/reserve_line.js', AX.CARD_RUBRIC_AXES.map(a => a.id));
  assert.match(b, /FRESH grader/);
  assert.match(b, /review-with-rubric/);
  assert.match(b, /card-rubric\.md/);
  assert.match(b, /set-fit/);
  assert.match(b, /cannot reject/i);
  assert.match(b, /grade-card\.js record/);
});
