/* Artillery: the shot itself, a single ball at the centre of the chit.
   o.artR lets a mini-board shrink it. */
'use strict';

defineUnitMark({
  type: 'artillery',
  board: function(g, m, o){
    g.appendChild(svgEl('circle',{ cx:m.cx, cy:m.cy, r:o.artR != null ? o.artR : 4.5, fill:m.ink }));
  },
  mat: function(m){
    return '<circle cx="10" cy="10" r="3.4" fill="'+m.ink+'"/>';
  },
  chart: function(){ return CHART.improve; }
});
