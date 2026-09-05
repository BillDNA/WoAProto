/* A hex as a POSITION — game/engine/board/hex/hex.js asked in pixels. Starts from the
   engine's key and DIRS every time, so the two cannot drift.

   Every helper takes a scale; the scales are hex-config.js, one row per board,
   and omitting it draws at the live board's. What a board frames or paints is
   the board's and calls in here.

   Classic script, no wrapper; loads before ui/board/board-marks.js.
   Prose: game/engine/board/hex/hex.md */
'use strict';

var HEX_SQ3 = Math.sqrt(3);

// Centre of hex k in board units.
function hexXY(k, s){
  s = s || HEX_CONFIG.board.size;
  var qr = E.parseKey(k);
  return [ s*HEX_SQ3*(qr[0] + qr[1]/2), s*1.5*qr[1] ];
}
// The two corner angles (degrees, y down) bounding the face in direction d:
// project the engine's step, then take 30 degrees either side. The six land on
// exact multiples of 60, so round the projection's float dust off.
function hexCornerAngles(d){
  var v = E.DIRS[d];
  var ang = Math.round(Math.atan2(1.5*v[1], HEX_SQ3*(v[0] + v[1]/2)) * 180/Math.PI);
  return [ang-30, ang+30];
}
function hexCornerPt(cx, cy, angDeg, rad){
  var a = angDeg*Math.PI/180;
  return [cx + rad*Math.cos(a), cy + rad*Math.sin(a)];
}
// The six corners of a hexagon at (cx,cy), as an SVG points string.
function hexPoints(cx, cy, rad){
  var pts = [];
  for (var i=0;i<6;i++){
    var a = (60*i - 90)*Math.PI/180;
    pts.push((cx+rad*Math.cos(a)).toFixed(1)+','+(cy+rad*Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}
// The two endpoints of one hex's face, inset to rad — where anything drawn on a
// side lands.
function hexEdgePts(hexKey, dir, rad, s){
  var c = hexXY(hexKey, s), aa = hexCornerAngles(dir);
  return [ hexCornerPt(c[0], c[1], aa[0], rad), hexCornerPt(c[0], c[1], aa[1], rad) ];
}
