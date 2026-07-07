/* War of Attrition — ui part: board rendering (hex math, renderBoard,
   highlights, hover attack-math pills). Classic script, no wrapper —
   top-level names attach to window (see ui/app.js header). Extracted
   verbatim from index.html's inline app script. */
'use strict';

/* =================== board rendering =================== */
var S = 44, SQ3 = Math.sqrt(3);
function hexXY(k){
  var qr = E.parseKey(k);
  return [ S*SQ3*(qr[0] + qr[1]/2), S*1.5*qr[1] ];
}
function cornerAngles(d){ // dir -> [a1,a2] degrees (y down)
  var ang = [0,-60,-120,180,120,60][d];
  return [ang-30, ang+30];
}
function cornerPt(cx, cy, angDeg, rad){
  var a = angDeg*Math.PI/180;
  return [cx + rad*Math.cos(a), cy + rad*Math.sin(a)];
}
function hexPoints(cx, cy, rad){
  var pts = [];
  for (var i=0;i<6;i++){
    var a = (60*i - 90)*Math.PI/180;
    pts.push((cx+rad*Math.cos(a)).toFixed(1)+','+(cy+rad*Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}
function svgEl(tag, attrs){
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function viewBoxFor(hexList){
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  hexList.forEach(function(k){
    var xy = hexXY(k);
    minX=Math.min(minX,xy[0]); maxX=Math.max(maxX,xy[0]);
    minY=Math.min(minY,xy[1]); maxY=Math.max(maxY,xy[1]);
  });
  var m = S*1.3;
  return (minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0);
}
function renderBoard(){
  var st = APP.st, svg = $('board');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', viewBoxFor(E.hexes()));
  // bound the parchment sheet by the hex geometry (kills the empty gutters on tall maps)
  var vb = svg.getAttribute('viewBox').split(' ');
  svg.style.setProperty('--board-ar', (parseFloat(vb[2]) / parseFloat(vb[3])).toFixed(4));

  var gHex = svgEl('g',{}), gTer = svgEl('g',{}), gTr = svgEl('g',{}), gPc = svgEl('g',{}), gHl = svgEl('g',{});
  svg.appendChild(gHex); svg.appendChild(gTer); svg.appendChild(gTr); svg.appendChild(gPc); svg.appendChild(gHl);

  E.hexes().forEach(function(k){
    var xy = hexXY(k);
    var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], S-1), 'class':'hex'+(((E.parseKey(k)[0]-E.parseKey(k)[1])%2+2)%2 ? ' dark':'') });
    p.dataset.hex = k;
    gHex.appendChild(p);
    var lbl = svgEl('text', { x: xy[0], y: xy[1]-S*0.58, 'text-anchor':'middle', 'class':'coordlbl' });
    lbl.textContent = E.hexLabel(k);
    gHex.appendChild(lbl);
  });

  // terrain sides (hex-owned: drawn inset inside the owning hex)
  for (var ek in st.terrainEdges){
    var parts = ek.split('>');
    var d = +parts[1];
    var c = hexXY(parts[0]);
    var aa = cornerAngles(d);
    var p1 = cornerPt(c[0], c[1], aa[0], S*0.85), p2 = cornerPt(c[0], c[1], aa[1], S*0.85);
    var t = st.terrainEdges[ek];
    var line = svgEl('line', { x1:p1[0], y1:p1[1], x2:p2[0], y2:p2[1],
      stroke: t==='F' ? 'var(--forest)' : t==='R' ? 'var(--river)' : 'var(--mountain)', 'stroke-width': 8, 'stroke-linecap':'round' });
    line.dataset.edge = ek;
    gTer.appendChild(line);
    // decoration at midpoint
    var mx=(p1[0]+p2[0])/2, my=(p1[1]+p2[1])/2;
    if (t==='R'){
      // a paler current line down the middle of the river
      gTer.appendChild(svgEl('line',{x1:(p1[0]*0.7+mx*0.3), y1:(p1[1]*0.7+my*0.3), x2:(p2[0]*0.7+mx*0.3), y2:(p2[1]*0.7+my*0.3),
        stroke:'#a9c6dd','stroke-width':2.2,'stroke-linecap':'round','stroke-dasharray':'6 5'}));
    } else if (t==='F'){
      gTer.appendChild(svgEl('circle',{cx:mx, cy:my, r:4.4, fill:'#3a6330'}));
      gTer.appendChild(svgEl('circle',{cx:(p1[0]+mx)/2, cy:(p1[1]+my)/2, r:3.4, fill:'#3a6330'}));
      gTer.appendChild(svgEl('circle',{cx:(p2[0]+mx)/2, cy:(p2[1]+my)/2, r:3.4, fill:'#3a6330'}));
    } else {
      var nx = (my- c[1]), ny = -(mx - c[0]); // not used; draw a peak triangle along edge
      var ex = (p2[0]-p1[0]), eyy = (p2[1]-p1[1]);
      var tri = [ [mx-ex*0.14, my-eyy*0.14], [mx+ex*0.14, my+eyy*0.14], [mx-(my-c[1])*0.18, my+(mx-c[0])*0.18] ];
      gTer.appendChild(svgEl('polygon',{points: tri.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' '), fill:'#5d5a52'}));
    }
  }

  // trenches (a hex may hold several)
  for (var th in st.trenches){
    var c2 = hexXY(th);
    st.trenches[th].forEach(function(t){
      t.dirs.forEach(function(d){
        var aa = cornerAngles(d);
        var p1 = cornerPt(c2[0], c2[1], aa[0], S*0.74), p2 = cornerPt(c2[0], c2[1], aa[1], S*0.74);
        gTr.appendChild(svgEl('line',{x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],stroke:'#5a4326','stroke-width':6.5,'stroke-linecap':'round','stroke-dasharray':'7 4'}));
      });
    });
  }

  // HQs
  ['red','blue'].forEach(function(p){
    if (!st.hqAlive[p]) return;
    var xy = hexXY(st.hq[p]);
    var col = p==='red' ? 'var(--red)' : 'var(--blue)';
    gPc.appendChild(svgEl('polygon',{points: hexPoints(xy[0], xy[1], S*0.62), fill:col, stroke:'#2b2113','stroke-width':2, opacity:.92}));
    gPc.appendChild(svgEl('polygon',{points: hexPoints(xy[0], xy[1], S*0.5), fill:'none', stroke:'var(--brass)','stroke-width':1.6}));
    var star = svgEl('text',{x:xy[0], y:xy[1]+7, 'text-anchor':'middle','font-size':20, fill:'#f0e6cc'});
    star.textContent = '★';
    gPc.appendChild(star);
  });

  // units
  for (var uh in st.units){
    var u = st.units[uh];
    var xy = hexXY(uh);
    var col = u.owner==='red' ? 'var(--red)' : 'var(--blue)';
    var colD = u.owner==='red' ? 'var(--red-dark)' : 'var(--blue-dark)';
    var g = svgEl('g',{'class':'unit','data-hex':uh});
    g.appendChild(svgEl('circle',{cx:xy[0], cy:xy[1], r:S*0.5, fill:col, stroke:colD,'stroke-width':2.5}));
    g.appendChild(svgEl('rect',{x:xy[0]-13, y:xy[1]-9, width:26, height:18, fill:'#ece1c4', stroke:colD,'stroke-width':1.4, rx:1.5}));
    if (u.type==='infantry'){
      g.appendChild(svgEl('line',{x1:xy[0]-13,y1:xy[1]-9,x2:xy[0]+13,y2:xy[1]+9,stroke:colD,'stroke-width':2}));
      g.appendChild(svgEl('line',{x1:xy[0]-13,y1:xy[1]+9,x2:xy[0]+13,y2:xy[1]-9,stroke:colD,'stroke-width':2}));
    } else if (u.type==='cavalry'){
      g.appendChild(svgEl('line',{x1:xy[0]-13,y1:xy[1]+9,x2:xy[0]+13,y2:xy[1]-9,stroke:colD,'stroke-width':2}));
    } else {
      g.appendChild(svgEl('circle',{cx:xy[0],cy:xy[1],r:4.5,fill:colD}));
    }
    // hover-preview of this unit's attack math (works when idle in choose-card;
    // during the attack step the highlight layer carries the same hover)
    (function(fromHex){
      g.addEventListener('mouseenter', function(){ showAttackHints(fromHex); });
      g.addEventListener('mouseleave', hideAttackHints);
    })(uh);
    gPc.appendChild(g);
  }

  renderHighlights(gHl);
}

