/* The RING: a hex that counted — a supporter, a trench dug, a barrage landed.

   `color` inks it directly; without one the caller's class does, which is how
   the manual keeps its own flatter palette. */
'use strict';

bpMark({ id:'ring', lifetime:'transient', draw: function(g, o, s){
  var xy = hexXY(o.hex, s);
  var a = { cx:xy[0], cy:xy[1], r:s*0.8, fill:'none', 'stroke-width':(s*0.114).toFixed(2) };
  if (o.color) a.stroke = o.color;
  g.appendChild(svgEl('circle', a));
}});
