/* Cavalry: the single sabre slash, the infantry X with one stroke taken away. */
'use strict';

defineUnitMark({
  type: 'cavalry',
  glyph: function(g, m){
    g.appendChild(svgEl('line',{ x1:m.cx-m.hw, y1:m.cy+m.hh, x2:m.cx+m.hw, y2:m.cy-m.hh,
      stroke:m.ink, 'stroke-width':m.sw, 'stroke-linecap':'round' }));
  },
  chart: function(){ return CHART.divRed[1]; }
});