function hl(g, k, cls, handler){
  var xy = hexXY(k);
  var p = svgEl('polygon',{points: hexPoints(xy[0], xy[1], S-3), 'class':'hl '+cls});
  p.addEventListener('click', handler);
  g.appendChild(p);
  return p;
}

/* hover a unit -> preview the attack math on every hex it could hit (V0
   combat-clarity). Uses the engine's computeAttack — the same numbers the
   confirm dialog and resolution use, so they can never disagree. Hover-only,
   so it costs no screen space when unwanted. */
function attackPreviewsFor(st, fromHex){
  var o = st.phase === 'step' ? E.stepOptions(st) : null;
  var list;
  if (o && o.type === 'attack') list = o.attacks.filter(function(a){ return a.from === fromHex; });
  else list = E.listAttacks(st, st.current).filter(function(a){ return a.from === fromHex; })
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
  var st = APP.st;
  if (!st || !inputLive()) return;
  if (st.phase === 'step'){
    var o = E.stepOptions(st);
    if (!o || o.type !== 'attack') return;
  } else if (st.phase !== 'choose-card') return;
  var u = st.units[fromHex];
  if (!u || u.owner !== st.current) return;
  var g = svgEl('g', { 'class': 'atk-hints', 'pointer-events': 'none' });
  attackPreviewsFor(st, fromHex).forEach(function(a){
    var xy = hexXY(a.to), pv = a.preview;
    var txt = pv.attackerPower + ' vs ' + pv.defenderPower;
    var fill = pv.outcome === 'attacker' ? 'rgba(58,99,48,.92)' :
               pv.outcome === 'tie' ? 'rgba(138,108,60,.94)' : 'rgba(111,29,25,.92)';
    var w = txt.length * 6.6 + 12;
    g.appendChild(svgEl('rect', { x: xy[0]-w/2, y: xy[1]+S*0.18, width: w, height: 17, rx: 8.5,
      fill: fill, stroke: '#2b2113', 'stroke-width': 1 }));
    var t = svgEl('text', { x: xy[0], y: xy[1]+S*0.18+12.5, 'text-anchor': 'middle',
      'font-size': 11, 'font-weight': 'bold', fill: '#f0e6cc' });
    t.textContent = txt;
    g.appendChild(t);
  });
  $('board').appendChild(g);
}
function hideAttackHints(){
  document.querySelectorAll('#board .atk-hints').forEach(function(el){ el.remove(); });
}

