/* The board colours several households paint with and none owns — what is left
   of the BOARD palette after each house took its share. Like svgEl and
   defineKind next door: no domain of its own.

   Each entry is labelled with its actual owner, so the next house built can
   find its share and take it:

     red / redDark / blue / blueDark / side()   the SEAT's. A side is red or
       blue whether or not a unit is standing on it, so it is not the unit's
       and not the board's. Read by the unit token, the HQ mark and fx.
     supportAlly / supportEnemy                 fx's. The two accents a
       support ring is played in; nothing standing on the board wears them.

   Gone from here: the board's own inks (BOARD_CONFIG.ink), terrain's colours
   (ui/board/terrain/terrain.css), the hex tile's (HEX_CONFIG.ink) and the
   unit chit's (UNIT_CONFIG.ink). BOARD.terrainStroke is attached by the
   terrain house at load.

   A colour the stylesheet also paints lives in :root once and is read here as
   var(--…), which resolves in an SVG attribute too.

   Classic script, no wrapper; loads before anything that draws. */
'use strict';

var BOARD = {
  red:'var(--red)', redDark:'var(--red-dark)', blue:'var(--blue)', blueDark:'var(--blue-dark)',
  supportAlly:'var(--gold)',    // gold — an allied unit whose support counted
  supportEnemy:'var(--steel)'   // slate — a defender's support that counted
};
BOARD.side = function(owner){
  return owner==='red' ? { fill:BOARD.red, dark:BOARD.redDark } : { fill:BOARD.blue, dark:BOARD.blueDark };
};
