/* The hex house — the screen's dialect: a hex as a POSITION.

   The same concept as game/engine/hex/hex.js, asked in pixels. A hex's identity
   is not respelled here: every function starts from the engine's key and reads
   it through E.parseKey / E.DIRS, so the two dialects cannot drift.

   S is the hex size the live board draws at; every helper takes an optional
   scale so a mini-board (the manual, the map thumbnails) shares ONE
   implementation rather than a tuned copy. Everything that draws hexes —
   board-primitives.js and every board over it, the terrain marks, the editor,
   the manual, the dashboard's map pane — reaches position through this file.

   What a board frames, insets or paints is NOT here: that is the board's, and
   it calls in. Classic script, no wrapper; loads before ui/board-primitives.js.

   Prose: game/engine/hex/hex.md */
'use strict';

var S = 44, HEX_SQ3 = Math.sqrt(3);

// Centre of hex k in board units.
function hexXY(k, s){
  s = s || S;
  var qr = E.parseKey(k);
  return [ s*HEX_SQ3*(qr[0] + qr[1]/2), s*1.5*qr[1] ];
}
// The two corner angles (degrees, y down) bounding the face in direction d.
// Derived from the engine's direction table so a direction means the same thing
// on both dialects: project the step, then take 30 degrees either side of it.
// The six are exact multiples of 60, so round off the projection's float dust.
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
// side (terrain, a trench, a barrage target, the editor's click strip) lands.
function hexEdgePts(hexKey, dir, rad, s){
  var c = hexXY(hexKey, s), aa = hexCornerAngles(dir);
  return [ hexCornerPt(c[0], c[1], aa[0], rad), hexCornerPt(c[0], c[1], aa[1], rad) ];
}
