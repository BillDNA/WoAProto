/* The HEADQUARTERS: a side-coloured hex, a brass ring, a star.

   `ring:false` drops the brass — the map editor's plain flag, which marks a
   position rather than a standing HQ. */
'use strict';

bpMark({ id:'hq', lifetime:'kept', draw: function(into, o, s){
  var xy = hexXY(o.hex, s), cx = xy[0], cy = xy[1];
  var col = BOARD.side(o.side).fill, pe = o.pe;
  var g = svgEl('g', { 'class': 'hq' + (o.cls ? ' ' + o.cls : '') });
  function add(el){ if (pe) el.setAttribute('pointer-events', pe); g.appendChild(el); }
  add(svgEl('polygon', { points: hexPoints(cx, cy, s*BOARD_R.hqOuter),
    fill:col, stroke:BOARD.outline, 'stroke-width':s*BOARD_SW.hqOuter, opacity:.92 }));
  if (o.ring !== false)
    add(svgEl('polygon', { points: hexPoints(cx, cy, s*BOARD_R.hqInner),
      fill:'none', stroke:BOARD.brass, 'stroke-width':s*BOARD_SW.hqBrass }));
  var star = svgEl('text', { x:cx, y:cy + s*BOARD_R.starDrop, 'text-anchor':'middle',
    'font-size':s*BOARD_R.starSize, fill:BOARD.star });
  star.textContent = '★';
  add(star);
  into.appendChild(g);
  return g;
}});
