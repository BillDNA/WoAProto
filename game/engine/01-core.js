/* War of Attrition — engine part 01: rules version, content assembly, rng, static data.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // apples (drives report/version folders and the persistent-data reset boundary).
  // Must track the rule book header (docs/War Of Attrition rule book.md).
  // 1.2 (WOA-039): metric re-baseline — Atk/Swp become % of actions, Tie%/Drag
  // condition to attrition endings, Reserves condition to HQ endings. Engine
  // RULES are unchanged; the bump exists so the golden balance diff (printed
  // report shape + balanceScore) may legitimately move and the report/version
  // folders + woa.db row versions roll to 1.2.
  var RULES_VERSION = '1.2';

  // CORE data (units/shapes/stock/ai) is hand-editable JSON in maps.js, which
  // loads first (browser) / sits next to this file (node).
  var CORE = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('../maps.js') : null);
  if (!CORE || !CORE.shapes || !CORE.units)
    throw new Error('War of Attrition: maps.js missing or malformed (must define WOA_BUILTIN with shapes + units)');

  // CONTENT (the map roster + the card decks) lives in per-item files under
  // content/ (Feedback Round 4, Pass 2 — delete a map/deck by deleting its
  // file). In the browser content/manifest.js document.write()'d them into
  // WOA_CONTENT before this script ran; in node we load them from disk here.
  (function loadContentNode() {
    if (global.WOA_CONTENT) return;                 // browser already populated it
    if (typeof require !== 'function') return;
    global.WOA_CONTENT = { maps: [], cards: [], decks: [], mapsets: [], units: [] };
    try {
      var fs = require('fs'), path = require('path');
      var kinds = ['cards', 'decks', 'maps', 'mapsets', 'units', 'commanders'];
      try { kinds = require('../content/kinds.js'); } catch (e2) { /* kinds.js is the source of truth when present */ }
      kinds.forEach(function (kind) {
        var dir = path.join(__dirname, '..', 'content', kind);
        fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f); }).sort().forEach(function (f) {
          require(path.join(dir, f));                // side effect: pushes into WOA_CONTENT
        });
      });
    } catch (e) {
      // don't swallow silently — a bad content file otherwise just vanishes
      // from the roster until the generic "no content" throw below
      if (typeof console !== 'undefined') console.error('WoA content load failed: ' + e.message);
    }
  })();
  var CONTENT = global.WOA_CONTENT || { maps: [], cards: [], decks: [], mapsets: [], units: [] };
  // Card catalog (#159): the single definition site for every card lives in
  // content/cards/*.js (WOA_CONTENT.cards). Deck files carry only refs
  // {id, count, starting?}; hydrate each ref into the full card def here, once,
  // in place — so EVERY reader of WOA_CONTENT.decks (engine, deck editor, node
  // tools) inherits fully-resolved cards without its own card-data path. An
  // entry that already carries a def (the browser __applied override, or any
  // hand-authored deck) passes through unchanged.
  var CATALOG = {};
  (CONTENT.cards || []).forEach(function (c) { if (c && c.id) CATALOG[c.id] = c; });
  function hydrateDeck(deck) {
    if (!deck || !Array.isArray(deck.cards)) return deck;
    deck.cards = deck.cards.map(function (ref) {
      var def = CATALOG[ref && ref.id];
      var card = def ? Object.assign({}, def, ref) : ref;   // catalog def + count/starting
      // A ref that resolved to no catalog def AND carries no inline steps is a
      // dangling pointer — inlined defs made that impossible pre-#159; re-establish
      // the invariant loudly instead of dealing a step-less card at play. (A full
      // override entry — the browser __applied / custom deck — already has steps.)
      if (!Array.isArray(card.steps))
        throw new Error('War of Attrition: deck "' + (deck.id || '?') + '" references card "' +
          (ref && ref.id) + '" with no catalog def (content/cards/' + (ref && ref.id) + '.js)');
      return card;
    });
    return deck;
  }
  (CONTENT.decks || []).forEach(hydrateDeck);
  // the active deck decides the card list; fall back to any deck, then to any
  // loose WOA_CONTENT.cards (belt-and-braces for hand-authored content).
  var ACTIVE_DECK = (CONTENT.decks || []).filter(function (d) { return d && d.active; })[0] ||
    (CONTENT.decks || [])[0] || null;
  var CARD_LIST = (ACTIVE_DECK && ACTIVE_DECK.cards && ACTIVE_DECK.cards.length) ? ACTIVE_DECK.cards : (CONTENT.cards || []);
  // Unit composition & values as a content lever (WOA-011): a units variant in
  // content/units/*.js (exactly one flagged active — the deck/map-set pattern)
  // fully REPLACES the default unit block, so composition (counts), VP, and
  // atk/def/sup are all editable as data. No active variant falls back to
  // maps.js CORE.units — the shipped 7/2/1 default — so this is the ONE place
  // unit stats resolve (every other layer reads I.UNITS).
  var UNITS_VARIANT = (CONTENT.units || []).filter(function (u) { return u && u.active; })[0] || null;
  var UNIT_DEFS = (UNITS_VARIANT && UNITS_VARIANT.units) || CORE.units;
  var BUILTIN = {
    shapes: CORE.shapes, units: UNIT_DEFS, trenchCount: CORE.trenchCount,
    terrainStock: CORE.terrainStock, ai: CORE.ai,
    maps: (CONTENT.maps || []).slice(),
    cards: CARD_LIST
  };
  if (!BUILTIN.maps.length || !BUILTIN.cards.length)
    throw new Error('War of Attrition: no content loaded (content/maps/*.js + content/decks/*.js). Check the content/ dirs and content/manifest.js.');

  // Map-sets (V1 content curation): named rosters in content/mapsets/*.js,
  // exactly one flagged active — the deck pattern applied to maps. The active
  // set IS the match/lab pool (one shared roster across play modes and tools;
  // it replaced the per-browser woa-disabled-maps preference). No sets, or an
  // active set matching nothing, falls back to the full library.
  var MAPSETS = (CONTENT.mapsets || []).slice();
  function activeMapset() {
    return MAPSETS.filter(function (s) { return s && s.active; })[0] || null;
  }
  function mapPool() {
    var set = activeMapset();
    if (!set || !set.maps || !set.maps.length) return BUILTIN.maps;
    var pool = BUILTIN.maps.filter(function (m) {
      return set.maps.indexOf(m.id) >= 0 || set.maps.indexOf(m.name) >= 0;
    });
    return pool.length ? pool : BUILTIN.maps;
  }

  /* ---------- rng (deterministic, seed stored in state) ---------- */
  function rnd(s) {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    var t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(s, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd(s) * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ---------- static data (all tunable in maps.js) ---------- */
  var UNITS = BUILTIN.units;
  // Physical-board guardrail (WOA-011): a side always fields exactly 10 pieces
  // (default 7 inf / 2 cav / 1 art). Values are free data; the TOTAL count is
  // the invariant — enforce it at load so a bad units variant fails loud
  // instead of quietly skewing every skirmish. (Default sums to 10, so this never
  // fires for the shipped config — the golden balance diff is unaffected.)
  var UNIT_COUNT = Object.keys(UNITS).reduce(function (s, t) { return s + (UNITS[t].count || 0); }, 0);
  if (UNIT_COUNT !== 10)
    throw new Error('War of Attrition: unit composition must total 10 pieces (got ' + UNIT_COUNT +
      (UNITS_VARIANT ? ' from units variant "' + UNITS_VARIANT.id + '"' : ' in maps.js') + ')');
  var TRENCH_COUNT = BUILTIN.trenchCount || 3;
  var TERRAIN_STOCK = BUILTIN.terrainStock || { F3: 2, F2: 4, M3: 2, M2: 4 };
  var CARDS = BUILTIN.cards;
  if (!UNITS || !CARDS) throw new Error('War of Attrition: maps.js must define units and cards');
  // A card registry is "everything the skirmish needs to know about one deck's
  // cards": the id->def map + which card opens. Built once for the active deck
  // (the global default) and once per side when a skirmish seats asymmetric
  // decks (WOA-055). One builder, so both paths derive it identically.
  function deckRegistry(cards) {
    var byId = {};
    cards.forEach(function (c) { byId[c.id] = c; });
    var starting = (cards.filter(function (c) { return c.starting; })[0] || cards[0]).id;
    return { cards: cards, byId: byId, starting: starting };
  }
  var DEFAULT_REG = deckRegistry(CARDS);
  var CARD_BY_ID = DEFAULT_REG.byId;
  var STARTING_CARD = DEFAULT_REG.starting;
  // WOA-055 per-side deck binding: turn a deck SELECTION into a registry.
  // null/undefined -> the active deck (default = today's symmetric behaviour);
  // a deck object with .cards; or an id/name string looked up in CONTENT.decks.
  // Registries are immutable for the process lifetime, so memoize the by-name
  // lookup — a balance run resolves the same two decks per skirmish (200x for a
  // 100-skirmish sweep) and would otherwise rebuild each byId map every time.
  var REG_CACHE = {};
  function resolveDeck(sel) {
    if (!sel) return DEFAULT_REG;
    if (typeof sel === 'string') {
      if (REG_CACHE[sel]) return REG_CACHE[sel];
      var found = (CONTENT.decks || []).filter(function (d) { return d && (d.id === sel || d.name === sel); })[0];
      if (!found) throw new Error('War of Attrition: no deck "' + sel + '" (known: ' +
        ((CONTENT.decks || []).map(function (d) { return d.id; }).join(', ') || 'none') + ')');
      if (!found.cards || !found.cards.length) throw new Error('War of Attrition: deck "' + found.id + '" has no cards');
      return (REG_CACHE[sel] = deckRegistry(found.cards));
    }
    if (!sel.cards || !sel.cards.length) throw new Error('War of Attrition: deck "' + (sel.id || sel) + '" has no cards');
    return deckRegistry(sel.cards);
  }
  // one slot per physical piece on the player mat
  var PIECE_TOTALS = { trench: TRENCH_COUNT };
  Object.keys(UNITS).forEach(function (t) { PIECE_TOTALS[t] = UNITS[t].count || 0; });

  var MAPS = BUILTIN.maps;

  /* ---------- army-points (WOA #54) ----------
     A descriptive capability yardstick: points are COMPUTED from a card's steps
     against this ONE hand-seeded weight table, never stored per card (one place
     to tune, no per-card drift). Measured balance always overrules this number.
     Seeding intent: deploy > attack > reposition; unit tier and the attack
     flags/mod add capability on top. `combo` is a global step-density exponent,
     flat at 1.0 (nSteps^0 = 1) with room to price multi-step combos later. */
  var POINTS = {
    combo: 1.0,
    step: { deploy: 3, attack: 2, reposition: 1, trench: 1, barrage: 2 },
    tier: { infantry: 0, cavalry: 1, artillery: 2 },   // deploy unit surcharge
    mod: 1,                                             // per point of |attack mod|
    tieSpare: 1, noAdvance: 0.5, anywhere: 1            // flag surcharges
  };
  function stepPoints(step) {
    if (!step || !step.type) return 0;
    var p = POINTS.step[step.type] || 0;
    p += POINTS.tier[step.unit] || 0;                  // 0 when the step has no unit
    if (step.mod) p += Math.abs(step.mod) * POINTS.mod;
    if (step.tieSpare) p += POINTS.tieSpare;
    if (step.noAdvance) p += POINTS.noAdvance;
    if (step.anywhere) p += POINTS.anywhere;
    return p;
  }
  function cardPoints(card) {
    var steps = (card && Array.isArray(card.steps)) ? card.steps : [];
    if (!steps.length) return 0;
    var sum = steps.reduce(function (s, st) { return s + stepPoints(st); }, 0);
    return sum * Math.pow(steps.length, POINTS.combo - 1);
  }
  function deckPoints(deck) {
    var cards = (deck && deck.cards) || [];
    return cards.reduce(function (s, c) { return s + cardPoints(c) * (c.count == null ? 1 : c.count); }, 0);
  }
  // Army-points budget ceiling (WOA #56): the fairness constraint that lets two
  // asymmetric decks be called "matched". Seeded above where the shipped roster
  // sits today (max iter3 = 70.5); the deck editor's sum(count) band guardrail
  // rejects an over-budget deck the same way it rejects an oversized one.
  var DECK_POINTS_CAP = 72;
  // Step (#110): signed deckPoints delta from incumbent to candidate. Null parent
  // (iteration-0 fixture) → 0.
  function deckStep(parent, candidate) {
    if (!parent) return 0;
    return deckPoints(candidate) - deckPoints(parent);
  }

  /* Deck legality (#116, lifted verbatim from the deck editor's deckProblems).
     ONE implementation of "is this deck legal", shared by the browser deck editor
     (game/ui/deck-editor.js aliases E.deckProblems) and the phase-0 drafter
     (dev/deckbuild.js). Returns human-readable problem strings; empty = legal.
     The army-points cap is the load-bearing gate the drafter hard-gates on; the
     size band + starting-card rules are the editor's stricter guardrails (the
     drafter treats them as advisory — size/starting are soft, only the cap fences). */
  var STEP_FLAGS = { deploy: { unit: 1, anywhere: 1 }, trench: {}, attack: { mod: 1, tieSpare: 1, noAdvance: 1 }, reposition: {}, barrage: {} };
  function deckProblems(cards) {
    var probs = [], ids = {}, total = 0, starting = 0;
    cards = (cards || []).filter(function (c) { return !c.out; }); // benched cards aren't shipped or validated
    cards.forEach(function (c, i) {
      var tag = c.name || c.id || ('card ' + (i + 1));
      if (!c.id || !/^[a-z0-9_]+$/i.test(c.id)) probs.push(tag + ': id must be letters/digits/underscores');
      else if (ids[c.id]) probs.push('duplicate id "' + c.id + '"');
      ids[c.id] = 1;
      if (!c.name) probs.push('card ' + (i + 1) + ' needs a name');
      var n = +c.count;
      if (!(n >= 1) || n !== Math.floor(n)) probs.push(tag + ': count must be a whole number ≥ 1');
      else total += n;
      if (c.starting && n !== 1) probs.push(tag + ': the starting card must have count 1 (the engine deals exactly one)');
      if (c.starting) starting++;
      if (!Array.isArray(c.steps) || !c.steps.length) probs.push(tag + ': needs at least one step');
      else c.steps.forEach(function (s, si) {
        var stp = tag + ' step ' + (si + 1);
        if (!s || !STEP_FLAGS[s.type]) { probs.push(stp + ': unknown type "' + (s && s.type) + '" (deploy / trench / attack / reposition / barrage)'); return; }
        Object.keys(s).forEach(function (k) { if (k !== 'type' && !STEP_FLAGS[s.type][k]) probs.push(stp + ': "' + k + '" is not a ' + s.type + ' option'); });
        if (s.type === 'deploy' && !UNITS[s.unit]) probs.push(stp + ': unknown unit "' + s.unit + '" (' + Object.keys(UNITS).join(' / ') + ')');
        if (s.type === 'attack' && s.mod !== undefined && typeof s.mod !== 'number') probs.push(stp + ': mod must be a number');
      });
    });
    if (starting !== 1) probs.push('exactly ONE card must be marked starting (got ' + starting + ')');
    // WOA-036: the physical guardrail is a design band, not one exact count — every
    // shipped deck totals 16 or 17. A custom deck must land in that same band.
    if (total < 16 || total > 17) probs.push('the deck must total 16-17 cards (got ' + total + ') — hand-edit the deck file if you really want an exotic size');
    // WOA #56: army-points budget ceiling — the fairness constraint. Same reject-on-validate as the size band.
    var pts = deckPoints({ cards: cards });
    if (pts > DECK_POINTS_CAP) probs.push('the deck is over the army-points budget (' + pts + ' > ' + DECK_POINTS_CAP + ') — cut a card or a step');
    return probs;
  }

  // tiny pure helpers used by every layer
  function other(p) { return p === 'red' ? 'blue' : 'red'; }
  function cap(p) { return p.charAt(0).toUpperCase() + p.slice(1); }

  /* shared-namespace exports */
  I.RULES_VERSION = RULES_VERSION;
  I.BUILTIN = BUILTIN;
  // WOA-032: the deck the ENGINE actually resolved this load (id + name) — the
  // one place to read "which deck is live", incl. the browser's '__applied'
  // sandbox deck (index.html pushes it before this file runs, see WOA-036
  // gotcha). Run-identity stampers (game/balance.js, the dashboard Run loop)
  // read this instead of re-deriving from content/decks/'s active flag.
  I.ACTIVE_DECK = ACTIVE_DECK;
  I.DECKS = CONTENT.decks || [];
  I.DEFAULT_REG = DEFAULT_REG;
  I.deckRegistry = deckRegistry;
  I.resolveDeck = resolveDeck;
  I.rnd = rnd;
  I.shuffle = shuffle;
  I.UNITS = UNITS;
  I.TRENCH_COUNT = TRENCH_COUNT;
  I.TERRAIN_STOCK = TERRAIN_STOCK;
  I.CARDS = CARDS;
  I.CARD_BY_ID = CARD_BY_ID;
  I.STARTING_CARD = STARTING_CARD;
  I.PIECE_TOTALS = PIECE_TOTALS;
  I.cardPoints = cardPoints;
  I.deckPoints = deckPoints;
  I.deckStep = deckStep;
  I.DECK_POINTS_CAP = DECK_POINTS_CAP;
  I.deckProblems = deckProblems;
  I.MAPS = MAPS;
  I.MAPSETS = MAPSETS;
  I.activeMapset = activeMapset;
  I.mapPool = mapPool;
  I.other = other;
  I.cap = cap;
})(typeof window !== 'undefined' ? window : globalThis);
