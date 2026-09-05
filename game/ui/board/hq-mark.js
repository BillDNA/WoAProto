/* A headquarters: a side-coloured hex, a brass ring, a star. The ring and the
   star are dials, so the thumbnails' bare side-coloured hex and the dashboard's
   stroke-only ring are the same mark, not two more. */
'use strict';

defineBoardMark({
  mark: 'hq',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = o.hex ? hexXY(o.hex, o.s) : [o.cx, o.cy], d = o.d;
    var inner = o.inner !== undefined ? o.inner : d.inner;
    var star = o.star !== undefined ? o.star : d.star;
    var rOuter = o.rOuter != null ? o.rOuter : d.outer * o.s;
    var poly = svgEl('polygon', { points: hexPoints(xy[0], xy[1], rOuter),
      fill: o.fill || BOARD.side(o.side).fill, stroke: o.stroke || o.ink.outline,
      'stroke-width': d.outerSW, opacity: d.opacity });
    if (o.pe) poly.setAttribute('pointer-events', o.pe);
    g.appendChild(poly);
    if (inner !== false){
      var ring = svgEl('polygon', { points: hexPoints(xy[0], xy[1], inner * o.s),
        fill:'none', stroke:o.ink.brass, 'stroke-width':d.brassSW });
      if (o.pe) ring.setAttribute('pointer-events', o.pe);
      g.appendChild(ring);
    }
    if (star !== false){
      var st = svgEl('text', { x:xy[0], y:xy[1] + d.starDY, 'text-anchor':'middle',
        'font-size':d.starFS, fill:o.starFill || o.ink.star });
      if (o.pe) st.setAttribute('pointer-events', o.pe);
      st.textContent = '★';
      g.appendChild(st);
    }
    return poly;
  }
});
