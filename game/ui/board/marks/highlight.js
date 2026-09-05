/* The HIGHLIGHT: a hex the player may click right now.

   What it means is the caller's `kind` (.hl-target, .hl-attack, .hl-from,
   .hl-selected, .hl-swap) and the stylesheet's; the mark is only the shape. */
'use strict';

bpMark({ id:'highlight', lifetime:'kept', draw: function(into, o, s){
  var xy = hexXY(o.hex, s);
  var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], s-3), 'class':'hl ' + o.kind });
  into.appendChild(p);
  return p;
}});
