/* War of Attrition — ui part: game-board rendering. Orchestration only —
   every mark is drawn by a bp* primitive from ui/board-primitives.js (svgEl and
   the BOARD palette live there; where a hex sits is ui/board/hex/hex-screen.js, the
   hex house's screen dialect); this file decides WHAT to draw and wires
   the interaction (clicks, the attack-math hover), never the raw SVG. Classic
   script, no wrapper — top-level names attach to window (see ui/app.js header). */
'use strict';

/* =================== board rendering =================== */
function renderBoard(){
  var st = APP.st, v = E.view(st), svg = $('board');
  var L = bpBeginBoard(svg);

  E.hexes().forEach(function(k){ bpHexTile(L.hex, k); });

  // terrain sides (hex-owned: drawn inset inside the owning hex)
  for (var ek in v.terrainEdges) bpTerrainEdge(L.ter, ek, v.terrainEdges[ek]);

  // trenches (a hex may hold several)
  for (var th in v.trenches){
    v.trenches[th].forEach(function(t){
      t.dirs.forEach(function(d){ bpTrenchLine(L.tr, th, d); });
    });
  }

  // HQs
  ['red','blue'].forEach(function(p){
    if (v.hqAlive(p)) bpHQ(L.pc, v.hq(p), p);
  });

  // units — the primitive draws the token, this file wires the attack-math
  // hover (works when idle in choose-card; during the attack step the highlight
  // layer carries the same hover)
  for (var uh in v.units){
    var g = bpUnit(L.pc, uh, v.units[uh]);
    (function(fromHex){
      g.addEventListener('mouseenter', function(){ showAttackHints(fromHex); });
      g.addEventListener('mouseleave', hideAttackHints);
    })(uh);
  }

  renderHighlights(L.hl);
}

function hl(g, k, cls, handler){
  var p = bpHighlight(g, k, cls);
  p.addEventListener('click', handler);
  return p;
}

/* hover a unit -> preview the attack math on every hex it could hit.
   Uses the engine's computeAttack — the same numbers the
   confirm dialog and resolution use, so they can never disagree. Hover-only,
   so it costs no screen space when unwanted. */
function attackPreviewsFor(st, fromHex){
  var v = E.view(st);
  var o = v.phase === 'step' ? E.stepOptions(st) : null;
  var list;
  if (o && o.type === 'attack') list = o.attacks.filter(function(a){ return a.from === fromHex; });
  else list = E.listAttacks(st, v.current).filter(function(a){ return a.from === fromHex; })
    .map(function(a){ return Object.assign({}, a, { preview: E.computeAttack(st, a) }); });
  var best = {};
  list.forEach(function(a){
    var diff = a.preview.attackerPower - a.preview.defenderPower;
    if (!(a.to in best) || diff > best[a.to].diff) best[a.to] = { a: a, diff: diff };
  });
  return Object.keys(best).map(function(to){ return best[to].a; });
}
function showAttackHints(fromHex){
  hideAttackHints();
  var st = APP.st, v = E.view(st);
  if (!st || !inputLive()) return;
  if (v.phase === 'step'){
    var o = E.stepOptions(st);
    if (!o || o.type !== 'attack') return;
  } else if (v.phase !== 'choose-card') return;
  var u = v.units[fromHex];
  if (!u || u.owner !== v.current) return;
  var g = bpAttackLayer();
  attackPreviewsFor(st, fromHex).forEach(function(a){
    var pv = a.preview;
    bpAttackPill(g, a.to, pv.attackerPower + ' vs ' + pv.defenderPower, pv.outcome);
  });
  $('board').appendChild(g);
}
function hideAttackHints(){
  document.querySelectorAll('#board .atk-hints').forEach(function(el){ el.remove(); });
}

