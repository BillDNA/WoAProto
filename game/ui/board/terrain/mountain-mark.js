/* Mountain: a peak on the side, its apex pointing away from the hex centre. */
'use strict';

defineTerrainMark({
  letter: 'M',
  stroke: 'var(--mountain)',
  ink: '#5d5a52',
  inset: 0.85,
  glyph: function(g, m){
    var ex = m.p2[0] - m.p1[0], ey = m.p2[1] - m.p1[1];
    var tri = [ [m.mx - ex*0.14, m.my - ey*0.14],
                [m.mx + ex*0.14, m.my + ey*0.14],
                [m.mx - (m.my - m.c[1])*0.18, m.my + (m.mx - m.c[0])*0.18] ];
    g.appendChild(svgEl('polygon',{
      points: tri.map(function(q){ return q[0].toFixed(1)+','+q[1].toFixed(1); }).join(' '), fill:m.ink }));
  }
});
