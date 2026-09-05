/* The TILE: a bare parchment hex.

   Its look is the .hex / .hex.dark stylesheet class, so the only thing this
   draws is the shape. `dark` is the caller's answer — the live board and the
   manual alternate by grid parity, the editor keeps its tiles uniform. */
'use strict';

bpMark({ id:'tile', lifetime:'kept', draw: function(into, o, s){
  var xy = hexXY(o.hex, s);
  var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], s-1),
    'class': 'hex' + (o.dark ? ' dark' : '') + (o.cls ? ' ' + o.cls : '') });
  p.dataset.hex = o.hex;
  into.appendChild(p);
  return p;
}});
