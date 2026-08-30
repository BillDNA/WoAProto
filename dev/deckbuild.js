#!/usr/bin/env node
/* War of Attrition — phase-0 LLM deckbuild (#116/#84, Track F of the #108 build order).
 *
 * Two LLMs each draft a Deck from the deduped union of game/content/decks/*.js under
 * the 72-point army-points cap — THE only hard rule. Size (16-20) and starting-card
 * are soft/advisory; deploy-count is prompt best-practice, never a gate (railroading
 * the search back to the same decks is the whole thing this avoids). A draft returns
 * {picks:[{id,count}], why}; assemble() turns it into a deck object that rides the
 * existing WOA-055 sideDecks path (match.decks -> E.newSkirmish), zero engine change.
 *
 * Legality is ONE implementation: E.deckProblems (lifted from the deck editor in #116)
 * for the shared structural checks, E.deckPoints/E.DECK_POINTS_CAP for the load-bearing
 * cap gate. dev/claude-plays.js --draft wires this in; run this file directly for a
 * deterministic mock self-check (node dev/deckbuild.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
// The pre-match deck-construction questionnaire rides #111's questionnaire table.
const CONSTRUCTION_QUESTIONS = require(path.join(__dirname, '..', 'game', 'content', 'questionnaire.js')).deckConstruction;

/* POOL — the card catalog (#159): the single definition site for every card is
   content/cards/*.js (WOA_CONTENT.cards), which is genuinely wider than any one
   16-card deck (it includes catalog-only cards in no shipped deck). require() is
   cached, so re-registering after the engine already loaded the catalog is a
   no-op; dedupe by id keeps the pool one-per-card either way. */
function buildPool() {
  const dir = path.join(__dirname, '..', 'game', 'content', 'cards');
  global.WOA_CONTENT = global.WOA_CONTENT || { maps: [], cards: [], decks: [], mapsets: [], units: [] };
  fs.readdirSync(dir).filter(f => /\.js$/.test(f)).sort()
    .forEach(f => { try { require(path.join(dir, f)); } catch (e) { console.error('deckbuild: skipped ' + f + ' — ' + e.message); } });
  const pool = {};
  (global.WOA_CONTENT.cards || []).forEach(c => { if (c && c.id && !pool[c.id]) pool[c.id] = c; });
  return Object.values(pool);
}

/* What the LLM sees: the pool as `id | pts | name — text`, the one hard rule, and
   the soft best-practices (break them on purpose if there's a reason). */
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
    '  - Mark exactly one basic deploy as your opener (starting:true); noOpener cards never open.',
    'Return JSON only: {"picks":[{"id":"<card id>","count":<n>}], "why":"<one line>"}'
  ].join('\n');
}

/* Assemble picks -> a deck object resolveDeck/newMatch accept. Starting card is
   advisory (the engine falls back to cards[0]). The engine deals the starting card
   once and excludes ALL its copies from the shuffled deck (buildDeck), so only a
   count-1 openable card can be the opener without losing copies — mark one when it
   exists, else float an openable card to cards[0] for the engine's fallback. Never
   rewrite counts (that mangles the draft). */
function assemble(picks, pool) {
  const byId = {}; pool.forEach(c => { byId[c.id] = c; });
  const cards = picks.map(p => {
    const base = byId[p.id];
    if (!base) throw new Error('draft picked unknown card "' + p.id + '"');
    return Object.assign({}, base, { count: p.count, starting: false });
  });
  const opener = cards.find(c => c.count === 1 && !byId[c.id].noOpener);
  if (opener) opener.starting = true;
  else {
    const i = cards.findIndex(c => !byId[c.id].noOpener);
    if (i > 0) cards.unshift(cards.splice(i, 1)[0]);
  }
  return { id: 'draft', name: 'Drafted deck', cards };
}

/* Legality. The cap is the ONLY hard gate (ok). E.deckProblems is the shared legality
   implementation — its output rides as advisory notes (size band, starting), never a
   gate for the draft. A pool-sourced deck fires only size/starting notes; structural
   checks stay quiet because every card came from a validated shipped deck. */
