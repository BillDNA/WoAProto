/* The EDGE HIT: an invisible fat line over a hex side, so a side can be clicked
   at all. The .edge-hit class carries the width and the hover; the caller wires
   what the click paints. */
'use strict';

bpMark({ id:'edge-hit', lifetime:'kept', draw: function(into, o, s){
  var pt = bpEdgePts(o.hex, o.dir, o.rad, s);
  var hit = svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1], 'class':'edge-hit' });
  into.appendChild(hit);
  return hit;
}});
