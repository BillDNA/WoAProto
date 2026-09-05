/* War of Attrition — engine part 06: the play-to-end drive loop + map validation.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* The one skirmish drive-loop: decide a turn, play the card, drain the step
     queue. `decide` is the only thing that varies (which AI/plan drives the turn)
     — one implementation per fact. The turn / step caps are load-bearing
     infinite-loop guards, homed in Engine.CONFIG.limits. This composes only play
     primitives (playCard/applyStep), so it ships with the engine; the hand-driven
     UI drives turns directly and does not use it. */
  function playToEnd(st, opts) {
    opts = opts || {};
    var guard = 0;
    while (st.flow.phase !== 'skirmish-over' && guard++ < I.CONFIG.limits.turnCap) {
      var plan = opts.decide(st);
      if (!plan) break;
      I.playCard(st, plan.cardId, plan.mode || 'normal');
      var g2 = 0;
      while (st.flow.phase === 'step' && g2++ < I.CONFIG.limits.stepsPerTurn) {
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
      if (m.shapeDef && I.SHAPES[shape].list.length > I.CONFIG.mapHexCeiling)
        problems.push(m.name + ': ' + I.SHAPES[shape].list.length + ' hexes exceeds the ' + I.CONFIG.mapHexCeiling + '-hex ceiling (laser-cutter max; big empty maps are not fun)');
      I.setBoard(shape);
      try {
        I.buildTerrain(m);
        if (!I.inBoard.apply(null, m.redHQ)) problems.push(m.name + ': red HQ off board');
        if (!I.inBoard.apply(null, m.blueHQ)) problems.push(m.name + ': blue HQ off board');
        if (I.key.apply(null, m.redHQ) === I.key.apply(null, m.blueHQ)) problems.push(m.name + ': HQs overlap');
        // no map may field more pieces of a type+length than the box holds
        var used = {};
        m.pieces.forEach(function (p) {
          var cap = I.stockCap(p.t, p.edges.length);
          if (cap === undefined) {
            problems.push(m.name + ': no physical ' + I.terrainOf(p.t).name + ' piece is ' +
              p.edges.length + ' sides long (the box holds ' + I.PIECE_LENGTHS.join('- and ') + '-side pieces)');
            return;
          }
          var k = p.t + p.edges.length;
          used[k] = (used[k] || 0) + 1;
          if (used[k] > cap)
            problems.push(m.name + ': needs ' + used[k] + ' ' + I.terrainOf(p.t).name +
              ' pieces of length ' + p.edges.length + ', the box holds ' + cap);
        });
      } catch (e) { problems.push(e.message); }
    });
    I.setBoard(prevShape);
    return problems;
  }

  /* shared-namespace exports */
  I.playToEnd = playToEnd;
  I.validateMaps = validateMaps;
})(typeof window !== 'undefined' ? window : globalThis);
