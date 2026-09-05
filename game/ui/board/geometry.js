/* The BOARD house's GEOMETRY: where a hex is, and the frame its marks go into.

   Every board in the game — the live one, the field manual's diagram, the map
   editor, the library thumbnails — asks these the same questions and differs
   only in the scale it passes. Nothing here knows what a mark looks like.

   Sizes are always `s` (the hex radius), defaulting to the live board's S. */
'use strict';

var SQ3 = Math.sqrt(3);

function hexXY(k, s){
  s = s || S;
  var qr = E.parseKey(k);
  return [ s*SQ3*(qr[0] + qr[1]/2), s*1.5*qr[1] ];
}
function cornerAngles(d){ // dir -> [a1,a2] degrees (y down)
  var ang = [0,-60,-120,180,120,60][d];
  return [ang-30, ang+30];
}
function cornerPt(cx, cy, angDeg, rad){
  var a = angDeg*Math.PI/180;
  return [cx + rad*Math.cos(a), cy + rad*Math.sin(a)];
}
function hexPoints(cx, cy, rad){
  var pts = [];
  for (var i=0;i<6;i++){
    var a = (60*i - 90)*Math.PI/180;
    pts.push((cx+rad*Math.cos(a)).toFixed(1)+','+(cy+rad*Math.sin(a)).toFixed(1));
  }
  return pts.join(' ');
}
function svgEl(tag, attrs){
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function viewBoxFor(hexList, s){
  s = s || S;
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  hexList.forEach(function(k){
    var xy = hexXY(k, s);
    minX=Math.min(minX,xy[0]); maxX=Math.max(maxX,xy[0]);
    minY=Math.min(minY,xy[1]); maxY=Math.max(maxY,xy[1]);
  });
  var m = s*1.3;
  return (minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0);
}
// the two endpoints of an inset edge (terrain, trenches and barrage all share it)
function bpEdgePts(hexKey, dir, rad, s){
  var c = hexXY(hexKey, s), aa = cornerAngles(dir);
  return [ cornerPt(c[0], c[1], aa[0], rad), cornerPt(c[0], c[1], aa[1], rad) ];
}

// Clear the live board, size its viewBox to the hex geometry (which kills empty
// gutters on tall maps), and lay down the five draw layers back-to-front.
// Returns the layer groups the caller draws its marks into.
function bpBeginBoard(svg){
  svg.innerHTML = '';
  svg.setAttribute('viewBox', viewBoxFor(E.hexes()));
  var vb = svg.getAttribute('viewBox').split(' ');
  svg.style.setProperty('--board-ar', (parseFloat(vb[2]) / parseFloat(vb[3])).toFixed(4));
  var layers = { hex:svgEl('g',{}), ter:svgEl('g',{}), tr:svgEl('g',{}), pc:svgEl('g',{}), hl:svgEl('g',{}) };
  svg.appendChild(layers.hex); svg.appendChild(layers.ter); svg.appendChild(layers.tr);
  svg.appendChild(layers.pc); svg.appendChild(layers.hl);
  return layers;
}
