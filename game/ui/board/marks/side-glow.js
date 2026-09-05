/* THE SIDE GLOW: the attention halo the field manual lays under a hex side it
   is talking about. Drawn before the terrain line it points at, so it reads as
   light behind the mark rather than a second mark. */
'use strict';

bpMark({ id:'side-glow', lifetime:'transient', draw: function(g, o, s){
  var pt = bpEdgePts(o.hex, o.dir, s*(o.rad || 0.85), s);
  g.appendChild(svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
    stroke:'var(--gold-glow)', 'stroke-width':o.sw, 'stroke-linecap':'round' }));
}});
