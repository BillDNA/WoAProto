/* A halo along one face of a hex — "look here". Sits under the terrain or
   trench line it is drawing attention to, which is why it is a mark of its own
   and not a thicker stroke on that one. */
'use strict';

defineBoardMark({
  mark: 'glow',
  lifetime: 'standing',
  draw: function(g, o){
    var d = o.d[o.of || 'side'];
    var pt = hexEdgePts(o.hex, o.dir, o.s * d.rad, o.s);
    var l = svgEl('line', { x1:pt[0][0], y1:pt[0][1], x2:pt[1][0], y2:pt[1][1],
      stroke:'var(--gold-glow)', 'stroke-width':d.sw, 'stroke-linecap':'round', 'class':'medge-glow' });
    g.appendChild(l);
    return l;
  }
});
