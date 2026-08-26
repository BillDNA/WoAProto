#!/usr/bin/env node
/* PROTOTYPE — throwaway. Answers issue #84: how does phase-0 LLM deckbuild work?
 * Run: node dev/prototypes/proto-phase0-deckbuild.js
 * NOT production. No LLM call — a deterministic mock stands in for the draft so
 * the *protocol* (what the LLM sees, what it returns, where it hooks, how it's
 * validated) is concrete and reactable. Fold the verdict into dev/claude-plays.js;
 * this file dies on its branch.
 *
 * Decisions (resolved with Bill on #84 — this stub reflects them):
 *  1. POOL = deduped union of cards across every content/decks/*.js (20 today).
 *     That is "all Cards" until the roguelite pool>deck split lands.
 *  2. THE ONE HARD RULE = the army-points cap (72). Everything else is
 *     best-practice prompt guidance, NOT a gate — the point of LLM deckbuild is
 *     to search the space, and hard rules railroad it back to the same decks.
 *  3. LLM SEES: the pool as `id | pts | name — text`, the cap, and soft
 *     best-practices (16-20 cards; run deploys ~ MTG lands; pick a basic opener,
 *     noOpener cards can't open). RETURNS: {picks:[{id,count}], why}.
 *  4. VALIDATE: cap is the only hard fail, on the EXPORTED E.deckPoints /
 *     E.DECK_POINTS_CAP (same primitive the deck-editor uses). Size 16-20 and
 *     starting-card are advisory notes (0/2 starting tolerated: deckRegistry
 *     falls back to cards[0]).
 *  5. QUESTIONNAIRE: a pre-match deck-construction questionnaire, data-defined,
 *     sharing #85's post-match debrief machinery (#91 dashboard edits it).
 *  6. HOOK: draft -> match.decks={red,blue} -> E.newMatch({...,decks}) ->
 *     E.newSkirmish already seats st.sideDecks (WOA-055, zero engine change).
 *     decks:null keeps the symmetric default path byte-for-byte golden.
 *
 * Filed to #82 (calibration/POINTS): should guaranteed-opener status carry a
 * point surcharge like `anywhere` already does, and should `noOpener` be DERIVED
 * from step properties instead of a hand-set flag — so army-points MEASURES the
 * rule-bends. Out of scope for this ticket (POINTS-table territory).
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
    'The ONE hard rule:',
    '  - Army-points must be <= ' + E.DECK_POINTS_CAP + ' (sum of cardPoints * count). This is the fence.',
    'Best practices (not rules — break them on purpose if you have a reason):',
    '  - Aim for 16-20 cards total (a card may repeat via count).',
    '  - Run some deploys. A deck with no deploys is like an MTG deck with no lands —',
    '    usually a trap, but the space is yours to search.',
    '  - Pick a basic deploy as your opener; noOpener cards (e.g. Airdrop) never open.',
    'Return JSON: {"picks":[{"id":"<card id>","count":<n>}], "why":"<one line>"}',
  ].join('\n');
}

/* Pre-match deck-construction questionnaire (issue #84). Data-defined, one place —
 * the SAME shape #85 chose for the post-match debrief; a real build shares that
 * table and #91's dashboard edits it. Output is prose for the judge role, no pin. */
const CONSTRUCTION_QUESTIONS = [
  { id: 'plan',      text: 'In one line, what is this deck trying to do?' },
  { id: 'keystone',  text: 'Which card(s) are the keystone, and why those?' },
  { id: 'ruleBend',  text: 'Did you lean on any rule-bend (anywhere placement, tie-survival, opener)?' },
  { id: 'cut',       text: 'What did you deliberately leave out, and what did it cost you?' },
];
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

/* 4. Validate. The cap is the ONLY hard gate (issue #84) — reuses the EXPORTED
 *    engine fact (same primitive the deck-editor uses). Size band (16-20) is a
 *    soft guardrail; starting-card is advisory — 0/2 is tolerated (deckRegistry
 *    falls back to cards[0]), so it's a note, never a failure. */
function legality(deck) {
  const notes = [];
  const total = deck.cards.reduce((s, c) => s + (c.count == null ? 1 : c.count), 0);
  const starting = deck.cards.filter(c => c.starting).length;
  const pts = E.deckPoints(deck);                       // <-- one implementation of the cap fact
  const ok = pts <= E.DECK_POINTS_CAP;                  // the fence, and the ONLY hard fail
  if (total < 16 || total > 20) notes.push('size ' + total + ' outside the 16-20 best-practice band');
  if (starting !== 1) notes.push('starting-card count is ' + starting + ' (engine will open with cards[0])');
  if (!ok) notes.push('OVER BUDGET ' + pts + ' > ' + E.DECK_POINTS_CAP + ' — rejected');
  return { ok, pts, total, starting, notes };
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

console.log('--- deck-construction questionnaire (pre-match, data-defined) ---');
CONSTRUCTION_QUESTIONS.forEach(q => console.log('  [' + q.id + '] ' + q.text));
console.log('  (LLM answers in prose alongside its draft; feeds the judge role, no pin)\n');

/* 5. HOOK: the drafted decks travel as match.decks; the engine seats sideDecks. */
const match = E.newMatch({ seed: 1234, firstPlayer: 'red', decks: { red, blue } });
const st = E.newSkirmish(match);
const sym = E.newSkirmish(E.newMatch({ seed: 1234, firstPlayer: 'red' })); // decks:null

console.log('asymmetric skirmish: sideDecks.red.starting=%s sideDecks.blue.starting=%s',
  st.sideDecks && st.sideDecks.red.starting, st.sideDecks && st.sideDecks.blue.starting);
console.log('symmetric skirmish : sideDecks=%s (golden path untouched)', sym.sideDecks);

/* ---- assertions (the throwaway's proof) ---- */
assert.ok(rl.ok, 'RED draft must be under cap: ' + rl.notes.join('; '));
assert.ok(bl.ok, 'BLUE draft must be under cap: ' + bl.notes.join('; '));
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
