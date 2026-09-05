/* A hex that is NOT on the board yet: a dashed outline where one could go. The
   editor wires its own hover and click; the wash it swaps between is the hex
   house's ink. */
'use strict';

defineBoardMark({
  mark: 'ghost',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = o.hex ? hexXY(o.hex, o.s) : [o.cx, o.cy];
    var rad = o.rad != null ? o.rad : HEX_CONFIG[o.on].tile - o.d.inset;
    var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], rad),
      fill:HEX_CONFIG.ink.ghost, stroke:HEX_CONFIG.ink.ghostStroke,
      'stroke-width':o.d.sw, 'stroke-dasharray':o.d.dash });
    g.appendChild(p);
    return p;
  }
});
