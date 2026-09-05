/* A hex outline drawn inside a hex — a ring that says something about the hex it
   sits in without hiding it. Its radius is the caller's, as a fraction of the
   tile, because what the ring MEANS is what sets it. */
'use strict';

defineBoardMark({
  mark: 'hexRing',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = hexXY(o.hex, o.s);
    var a = { points: hexPoints(xy[0], xy[1], HEX_CONFIG[o.on].tile * o.of),
      fill:'none', stroke:o.stroke, 'stroke-width':o.sw };
    if (o.dash) a['stroke-dasharray'] = o.dash;
    var p = svgEl('polygon', a);
    g.appendChild(p);
    return p;
  }
});
