/* The BOARD house's THUMBNAIL room: the map-library previews.

   Its own emitter, deliberately. Every other mark builds DOM; a thumbnail goes
   into innerHTML, so this room returns an SVG string. The geometry and the
   palette are the house's; only the emitter and the deliberately-plainer look
   (its own tile ink, an HQ with no brass ring or star) are its own. */
'use strict';

function bpThumbHex(cx, cy, rad){
  return '<polygon points="'+hexPoints(cx, cy, rad)+'" fill="'+BOARD.thumbTile+'" stroke="'+BOARD.thumbTileStroke+'" stroke-width="0.8"/>';
}
function bpThumbHQ(cx, cy, side, rad){
  return '<polygon points="'+hexPoints(cx, cy, rad)+'" fill="'+BOARD.side(side).fill+'" stroke="'+BOARD.outline+'" stroke-width="0.8"/>';
}
// self-contained map thumbnail (no global board state): tiles, terrain sides, HQs.
function previewSVG(def){
  var s = 11;
  var hexList = E.boardHexes(E.ensureMapShape(def));
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  var body = '';
  hexList.forEach(function(k){
    var p = hexXY(k, s);
    minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]);
    body += bpThumbHex(p[0], p[1], s-0.6);
  });
  (def.pieces||[]).forEach(function(pc){
    pc.edges.forEach(function(e){
      var c = hexXY(E.key(e[0],e[1]), s), aa = cornerAngles(e[2]);
      body += bpThumbTerrain(cornerPt(c[0],c[1],aa[0],s-2.4), cornerPt(c[0],c[1],aa[1],s-2.4), pc.t);
    });
  });
  ['red','blue'].forEach(function(side){
    var hq = def[side+'HQ'];
    if (!hq) return;
    var p = hexXY(E.key(hq[0],hq[1]), s);
    body += bpThumbHQ(p[0], p[1], side, s*0.62);
  });
  var m = s*1.4;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0)+'">'+body+'</svg>';
}
