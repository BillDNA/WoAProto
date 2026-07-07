/* War of Attrition — ui part: Field Manual + its diagram player (V1
   field-manual animations, specs/V1-specs/v1-field-manual-animations.md).

   The player shows three worked examples — Support, Ties, Trench vs River —
   as step-through beats (Prev/Next, arrow keys) over a mini hex board that
   reuses the live board's visual vocabulary: gold rings = attacker support
   that counted, steel rings = defender support, grey dashed ring = support
   denied, strike arrow, A-vs-D pill.

   THE RULE THAT MATTERS: every number, ring and outcome shown is read from
   the REAL engine at render time — E.supportFor / E.computeAttack for the
   tallies and rings, E.applyStep (the real resolution path) for the
   aftermath frames. Nothing is hardcoded, so a rules change flows into the
   manual automatically. Authoring guide for future examples:
   dynamic-scrum/docs/human-instructions/manual-animations-authoring.md.

   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). All page wiring (buttons, keys, ?screen=manual) lives
   in ui/boot.js; this file only declares. */
'use strict';

/* ============ mini-board geometry (board.js vocabulary at MP_S scale) ============
   The live board.js is welded to #board / APP.st / S=44, so the manual keeps
   its own tiny renderer — but it reuses board.js's pure helpers (svgEl,
   hexPoints, cornerPt, cornerAngles) and the same CSS classes/vars, so the
   two boards look like the same physical thing. */
var MP_S = 34; // mini hex radius (live board: S = 44)

function mpXY(k){
  var qr = E.parseKey(k);
  return [ MP_S*SQ3*(qr[0] + qr[1]/2), MP_S*1.5*qr[1] ];
}
function mpViewBox(hexList){
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  hexList.forEach(function(k){
    var xy = mpXY(k);
    minX=Math.min(minX,xy[0]); maxX=Math.max(maxX,xy[0]);
    minY=Math.min(minY,xy[1]); maxY=Math.max(maxY,xy[1]);
  });
  var m = MP_S*1.3;
  return (minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0);
}

/* ============ fixture states (real engine states, tiny inline maps) ============ */
// One 9-hex outline shared by every example: labels A1-A3 / B1-B3 / C1-C3.
var MP_HEXES = [[0,-1],[1,-1],[2,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]];

function mpDef(id, redHQ, blueHQ, pieces){
  return { name: 'Manual — '+id, id: 'manual-'+id, custom: true,
    shapeDef: { label: 'Manual diagram', hexes: MP_HEXES },
    redHQ: redHQ, blueHQ: blueHQ, pieces: pieces || [] };
}
// A REAL battle state (deck, HQs, turn flow all live), then the fixture's
// pieces are placed directly. units: { 'q,r': ['infantry','red'], ... }.
// NOTE: E.newBattle switches the engine's global board to this map's shape —
// renderManual() saves and restores the live shape around every render.
function mpState(def, units, trenches){
  var match = E.newMatch({ maps: [def], seed: 7, firstPlayer: 'red' });
  var st = E.newBattle(match);
  st.__sim = true; // a diagram, not a real battle — never fire onBattleEnd hooks
  st.units = {};
  Object.keys(units).forEach(function(h){ st.units[h] = { type: units[h][0], owner: units[h][1] }; });
  st.trenches = trenches || {};
  return st;
}
// Resolve an attack through the REAL rules path (legality check + resolveAttack
// + tie/HQ/advance handling), by handing applyStep a synthesized attack step.
function mpResolve(st, atk){
  st.pending = { cardId: st.hands[st.current][0] || 'manual', mode: 'attack',
    steps: [{ type:'attack', mod: atk.mod||0, tieSpare: !!atk.tieSpare, noAdvance: !!atk.noAdvance }],
    idx: 0, acted: 0, logIdx: -1 };
  st.phase = 'step';
  E.applyStep(st, { from: atk.from, to: atk.to, via: atk.via || null });
  return st;
}
// What actually happened, read from the pre/post states (same derivation the
// live playFX uses) — never re-derived from rules text.
function mpAftermath(pre, post, atk){
  var att = pre.units[atk.from], def = pre.units[atk.to];
  var defHQ = null;
  ['red','blue'].forEach(function(p){ if (pre.hqAlive[p] && pre.hq[p] === atk.to) defHQ = p; });
  var now = post.units[atk.to];
  var advanced = !!(now && att && now.owner === att.owner && !post.units[atk.from]);
  return {
    advanced: advanced,
    attackerFell: !!(att && !post.units[atk.from] && !advanced),
    defenderFell: !!(def && (!now || advanced)),
    hqFell: !!(defHQ && !post.hqAlive[defHQ]),
    hqSide: defHQ,
    winner: post.battleWinner || null
  };
}
// support given by the piece on hex h (engine data, used for running tallies)
function mpSupAmount(st, h){ return E.isHQ(st, h) ? 1 : E.UNITS[st.units[h].type].sup; }
function mpSum(st, hexes){ var t=0; hexes.forEach(function(h){ t += mpSupAmount(st,h); }); return t; }

