/* FALLEN: where a unit was, left behind to fade.

   The live board's mark for a death. Its still-frame twin is `struck` — the
   manual annotates a counter that is gone rather than fading one away, so the
   two look like one mark and are not. */
'use strict';

bpMark({ id:'fallen', lifetime:'transient', draw: function(g, o, s){
  var xy = hexXY(o.hex, s), sc = BOARD.side(o.owner);
  g.appendChild(svgEl('circle', { cx:xy[0], cy:xy[1], r:s*BOARD_R.unit,
    fill:sc.fill, stroke:sc.dark, 'stroke-width':s*BOARD_SW.unit }));
}});
