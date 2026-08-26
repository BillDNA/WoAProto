#!/usr/bin/env node
/* PROTOTYPE — throwaway. Answers issue #84: how does phase-0 LLM deckbuild work?
 * Run: node dev/prototypes/proto-phase0-deckbuild.js
 * NOT production. No LLM call — a deterministic mock stands in for the draft so
 * the *protocol* (what the LLM sees, what it returns, where it hooks, how it's
 * validated) is concrete and reactable. Fold the verdict into dev/claude-plays.js;
 * this file dies on its branch.
 *
 * Strawman the human reacts to:
 *  1. POOL = deduped union of cards across every content/decks/*.js (20 today).
 *     That is "all Cards" until the roguelite pool>deck split lands.
 *  2. LLM SEES: the pool as `id | pts | name — text`, the cap (72), the size
 *     band (16-17), the starting-card rule. LLM RETURNS: {picks:[{id,count}], why}.
 *  3. ASSEMBLE: map picks -> {cards:[...]} via the pool lookup.
 *  4. VALIDATE on the SAME cap fact the deck-editor uses — the exported
 *     E.deckPoints / E.DECK_POINTS_CAP primitives (NOT a new number). See the
 *     SEAM note at the bottom: full legality (size band + starting) today lives
 *     ONLY in game/ui/deck-editor.js (a browser file) — real integration should
 *     lift that gate into the engine so there's one implementation.
 *  5. HOOK: draft -> match.decks={red,blue} -> E.newMatch({...,decks}) ->
 *     E.newSkirmish already seats st.sideDecks (WOA-055, zero engine change).
 *     decks:null keeps the symmetric default path byte-for-byte golden.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const E = require(path.join(__dirname, '..', '..', 'game', 'engine.js'));

/* 1. POOL — union of all shipped decks (dedupe by id). */
function buildPool() {
  const dir = path.join(__dirname, '..', '..', 'game', 'content', 'decks');
  global.WOA_CONTENT = global.WOA_CONTENT || { decks: [] };
  const before = (global.WOA_CONTENT.decks || []).slice();
  fs.readdirSync(dir).filter(f => /\.js$/.test(f)).sort()
    .forEach(f => { try { require(path.join(dir, f)); } catch (e) {} });
  const decks = global.WOA_CONTENT.decks || before;
  const pool = {};
  decks.forEach(d => (d.cards || []).forEach(c => { if (!pool[c.id]) pool[c.id] = c; }));
  return Object.values(pool);
}

/* 2. What the LLM sees. */
function draftPrompt(pool) {
  const rows = pool
    .map(c => '  ' + c.id.padEnd(20) + String(E.cardPoints(c)).padStart(4) + ' pts  ' +
      c.name + ' — ' + (c.text || ''))
    .join('\n');
  return [
    'Draft a War of Attrition deck for your side. Cards available (id, army-points, text):',
    rows,
    '',
    'Rules:',
    '  - Total 16-17 cards (a card may repeat via count).',
    '  - Army-points must be <= ' + E.DECK_POINTS_CAP + ' (sum of cardPoints * count).',
    '  - Exactly ONE card must be your starting card (count 1); pick a deploy.',
    'Return JSON: {"picks":[{"id":"<card id>","count":<n>}], "why":"<one line>"}',
  ].join('\n');
}
const DRAFT_SCHEMA = {
  type: 'object',
  required: ['picks', 'why'],
  properties: {
    picks: { type: 'array', items: {
      type: 'object', required: ['id', 'count'],
      properties: { id: { type: 'string' }, count: { type: 'integer', minimum: 1 } } } },
    why: { type: 'string' },
  },
};

/* 3. Assemble picks -> a deck object resolveDeck/newMatch accept. */
function assemble(picks, pool) {
  const byId = {}; pool.forEach(c => { byId[c.id] = c; });
  const cards = picks.map(p => {
    const base = byId[p.id];
    if (!base) throw new Error('draft picked unknown card "' + p.id + '"');
    return Object.assign({}, base, { count: p.count });
  });
  return { id: 'draft', name: 'Drafted deck', cards };
}

/* 4. Validate. Cap reuses the EXPORTED engine fact (same as the deck-editor).
 *    Size-band + starting are re-stated here only because the real gate is
 *    trapped in the browser deck-editor — SEAM note below. */
function legality(deck) {
  const probs = [];
  const total = deck.cards.reduce((s, c) => s + (c.count == null ? 1 : c.count), 0);
  const starting = deck.cards.filter(c => c.starting).length;
  if (total < 16 || total > 17) probs.push('size ' + total + ' outside 16-17');
  if (starting !== 1) probs.push('starting-card count is ' + starting + ' (need exactly 1)');
  const pts = E.deckPoints(deck);                       // <-- one implementation of the cap fact
  if (pts > E.DECK_POINTS_CAP) probs.push('over budget ' + pts + ' > ' + E.DECK_POINTS_CAP);
  return { ok: probs.length === 0, pts, total, starting, probs };
}

