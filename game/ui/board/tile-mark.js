/* The parchment hex the board is made of. Its dark twin is a parity of the
   coordinate, so no caller works one out; a board that paints its own tiles
   (a string-built thumbnail, a dashboard lens) passes the ink instead. */
'use strict';

defineBoardMark({
  mark: 'tile',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = o.hex ? hexXY(o.hex, o.s) : [o.cx, o.cy];
    var rad = o.rad != null ? o.rad : HEX_CONFIG[o.on].tile;
    var a = { points: hexPoints(xy[0], xy[1], rad) };
    if (o.d.inline || o.fill){
      // no stylesheet reaches a string-built SVG, so read the class's own vars
      a.fill = o.fill || HEX_CONFIG.ink.tile;
      a.stroke = o.stroke || HEX_CONFIG.ink.tileStroke;
      if (o.d.sw != null) a['stroke-width'] = o.d.sw;
    } else {
      var dark = o.dark;
      if (dark === undefined && o.hex){ var qr = E.parseKey(o.hex); dark = ((qr[0]-qr[1])%2+2)%2; }
      a['class'] = 'hex' + (dark ? ' dark' : '');
    }
    var p = svgEl('polygon', a);
    if (o.data && o.hex) p.dataset.hex = o.hex;
    g.appendChild(p);
    return p;
  }
});
