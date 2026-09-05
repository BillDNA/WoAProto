/* The one createElementNS in the UI.

   Every SVG the game draws — the board and its marks, the terrain glyphs, the
   editor, the manual's mini-board, fx — is built through here. No domain of its
   own: like defineKind next door, several households use it and none owns it.

   (The dashboard's charts build SVG as strings, not elements, so they have their
   own opener in ui/chart-primitives.js.)

   Classic script, no wrapper; loads before anything that draws. */
'use strict';

function svgEl(tag, attrs){
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
