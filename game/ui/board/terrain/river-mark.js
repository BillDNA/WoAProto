/* River: a dashed current running along the middle of the side. Its weights are
   the `river` section of the board's row in terrain-config.js. */
'use strict';

defineTerrainMark({
  letter: 'R',
  stroke: 'var(--river)',
  ink: 'var(--river-ink)',
  inset: 0.85,
  glyph: function(g, m, o){
    g.appendChild(svgEl('line',{
      x1:(m.p1[0]*0.7 + m.mx*0.3), y1:(m.p1[1]*0.7 + m.my*0.3),
      x2:(m.p2[0]*0.7 + m.mx*0.3), y2:(m.p2[1]*0.7 + m.my*0.3),
      stroke:m.ink, 'stroke-width':m.d.sw,
      'stroke-linecap':'round', 'stroke-dasharray':m.d.dash }));
  }
});
