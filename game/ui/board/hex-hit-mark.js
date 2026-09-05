/* The pointer target over a whole hex: invisible, the tile's size, and carrying
   whatever the caller needs to answer a hover. The face's twin is edgeHit. */
'use strict';

defineBoardMark({
  mark: 'hexHit',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = hexXY(o.hex, o.s);
    var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], HEX_CONFIG[o.on].tile),
      fill:'transparent', 'class':o.cls });
    for (var k in (o.attrs || {})) p.setAttribute(k, o.attrs[k]);
    g.appendChild(p);
    return p;
  }
});