/* ============ frame drawing ============ */
// f = { st, strike:{from,to,via,color}, rings:[{hex,cls:'gold'|'steel'|'deny'}],
//       glowSides:[sideKey], glowTrench:{hex,dirs}, ghosts:[{hex,unit}],
//       badges:[hex], hqGhost:hex, pill:{at,text,tone} }
function mpDrawFrame(f){
  var st = f.st, svg = $('mpBoard');
  svg.innerHTML = '';
  var list = E.SHAPES[st.boardShape].list;
  svg.setAttribute('viewBox', mpViewBox(list));

  // hexes + grid labels (same classes as the live board)
  list.forEach(function(k){
    var xy = mpXY(k), p = E.parseKey(k);
    svg.appendChild(svgEl('polygon', { points: hexPoints(xy[0], xy[1], MP_S-1),
      'class': 'hex'+(((p[0]-p[1])%2+2)%2 ? ' dark' : '') }));
    var lbl = svgEl('text', { x: xy[0], y: xy[1]-MP_S*0.58, 'text-anchor':'middle', 'class':'coordlbl' });
    lbl.textContent = E.hexLabel(k);
    svg.appendChild(lbl);
  });

  // attention halos go UNDER the terrain/trench lines they highlight
  (f.glowSides||[]).forEach(function(sk){
    var parts = sk.split('>'), c = mpXY(parts[0]), aa = cornerAngles(+parts[1]);
    var p1 = cornerPt(c[0],c[1],aa[0],MP_S*0.85), p2 = cornerPt(c[0],c[1],aa[1],MP_S*0.85);
    svg.appendChild(svgEl('line', { x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],
      stroke:'#e8c252','stroke-width':11,'stroke-linecap':'round','class':'medge-glow' }));
  });
  if (f.glowTrench){
    var gc = mpXY(f.glowTrench.hex);
    f.glowTrench.dirs.forEach(function(d){
      var aa = cornerAngles(d);
      var p1 = cornerPt(gc[0],gc[1],aa[0],MP_S*0.74), p2 = cornerPt(gc[0],gc[1],aa[1],MP_S*0.74);
      svg.appendChild(svgEl('line', { x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],
        stroke:'#e8c252','stroke-width':10,'stroke-linecap':'round','class':'medge-glow' }));
    });
  }

  // terrain sides (hex-owned, inset — the live board's drawing at MP_S scale)
  for (var ek in st.terrainEdges){
    var parts = ek.split('>'), d = +parts[1], c = mpXY(parts[0]);
    var aa = cornerAngles(d);
    var p1 = cornerPt(c[0],c[1],aa[0],MP_S*0.85), p2 = cornerPt(c[0],c[1],aa[1],MP_S*0.85);
    var t = st.terrainEdges[ek];
    svg.appendChild(svgEl('line', { x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],
      stroke: t==='F' ? 'var(--forest)' : t==='R' ? 'var(--river)' : 'var(--mountain)',
      'stroke-width': 6, 'stroke-linecap':'round' }));
    var mx=(p1[0]+p2[0])/2, my=(p1[1]+p2[1])/2;
    if (t==='R'){
      svg.appendChild(svgEl('line',{x1:(p1[0]*0.7+mx*0.3), y1:(p1[1]*0.7+my*0.3), x2:(p2[0]*0.7+mx*0.3), y2:(p2[1]*0.7+my*0.3),
        stroke:'#a9c6dd','stroke-width':1.8,'stroke-linecap':'round','stroke-dasharray':'5 4'}));
    } else if (t==='F'){
      svg.appendChild(svgEl('circle',{cx:mx, cy:my, r:3.4, fill:'#3a6330'}));
      svg.appendChild(svgEl('circle',{cx:(p1[0]+mx)/2, cy:(p1[1]+my)/2, r:2.6, fill:'#3a6330'}));
      svg.appendChild(svgEl('circle',{cx:(p2[0]+mx)/2, cy:(p2[1]+my)/2, r:2.6, fill:'#3a6330'}));
    } else {
      var ex = (p2[0]-p1[0]), eyy = (p2[1]-p1[1]);
      var tri = [ [mx-ex*0.14, my-eyy*0.14], [mx+ex*0.14, my+eyy*0.14], [mx-(my-c[1])*0.18, my+(mx-c[0])*0.18] ];
      svg.appendChild(svgEl('polygon',{points: tri.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' '), fill:'#5d5a52'}));
    }
  }

  // trenches
  for (var th in st.trenches){
    var tc = mpXY(th);
    st.trenches[th].forEach(function(tr){
      tr.dirs.forEach(function(d2){
        var aa2 = cornerAngles(d2);
        var q1 = cornerPt(tc[0],tc[1],aa2[0],MP_S*0.74), q2 = cornerPt(tc[0],tc[1],aa2[1],MP_S*0.74);
        svg.appendChild(svgEl('line',{x1:q1[0],y1:q1[1],x2:q2[0],y2:q2[1],
          stroke:'#5a4326','stroke-width':5,'stroke-linecap':'round','stroke-dasharray':'5.5 3'}));
      });
    });
  }

  // HQs (plus the fallen-HQ ghost)
  ['red','blue'].forEach(function(p){
    if (st.hqAlive[p]) mpDrawHQ(svg, st.hq[p], p, false);
  });
  if (f.hqGhost && f.hqGhost.hex) mpDrawHQ(svg, f.hqGhost.hex, f.hqGhost.side, true);

  // units, then the fallen (ghosts render where a hex ended up empty)
  for (var uh in st.units) mpDrawUnit(svg, uh, st.units[uh], false);
  (f.ghosts||[]).forEach(function(g){ mpDrawUnit(svg, g.hex, g.unit, true); });

  // support rings — the live FX colors: gold attacker / steel defender / grey denied
  (f.rings||[]).forEach(function(r){
    var xy = mpXY(r.hex);
    svg.appendChild(svgEl('circle',{cx:xy[0], cy:xy[1], r:MP_S*0.82, 'class':'mring '+r.cls}));
  });

  // strike arrow (the live fxStrike, persistent, bending through a via-HQ)
  if (f.strike) mpDrawStrike(svg, f.strike);

  // "unit fell here but the hex is re-occupied" badge (advance-into-kill)
  (f.badges||[]).forEach(function(h){
    var xy = mpXY(h);
    svg.appendChild(svgEl('circle',{cx:xy[0]+MP_S*0.55, cy:xy[1]-MP_S*0.6, r:7.5, fill:'#6f1d19', stroke:'#2b2113','stroke-width':1}));
    var x = svgEl('text',{x:xy[0]+MP_S*0.55, y:xy[1]-MP_S*0.6+3.5,'text-anchor':'middle','font-size':10,'font-weight':'bold',fill:'#f0e6cc'});
    x.textContent = '✕';
    svg.appendChild(x);
  });

  // the A-vs-D pill (same maths pills the live board hovers)
  if (f.pill){
    var pxy = mpXY(f.pill.at);
    var fill = f.pill.tone==='attacker' ? 'rgba(58,99,48,.92)' :
               f.pill.tone==='tie' ? 'rgba(138,108,60,.94)' :
               f.pill.tone==='defender' ? 'rgba(111,29,25,.92)' : 'rgba(74,61,38,.92)';
    var w = f.pill.text.length*6.4 + 14;
    svg.appendChild(svgEl('rect',{x:pxy[0]-w/2, y:pxy[1]+MP_S*0.52, width:w, height:16, rx:8,
      fill:fill, stroke:'#2b2113','stroke-width':1, 'class':'mpill'}));
    var pt = svgEl('text',{x:pxy[0], y:pxy[1]+MP_S*0.52+11.5, 'text-anchor':'middle',
      'font-size':10.5, 'font-weight':'bold', fill:'#f0e6cc', 'class':'mpill-t'});
    pt.textContent = f.pill.text;
    svg.appendChild(pt);
  }
}
function mpDrawUnit(svg, hex, u, ghost){
  var xy = mpXY(hex);
  var col = u.owner==='red' ? 'var(--red)' : 'var(--blue)';
  var colD = u.owner==='red' ? 'var(--red-dark)' : 'var(--blue-dark)';
  var g = svgEl('g', ghost ? {'class':'mghost'} : {});
  g.appendChild(svgEl('circle',{cx:xy[0], cy:xy[1], r:MP_S*0.5, fill:col, stroke:colD,'stroke-width':2}));
  g.appendChild(svgEl('rect',{x:xy[0]-10, y:xy[1]-7, width:20, height:14, fill:'#ece1c4', stroke:colD,'stroke-width':1.2, rx:1.5}));
  if (u.type==='infantry'){
    g.appendChild(svgEl('line',{x1:xy[0]-10,y1:xy[1]-7,x2:xy[0]+10,y2:xy[1]+7,stroke:colD,'stroke-width':1.7}));
    g.appendChild(svgEl('line',{x1:xy[0]-10,y1:xy[1]+7,x2:xy[0]+10,y2:xy[1]-7,stroke:colD,'stroke-width':1.7}));
  } else if (u.type==='cavalry'){
    g.appendChild(svgEl('line',{x1:xy[0]-10,y1:xy[1]+7,x2:xy[0]+10,y2:xy[1]-7,stroke:colD,'stroke-width':1.7}));
  } else {
    g.appendChild(svgEl('circle',{cx:xy[0],cy:xy[1],r:3.6,fill:colD}));
  }
  if (ghost){ // fallen: the ✕ over the counter
    g.appendChild(svgEl('line',{x1:xy[0]-12,y1:xy[1]-12,x2:xy[0]+12,y2:xy[1]+12,stroke:'#2b2113','stroke-width':2.5}));
    g.appendChild(svgEl('line',{x1:xy[0]-12,y1:xy[1]+12,x2:xy[0]+12,y2:xy[1]-12,stroke:'#2b2113','stroke-width':2.5}));
  }
  svg.appendChild(g);
}
function mpDrawHQ(svg, hex, p, ghost){
  var xy = mpXY(hex);
  var col = p==='red' ? 'var(--red)' : 'var(--blue)';
  var g = svgEl('g', ghost ? {'class':'mghost'} : {});
  g.appendChild(svgEl('polygon',{points: hexPoints(xy[0], xy[1], MP_S*0.62), fill:col, stroke:'#2b2113','stroke-width':1.6, opacity:.92}));
  g.appendChild(svgEl('polygon',{points: hexPoints(xy[0], xy[1], MP_S*0.5), fill:'none', stroke:'var(--brass)','stroke-width':1.3}));
  var star = svgEl('text',{x:xy[0], y:xy[1]+5.5, 'text-anchor':'middle','font-size':15, fill:'#f0e6cc'});
  star.textContent = '★';
  g.appendChild(star);
  if (ghost){
    g.appendChild(svgEl('line',{x1:xy[0]-13,y1:xy[1]-13,x2:xy[0]+13,y2:xy[1]+13,stroke:'#2b2113','stroke-width':2.5}));
    g.appendChild(svgEl('line',{x1:xy[0]-13,y1:xy[1]+13,x2:xy[0]+13,y2:xy[1]-13,stroke:'#2b2113','stroke-width':2.5}));
  }
  svg.appendChild(g);
}
function mpDrawStrike(svg, s){
  var pts = [mpXY(s.from)];
  if (s.via) pts.push(mpXY(s.via));
  pts.push(mpXY(s.to));
  var g = svgEl('g', {'class':'mstrike', 'pointer-events':'none'});
  g.appendChild(svgEl('polyline', { points: pts.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '),
    fill:'none', stroke:s.color, 'stroke-width':4.5, 'stroke-linecap':'round', 'stroke-linejoin':'round',
    'stroke-dasharray':'10 6' }));
  var a = pts[pts.length-2], b = pts[pts.length-1];
  var ang = Math.atan2(b[1]-a[1], b[0]-a[0]);
  var tip = [b[0]-Math.cos(ang)*MP_S*0.46, b[1]-Math.sin(ang)*MP_S*0.46];
  var l = 11, wdt = 6.5;
  var p1 = [tip[0]-Math.cos(ang)*l+Math.sin(ang)*wdt, tip[1]-Math.sin(ang)*l-Math.cos(ang)*wdt];
  var p2 = [tip[0]-Math.cos(ang)*l-Math.sin(ang)*wdt, tip[1]-Math.sin(ang)*l+Math.cos(ang)*wdt];
  g.appendChild(svgEl('polygon', { points: [tip, p1, p2].map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '),
    fill: s.color, stroke:'#2b2113', 'stroke-width':1 }));
  svg.appendChild(g);
}

