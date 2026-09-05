/* Forest: three dots along the side, a big one centred between two smaller.
   o.forestR / o.forestR2 let a mini-board shrink them. */
'use strict';

defineTerrainMark({
  letter: 'F',
  stroke: 'var(--forest)',
  ink: '#3a6330',
  inset: 0.85,
  glyph: function(g, m, o){
    var r = o.forestR != null ? o.forestR : 4.4, r2 = o.forestR2 != null ? o.forestR2 : 3.4;
    g.appendChild(svgEl('circle',{ cx:m.mx, cy:m.my, r:r, fill:m.ink }));
    g.appendChild(svgEl('circle',{ cx:(m.p1[0]+m.mx)/2, cy:(m.p1[1]+m.my)/2, r:r2, fill:m.ink }));
    g.appendChild(svgEl('circle',{ cx:(m.p2[0]+m.mx)/2, cy:(m.p2[1]+m.my)/2, r:r2, fill:m.ink }));
  }
});
