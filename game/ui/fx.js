/* War of Attrition — ui part: board effects (pure flourish, no rules).
   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). Extracted verbatim from index.html's inline app script. */
'use strict';

/* =================== board effects (pure flourish, no rules) =================== */
function unitEl(hex){ return document.querySelector('#board g.unit[data-hex="'+hex+'"]'); }
function slideUnit(fromHex, toHex){
  var el = unitEl(toHex);
  if (!el) return;
  var a = hexXY(fromHex), b = hexXY(toHex);
  el.style.transition = 'none';
  el.style.transform = 'translate('+(a[0]-b[0])+'px,'+(a[1]-b[1])+'px)';
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    el.style.transition = 'transform .3s ease';
    el.style.transform = 'translate(0,0)';
  }); });
}
function popUnit(hex){
  var el = unitEl(hex);
  if (el) el.classList.add('fx-pop');
}
function ghostUnit(hex, unit){
  var svg = $('board');
  if (!svg.firstChild || !unit) return;
  var xy = hexXY(hex);
  var col = unit.owner==='red' ? 'var(--red)' : 'var(--blue)';
  var colD = unit.owner==='red' ? 'var(--red-dark)' : 'var(--blue-dark)';
  var g = svgEl('g',{'class':'fx-ghost'});
  g.appendChild(svgEl('circle',{cx:xy[0], cy:xy[1], r:S*0.5, fill:col, stroke:colD, 'stroke-width':2.5}));
  svg.appendChild(g);
  setTimeout(function(){ if (g.parentNode) g.parentNode.removeChild(g); }, 750);
}
function ringAt(hex, color){
  var svg = $('board');
  if (!hex || !svg.firstChild) return;
  var xy = hexXY(hex);
  var c = svgEl('circle',{cx:xy[0], cy:xy[1], r:S*0.8, fill:'none', stroke:color, 'stroke-width':5, 'class':'fx-ring'});
  svg.appendChild(c);
  setTimeout(function(){ if (c.parentNode) c.parentNode.removeChild(c); }, 600);
}
function fxStrike(fromHex, toHex, viaHex, color){
  var svg = $('board');
  if (!svg.firstChild) return;
  var pts = [hexXY(fromHex)];
  if (viaHex) pts.push(hexXY(viaHex));
  pts.push(hexXY(toHex));
  var g = svgEl('g', {'class':'fx-strike', 'pointer-events':'none'});
  g.appendChild(svgEl('polyline', { points: pts.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '),
    fill:'none', stroke:color, 'stroke-width':6, 'stroke-linecap':'round', 'stroke-linejoin':'round',
    'stroke-dasharray':'13 8', opacity:.9 }));
  // arrowhead just short of the target's centre
  var a = pts[pts.length-2], b = pts[pts.length-1];
  var ang = Math.atan2(b[1]-a[1], b[0]-a[0]);
  var tip = [b[0]-Math.cos(ang)*S*0.42, b[1]-Math.sin(ang)*S*0.42];
  var l = 14, wdt = 8;
  var p1 = [tip[0]-Math.cos(ang)*l+Math.sin(ang)*wdt, tip[1]-Math.sin(ang)*l-Math.cos(ang)*wdt];
  var p2 = [tip[0]-Math.cos(ang)*l-Math.sin(ang)*wdt, tip[1]-Math.sin(ang)*l+Math.cos(ang)*wdt];
  g.appendChild(svgEl('polygon', { points: [tip, p1, p2].map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '),
    fill: color, stroke:'#2b2113', 'stroke-width':1 }));
  svg.appendChild(g);
  setTimeout(function(){ if (g.parentNode) g.parentNode.removeChild(g); }, 900);
}
function shakeBoard(){
  var w = $('boardwrap');
  w.classList.remove('fx-shake');
  void w.offsetWidth;
  w.classList.add('fx-shake');
}
// snapshot what is about to happen so we can animate the aftermath
function capturePre(st, choice){
  if (!choice || choice.skip || st.phase!=='step') return null;
  var o = E.stepOptions(st);
  if (!o) return null;
  var pre = { type:o.type, choice:choice };
  if (o.type==='attack' && choice.to){
    pre.attacker = st.units[choice.from];
    pre.defender = st.units[choice.to] || null;
    pre.defenderHQ = E.isHQ(st, choice.to);
    // who actually contributes (engine truth incl. trench/river blocking) —
    // captured BEFORE resolution so the FX can point at them afterwards
    if (pre.attacker){
      pre.supporters = E.supportFor(st, pre.attacker.owner, choice.to, choice.from, true).hexes;
      pre.defSupporters = E.supportFor(st, E.other(pre.attacker.owner), choice.to, null, false).hexes;
    }
  }
  return pre;
}
function playFX(pre){
  if (!pre) return;
  var st = APP.st, c = pre.choice;
  if (pre.type==='deploy' && c.hex){ popUnit(c.hex); }
  else if (pre.type==='trench' && c.hex){ ringAt(c.hex, '#5a4326'); }
  else if (pre.type==='barrage'){ ringAt(c.trenchHex || fxPieceHex(c.pieceId), '#c0392b'); }
  else if (pre.type==='reposition'){
    if (c.swap){ slideUnit(c.b, c.a); slideUnit(c.a, c.b); }
    else slideUnit(c.from, c.to);
  }
  else if (pre.type==='attack' && c.to){
    // where the blow comes from — a strike line (bending through the HQ on a
    // via-attack) plus a ring on every unit whose support actually counted
    if (pre.attacker){
      fxStrike(c.from, c.to, c.via, pre.attacker.owner==='red' ? 'var(--red)' : 'var(--blue)');
      (pre.supporters || []).forEach(function(h){ ringAt(h, '#d4af37'); });
      (pre.defSupporters || []).forEach(function(h){ ringAt(h, '#8ea8be'); });
    }
    ringAt(c.to, '#c0392b');
    var now = st.units[c.to];
    var advanced = now && pre.attacker && now.owner===pre.attacker.owner && !st.units[c.from];
    if (advanced) slideUnit(c.from, c.to);
    if (pre.defender && (!now || advanced)) ghostUnit(c.to, pre.defender);            // defender fell
    if (pre.attacker && !st.units[c.from] && !advanced) ghostUnit(c.from, pre.attacker); // attacker fell
    if (pre.defenderHQ && !E.isHQ(st, c.to)) shakeBoard();                            // HQ captured!
  }
}
function fxPieceHex(pieceId){
  var pc = (APP.st.terrainPieces||[]).filter(function(x){ return x.id===pieceId; })[0];
  return pc ? pc.edgeKeys[0].split('>')[0] : null;
}