/* ============ helpers for captions ============ */
function mpSideName(p){ return p === 'red' ? 'Red' : 'Blue'; }
// plain-words sentence for what the resolution did — built from the aftermath
// flags (which came from the real resolved state), so it can't contradict it
function mpAftermathWords(am){
  var bits = [];
  if (am.hqFell) bits.push('the ' + mpSideName(am.hqSide) + ' headquarters falls');
  if (am.defenderFell) bits.push('the defender is destroyed');
  if (am.attackerFell) bits.push('the attacker is destroyed');
  if (!am.defenderFell && !am.attackerFell && !am.hqFell) bits.push('the attack is repelled');
  if (am.advanced) bits.push('the winning attacker <b>advances into the hex</b>');
  else if (am.defenderFell && !am.attackerFell) bits.push('the attacker <b>holds its own hex</b>');
  var s = bits.join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

/* ============ the three examples ============ */
/* Each example = { id, label, scene(), beats:[{cap(d), frame(d)}] }.
   scene() builds fresh fixture states and reads EVERY number from the engine
   (board globals are correct right after each state is built — build a state,
   read its numbers immediately, then build the next). Beats are pure views of
   that data: re-rendered whole per beat, so reduced-motion is naturally fine. */
var MANUAL_EXAMPLES = [

{ id: 'support', label: 'Support',
  scene: function(){
    var def = mpDef('support', [1,-1], [1,1], [ { t:'F', edges: [[-1,0,0],[-1,0,1]] } ]);
    var units = {
      '0,0':  ['infantry','blue'],   // the defender
      '-1,0': ['infantry','red'],    // the attacker
      '0,-1': ['infantry','red'],    // supporter
      '-1,1': ['infantry','red'],    // supporter
      '1,0':  ['infantry','blue']    // Blue's supporter
    };
    var d = { atk: { from:'-1,0', to:'0,0', via:null } };
    d.st = mpState(def, units);
    d.res  = E.computeAttack(d.st, d.atk);
    d.asup = E.supportFor(d.st, 'red',  d.atk.to, d.atk.from, true);
    d.dsup = E.supportFor(d.st, 'blue', d.atk.to, null, false);
    d.aUnits = d.asup.hexes.filter(function(h){ return !E.isHQ(d.st, h); });
    d.aHQs   = d.asup.hexes.filter(function(h){ return  E.isHQ(d.st, h); });
    d.base  = E.UNITS[d.st.units[d.atk.from].type].atk;
    d.t2 = d.base + mpSum(d.st, d.aUnits);            // after unit support
    d.t3 = d.base + d.asup.total;                     // after HQ support
    d.forest = d.res.attackerPower - d.t3;            // engine-derived terrain bonus
    d.dBase = d.res.defenderPower - d.dsup.total;     // defense before support
    d.fSide = E.sideKey(d.atk.from, E.dirBetween(d.atk.from, d.atk.to));
    d.L = { from: E.hexLabel(d.atk.from), to: E.hexLabel(d.atk.to) };
    d.post = mpResolve(mpState(def, units), d.atk);   // fresh state through the REAL resolver
    d.am = mpAftermath(d.st, d.post, d.atk);
    return d;
  },
  beats: [
    { cap: function(d){ return 'The order: <b>Red Infantry at '+d.L.from+'</b> attacks the <b>Blue Infantry at '+d.L.to+'</b>. Every fight opens with the unit’s own attack value — Infantry strikes at <b>'+d.base+'</b>.'; },
      frame: function(d){ return { st:d.st, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.base+' vs ?', tone:'run'} }; } },
    { cap: function(d){ return 'Support: your other units standing <b>next to the defender’s hex</b> each lend their support — the <b>gold rings</b>. '+d.aUnits.length+' Red Infantry stand ready, and the tally climbs to <b>'+d.t2+'</b>.'; },
      frame: function(d){ return { st:d.st, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.t2+' vs ?', tone:'run'},
        rings: d.aUnits.map(function(h){ return {hex:h, cls:'gold'}; }) }; } },
    { cap: function(d){ return 'The <b>headquarters counts too</b>: an HQ adjacent to the fight adds +1. Red’s tally: <b>'+d.t3+'</b>.'; },
      frame: function(d){ return { st:d.st, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.t3+' vs ?', tone:'run'},
        rings: d.asup.hexes.map(function(h){ return {hex:h, cls:'gold'}; }) }; } },
    { cap: function(d){ return 'Terrain: the attacker’s hex holds a <b>forest on the crossed edge</b> — +'+d.forest+' for attacking out across it. Red’s total: <b>'+d.res.attackerPower+'</b>.'; },
      frame: function(d){ return { st:d.st, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.res.attackerPower+' vs ?', tone:'run'},
        glowSides:[d.fSide], rings: d.asup.hexes.map(function(h){ return {hex:h, cls:'gold'}; }) }; } },
    { cap: function(d){ return 'The defender answers with the same arithmetic: defense '+d.dBase+' plus support from <b>their</b> adjacent pieces — the <b>steel rings</b>. Blue’s total: <b>'+d.res.defenderPower+'</b>. Defender support is never blocked.'; },
      frame: function(d){ return { st:d.st, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.res.attackerPower+' vs '+d.res.defenderPower, tone:'run'},
        rings: d.asup.hexes.map(function(h){ return {hex:h, cls:'gold'}; }).concat(d.dsup.hexes.map(function(h){ return {hex:h, cls:'steel'}; })) }; } },
    { cap: function(d){ return 'Totals on the table: <b>'+d.res.attackerPower+' vs '+d.res.defenderPower+'</b>. Higher total wins — there are no dice in this war. '+(d.res.outcome==='attacker' ? 'Red carries the fight.' : d.res.outcome==='tie' ? 'Dead even — see the Ties chapter.' : 'Blue holds.'); },
      frame: function(d){ return { st:d.st, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.res.attackerPower+' vs '+d.res.defenderPower, tone:d.res.outcome},
        rings: d.asup.hexes.map(function(h){ return {hex:h, cls:'gold'}; }).concat(d.dsup.hexes.map(function(h){ return {hex:h, cls:'steel'}; })) }; } },
    { cap: function(d){ return mpAftermathWords(d.am)+' That’s the whole trick of support: never send a soldier alone to a knife fight.'; },
      frame: function(d){ return { st:d.post, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.res.attackerPower+' vs '+d.res.defenderPower, tone:d.res.outcome},
        badges: (d.am.defenderFell && d.am.advanced) ? [d.atk.to] : [],
        ghosts: (d.am.defenderFell && !d.am.advanced ? [{hex:d.atk.to, unit:d.st.units[d.atk.to]}] : [])
          .concat(d.am.attackerFell ? [{hex:d.atk.from, unit:d.st.units[d.atk.from]}] : []) }; } }
  ] },

