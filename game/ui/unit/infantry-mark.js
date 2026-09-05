/* Infantry: the crossed straps of a field pack — an X filling the chit. */
'use strict';

defineUnitMark({
  type: 'infantry',
  board: function(g, m){
    g.appendChild(svgEl('line',{ x1:m.cx-m.hw, y1:m.cy-m.hh, x2:m.cx+m.hw, y2:m.cy+m.hh, stroke:m.ink, 'stroke-width':m.sw }));
    g.appendChild(svgEl('line',{ x1:m.cx-m.hw, y1:m.cy+m.hh, x2:m.cx+m.hw, y2:m.cy-m.hh, stroke:m.ink, 'stroke-width':m.sw }));
  },
  mat: function(m){
    return '<path d="M5.5 13.5 L14.5 6.5 M5.5 6.5 L14.5 13.5" stroke="'+m.ink+'" stroke-width="2" stroke-linecap="round"/>';
  },
  chart: function(){ return CHART.divBlue[1]; }
});
