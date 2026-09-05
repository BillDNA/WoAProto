/* The grid reference sitting over a hex — A1, C4. The name is the board's
   answer (E.hexLabel), so a caller that is drawing the live board passes only
   the hex. */
'use strict';

defineBoardMark({
  mark: 'coord',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = o.hex ? hexXY(o.hex, o.s) : [o.cx, o.cy];
    var lbl = svgEl('text', { x:xy[0], y:xy[1] + o.s*o.d.dy, 'text-anchor':'middle', 'class':'coordlbl' });
    if (o.pe) lbl.setAttribute('pointer-events', o.pe);
    lbl.textContent = o.text != null ? o.text : E.hexLabel(o.hex);
    g.appendChild(lbl);
    return lbl;
  }
});