/* Mock "LLM" drafts — deterministic, no transport. Two DIFFERENT legal builds so
 * the asymmetric path is exercised. Start from 16 of the cheapest card (always
 * legal: 16*minPts << cap), then upgrade slots toward the wished opening/filler
 * while the cap allows — so the result is always a legal 16-card asymmetric deck. */
function mockDraft(pool, opening, filler) {
  const cheapest = pool.slice().sort((a, b) => E.cardPoints(a) - E.cardPoints(b))[0].id;
  const slots = Array(16).fill(cheapest);
  slots[0] = 'deploy_inf_start';                        // exactly one starting card
  const wishlist = Array(5).fill(opening).concat(Array(10).fill(filler));
  const toPicks = arr => arr.reduce((a, id) => dedupe(a, { id, count: 1 }), []);
  wishlist.forEach((id, i) => {
    const trial = slots.slice(); trial[i + 1] = id;     // slot 0 is the starting card
    if (E.deckPoints(assemble(toPicks(trial), pool)) <= E.DECK_POINTS_CAP) slots[i + 1] = id;
  });
  return { picks: toPicks(slots), why: 'upgrade-from-cheapest: ' + opening + ' + ' + filler };
}
function dedupe(acc, p) {
  const hit = acc.find(x => x.id === p.id);
  if (hit) hit.count += p.count; else acc.push({ id: p.id, count: p.count });
  return acc;
}

/* ---- run + surface state ---- */
const pool = buildPool();
console.log('POOL (%d cards):\n%s\n', pool.length, pool.map(c => c.id).join(', '));
console.log('--- DRAFT PROMPT the LLM sees ---\n' + draftPrompt(pool) + '\n');
console.log('--- DRAFT SCHEMA ---\n' + JSON.stringify(DRAFT_SCHEMA) + '\n');

const redRaw = mockDraft(pool, 'deploy_cavalry', 'attack_plus1');
const blueRaw = mockDraft(pool, 'deploy_artillery', 'forced_march');
const red = assemble(redRaw.picks, pool);
const blue = assemble(blueRaw.picks, pool);
const rl = legality(red), bl = legality(blue);
console.log('RED  draft:', JSON.stringify(redRaw.picks), '=>', rl);
console.log('BLUE draft:', JSON.stringify(blueRaw.picks), '=>', bl, '\n');

/* 5. HOOK: the drafted decks travel as match.decks; the engine seats sideDecks. */
const match = E.newMatch({ seed: 1234, firstPlayer: 'red', decks: { red, blue } });
const st = E.newSkirmish(match);
const sym = E.newSkirmish(E.newMatch({ seed: 1234, firstPlayer: 'red' })); // decks:null

console.log('asymmetric skirmish: sideDecks.red.starting=%s sideDecks.blue.starting=%s',
  st.sideDecks && st.sideDecks.red.starting, st.sideDecks && st.sideDecks.blue.starting);
console.log('symmetric skirmish : sideDecks=%s (golden path untouched)', sym.sideDecks);

/* ---- assertions (the throwaway's proof) ---- */
assert.ok(rl.ok, 'RED draft must be legal: ' + rl.probs.join('; '));
assert.ok(bl.ok, 'BLUE draft must be legal: ' + bl.probs.join('; '));
assert.ok(st.sideDecks && st.sideDecks.red && st.sideDecks.blue, 'asymmetric decks must seat sideDecks');
assert.strictEqual(sym.sideDecks, undefined, 'symmetric path must leave sideDecks absent (golden)');
// over-cap draft must be rejected by the SAME primitive
const over = assemble(pool.map(c => ({ id: c.id, count: 3 })), pool);
assert.ok(!legality(over).ok && E.deckPoints(over) > E.DECK_POINTS_CAP, 'over-cap draft must fail the cap gate');

console.log('\nOK — phase-0 draft produces legal asymmetric decks; symmetric path stays golden.');

/* SEAM note for #84: legality() duplicates the size-band + starting checks that
 * TODAY live only in game/ui/deck-editor.js deckProblems() (browser-only). The
 * cap check already rides the exported E.deckPoints/E.DECK_POINTS_CAP. The clean
 * integration is to lift deckProblems into the engine (e.g. E.deckProblems(deck))
 * so the deck-editor AND the phase-0 draft validate on ONE implementation, per
 * the project's "one implementation per fact" doctrine. That extraction is the
 * real decision this ticket surfaces. */
