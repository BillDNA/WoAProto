/* What Red and Blue look like.

   This is the RED / BLUE house's screen dialect, and that house is not built
   yet — it has a lexicon entry (docs/context/game-concepts-context.md, "Red /
   Blue": the two sides) and its engine dialect is `other(p)` in
   engine/01-core.js, but nothing has been gathered under it. This file is its
   share, sitting in kit/ until it has a household to sit in, because a side is
   red or blue whether or not a unit, an HQ or a mark is standing on it.

   Every house that paints a side asks here and paints whatever comes back — the
   unit token (ui/board/unit/), the HQ mark (ui/board/hq-mark.js), the strike
   arrow. None of them names a colour, and each has a test in its own suite
   pinning that, so the day this house is built the callers do not move.

   supportAlly / supportEnemy are NOT the seat's: they are the two accents a
   support ring is played in, and they belong with the ring's meaning, not with
   whose ring it is. They sit here for the same reason — no house yet.

   BOARD.terrainStroke is attached by the terrain house at load, so a caller can
   ask what a terrain letter paints without knowing the terrain house's shape.

   A colour the stylesheet also paints lives in :root once and is read here as
   var(--…), which resolves in an SVG attribute too.

   Classic script, no wrapper; loads before anything that draws. */
'use strict';

var BOARD = {
  red:'var(--red)', redDark:'var(--red-dark)', blue:'var(--blue)', blueDark:'var(--blue-dark)',
  supportAlly:'var(--gold)',    // gold — an allied unit whose support counted
  supportEnemy:'var(--steel)'   // slate — a defender's support that counted
};
// The one answer to "what does this side look like": a fill and its shadow.
BOARD.side = function(owner){
  return owner==='red' ? { fill:BOARD.red, dark:BOARD.redDark } : { fill:BOARD.blue, dark:BOARD.blueDark };
};