{ id: 'ties', label: 'Ties',
  scene: function(){
    var d = {};
    // scene one: a plain dead tie, no support anywhere
    var defA = mpDef('tie', [2,-1], [1,1]);
    var unitsA = { '0,0': ['infantry','blue'], '-1,0': ['infantry','red'] };
    d.atkA = { from:'-1,0', to:'0,0', via:null };
    d.stA = mpState(defA, unitsA);
    d.resA = E.computeAttack(d.stA, d.atkA);
    d.L = { from: E.hexLabel(d.atkA.from), to: E.hexLabel(d.atkA.to) };
    d.postA = mpResolve(mpState(defA, unitsA), d.atkA);
    d.amA = mpAftermath(d.stA, d.postA, d.atkA);
    // scene two: the same tie, but the defender is a headquarters
    var defB = mpDef('tie-hq', [2,-1], [0,0]);
    var unitsB = { '-1,0': ['infantry','red'], '1,0': ['infantry','blue'] };
    d.atkB = { from:'-1,0', to:'0,0', via:null };
    d.stB = mpState(defB, unitsB);
    d.resB = E.computeAttack(d.stB, d.atkB);
    d.dsupB = E.supportFor(d.stB, 'blue', d.atkB.to, null, false);
    d.postB = mpResolve(mpState(defB, unitsB), d.atkB);
    d.amB = mpAftermath(d.stB, d.postB, d.atkB);
    // scene three: the same tie under a tieSpare order (Ordered Withdraw)
    d.atkC = { from:'-1,0', to:'0,0', via:null, tieSpare:true, noAdvance:true };
    d.stC = mpState(defA, unitsA);
    d.resC = E.computeAttack(d.stC, d.atkC);
    d.postC = mpResolve(mpState(defA, unitsA), d.atkC);
    d.amC = mpAftermath(d.stC, d.postC, d.atkC);
    // name the tieSpare card from the live deck (falls back if it's been cut)
    var tieCard = E.CARDS.filter(function(c){ return (c.steps||[]).some(function(s){ return s.tieSpare; }); })[0];
    d.tieCardName = tieCard ? tieCard.name : 'a "attacker survives a tie" order';
    return d;
  },
  beats: [
    { cap: function(d){ return 'Ties, scene one. Red Infantry attacks from '+d.L.from+', <b>no support on either side</b>: <b>'+d.resA.attackerPower+' vs '+d.resA.defenderPower+'</b> — dead even.'; },
      frame: function(d){ return { st:d.stA, atk:d.atkA, strike:{from:d.atkA.from,to:d.atkA.to,color:'var(--red)'}, pill:{at:d.atkA.to, text:d.resA.attackerPower+' vs '+d.resA.defenderPower, tone:d.resA.outcome} }; } },
    { cap: function(d){ return mpAftermathWords(d.amA)+' A tie destroys <b>both</b> units, and the attacker does <b>not</b> advance — the hex stands empty. An even trade, chosen by the attacker.'; },
      frame: function(d){ return { st:d.postA, atk:d.atkA, strike:{from:d.atkA.from,to:d.atkA.to,color:'var(--red)'}, pill:{at:d.atkA.to, text:d.resA.attackerPower+' vs '+d.resA.defenderPower, tone:d.resA.outcome},
        ghosts: (d.amA.defenderFell ? [{hex:d.atkA.to, unit:d.stA.units[d.atkA.to]}] : []).concat(d.amA.attackerFell ? [{hex:d.atkA.from, unit:d.stA.units[d.atkA.from]}] : []) }; } },
    { cap: function(d){ return 'Scene two — a tie <b>on a headquarters</b>. The HQ defends at '+(d.resB.defenderPower - d.dsupB.total)+', its adjacent Infantry lends +'+d.dsupB.total+': <b>'+d.resB.attackerPower+' vs '+d.resB.defenderPower+'</b>. Even again.'; },
      frame: function(d){ return { st:d.stB, atk:d.atkB, strike:{from:d.atkB.from,to:d.atkB.to,color:'var(--red)'}, pill:{at:d.atkB.to, text:d.resB.attackerPower+' vs '+d.resB.defenderPower, tone:d.resB.outcome},
        rings: d.dsupB.hexes.map(function(h){ return {hex:h, cls:'steel'}; }) }; } },
    { cap: function(d){ return mpAftermathWords(d.amB)+' A tie on a headquarters still <b>captures it</b>'+(d.amB.winner ? ' — <b>'+mpSideName(d.amB.winner)+' wins the battle</b> on the spot. One Infantry for the war is a fine trade.' : '.'); },
      frame: function(d){ return { st:d.postB, atk:d.atkB, strike:{from:d.atkB.from,to:d.atkB.to,color:'var(--red)'}, pill:{at:d.atkB.to, text:d.resB.attackerPower+' vs '+d.resB.defenderPower, tone:d.resB.outcome},
        hqGhost: d.amB.hqFell ? {hex:d.atkB.to, side:d.amB.hqSide} : null,
        ghosts: d.amB.attackerFell ? [{hex:d.atkB.from, unit:d.stB.units[d.atkB.from]}] : [] }; } },
    { cap: function(d){ return 'Scene three — the card <b>'+d.tieCardName+'</b>. The same dead-even fight, <b>'+d.resC.attackerPower+' vs '+d.resC.defenderPower+'</b> — but this order promises your attacker <b>survives a tie</b> (and never advances).'; },
      frame: function(d){ return { st:d.stC, atk:d.atkC, strike:{from:d.atkC.from,to:d.atkC.to,color:'var(--red)'}, pill:{at:d.atkC.to, text:d.resC.attackerPower+' vs '+d.resC.defenderPower, tone:d.resC.outcome} }; } },
    { cap: function(d){ return mpAftermathWords(d.amC)+' One card turns an even trade into a clean kill — that’s why ties are worth engineering.'; },
      frame: function(d){ return { st:d.postC, atk:d.atkC, strike:{from:d.atkC.from,to:d.atkC.to,color:'var(--red)'}, pill:{at:d.atkC.to, text:d.resC.attackerPower+' vs '+d.resC.defenderPower, tone:d.resC.outcome},
        ghosts: (d.amC.defenderFell ? [{hex:d.atkC.to, unit:d.stC.units[d.atkC.to]}] : []).concat(d.amC.attackerFell ? [{hex:d.atkC.from, unit:d.stC.units[d.atkC.from]}] : []) }; } }
  ] },

