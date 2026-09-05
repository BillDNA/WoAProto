/* The BOARD house's OVERLAY base: the transient marks.

   A mark in mark.js says what is on the board. A mark here says what just
   happened on it — the strike that was thrown, whose support counted, where a
   unit fell, what the numbers were. The live board draws them for three-quarters
   of a second; the field manual draws the same four as a still frame at its own
   scale. Both used to write them out in full, so a restyled strike arrow was two
   edits and they had already drifted apart.

   bpOverlayMark({id, draw}) declares one. bpOverlay(into, id, o) draws it:
   `o.s` is the hex size (the live board's S by default), `o.ttl` removes it
   after that many ms, `o.cls` adds a class the stylesheet can animate. Sizes
   derive from `s`, so scale is the only thing that varies between boards. */
'use strict';

var BOARD_MARKS = {};

function bpOverlayMark(spec){
  if (BOARD_MARKS[spec.id]) throw new Error('bpOverlayMark: duplicate id ' + JSON.stringify(spec.id));
  BOARD_MARKS[spec.id] = spec;
  return spec;
}

function bpOverlay(into, id, o){
  var spec = BOARD_MARKS[id];
  if (!spec) throw new Error('bpOverlay: no mark ' + JSON.stringify(id));
  o = o || {};
  var g = svgEl('g', { 'class': 'bpm bpm-' + id + (o.cls ? ' ' + o.cls : ''), 'pointer-events': 'none' });
  spec.draw(g, o, o.s || S);
  into.appendChild(g);
  if (o.ttl) setTimeout(function(){ if (g.parentNode) g.parentNode.removeChild(g); }, o.ttl);
  return g;
}

/* ---- the marks ---- */

// The blow: a dashed line from attacker to target, bending through a via-hex,
// with an arrowhead stopping just short of the target's centre.
bpOverlayMark({ id: 'strike', draw: function(g, o, s){
  var pts = [hexXY(o.from, s)];
  if (o.via) pts.push(hexXY(o.via, s));
  pts.push(hexXY(o.to, s));
  g.appendChild(svgEl('polyline', {
    points: pts.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '),
    fill:'none', stroke:o.color, 'stroke-width':(s*0.136).toFixed(2),
    'stroke-linecap':'round', 'stroke-linejoin':'round',
    'stroke-dasharray':(s*0.295).toFixed(1)+' '+(s*0.182).toFixed(1), opacity:.9 }));
  var a = pts[pts.length-2], b = pts[pts.length-1];
  var ang = Math.atan2(b[1]-a[1], b[0]-a[0]);
  var tip = [b[0]-Math.cos(ang)*s*0.42, b[1]-Math.sin(ang)*s*0.42];
  var l = s*0.318, wdt = s*0.182;
  var p1 = [tip[0]-Math.cos(ang)*l+Math.sin(ang)*wdt, tip[1]-Math.sin(ang)*l-Math.cos(ang)*wdt];
  var p2 = [tip[0]-Math.cos(ang)*l-Math.sin(ang)*wdt, tip[1]-Math.sin(ang)*l+Math.cos(ang)*wdt];
  g.appendChild(svgEl('polygon', { points: [tip, p1, p2].map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '),
    fill:o.color, stroke:BOARD.outline, 'stroke-width':1 }));
}});

// A ring around a hex: a supporter that counted, a trench dug, a barrage landed.
// `color` inks it directly; without one the class does (the manual's palette).
bpOverlayMark({ id: 'ring', draw: function(g, o, s){
  var xy = hexXY(o.hex, s);
  var a = { cx:xy[0], cy:xy[1], r:s*0.8, fill:'none', 'stroke-width':(s*0.114).toFixed(2) };
  if (o.color) a.stroke = o.color;
  g.appendChild(svgEl('circle', a));
}});

// The A-vs-D pill under a hex. Its text stays legible rather than scaling, so
// only the drop below the hex centre follows `s`.
bpOverlayMark({ id: 'pill', draw: function(g, o, s){
  var xy = hexXY(o.hex, s);
  var y = xy[1] + (o.dy != null ? o.dy : s*0.18);
  var w = o.text.length * 6.6 + 12;
  g.appendChild(svgEl('rect', { x:xy[0]-w/2, y:y, width:w, height:17, rx:8.5,
    fill:BOARD.hint[o.tone] || BOARD.hint.neutral, stroke:BOARD.outline, 'stroke-width':1 }));
  var t = svgEl('text', { x:xy[0], y:y+12.5, 'text-anchor':'middle',
    'font-size':11, 'font-weight':'bold', fill:BOARD.star });
  t.textContent = o.text;
  g.appendChild(t);
}});

// Where a unit fell: its token's shape, left behind to fade.
bpOverlayMark({ id: 'fallen', draw: function(g, o, s){
  var xy = hexXY(o.hex, s), sc = BOARD.side(o.owner);
  g.appendChild(svgEl('circle', { cx:xy[0], cy:xy[1], r:s*(BOARD_R.unit/S),
    fill:sc.fill, stroke:sc.dark, 'stroke-width':BOARD_SW.unit }));
}});

// The ✕ struck over a counter that is gone — the still-frame twin of `fallen`,
// drawn into the token's own group so it moves with it.
bpOverlayMark({ id: 'struck', draw: function(g, o, s){
  var xy = hexXY(o.hex, s), r = o.r != null ? o.r : s*0.35;
  [[-1,-1,1,1],[-1,1,1,-1]].forEach(function(d){
    g.appendChild(svgEl('line', { x1:xy[0]+d[0]*r, y1:xy[1]+d[1]*r, x2:xy[0]+d[2]*r, y2:xy[1]+d[3]*r,
      stroke:BOARD.outline, 'stroke-width':o.sw != null ? o.sw : 2.5 }));
  });
}});

// "A unit fell here, but the hex is occupied again" — the advance-into-kill badge.
bpOverlayMark({ id: 'fellbadge', draw: function(g, o, s){
  var xy = hexXY(o.hex, s), cx = xy[0]+s*0.55, cy = xy[1]-s*0.6;
  g.appendChild(svgEl('circle', { cx:cx, cy:cy, r:7.5, fill:BOARD.redDark, stroke:BOARD.outline, 'stroke-width':1 }));
  var t = svgEl('text', { x:cx, y:cy+3.5, 'text-anchor':'middle', 'font-size':10, 'font-weight':'bold', fill:BOARD.star });
  t.textContent = '✕';
  g.appendChild(t);
}});

// The attention halo the manual lays under a side it is talking about.
bpOverlayMark({ id: 'sideglow', draw: function(g, o, s){
  var pt = bpEdgePts(o.hex, o.dir, s*(o.rad || 0.85), s);
  g.appendChild(svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:'var(--gold-glow)', 'stroke-width':o.sw, 'stroke-linecap':'round' }));
}});

// The hover-only attack-math layer the live board hangs its pills on.
function bpAttackLayer(){ return svgEl('g', { 'class':'atk-hints', 'pointer-events':'none' }); }
