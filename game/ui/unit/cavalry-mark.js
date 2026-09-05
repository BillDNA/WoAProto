/* Cavalry: the single sabre slash, the infantry X with one stroke taken away. */
'use strict';

defineUnitMark({
  type: 'cavalry',
  board: function(g, m){
    g.appendChild(svgEl('line',{ x1:m.cx-m.hw, y1:m.cy+m.hh, x2:m.cx+m.hw, y2:m.cy-m.hh, stroke:m.ink, 'stroke-width':m.sw }));
  },
  mat: function(m){
    return '<path d="M5.5 14 L14.5 6" stroke="'+m.ink+'" stroke-width="2.3" stroke-linecap="round"/>';
  },
  chart: function(){ return CHART.divRed[1]; }
});
