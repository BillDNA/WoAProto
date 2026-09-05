/* The BOARD house's dials: the hex size every board scales from, the radii and
   line weights its marks derive from, and the palette they take their ink from.

   The twin of :root for the board's SVG. A colour the stylesheet also paints
   lives in :root once and is read here as var(--…) — it resolves in an SVG
   attribute, same as the unit fills. The glyph inks the stylesheet never sees
   are named here and nowhere else.

   Terrain colours are not here: each type's mark owns its own stroke and glyph
   ink, in ui/board/terrain/. */
'use strict';

// The live board's hex radius. Every other board passes its own scale and each
// mark derives from it, so this is the one size in the game that is authored.
var S = 44;

// Mark radii, as a fraction of the hex size — the inset a mark sits at.
// (terrain insets are per type, declared with each mark in ui/board/terrain/)
var BOARD_R = { hqOuter:0.62, hqInner:0.5, unit:0.5, chitHW:0.295, chitHH:0.205, art:0.102,
                starSize:0.455, starDrop:0.159 };
// Line weights, also as a fraction of the hex size, so a mini-board's strokes
// stay in proportion to its marks instead of being re-tuned per board.
var BOARD_SW = { unit:0.057, chit:0.032, glyph:0.045, hqOuter:0.045, hqBrass:0.036 };

var BOARD = {
  // side colours (units + HQ) from CSS
  red:'var(--red)', redDark:'var(--red-dark)', blue:'var(--blue)', blueDark:'var(--blue-dark)',
  brass:'var(--brass)',
  outline:'var(--ink-plate)',   // the near-black board ink (piece + pill strokes)
  chit:'#ece1c4',       // the unit chit
  star:'var(--star)',   // HQ star + pill text
  barrage:'var(--attack)',      // barrage action marks
  thumbTile:'var(--hex)', thumbTileStroke:'var(--hex-stroke)', // maps-screen preview tiles (own look, not the live .hex class)
  // attack-math pill fill by combat outcome (neutral = manual's "no clear side")
  hint:{ attacker:'rgba(58,99,48,.92)', tie:'rgba(138,108,60,.94)', defender:'rgba(111,29,25,.92)', neutral:'rgba(74,61,38,.92)' },
  // the editor/dig ghost-hex affordance (own board-only wash + gold hover)
  ghostFill:'rgba(255,255,255,.10)', ghostStroke:'rgba(74,61,38,.5)', ghostHover:'rgba(212,175,55,.28)',
  // support-ring accents
  supportAlly:'var(--gold)',    // gold — an allied unit whose support counted
  supportEnemy:'var(--steel)'   // slate — a defender's support that counted
};
BOARD.side = function(owner){
  return owner==='red' ? { fill:BOARD.red, dark:BOARD.redDark } : { fill:BOARD.blue, dark:BOARD.blueDark };
};
