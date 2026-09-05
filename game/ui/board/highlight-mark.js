/* A hex the player may click: a fill inside the tile's edge. Which class it
   wears is the step's business (board.css paints them); the click handler is
   the caller's. */
'use strict';

defineBoardMark({
  mark: 'highlight',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = hexXY(o.hex, o.s);
    var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], HEX_CONFIG[o.on].tile - o.d.inset),
      'class':'hl ' + o.cls });
    g.appendChild(p);
    return p;
  }
});
