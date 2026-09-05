/* The PILL: the attack maths under a hex — attacker power versus defender,
   tinted by who wins it.

   Its text stays legible rather than scaling, so only the drop below the hex
   centre follows the board's size. */
'use strict';

bpMark({ id:'pill', lifetime:'transient', draw: function(g, o, s){
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
