#!/usr/bin/env node
/* War of Attrition — the Author's hands for the CARD kind (#165, spec §8 A2-card).
 *
 * The updated `create-card` skill is the Author's BRAIN (what card, why, at what
 * Temperature); THIS file is its HANDS — the deterministic write path that turns an
 * authoring decision into real, legal `game/content/cards/*.js` files. The brain
 * decides; the hands guarantee the file is well-formed, catalog-shaped, legal, and
 * recorded so the Workbench can render it. One authoring brain per kind (spec §11.7),
 * one write path per kind, so the LLM never hand-rolls the IIFE wrapper or forgets a
 * legality check.
 *
 * Catalog-first (#159): a card lives in ONE file `game/content/cards/<id>.js`; decks
 * are refs. So `add` writes a new file, `edit` overwrites one, `remove` deletes one —
 * the Author SHAPES the catalog (add / edit / remove), it never appends-only (spec §2).
 *
 * Legality is ONE implementation: E.deckProblems (the frozen shared impl the deck
 * editor and phase-0 drafter also use). Every card is seated in a legal probe deck and
 * validated before it is written — a malformed or over-budget card is REFUSED, never
 * emitted (spec §4 / #165 AC "every card it writes is legal"). This is the pre-game
 * legality budget (army-points cap), NOT the post-game balance Tolerance (that shapes,
 * never rejects — report-model.js).
 *
 * Every write also appends a renderable record to logs/authored/latest.json — the
 * Author's output in the shape the Workbench "Authored this run" feed renders (add /
 * edit / remove distinguished, as CARDS not JSON, spec §12). The git diff is the
 * rollback; the feed is the human-readable surface.
 *
 * CLI (the skill drives these; run directly for a self-check):
 *   node dev/author-card.js reset  [--nudge "..."] [--temperature safe|standard|bold|wild]
 *   node dev/author-card.js add    '<card json>' [--note "..."] [--nudge ...] [--temperature ...]
 *   node dev/author-card.js edit   '<card json>' [--note "..."] [--nudge ...] [--temperature ...]
 *   node dev/author-card.js remove <id>          [--note "..."] [--nudge ...] [--temperature ...]
 *   node dev/author-card.js lint   ['<card json>' | <id> | --all]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAME_DIR = path.join(ROOT, 'game');
const CARDS_DIR = path.join(GAME_DIR, 'content', 'cards');
const FEED_FILE = path.join(ROOT, 'logs', 'authored', 'latest.json');
const TEMPERATURES = ['safe', 'standard', 'bold', 'wild'];

const E = require(path.join(GAME_DIR, 'engine.js'));

// The full catalog is WOA_CONTENT.cards (every content/cards/*.js file, incl. catalog-only
// cards in no shipped deck) — NOT E.CARDS, which is just the ACTIVE deck's resolved cards.
// "does the catalog still load / is every card legal" is a question about the whole set.
function catalogCards() {
  return (typeof global !== 'undefined' && global.WOA_CONTENT && global.WOA_CONTENT.cards) || E.CARDS;
}

// The canonical content-file wrapper — byte-identical to game/server.js wrapContent
// so a hand-written and a server-written card file are indistinguishable (one format).
function wrapCard(card) {
  return "(function(g){var c=g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[],mapsets:[]};(c.cards=c.cards||[]).push(\n" +
    JSON.stringify(card, null, 1) + "\n);})(typeof window!=='undefined'?window:globalThis);\n";
}

// Deck-ref-only properties: a deck entry carries count/starting/out, a CATALOG card never
// does (its shape is {id,name,text,steps,...engine flags}). Strip them so they can't leak
// into a content/cards file or slip past the validator masked as a "second starting card".
const DECK_REF_PROPS = ['count', 'starting', 'out'];
function toCatalogShape(card) {
  const out = Object.assign({}, card);
  DECK_REF_PROPS.forEach(function (k) { delete out[k]; });
  return out;
}

/* Card legality via the engine's shared deckProblems. A catalog card is the shape
   {id,name,text,steps} — so we seat it at count 1 in a legal probe deck (cheapest cards to
   the 16-card band) and DIFF the deck's problems against a baseline probe with the card
   replaced by another filler. Every problem the card introduces is attributable to it, and
   attribution is by set-difference of the actual problem strings — NOT substring-matching a
   filler's name (which mis-judged a card whose own name contained a filler's). Returns the
   card's problem strings (empty = legal). The probe is the cheapest legal 16-card deck, so
   its budget headroom (cap − 15 cheapest slots ≈ 27 pts) is the true most a single card can
   cost and still be seatable in ANY legal deck — a principled per-card budget, not an
   artefact of the filler count. */
