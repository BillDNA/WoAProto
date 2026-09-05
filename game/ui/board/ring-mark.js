/* A ring round a hex — "this one counted". The live board plays it for a beat
   after an action; the Field Manual holds the same ring still and lets its
   class say which kind of support it was. */
'use strict';

defineBoardMark({
  mark: 'ring',
  lifetime: 'transient',
  draw: function(g, o){
    var xy = hexXY(o.hex, o.s);
    var a = { cx:xy[0], cy:xy[1], r:o.s * o.d.r, fill:'none', 'stroke-width':o.d.sw,
      'class':o.cls || 'fx-ring' };
    if (o.color) a.stroke = o.color;    // otherwise the class carries the colour
    var c = svgEl('circle', a);
    g.appendChild(c);
    return c;
  }
});
