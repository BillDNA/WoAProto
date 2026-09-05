/* Every dial for a hex on screen, one row per board that draws hexes. Change a
   row and that board redraws at the new size with every mark on it scaling
   along; what a MARK sits at inside its hex is that mark's own fraction,
   declared with the mark.

   Classic script, no wrapper; loads after the engine, before hex-screen.js. */
'use strict';

var HEX_CONFIG = window.Engine.defineConfigHome({
  // size = the hex radius, the spacing everything on that board inherits
  // tile = the radius the parchment tile is drawn at, so tiles have a gutter
  board:   { size: 44,   tile: 43   },   // the live skirmish board, the map editor, fx
  manual:  { size: 34,   tile: 33   },   // the Field Manual's mini-board
  mapPane: { size: 44,   tile: 40   },   // the dashboard's hex lenses (wide gutter, no terrain)
  thumb:   { size: 11,   tile: 10.4 },   // the map-library thumbnails
  // pointers into ui/board/hex/hex.css, for the two renderers that cannot use
  // the .hex class: the string-built thumbnails and the editor's ghost hex
  ink: {
    tile: 'var(--hex)', tileStroke: 'var(--hex-stroke)',
    ghost: 'var(--hex-ghost)', ghostStroke: 'var(--hex-ghost-stroke)', ghostHover: 'var(--hex-ghost-hover)'
  }
});