{ id: 'trench-river', label: 'Trench vs River',
  scene: function(){
    var d = {};
    var units = {
      '0,0':  ['infantry','blue'],   // the defender
      '-1,0': ['infantry','red'],    // the attacker
      '0,-1': ['infantry','red'],    // the northern supporter (the border in question)
      '-1,1': ['infantry','red']     // the southern supporter (always clear)
    };
    d.atk = { from:'-1,0', to:'0,0', via:null };
    // open ground — the baseline tally
    var defOpen = mpDef('front-open', [2,-1], [1,1]);
    d.stOpen = mpState(defOpen, units);
    d.resOpen = E.computeAttack(d.stOpen, d.atk);
    d.asupOpen = E.supportFor(d.stOpen, 'red', d.atk.to, d.atk.from, true);
    d.L = { from: E.hexLabel(d.atk.from), to: E.hexLabel(d.atk.to), n: E.hexLabel('0,-1') };
    // the same border, trenched (trench lives in the state, dug on the defender's hex)
    d.trDirs = [1, 2]; // covers the defender's NE + NW edges — incl. the border to the northern supporter
    d.stTr = mpState(defOpen, units, { '0,0': [ { dirs: d.trDirs.slice(), owner: 'blue' } ] });
    d.resTr = E.computeAttack(d.stTr, d.atk);
    d.asupTr = E.supportFor(d.stTr, 'red', d.atk.to, d.atk.from, true);
    d.denied = d.asupOpen.hexes.filter(function(h){ return d.asupTr.hexes.indexOf(h) < 0; }); // engine-truth: who the trench turned away
    // the same border, a river instead (river is map terrain)
    var defRiv = mpDef('front-river', [2,-1], [1,1], [ { t:'R', edges: [[0,0,1],[0,0,2]] } ]);
    d.stRiv = mpState(defRiv, units);
    d.resRiv = E.computeAttack(d.stRiv, d.atk);
    d.asupRiv = E.supportFor(d.stRiv, 'red', d.atk.to, d.atk.from, true);
    d.rSides = ['0,0>1', '0,0>2'];
    return d;
  },
  beats: [
    { cap: function(d){ return 'Open ground first. Red Infantry attacks '+d.L.to+' with <b>'+d.asupOpen.hexes.length+' friendly units adjacent</b> to the defender’s hex: <b>'+d.resOpen.attackerPower+' vs '+d.resOpen.defenderPower+'</b>. Hold that number.'; },
      frame: function(d){ return { st:d.stOpen, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.resOpen.attackerPower+' vs '+d.resOpen.defenderPower, tone:d.resOpen.outcome},
        rings: d.asupOpen.hexes.map(function(h){ return {hex:h, cls:'gold'}; }) }; } },
    { cap: function(d){ return 'Now a <b>trench</b> guards that border. <b>Attacking support may not cross a trenched edge</b> — the unit at '+d.L.n+' is turned away (grey ring) and the tally drops from '+d.resOpen.attackerPower+' to <b>'+d.resTr.attackerPower+'</b>. The attack itself still goes in: a trench never blocks the blow, only the help.'; },
      frame: function(d){ return { st:d.stTr, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.resTr.attackerPower+' vs '+d.resTr.defenderPower, tone:d.resTr.outcome},
        glowTrench: {hex:'0,0', dirs:d.trDirs},
        rings: d.asupTr.hexes.map(function(h){ return {hex:h, cls:'gold'}; }).concat(d.denied.map(function(h){ return {hex:h, cls:'deny'}; })) }; } },
    { cap: function(d){ return 'Swap the trench for a <b>river</b>: support <b>wades straight across</b> — nothing is denied. <b>'+d.resRiv.attackerPower+' vs '+d.resRiv.defenderPower+'</b>, exactly as on open ground.'; },
      frame: function(d){ return { st:d.stRiv, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.resRiv.attackerPower+' vs '+d.resRiv.defenderPower, tone:d.resRiv.outcome},
        glowSides: d.rSides,
        rings: d.asupRiv.hexes.map(function(h){ return {hex:h, cls:'gold'}; }) }; } },
    { cap: function(d){ return 'Say it plainly, soldier: a <b>trench stops attacking support</b>. A <b>river stops deployment</b> — control never extends across water, so you may not deploy onto the far bank. Neither ever stops the attack itself, and neither hinders the <b>defender’s</b> support.'; },
      frame: function(d){ return { st:d.stRiv, strike:{from:d.atk.from,to:d.atk.to,color:'var(--red)'}, pill:{at:d.atk.to, text:d.resRiv.attackerPower+' vs '+d.resRiv.defenderPower, tone:d.resRiv.outcome},
        rings: d.asupRiv.hexes.map(function(h){ return {hex:h, cls:'gold'}; }) }; } }
  ] }
];

