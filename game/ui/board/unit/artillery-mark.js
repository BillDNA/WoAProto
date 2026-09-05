/* Artillery: the shot itself, a single ball at the centre of the chit. */
'use strict';

defineUnitMark({
  type: 'artillery',
  glyph: function(g, m){
    g.appendChild(svgEl('circle',{ cx:m.cx, cy:m.cy, r:m.dotR, fill:m.ink }));
  },
  chart: function(){ return CHART.improve; }
});
