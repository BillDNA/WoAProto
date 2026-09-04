/* War of Attrition — engine part 01: rules version, content assembly, rng, static data.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // The version string keeps playtest data apples-to-apples: it drives the
  // report/version folders, the woa.db row versions, and the persistent-data
  // reset boundary. Bump it whenever byte-identical balance aggregates may
  // legitimately move (a rules or metric change), atomically with the test-pin updates.
  // Must track the rule book header (docs/War Of Attrition rule book.md).
  var RULES_VERSION = '1.2';

  // CORE data (units/shapes/stock/ai) is hand-editable JSON in maps.js, which
  // loads first (browser) / sits next to this file (node).
  var CORE = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('../maps.js') : null);
  if (!CORE || !CORE.shapes || !CORE.units)
    throw new Error('War of Attrition: maps.js missing or malformed (must define WOA_BUILTIN with shapes + units)');

  // CONTENT (the map library + the card battalions) lives in per-item files under
  // content/ — delete a map/battalion by deleting its file. In the browser
  // content/manifest.js document.write()'d them into WOA_CONTENT before this
  // script ran; in node we load them from disk here.
  (function loadContentNode() {
    if (global.WOA_CONTENT) return;                 // browser already populated it
    if (typeof require !== 'function') return;
    global.WOA_CONTENT = { maps: [], cards: [], battalions: [], mapsets: [], units: [], commanders: [] };
    try {
      var fs = require('fs'), path = require('path');
      var kinds = ['cards', 'battalions', 'maps', 'mapsets', 'units', 'commanders'];
      try { kinds = require('../content/kinds.js'); } catch (e2) { /* kinds.js is the source of truth when present */ }
      kinds.forEach(function (kind) {
        var dir = path.join(__dirname, '..', 'content', kind);
        var files;
        try { files = fs.readdirSync(dir); } catch (e3) { return; } // an absent kind dir skips itself, not the rest
        files.filter(function (f) { return /\.js$/.test(f); }).sort().forEach(function (f) {
          require(path.join(dir, f));                // side effect: pushes into WOA_CONTENT
        });
      });
    } catch (e) {
      // don't swallow silently — a bad content file otherwise just vanishes
      // from the library until the generic "no content" throw below
      if (typeof console !== 'undefined') console.error('WoA content load failed: ' + e.message);
    }
  })();
  var CONTENT = global.WOA_CONTENT || { maps: [], cards: [], battalions: [], mapsets: [], units: [], commanders: [] };
  // Shared card pool: content/cards/*.js each push one card def (id -> intrinsics:
  // name, text, steps, opener behaviour, a reserved `faction` stub). A battalion
  // references pool cards by id and carries only the battalion-scoped `count`, so the
  // card def lives once (one implementation per fact), mirroring mapset -> map.
  var CARD_POOL = (CONTENT.cards || []);
  var CARD_POOL_BY_ID = {};
  CARD_POOL.forEach(function (c) { CARD_POOL_BY_ID[c.id] = c; });
  // Hydrate a battalion card entry into the full card the skirmish layer consumes: a
  // {cardId,count} reference is filled from the pool (count is the ONE battalion-scoped
  // field); an already-full card (the localStorage/custom-battalion override and inline
  // test battalions) passes through unchanged, so both authoring paths coexist.
  function hydrateCardRef(ref) {
    if (ref && ref.cardId != null) {
      var def = CARD_POOL_BY_ID[ref.cardId];
      if (!def) throw new Error('War of Attrition: battalion references unknown card "' + ref.cardId + '" (not in content/cards/)');
      var out = {}; for (var k in def) out[k] = def[k];
      out.count = ref.count;
      return out;
    }
    return ref;
  }
  function hydrateBattalionCards(cards) { return (cards || []).map(hydrateCardRef); }
  // the active battalion decides the card list; fall back to the loose pool
  // (belt-and-braces for hand-authored content).
  var ACTIVE_BATTALION = (CONTENT.battalions || []).filter(function (d) { return d && d.active; })[0] ||
    (CONTENT.battalions || [])[0] || null;
  var CARD_LIST = (ACTIVE_BATTALION && ACTIVE_BATTALION.cards && ACTIVE_BATTALION.cards.length) ? hydrateBattalionCards(ACTIVE_BATTALION.cards) : (CONTENT.cards || []);
  // Unit composition & values as a content lever: a units variant in
  // content/units/*.js (exactly one flagged active — the battalion/mapset pattern)
  // fully REPLACES the default unit block, so composition (counts), worth, and
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
    throw new Error('War of Attrition: no content loaded (content/maps/*.js + content/battalions/*.js). Check the content/ dirs and content/manifest.js.');

  // Mapsets: named sets in content/mapsets/*.js, exactly one flagged active —
  // the battalion pattern applied to maps. The active set IS the match/lab pool (one
  // shared mapset across play modes and tools). No sets, or an active set
  // matching nothing, falls back to the full library.
  var MAPSETS = (CONTENT.mapsets || []).slice();
  function activeMapset() {
    return MAPSETS.filter(function (s) { return s && s.active; })[0] || null;
  }
  function activeMaps() {
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
  // Physical-board guardrail: a side always fields exactly CONFIG.pieceTotal pieces
  // (default 7 inf / 2 cav / 1 art). Values are free data; the TOTAL count is the
  // invariant — enforce it at load so a bad units variant fails loud instead of
  // quietly skewing every skirmish.
  var UNIT_COUNT = Object.keys(UNITS).reduce(function (s, t) { return s + (UNITS[t].count || 0); }, 0);
  if (UNIT_COUNT !== I.CONFIG.pieceTotal)
    throw new Error('War of Attrition: unit composition must total ' + I.CONFIG.pieceTotal + ' pieces (got ' + UNIT_COUNT +
      (UNITS_VARIANT ? ' from units variant "' + UNITS_VARIANT.id + '"' : ' in maps.js') + ')');
  var CARDS = BUILTIN.cards;
  if (!UNITS || !CARDS) throw new Error('War of Attrition: maps.js must define units and cards');
  // A card registry is "everything the skirmish needs to know about one battalion's
  // cards": the id->def map + which card opens. Built once for the active battalion
  // (the global default) and once per side when a skirmish seats asymmetric
  // battalions. One builder, so both paths derive it identically.
  function battalionRegistry(cards) {
    var byId = {};
    cards.forEach(function (c) { byId[c.id] = c; });
    var starting = (cards.filter(function (c) { return c.starting; })[0] || cards[0]).id;
    return { cards: cards, byId: byId, starting: starting };
  }
  var DEFAULT_REG = battalionRegistry(CARDS);
  var CARD_BY_ID = DEFAULT_REG.byId;
  var STARTING_CARD = DEFAULT_REG.starting;
  // Per-side battalion binding: turn a battalion SELECTION into a registry.
  // null/undefined -> the active battalion (the symmetric default);
  // a battalion object with .cards; or an id/name string looked up in CONTENT.battalions.
  // Registries are immutable for the process lifetime, so memoize the by-name
  // lookup — a balance run resolves the same two battalions per skirmish (200x for a
  // 100-skirmish sweep) and would otherwise rebuild each byId map every time.
  var REG_CACHE = {};
  function resolveBattalion(sel) {
    if (!sel) return DEFAULT_REG;
    if (typeof sel === 'string') {
      if (REG_CACHE[sel]) return REG_CACHE[sel];
      var found = (CONTENT.battalions || []).filter(function (d) { return d && (d.id === sel || d.name === sel); })[0];
      if (!found) throw new Error('War of Attrition: no battalion "' + sel + '" (known: ' +
        ((CONTENT.battalions || []).map(function (d) { return d.id; }).join(', ') || 'none') + ')');
      if (!found.cards || !found.cards.length) throw new Error('War of Attrition: battalion "' + found.id + '" has no cards');
      return (REG_CACHE[sel] = battalionRegistry(hydrateBattalionCards(found.cards)));
    }
    if (!sel.cards || !sel.cards.length) throw new Error('War of Attrition: battalion "' + (sel.id || sel) + '" has no cards');
    return battalionRegistry(hydrateBattalionCards(sel.cards));
  }
  // Commanders: a content kind (content/commanders/*.js each push one record),
  // resolved per-side by a SELECTION the same way battalions are — mirroring
  // resolveBattalion so a Commander is a content edit, not engine code. A record
  // carries id/name, a reserved story flavor, a traits list (source-agnostic
  // effect primitives), and an inline AI weights override. null/'none' = the
  // baseline (no Commander), so both a plain battle and a per-side pick share one path.
  var COMMANDERS = (CONTENT.commanders || []).slice();
  var COMMANDER_BY_ID = {};
  COMMANDERS.forEach(function (c) { COMMANDER_BY_ID[c.id] = c; });
  function resolveCommander(sel) {
    if (!sel || sel === 'none') return null;
    if (typeof sel === 'string') {
      var found = COMMANDER_BY_ID[sel];
      if (!found) throw new Error('War of Attrition: no Commander "' + sel + '" (known: ' +
        (COMMANDERS.map(function (c) { return c.id; }).join(', ') || 'none') + ')');
      return found;
    }
    return sel; // an inline Commander object (tests / a custom pick)
  }

  // one slot per physical piece on the player mat
  var PIECE_TOTALS = { trench: I.CONFIG.trenchCount };
  Object.keys(UNITS).forEach(function (t) { PIECE_TOTALS[t] = UNITS[t].count || 0; });

  var MAPS = BUILTIN.maps;

  /* ---------- army-points (weights owned by the config home, 00-config.js) ----------
     Points are COMPUTED from a card's steps against I.CONFIG.points — read directly
     from the home at each site. See 00-config.js for the weight table and rationale. */
  function comboWeight(i) { var combo = I.CONFIG.points.combo; return combo[i] != null ? combo[i] : combo[combo.length - 1]; }
  function stepPoints(step) {
    if (!step || !step.type) return 0;
    var pts = I.CONFIG.points;
    var p = pts.step[step.type] || 0;
    p += pts.tier[step.unit] || 0;                     // 0 when the step has no unit
    if (step.mod) p += Math.abs(step.mod) * pts.mod;
    if (step.tieSpare) p += pts.tieSpare;
    if (step.noAdvance) p += pts.noAdvance;
    if (step.anywhere) p += pts.anywhere;
    return p;
  }
  // Each action is priced at its base cost x its position multiplier, so cost
  // escalates with how many actions a card stacks (the yardstick's density penalty).
  function cardPoints(card) {
    var steps = (card && Array.isArray(card.steps)) ? card.steps : [];
    return steps.reduce(function (s, st, i) { return s + stepPoints(st) * comboWeight(i); }, 0);
  }
  function battalionPoints(battalion) {
    var cards = hydrateBattalionCards((battalion && battalion.cards) || []);
    return cards.reduce(function (s, c) { return s + cardPoints(c) * (c.count == null ? 1 : c.count); }, 0);
  }

  // tiny pure helpers used by every layer
  function other(p) { return p === 'red' ? 'blue' : 'red'; }
  function cap(p) { return p.charAt(0).toUpperCase() + p.slice(1); }

  /* shared-namespace exports */
  I.RULES_VERSION = RULES_VERSION;
  I.BUILTIN = BUILTIN;
  // The battalion the ENGINE actually resolved this load (id + name) — the one place
  // to read "which battalion is live", incl. the browser's '__applied' sandbox battalion
  // (index.html pushes it before this file runs). Run-identity stampers
  // (dev/balance.js, the dashboard Run loop) read this instead of re-deriving
  // from content/battalions/'s active flag.
  I.ACTIVE_BATTALION = ACTIVE_BATTALION;
  I.BATTALIONS = CONTENT.battalions || [];
  I.CARD_POOL = CARD_POOL;
  I.hydrateBattalionCards = hydrateBattalionCards;
  I.DEFAULT_REG = DEFAULT_REG;
  I.battalionRegistry = battalionRegistry;
  I.resolveBattalion = resolveBattalion;
  I.COMMANDERS = COMMANDERS;
  I.resolveCommander = resolveCommander;
  I.rnd = rnd;
  I.shuffle = shuffle;
  I.UNITS = UNITS;
  I.CARDS = CARDS;
  I.CARD_BY_ID = CARD_BY_ID;
  I.STARTING_CARD = STARTING_CARD;
  I.PIECE_TOTALS = PIECE_TOTALS;
  I.cardPoints = cardPoints;
  I.battalionPoints = battalionPoints;
  I.MAPS = MAPS;
  I.MAPSETS = MAPSETS;
  I.activeMapset = activeMapset;
  I.activeMaps = activeMaps;
  I.other = other;
  I.cap = cap;
})(typeof window !== 'undefined' ? window : globalThis);