/* highlights depend on UI stage */
function renderHighlights(g){
  var st = APP.st;
  if (!inputLive() || st.phase !== 'step') return;
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
      // one action (V0 combat-clarity): every legal orientation is a brass
      // corner knob — hovering it previews the two covered edges, one click digs
      hl(g, ui.sel, 'hl-selected', function(){ ui.sel = null; renderAll(); });
      var pairs = E.trenchOrientations(st, ui.sel);
      var c = hexXY(ui.sel);
      pairs.forEach(function(pr){
        var segs = pr.map(function(d){
          var aa = cornerAngles(d);
          var p1 = cornerPt(c[0],c[1],aa[0],S*0.74), p2 = cornerPt(c[0],c[1],aa[1],S*0.74);
          var ln = svgEl('line', {x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],
            stroke:'#5a4326','stroke-width':8,'stroke-linecap':'round',
            'stroke-dasharray':'7 4', opacity:.35, 'pointer-events':'none'});
          g.appendChild(ln);
          return ln;
        });
        // the pair's shared corner (edge d ends where edge d+1 begins)
        var cp = cornerPt(c[0], c[1], cornerAngles(pr[0])[0], S*0.74);
        var knob = svgEl('circle', {cx:cp[0], cy:cp[1], r:8, fill:'var(--brass)',
          stroke:'#5a4326','stroke-width':2.5, 'class':'hl'});
        knob.style.animation = 'pulse 1.1s infinite';
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
        g.appendChild(knob);
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
      var c = hexXY(t.hex);
      t.dirs.forEach(function(d){
        var aa = cornerAngles(d);
        var p1 = cornerPt(c[0],c[1],aa[0],S*0.74), p2 = cornerPt(c[0],c[1],aa[1],S*0.74);
        var seg = svgEl('line',{x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],stroke:'#c0392b','stroke-width':11,'stroke-linecap':'round',opacity:.55,'class':'hl'});
        seg.addEventListener('mouseenter', function(){ seg.setAttribute('opacity','.9'); });
        seg.addEventListener('mouseleave', function(){ seg.setAttribute('opacity','.55'); });
        seg.addEventListener('click', function(){ act({trenchHex:t.hex, trenchIdx:t.idx}); });
        g.appendChild(seg);
      });
    });
    o.forestPieces.forEach(function(pc){
      pc.edgeKeys.forEach(function(ek){
        var parts = ek.split('>');
        var d = +parts[1];
        var c = hexXY(parts[0]);
        var aa = cornerAngles(d);
        var p1 = cornerPt(c[0],c[1],aa[0],S*0.85), p2 = cornerPt(c[0],c[1],aa[1],S*0.85);
        var line = svgEl('line',{x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],stroke:'#c0392b','stroke-width':12,'stroke-linecap':'round',opacity:.55,'class':'hl'});
        line.addEventListener('mouseenter', function(){ line.setAttribute('opacity','.9'); });
        line.addEventListener('mouseleave', function(){ line.setAttribute('opacity','.55'); });
        line.addEventListener('click', function(){ act({pieceId: pc.id}); });
        g.appendChild(line);
      });
    });
  }
}