/* highlights depend on UI stage */
function renderHighlights(g){
  var st = APP.st, v = E.view(st);
  if (!inputLive() || v.phase !== 'step') return;
  var o = E.stepOptions(st);
  if (!o) return;
  var ui = APP.ui;

  if (o.type==='deploy'){
    o.targets.forEach(function(h){ hl(g, h, 'hl-target', function(){ act({hex:h}); }); });
  }
  else if (o.type==='trench'){
    if (!ui.sel){
      o.targets.forEach(function(h){ hl(g, h, 'hl-target', function(){ ui.sel = h; renderAll(); }); });
    } else {
      // one action: every legal orientation is a brass
      // corner knob — hovering it previews the two covered edges, one click digs
      hl(g, ui.sel, 'hl-selected', function(){ ui.sel = null; renderAll(); });
      var pairs = E.trenchOrientations(st, ui.sel);
      pairs.forEach(function(pr){
        var segs = pr.map(function(d){ return bpTrenchGhost(g, ui.sel, d); });
        var knob = bpTrenchKnob(g, ui.sel, pr[0]);
        knob.classList.add('pulse'); // duration reads the --dur-pulse token
        knob.addEventListener('mouseenter', function(){
          segs.forEach(function(s2){ s2.setAttribute('opacity','1'); s2.removeAttribute('stroke-dasharray'); });
        });
        knob.addEventListener('mouseleave', function(){
          segs.forEach(function(s2){ s2.setAttribute('opacity','.35'); s2.setAttribute('stroke-dasharray','7 4'); });
        });
        knob.addEventListener('click', function(){
          var hx = ui.sel;
          ui.sel = null;
          act({hex:hx, dirs:pr.slice()});
        });
      });
    }
  }
  else if (o.type==='attack'){
    var froms = {};
    o.attacks.forEach(function(a){ froms[a.from] = true; });
    var hoverable = function(p, h){
      p.addEventListener('mouseenter', function(){ showAttackHints(h); });
      p.addEventListener('mouseleave', hideAttackHints);
    };
    if (!ui.sel){
      Object.keys(froms).forEach(function(h){ hoverable(hl(g, h, 'hl-from', function(){ ui.sel = h; renderAll(); }), h); });
    } else {
      showAttackHints(ui.sel);
      hl(g, ui.sel, 'hl-selected', function(){ ui.sel = null; renderAll(); });
      // group attacks from selected hex by target; if multiple routes, keep the strongest
      var best = {};
      o.attacks.filter(function(a){ return a.from===ui.sel; }).forEach(function(a){
        var diff = a.preview.attackerPower - a.preview.defenderPower;
        if (!(a.to in best) || diff > best[a.to].diff) best[a.to] = {a:a, diff:diff};
      });
      Object.keys(best).forEach(function(to){
        hl(g, to, 'hl-attack', function(){ confirmAttack(best[to].a); });
      });
      Object.keys(froms).filter(function(h){return h!==ui.sel;}).forEach(function(h){
        hl(g, h, 'hl-from', function(){ ui.sel = h; renderAll(); });
      });
    }
  }
  else if (o.type==='reposition'){
    var units = {};
    o.moves.forEach(function(m){ units[m.from]=true; });
    o.swaps.forEach(function(s){ units[s.a]=true; units[s.b]=true; });
    if (!ui.sel){
      Object.keys(units).forEach(function(h){ hl(g, h, 'hl-from', function(){ ui.sel=h; renderAll(); }); });
    } else {
      hl(g, ui.sel, 'hl-selected', function(){ ui.sel=null; renderAll(); });
      var seen = {};
      o.moves.filter(function(m){return m.from===ui.sel;}).forEach(function(m){
        if (seen[m.to]) return; seen[m.to]=true;
        hl(g, m.to, 'hl-target', function(){ var f=ui.sel; ui.sel=null; act({from:f, to:m.to}); });
      });
      o.swaps.forEach(function(s){
        var partner = s.a===ui.sel ? s.b : (s.b===ui.sel ? s.a : null);
        if (!partner || seen[partner]) return; seen[partner]=true;
        hl(g, partner, 'hl-swap', function(){ var f=ui.sel; ui.sel=null; act({swap:true, a:f, b:partner}); });
      });
      Object.keys(units).filter(function(h){return h!==ui.sel;}).forEach(function(h){
        if (!seen[h]) hl(g, h, 'hl-from', function(){ ui.sel=h; renderAll(); });
      });
    }
  }
  else if (o.type==='barrage'){
    o.trenches.forEach(function(t){
      t.dirs.forEach(function(d){
        var seg = bpBarrageTerrain(g, t.hex, d, 'T');
        seg.addEventListener('mouseenter', function(){ seg.setAttribute('opacity','.9'); });
        seg.addEventListener('mouseleave', function(){ seg.setAttribute('opacity','.55'); });
        seg.addEventListener('click', function(){ act({trenchHex:t.hex, trenchIdx:t.idx}); });
      });
    });
    o.terrainTargets.forEach(function(pc){
      pc.edgeKeys.forEach(function(ek){
        var parts = E.parseSideKey(ek);
        var line = bpBarrageTerrain(g, parts[0], parts[1], pc.t);
        line.addEventListener('mouseenter', function(){ line.setAttribute('opacity','.9'); });
        line.addEventListener('mouseleave', function(){ line.setAttribute('opacity','.55'); });
        line.addEventListener('click', function(){ act({pieceId: pc.id}); });
      });
    });
  }
}
