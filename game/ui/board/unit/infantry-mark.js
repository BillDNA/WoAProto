/* Infantry: the crossed straps of a field pack — an X filling the chit. */
'use strict';

defineUnitMark({
  type: 'infantry',
  glyph: function(g, m){
    g.appendChild(svgEl('line',{ x1:m.cx-m.hw, y1:m.cy-m.hh, x2:m.cx+m.hw, y2:m.cy+m.hh,
      stroke:m.ink, 'stroke-width':m.sw, 'stroke-linecap':'round' }));
    g.appendChild(svgEl('line',{ x1:m.cx-m.hw, y1:m.cy+m.hh, x2:m.cx+m.hw, y2:m.cy-m.hh,
      stroke:m.ink, 'stroke-width':m.sw, 'stroke-linecap':'round' }));
  },
  chart: function(){ return CHART.divBlue[1]; }
});
