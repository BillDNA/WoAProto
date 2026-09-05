/* THE FELL BADGE: "a unit fell here, but the hex is occupied again" — the
   advance-into-kill, which no mark on the hex itself could show. */
'use strict';

bpMark({ id:'fell-badge', lifetime:'transient', draw: function(g, o, s){
  var xy = hexXY(o.hex, s), cx = xy[0]+s*0.55, cy = xy[1]-s*0.6;
  g.appendChild(svgEl('circle', { cx:cx, cy:cy, r:7.5, fill:BOARD.redDark, stroke:BOARD.outline, 'stroke-width':1 }));
  var t = svgEl('text', { x:cx, y:cy+3.5, 'text-anchor':'middle', 'font-size':10, 'font-weight':'bold', fill:BOARD.star });
  t.textContent = '✕';
  g.appendChild(t);
}});
