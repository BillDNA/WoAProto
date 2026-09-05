/* The UNIT: a side-coloured counter with the chit and the type's glyph —
   infantry crossed, cavalry a single slash, artillery a shot.

   It gets its own group carrying the hex, because the live board hangs the
   attack-math hover on it and the manual fades it as one thing. */
'use strict';

bpMark({ id:'unit', lifetime:'kept', draw: function(into, o, s){
  var xy = hexXY(o.hex, s), cx = xy[0], cy = xy[1];
  var u = o.unit, sc = BOARD.side(u.owner), col = sc.fill, colD = sc.dark;
  var r = s*BOARD_R.unit, hw = s*BOARD_R.chitHW, hh = s*BOARD_R.chitHH, gsw = s*BOARD_SW.glyph;
  var g = svgEl('g', { 'class':'unit' + (o.cls ? ' ' + o.cls : ''), 'data-hex':o.hex });
  g.appendChild(svgEl('circle', { cx:cx, cy:cy, r:r, fill:col, stroke:colD, 'stroke-width':s*BOARD_SW.unit }));
  g.appendChild(svgEl('rect', { x:cx-hw, y:cy-hh, width:hw*2, height:hh*2,
    fill:BOARD.chit, stroke:colD, 'stroke-width':s*BOARD_SW.chit, rx:1.5 }));
  if (u.type==='infantry'){
    g.appendChild(svgEl('line', { x1:cx-hw, y1:cy-hh, x2:cx+hw, y2:cy+hh, stroke:colD, 'stroke-width':gsw }));
    g.appendChild(svgEl('line', { x1:cx-hw, y1:cy+hh, x2:cx+hw, y2:cy-hh, stroke:colD, 'stroke-width':gsw }));
  } else if (u.type==='cavalry'){
    g.appendChild(svgEl('line', { x1:cx-hw, y1:cy+hh, x2:cx+hw, y2:cy-hh, stroke:colD, 'stroke-width':gsw }));
  } else {
    g.appendChild(svgEl('circle', { cx:cx, cy:cy, r:s*BOARD_R.art, fill:colD }));
  }
  into.appendChild(g);
  return g;
}});
