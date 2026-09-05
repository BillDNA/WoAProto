/* The click target on one face of a hex — invisible, and fat enough to hit
   (board.css's .edge-hit). Returns the line so the caller wires its own paint
   handler. */
'use strict';

defineBoardMark({
  mark: 'edgeHit',
  lifetime: 'standing',
  draw: function(g, o){
    var pt = hexEdgePts(o.hex, o.dir, o.rad, o.s);
    var hit = svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1], 'class':'edge-hit' });
    g.appendChild(hit);
    return hit;
  }
});