function cardProblems(card) {
  const cheapest = catalogCards().slice()
    .filter(function (c) { return !card || c.id !== card.id; })
    .sort(function (a, b) { return E.cardPoints(a) - E.cardPoints(b); });
  const start = cheapest[0], fill = cheapest[1];
  if (!start || !fill) return ['author-card: too few probe cards in the catalog — cannot validate'];
  const startRef = Object.assign(toCatalogShape(start), { count: 1, starting: true });
  const cardRef = Object.assign(toCatalogShape(card || {}), { count: 1 });
  const fillRef = Object.assign(toCatalogShape(fill), { count: 14 });
  // Baseline = the same legal deck with the card's slot given back to the filler (count 15).
  const baseline = E.deckProblems([startRef, Object.assign(toCatalogShape(fill), { count: 15 })]);
  const withCard = E.deckProblems([startRef, cardRef, fillRef]);
  const baseSet = {}; baseline.forEach(function (p) { baseSet[p] = 1; });
  return withCard.filter(function (p) { return !baseSet[p]; });
}

// --- feed (logs/authored/latest.json) — the renderable record the Workbench reads ---
function readFeed(feedFile) {
  const f = feedFile || FEED_FILE;
  let src;
  try { src = fs.readFileSync(f, 'utf8'); }
  catch (e) { return { authoredAt: null, nudge: '', temperature: '', cards: [] }; } // absent = fresh run
  // Present but unparseable: DON'T silently reset — that would wipe the run's prior records
  // on the next append. Fail loud so the operator recovers (or re-runs `reset` deliberately).
  try { return JSON.parse(src); }
  catch (e) { throw new Error('author feed at ' + f + ' is corrupt (' + e.message + ') — fix it or run `author-card.js reset`'); }
}
function writeFeed(feed, feedFile) {
  const f = feedFile || FEED_FILE;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(feed, null, 2) + '\n');
}
// Append one authored record, carrying run-meta (nudge/temperature) forward from
// whatever `reset` (or the first write) stamped.
function appendFeed(record, meta, opts) {
  opts = opts || {};
  const feed = readFeed(opts.feedFile);
  feed.cards = feed.cards || [];
  if (meta && meta.nudge != null && meta.nudge !== '') feed.nudge = meta.nudge;
  if (meta && meta.temperature != null && meta.temperature !== '') feed.temperature = meta.temperature;
  feed.authoredAt = new Date().toISOString();
  feed.cards.push(record);
  writeFeed(feed, opts.feedFile);
  return feed;
}

function cardFile(id, cardsDir) { return path.join(cardsDir || CARDS_DIR, id + '.js'); }

/* Read a catalog card's stored object back from its file (for edit `before` and remove
   records) — parses the JSON literal out of the IIFE wrapper without executing it. */
function readStoredCard(id, cardsDir) {
  let src;
  try { src = fs.readFileSync(cardFile(id, cardsDir), 'utf8'); } catch (e) { return null; }
  const s = src.indexOf('.push(');
  // The wrapper closes the push on its own line `\n);` (the JSON literal itself has no
  // ')'); anchor to that, not the trailing `);})(...)` at end of file.
  const e = s < 0 ? -1 : src.indexOf('\n);', s);
  if (s < 0 || e < 0) return null;
  try { return JSON.parse(src.slice(s + '.push('.length, e).trim()); } catch (err) { return null; }
}

// Stamp E.cardPoints onto a card record so the feed and the Workbench can show its
// army-points cost without re-deriving it (the descriptive yardstick, ADR-0002).
function withPoints(card) {
  const out = Object.assign({}, card);
  try { out.points = E.cardPoints(card); } catch (e) { /* leave unset */ }
  return out;
}

// Regenerate content/manifest.js so the browser loads exactly the files on disk.
// Tests pass regen:false (or their own fn); the real CLI uses the content generator.
function regen(fn) {
  if (fn === false) return;
  if (typeof fn === 'function') return fn();
  try { require(path.join(GAME_DIR, 'content', 'manifest-gen.js')).regen(); } catch (e) { /* zipped game/ */ }
}

