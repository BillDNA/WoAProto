/* A whole board from a map def and nothing else — no live state, no screen. The
   map library shows one per map, so it comes out as markup (it goes into
   innerHTML) at the thumb row's scale, drawn from the same marks as every other
   board. Pure: asking for a thumbnail never moves the live board.

   Classic script, no wrapper. Prose: engine/board/board.md */
'use strict';

function previewSVG(def){
  var on = 'thumb', s = HEX_CONFIG[on].size;
  var hexList = E.outlineHexes(E.outline(def));
  var tiles = bpMarkup(function(g){
    hexList.forEach(function(k){ bpMark('tile', g, { hex:k, on:on }); });
  });
  var terrain = '';
  (def.pieces||[]).forEach(function(pc){
    pc.edges.forEach(function(e){
      var c = hexXY(E.key(e[0],e[1]), s), aa = hexCornerAngles(e[2]);
      terrain += bpThumbTerrain(hexCornerPt(c[0],c[1],aa[0],s-2.4), hexCornerPt(c[0],c[1],aa[1],s-2.4), pc.t);
    });
  });
  var hqs = bpMarkup(function(g){
    ['red','blue'].forEach(function(side){
      var hq = def[side+'HQ'];
      if (hq) bpMark('hq', g, { hex:E.key(hq[0],hq[1]), side:side, on:on });
    });
  });
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBoxFor(hexList, null, on) + '">' +
    tiles + terrain + hqs + '</svg>';
}