/* ============ player state + render ============ */
// window-visible for dev/smoke.js: current example/beat + the frame's fixture
// state and attack, so tests can re-run the engine on EXACTLY what is shown.
var MANUAL = { ex: 0, beat: 0, state: null, atk: null, built: false };

function renderManual(){
  // fixture building flips the engine's global board to the mini map — save
  // and ALWAYS restore the live shape so an in-progress battle is untouched
  var prev = E.currentShape();
  try {
    var ex = MANUAL_EXAMPLES[MANUAL.ex] || MANUAL_EXAMPLES[0];
    MANUAL.ex = MANUAL_EXAMPLES.indexOf(ex);
    MANUAL.beat = Math.max(0, Math.min(MANUAL.beat, ex.beats.length - 1));
    var d = ex.scene();
    var beat = ex.beats[MANUAL.beat];
    var f = beat.frame(d);
    E.setBoard(f.st.boardShape); // labels + geometry under the frame's own board
    mpDrawFrame(f);
    $('mpCaption').innerHTML = beat.cap(d);
    $('mpCounter').textContent = (MANUAL.beat + 1) + '/' + ex.beats.length;
    $('mpPrev').disabled = MANUAL.beat === 0;
    $('mpNext').disabled = MANUAL.beat === ex.beats.length - 1;
    document.querySelectorAll('#mpTabs .mptab').forEach(function(b){
      b.classList.toggle('sel', +b.dataset.mpex === MANUAL.ex);
    });
    MANUAL.state = f.st;
    MANUAL.atk = f.atk || d.atk || null;
  } finally { E.setBoard(prev); }
}

