/* War of Attrition — engine part 06: the play-to-end drive loop + map validation.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* The one skirmish drive-loop: decide a turn, play the card, drain the step
     queue. `decide` is the only thing that varies (which AI/plan drives the turn)
     — one implementation per fact. The 400-turn / 12-step caps are load-bearing
     infinite-loop guards. This composes only play primitives (playCard/applyStep),
     so it ships with the engine; the hand-driven UI drives turns directly and does
     not use it. */
  function playToEnd(st, opts) {
    opts = opts || {};
    var guard = 0;
    while (st.phase !== 'skirmish-over' && guard++ < 400) {
      var plan = opts.decide(st);
      if (!plan) break;
      I.playCard(st, plan.cardId, plan.mode || 'normal');
      var g2 = 0;
      while (st.phase === 'step' && g2++ < 12) {
        var c = plan.choices.shift() || { skip: true };
        try { I.applyStep(st, c); }
        catch (e) { try { I.applyStep(st, { skip: true }); } catch (e2) { break; } }
      }
    }
    return st;
  }

  /* ---------- map validation (content integrity, for the editor + tests) ---------- */
  function validateMaps(list) {
    var problems = [];
    var prevShape = I.currentShape();
    (list || I.MAPS).forEach(function (m) {
      var shape;
      try { shape = I.ensureMapShape(m); }
      catch (e) { problems.push(m.name + ': ' + e.message); return; }
      if (!I.SHAPES[shape]) { problems.push(m.name + ': unknown board shape "' + shape + '"'); return; }
      if (m.shapeDef && I.SHAPES[shape].list.length > 24)
        problems.push(m.name + ': ' + I.SHAPES[shape].list.length + ' hexes exceeds the 24-hex ceiling (laser-cutter max; big empty maps are not fun)');
      I.setBoard(shape);
      try {
        I.buildTerrain(m);
        if (!I.inBoard.apply(null, m.redHQ)) problems.push(m.name + ': red HQ off board');
        if (!I.inBoard.apply(null, m.blueHQ)) problems.push(m.name + ': blue HQ off board');
        if (I.key.apply(null, m.redHQ) === I.key.apply(null, m.blueHQ)) problems.push(m.name + ': HQs overlap');
        var stock = {};
        Object.keys(I.TERRAIN_STOCK).forEach(function (k) { stock[k] = 0; });
        m.pieces.forEach(function (p) {
          var sk = p.t + p.edges.length;
          if (stock[sk] === undefined) problems.push(m.name + ': piece of length ' + p.edges.length + ' has no physical counterpart (stock: ' + Object.keys(I.TERRAIN_STOCK).join(',') + ')');
          else stock[sk]++;
        });
        var over = Object.keys(I.TERRAIN_STOCK).filter(function (k) { return stock[k] > I.TERRAIN_STOCK[k]; });
        if (over.length) problems.push(m.name + ': exceeds terrain stock ' + JSON.stringify(stock));
      } catch (e) { problems.push(e.message); }
    });
    I.setBoard(prevShape);
    return problems;
  }

  /* shared-namespace exports */
  I.playToEnd = playToEnd;
  I.validateMaps = validateMaps;
})(typeof window !== 'undefined' ? window : globalThis);
