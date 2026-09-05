/* STRUCK: the ✕ over a counter that is gone.

   The still frame's annotation, drawn into the token's own group so it travels
   with it. The live board's fade is `fallen`. */
'use strict';

bpMark({ id:'struck', lifetime:'transient', draw: function(g, o, s){
  var xy = hexXY(o.hex, s), r = o.r != null ? o.r : s*0.35;
  [[-1,-1,1,1],[-1,1,1,-1]].forEach(function(d){
    g.appendChild(svgEl('line', { x1:xy[0]+d[0]*r, y1:xy[1]+d[1]*r, x2:xy[0]+d[2]*r, y2:xy[1]+d[3]*r,
      stroke:BOARD.outline, 'stroke-width':o.sw != null ? o.sw : s*BOARD_SW.unit }));
  });
}});
