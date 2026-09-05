/* The GHOST HEX: a hex that is not on the map yet — the editor's "add this one"
   affordance. Dashed, washed, and gold on hover (the caller wires that). */
'use strict';

bpMark({ id:'ghost-hex', lifetime:'kept', draw: function(into, o, s){
  var xy = hexXY(o.hex, s);
  var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], s-4),
    fill:BOARD.ghostFill, stroke:BOARD.ghostStroke, 'stroke-width':1.4, 'stroke-dasharray':'6 5' });
  into.appendChild(p);
  return p;
}});
