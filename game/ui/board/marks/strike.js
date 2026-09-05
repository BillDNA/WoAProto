/* The STRIKE: the blow, drawn from attacker to target — a dashed line bending
   through a via-hex, with an arrowhead stopping just short of the target. */
'use strict';

bpMark({ id:'strike', lifetime:'transient', draw: function(g, o, s){
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
