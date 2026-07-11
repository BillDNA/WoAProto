/* War of Attrition — engine part 01: rules version, content assembly, rng, static data.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // apples (drives report/version folders and the persistent-data reset boundary).
  // Must track the rule book header (dynamic-scrum/docs/War Of Attrition rule book.md).
  var RULES_VERSION = '1.1';

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
      var kinds = ['decks', 'maps', 'mapsets', 'units'];
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
  // instead of quietly skewing every battle. (Default sums to 10, so this never
  // fires for the shipped config — the golden balance diff is unaffected.)
  var UNIT_COUNT = Object.keys(UNITS).reduce(function (s, t) { return s + (UNITS[t].count || 0); }, 0);
  if (UNIT_COUNT !== 10)
    throw new Error('War of Attrition: unit composition must total 10 pieces (got ' + UNIT_COUNT +
      (UNITS_VARIANT ? ' from units variant "' + UNITS_VARIANT.id + '"' : ' in maps.js') + ')');
  var TRENCH_COUNT = BUILTIN.trenchCount || 3;
  var TERRAIN_STOCK = BUILTIN.terrainStock || { F3: 2, F2: 4, M3: 2, M2: 4 };
  var CARDS = BUILTIN.cards;
  if (!UNITS || !CARDS) throw new Error('War of Attrition: maps.js must define units and cards');
  var CARD_BY_ID = {};
  CARDS.forEach(function (c) { CARD_BY_ID[c.id] = c; });
  var STARTING_CARD = (CARDS.filter(function (c) { return c.starting; })[0] || CARDS[0]).id;
  // one slot per physical piece on the player mat
  var PIECE_TOTALS = { trench: TRENCH_COUNT };
  Object.keys(UNITS).forEach(function (t) { PIECE_TOTALS[t] = UNITS[t].count || 0; });

  var MAPS = BUILTIN.maps;
  // tiny pure helpers used by every layer
  function other(p) { return p === 'red' ? 'blue' : 'red'; }
  function cap(p) { return p.charAt(0).toUpperCase() + p.slice(1); }

  /* shared-namespace exports */
  I.RULES_VERSION = RULES_VERSION;
  I.BUILTIN = BUILTIN;
  I.rnd = rnd;
  I.shuffle = shuffle;
  I.UNITS = UNITS;
  I.TRENCH_COUNT = TRENCH_COUNT;
  I.TERRAIN_STOCK = TERRAIN_STOCK;
  I.CARDS = CARDS;
  I.CARD_BY_ID = CARD_BY_ID;
  I.STARTING_CARD = STARTING_CARD;
  I.PIECE_TOTALS = PIECE_TOTALS;
  I.MAPS = MAPS;
  I.MAPSETS = MAPSETS;
  I.activeMapset = activeMapset;
  I.mapPool = mapPool;
  I.other = other;
  I.cap = cap;
})(typeof window !== 'undefined' ? window : globalThis);
