/* dev/author-card.test.js — the Author's card-write path (#165, spec §8 A2-card).
   Run: node --test dev/author-card.test.js   (part of `npm test`).
   node:test harness (ADR-0003). Every write targets a throwaway temp catalog dir +
   feed file (opts.cardsDir/feedFile, regen:false) so the real game/content is never
   touched — the tests prove the SHAPING behaviour, not that a specific card shipped. */
'use strict';

const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const A = require('./author-card.js');

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-author-'));
  return { cardsDir: path.join(dir, 'cards'), feedFile: path.join(dir, 'authored.json'), regen: false };
}
const CARD = { id: 'reserve_line', name: 'Reserve Line', text: 'Dig in, then deploy an infantry.', steps: [{ type: 'trench' }, { type: 'deploy', unit: 'infantry' }] };

/* ---------- legality gate (AC: every card it writes is legal) ---------- */
test('cardProblems: a well-formed catalog card is legal', () => {
  assert.deepStrictEqual(A.cardProblems(CARD), []);
});
test('cardProblems: the whole shipped catalog is legal', () => {
  // The full catalog (every content/cards/*.js), not just the active deck — the guard
  // that the Author never leaves an illegal card on disk (#165 AC: catalog still loads).
  const bad = A.catalogCards().filter(c => A.cardProblems(c).length);
  assert.strictEqual(bad.length, 0, 'illegal catalog cards: ' + bad.map(c => c.id).join(', '));
});
test('cardProblems: flags the card-level checks the AC names', () => {
  assert.ok(A.cardProblems({ id: 'Bad Id!', name: 'x', steps: [{ type: 'trench' }] }).some(p => /id must be/.test(p)), 'bad id');
  assert.ok(A.cardProblems({ id: 'no_name', steps: [{ type: 'trench' }] }).some(p => /needs a name/.test(p)), 'missing name');
  assert.ok(A.cardProblems({ id: 'no_steps', name: 'x', steps: [] }).some(p => /at least one step/.test(p)), 'no steps');
  assert.ok(A.cardProblems({ id: 'bad_step', name: 'x', steps: [{ type: 'teleport' }] }).some(p => /unknown type/.test(p)), 'unknown step');
  assert.ok(A.cardProblems({ id: 'bad_unit', name: 'x', steps: [{ type: 'deploy', unit: 'dragon' }] }).some(p => /unknown unit/.test(p)), 'unknown unit');
  // an absurdly expensive card busts the army-points budget even in the leanest deck
  const huge = { id: 'huge', name: 'x', steps: Array.from({ length: 6 }, () => ({ type: 'deploy', unit: 'artillery', anywhere: true })) };
  assert.ok(A.cardProblems(huge).some(p => /army-points budget/.test(p)), 'over budget');
});

/* ---------- add / edit / remove write real files + record the feed ---------- */
test('addCard writes a real catalog file and records an add in the feed', () => {
  const s = sandbox();
  A.addCard(CARD, { note: 'fills a dig-then-push gap', nudge: 'build out toward 30 cards', temperature: 'standard' }, s);
  const file = path.join(s.cardsDir, 'reserve_line.js');
  assert.ok(fs.existsSync(file), 'content/cards/reserve_line.js written');
  const src = fs.readFileSync(file, 'utf8');
  assert.ok(/WOA_CONTENT/.test(src) && /"id": "reserve_line"/.test(src), 'canonical IIFE + card json');
  assert.deepStrictEqual(A.readStoredCard('reserve_line', s.cardsDir).steps, CARD.steps, 'round-trips the steps');
  const feed = JSON.parse(fs.readFileSync(s.feedFile, 'utf8'));
  assert.strictEqual(feed.cards.length, 1);
  assert.strictEqual(feed.cards[0].action, 'add');
  assert.strictEqual(feed.cards[0].card.id, 'reserve_line');
  assert.ok(typeof feed.cards[0].card.points === 'number', 'feed carries the army-points cost');
  assert.strictEqual(feed.nudge, 'build out toward 30 cards', 'run nudge stamped on the feed');
  assert.strictEqual(feed.temperature, 'standard', 'run temperature stamped on the feed');
});
test('editCard overwrites the file and records before/after', () => {
  const s = sandbox();
  A.addCard(CARD, {}, s);
  const edited = Object.assign({}, CARD, { text: 'Dig in, then deploy TWO infantry.', steps: [{ type: 'trench' }, { type: 'deploy', unit: 'infantry' }, { type: 'deploy', unit: 'infantry' }] });
  A.editCard(edited, { note: 'stronger reserve' }, s);
  assert.strictEqual(A.readStoredCard('reserve_line', s.cardsDir).steps.length, 3, 'file now has 3 steps');
  const feed = JSON.parse(fs.readFileSync(s.feedFile, 'utf8'));
  const rec = feed.cards[feed.cards.length - 1];
  assert.strictEqual(rec.action, 'edit');
  assert.strictEqual(rec.before.steps.length, 2, 'edit record keeps the before-shape');
  assert.strictEqual(rec.card.steps.length, 3, 'edit record has the after-shape');
});
test('removeCard deletes the file and records a remove', () => {
  const s = sandbox();
  A.addCard(CARD, {}, s);
  A.removeCard('reserve_line', { note: 'shadowed by conscription' }, s);
  assert.ok(!fs.existsSync(path.join(s.cardsDir, 'reserve_line.js')), 'file deleted');
  const feed = JSON.parse(fs.readFileSync(s.feedFile, 'utf8'));
  const rec = feed.cards[feed.cards.length - 1];
  assert.strictEqual(rec.action, 'remove');
  assert.strictEqual(rec.card.id, 'reserve_line', 'remove record names the card that left');
});

/* ---------- the write path REFUSES to emit an illegal / conflicting card ---------- */
test('addCard refuses an illegal card and writes nothing', () => {
  const s = sandbox();
  assert.throws(() => A.addCard({ id: 'broken', name: 'x', steps: [{ type: 'teleport' }] }, {}, s), /illegal/i);
  assert.ok(!fs.existsSync(path.join(s.cardsDir, 'broken.js')), 'no file for a refused card');
  assert.ok(!fs.existsSync(s.feedFile), 'no feed record for a refused card');
});
test('addCard refuses to clobber an existing card; edit refuses a missing one', () => {
  const s = sandbox();
  A.addCard(CARD, {}, s);
  assert.throws(() => A.addCard(CARD, {}, s), /already exists/);
  assert.throws(() => A.editCard({ id: 'ghost', name: 'x', steps: [{ type: 'trench' }] }, {}, s), /does not exist/);
});

test('TEMPERATURES matches the Workbench author-boldness knob', () => {
  assert.deepStrictEqual(A.TEMPERATURES, ['safe', 'standard', 'bold', 'wild']);
});
