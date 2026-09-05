/* Forest: three dots along the side, a big one centred between two smaller. Their
   radii are the `forest` section of the board's row in terrain-config.js. */
'use strict';

defineTerrainMark({
  letter: 'F',
  stroke: 'var(--forest)',
  ink: 'var(--forest-ink)',
  inset: 0.85,
  glyph: function(g, m, o){
    var r = m.d.r, r2 = m.d.r2;
    g.appendChild(svgEl('circle',{ cx:m.mx, cy:m.my, r:r, fill:m.ink }));
    g.appendChild(svgEl('circle',{ cx:(m.p1[0]+m.mx)/2, cy:(m.p1[1]+m.my)/2, r:r2, fill:m.ink }));
    g.appendChild(svgEl('circle',{ cx:(m.p2[0]+m.mx)/2, cy:(m.p2[1]+m.my)/2, r:r2, fill:m.ink }));
  }
});