// --- the three shaping moves. Each validates, writes the file, and records the feed. ---
// opts (tests): { cardsDir, feedFile, regen } override the real repo paths / manifest.
function addCard(card, meta, opts) {
  opts = opts || {};
  const dir = opts.cardsDir || CARDS_DIR;
  if (!card || !card.id) throw new Error('add: card needs an id');
  card = toCatalogShape(card);   // deck-ref props (count/starting/out) never belong in a catalog file
  if (fs.existsSync(cardFile(card.id, dir))) throw new Error('add: ' + card.id + ' already exists — use `edit`');
  const probs = cardProblems(card);
  if (probs.length) throw new Error('add: refusing an illegal card:\n  - ' + probs.join('\n  - '));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cardFile(card.id, dir), wrapCard(card));
  regen(opts.regen);
  appendFeed({ action: 'add', card: withPoints(card), note: (meta && meta.note) || '' }, meta, opts);
  return card.id;
}
function editCard(card, meta, opts) {
  opts = opts || {};
  const dir = opts.cardsDir || CARDS_DIR;
  if (!card || !card.id) throw new Error('edit: card needs an id');
  card = toCatalogShape(card);   // deck-ref props (count/starting/out) never belong in a catalog file
  const before = readStoredCard(card.id, dir);
  if (!before) throw new Error('edit: ' + card.id + ' does not exist — use `add`');
  const probs = cardProblems(card);
  if (probs.length) throw new Error('edit: refusing an illegal card:\n  - ' + probs.join('\n  - '));
  fs.writeFileSync(cardFile(card.id, dir), wrapCard(card));
  regen(opts.regen);
  appendFeed({ action: 'edit', card: withPoints(card), before: withPoints(before), note: (meta && meta.note) || '' }, meta, opts);
  return card.id;
}
function removeCard(id, meta, opts) {
  opts = opts || {};
  const dir = opts.cardsDir || CARDS_DIR;
  if (!id) throw new Error('remove: needs a card id');
  const before = readStoredCard(id, dir);
  if (!before) throw new Error('remove: ' + id + ' does not exist');
  fs.unlinkSync(cardFile(id, dir));
  regen(opts.regen);
  appendFeed({ action: 'remove', card: withPoints(before), note: (meta && meta.note) || '' }, meta, opts);
  return id;
}

module.exports = { cardProblems, addCard, editCard, removeCard, readStoredCard, readFeed, wrapCard, withPoints, catalogCards, TEMPERATURES, FEED_FILE };

// ---------------------------------------------------------------- CLI
if (require.main === module) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  function flag(name) { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; }
  const meta = { note: flag('note'), nudge: flag('nudge'), temperature: flag('temperature') };
  if (meta.temperature && TEMPERATURES.indexOf(meta.temperature) < 0) {
    console.error('unknown temperature "' + meta.temperature + '" — one of: ' + TEMPERATURES.join(', '));
    process.exit(1);
  }
  function jsonArg() {
    const raw = argv[1];
    if (!raw) throw new Error('expected a card JSON argument');
    return JSON.parse(raw);
  }
  try {
    if (cmd === 'reset') {
      writeFeed({ authoredAt: new Date().toISOString(), nudge: meta.nudge || '', temperature: meta.temperature || '', cards: [] });
      console.log('AUTHORED_RESET ' + path.relative(ROOT, FEED_FILE));
    } else if (cmd === 'add') {
      const id = addCard(jsonArg(), meta);
      console.log('AUTHORED add ' + id + '  (' + E.cardPoints(readStoredCard(id)) + ' pts)  -> content/cards/' + id + '.js');
    } else if (cmd === 'edit') {
      const id = editCard(jsonArg(), meta);
      console.log('AUTHORED edit ' + id + '  (' + E.cardPoints(readStoredCard(id)) + ' pts)  -> content/cards/' + id + '.js');
    } else if (cmd === 'remove') {
      const id = removeCard(argv[1], meta);
      console.log('AUTHORED remove ' + id + '  (deleted content/cards/' + id + '.js)');
    } else if (cmd === 'lint') {
      const target = argv[1];
      if (!target || target === '--all') {
        let bad = 0;
        const all = catalogCards();
        all.forEach(function (c) {
          const p = cardProblems(c);
          if (p.length) { bad++; console.log('ILLEGAL ' + c.id + ':\n  - ' + p.join('\n  - ')); }
        });
        console.log(bad ? bad + ' illegal card(s)' : 'all ' + all.length + ' catalog cards legal');
        process.exit(bad ? 1 : 0);
      } else {
        const card = target.trim()[0] === '{' ? JSON.parse(target) : (readStoredCard(target) || E.CARD_BY_ID[target]);
        if (!card) throw new Error('lint: no card "' + target + '" (pass a card id or a JSON object)');
        const p = cardProblems(card);
        console.log(p.length ? 'ILLEGAL ' + (card.id || '?') + ':\n  - ' + p.join('\n  - ') : 'legal (' + E.cardPoints(card) + ' pts)');
        process.exit(p.length ? 1 : 0);
      }
    } else {
      console.error('usage: node dev/author-card.js reset|add|edit|remove|lint  (see file header)');
      process.exit(1);
    }
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}