function openManual(){
  if (!MANUAL.built){
    var tabs = $('mpTabs');
    tabs.innerHTML = '';
    MANUAL_EXAMPLES.forEach(function(ex, i){
      var b = document.createElement('button');
      b.className = 'mptab';
      b.dataset.mpex = i;
      b.textContent = ex.label;
      tabs.appendChild(b);
    });
    MANUAL.built = true;
  }
  renderManual();
  $('manualOvr').classList.add('active');
}
function manualStep(delta){
  MANUAL.beat += delta;
  renderManual();
}
// tab clicks are delegated from one container handler wired in ui/boot.js
function manualTabClick(ev){
  var t = ev.target;
  while (t && t !== ev.currentTarget && !(t.dataset && t.dataset.mpex !== undefined)) t = t.parentNode;
  if (!t || t === ev.currentTarget || t.dataset.mpex === undefined) return;
  MANUAL.ex = +t.dataset.mpex;
  MANUAL.beat = 0;
  renderManual();
}
// ← / → step the beats while the manual is open (wired in ui/boot.js)
function manualKey(ev){
  if (!$('manualOvr').classList.contains('active')) return;
  var tag = ev.target && ev.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (ev.key === 'ArrowRight'){ manualStep(1); ev.preventDefault(); }
  else if (ev.key === 'ArrowLeft'){ manualStep(-1); ev.preventDefault(); }
}