function legality(deck) {
  const total = deck.cards.reduce((s, c) => s + (c.count == null ? 1 : c.count), 0);
  const starting = deck.cards.filter(c => c.starting).length;
  const pts = E.deckPoints(deck);
  const ok = pts <= E.DECK_POINTS_CAP;           // the fence, and the ONLY hard fail
  const advisories = E.deckProblems(deck.cards) // shared legality impl, advisory here
    .filter(p => !/over the army-points budget/.test(p) && // cap is reported via `ok`, not twice
                 !/must total 16-17/.test(p));             // draft band is the softer 16-20 below
  if (total < 16 || total > 20) advisories.push('size ' + total + ' outside the 16-20 best-practice band');
  return { ok, pts, total, starting, advisories };
}

/* Deterministic mock draft — no transport. Start from 16 of the cheapest card (always
   legal: 16*minPts << cap), then upgrade slots toward the wished opening/filler while
   the cap allows. Used by the self-check and as claude-plays' --mock / fallback draft. */
function mockDraft(pool, opening, filler) {
  const byId = {}; pool.forEach(c => { byId[c.id] = c; });
  const cheapest = pool.slice().sort((a, b) => E.cardPoints(a) - E.cardPoints(b))[0].id;
  // slot 0 = a count-1 basic opener (kept unique so it stays the starting card).
  const openers = pool.filter(c => !c.noOpener && (c.steps || []).some(s => s.type === 'deploy'));
  const opener = (byId['deploy_inf_start'] || openers.sort((a, b) => E.cardPoints(a) - E.cardPoints(b))[0] || pool[0]).id;
  const slots = [opener].concat(Array(15).fill(cheapest));
  // filter to real pool ids so an unknown spec degrades to cheapest-fill (legal),
  // never a throw — this is what makes draftSide's "always legal" guarantee hold.
  const wishlist = Array(5).fill(opening).concat(Array(10).fill(filler)).filter(id => byId[id] && id !== opener);
  const toPicks = arr => arr.reduce((a, id) => dedupe(a, { id, count: 1 }), []);
  wishlist.forEach((id, i) => {
    const trial = slots.slice(); trial[i + 1] = id;
    if (E.deckPoints(assemble(toPicks(trial), pool)) <= E.DECK_POINTS_CAP) slots[i + 1] = id;
  });
  return { picks: toPicks(slots), why: 'mock upgrade-from-cheapest: ' + opening + ' + ' + filler };
}
function dedupe(acc, p) {
  const hit = acc.find(x => x.id === p.id);
  if (hit) hit.count += p.count; else acc.push({ id: p.id, count: p.count });
  return acc;
}

/* Parse a {picks, why} draft out of an LLM's prose reply (the prompt asks for JSON
   only, but models wrap it in prose). Scan each '{' for the first COMPLETE balanced
   object that parses into a non-empty picks list — a stray brace in the prose must
   not swallow the real draft (a greedy first-{ to last-} would). Returns null on
   anything unparseable so the caller can fall back to a mock. */
function parseDraft(text) {
  if (!text) return null;
  for (let i = text.indexOf('{'); i >= 0; i = text.indexOf('{', i + 1)) {
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}' && --depth === 0) {          // balanced object [i..j]
        try {
          const d = JSON.parse(text.slice(i, j + 1));
          if (Array.isArray(d.picks) && d.picks.length) {
            const picks = d.picks.filter(p => p && p.id)
              .map(p => ({ id: String(p.id), count: Math.max(1, Math.floor(+p.count || 1)) }));
            if (picks.length) return { picks, why: String(d.why || '') };
          }
        } catch (e) { /* not valid JSON — try the next '{' */ }
        break;                                              // advance to the next '{'
      }
    }
  }
  return null;
}

/* Draft one side. `ask(prompt)` -> Promise<string> is the LLM transport (prose reply);
   null/mock -> deterministic mockDraft. Guarantees a LEGAL (<= cap) deck on the
   sideDecks path: an unparseable or over-cap LLM draft falls back to the mock, which
   is always legal by construction. Returns { deck, draft, legality, fromMock }. */
