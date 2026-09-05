/* The COORD LABEL: the grid reference above a hex centre.

   `pe:'none'` makes it click-through, which the editor needs so a label never
   swallows a click meant for the tile under it. */
'use strict';

bpMark({ id:'coord', lifetime:'kept', draw: function(into, o, s){
  var xy = hexXY(o.hex, s);
  var lbl = svgEl('text', { x:xy[0], y:xy[1] - s*0.58, 'text-anchor':'middle', 'class':'coordlbl' });
  if (o.pe) lbl.setAttribute('pointer-events', o.pe);
  lbl.textContent = E.hexLabel(o.hex);
  into.appendChild(lbl);
  return lbl;
}});
