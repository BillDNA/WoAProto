/* A ✕ over a piece that fell. Drawn over whatever stood there — a unit token or
   an HQ — so its size says which, not the caller's arithmetic. */
'use strict';

defineBoardMark({
  mark: 'struck',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = hexXY(o.hex, o.s), r = o.d.r[o.of || 'unit'], sw = o.d.sw;
    g.appendChild(svgEl('line', { x1:xy[0]-r, y1:xy[1]-r, x2:xy[0]+r, y2:xy[1]+r,
      stroke:o.ink.outline, 'stroke-width':sw }));
    var l = svgEl('line', { x1:xy[0]-r, y1:xy[1]+r, x2:xy[0]+r, y2:xy[1]-r,
      stroke:o.ink.outline, 'stroke-width':sw });
    g.appendChild(l);
    return l;
  }
});