async function draftSide(pool, ask, mockSpec) {
  const fallback = () => mockDraft(pool, mockSpec.opening, mockSpec.filler);
  let draft = null, fromMock = false;
  if (ask) {
    try { draft = parseDraft(await ask(draftPrompt(pool))); } catch (e) { draft = null; }
  }
  if (!draft) { draft = fallback(); fromMock = true; }
  let deck;
  try { deck = assemble(draft.picks, pool); } catch (e) { draft = fallback(); fromMock = true; deck = assemble(draft.picks, pool); }
  let leg = legality(deck);
  if (!leg.ok) { draft = fallback(); fromMock = true; deck = assemble(draft.picks, pool); leg = legality(deck); }
  return { deck, draft, legality: leg, fromMock };
}

module.exports = {
  buildPool, draftPrompt, CONSTRUCTION_QUESTIONS,
  assemble, legality, mockDraft, parseDraft, draftSide
};

/* ---- self-check (node dev/deckbuild.js) — the throwaway prototype's proof, kept
   as a runnable check per the deliberate-simplification rule. ---- */
if (require.main === module) {
  const assert = require('assert');
  const pool = buildPool();
  console.log('POOL (%d cards): %s\n', pool.length, pool.map(c => c.id).join(', '));

  (async () => {
    const red = await draftSide(pool, null, { opening: 'deploy_cavalry', filler: 'attack_plus1' });
    const blue = await draftSide(pool, null, { opening: 'deploy_artillery', filler: 'forced_march' });
    console.log('RED  =>', JSON.stringify(red.draft.picks), red.legality);
    console.log('BLUE =>', JSON.stringify(blue.draft.picks), blue.legality, '\n');

    // AC: a phase-0 draft produces a legal (<= 72) deck on the sideDecks path per side.
    assert.ok(red.legality.ok && blue.legality.ok, 'both drafts must be under the cap');
    const match = E.newMatch({ seed: 1234, firstPlayer: 'red', decks: { red: red.deck, blue: blue.deck } });
    const st = E.newSkirmish(match);
    assert.ok(st.sideDecks && st.sideDecks.red && st.sideDecks.blue, 'asymmetric decks must seat sideDecks');
    const sym = E.newSkirmish(E.newMatch({ seed: 1234, firstPlayer: 'red' }));
    assert.strictEqual(sym.sideDecks, undefined, 'symmetric path stays golden (sideDecks absent)');

    // AC: only the cap gates — an over-cap draft is rejected by the SAME primitive.
    const over = assemble(pool.map(c => ({ id: c.id, count: 3 })), pool);
    assert.ok(!legality(over).ok && E.deckPoints(over) > E.DECK_POINTS_CAP, 'over-cap draft must fail the cap gate');

    // AC: parseDraft pulls {picks,why} out of prose; bad input falls back cleanly.
    assert.ok(parseDraft('sure! {"picks":[{"id":"x","count":2}],"why":"hi"} done').picks[0].count === 2, 'parseDraft reads JSON from prose');
    assert.ok(parseDraft('my plan {note}: {"picks":[{"id":"y","count":3}],"why":"ok"}').picks[0].id === 'y', 'parseDraft skips a stray prose brace to find the real draft');
    assert.strictEqual(parseDraft('no json here'), null, 'parseDraft returns null on junk');

    // The construction questionnaire rides #111's machinery (ordered id+text rows).
    assert.ok(CONSTRUCTION_QUESTIONS.length && CONSTRUCTION_QUESTIONS.every(q => q.id && q.text), 'construction questionnaire is an id+text table');
    console.log('deck-construction questionnaire:');
    CONSTRUCTION_QUESTIONS.forEach(q => console.log('  [' + q.id + '] ' + q.text));

    console.log('\nOK — phase-0 draft produces legal asymmetric decks; symmetric path stays golden.');
  })().catch(e => { console.error(e); process.exit(1); });
}
