/* A small ✕ chip in the corner of a hex: a piece fell here, but the hex is
   already occupied again, so a struck mark over the token would read as the
   wrong piece dying. */
'use strict';

defineBoardMark({
  mark: 'badge',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = hexXY(o.hex, o.s), d = o.d;
    var cx = xy[0] + o.s*d.dx, cy = xy[1] + o.s*d.dy;
    g.appendChild(svgEl('circle', { cx:cx, cy:cy, r:d.r, fill:BOARD.redDark,
      stroke:o.ink.outline, 'stroke-width':d.sw }));
    var t = svgEl('text', { x:cx, y:cy + d.textDY, 'text-anchor':'middle',
      'font-size':d.fs, 'font-weight':'bold', fill:o.ink.star });
    t.textContent = '✕';
    g.appendChild(t);
    return t;
  }
});
