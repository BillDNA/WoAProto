/* Every dial for a mark on a hex board, one row per board that draws one. The
   `board` row is the live skirmish board and every other row is read OVER it,
   so a row names only what that surface does differently. A row's name is also
   its row in hex-config.js, which is where the hex size comes from — scale is
   the caller's, not a second set of numbers here.

   What a mark IS drawn like beyond these numbers is that mark's own file.

   Classic script, no wrapper; loads after the engine, before board-marks.js. */
'use strict';

var BOARD_CONFIG = window.Engine.defineConfigHome({
  // the live skirmish board, the map editor and fx
  board: {
    frame:     { gutter: 1.3 },        // viewBox margin round the outline, in hex sizes
    coord:     { dy: -0.58 },          // the grid label's rise above the hex centre
    hq:        { outer: 0.62, inner: 0.5, outerSW: 2, brassSW: 1.6,
                 starFS: 20, starDY: 7, opacity: 0.92 },
    // noOutcome = the fill when the caller names no outcome; on the live board
    // an attack always has one, so it falls to the defender's red
    pill:      { charW: 6.6, pad: 12, h: 17, rx: 8.5, sw: 1,
                 dy: 0.18, textDY: 12.5, fs: 11, noOutcome: 'defender' },
    ring:      { r: 0.8, sw: 5, ms: 600 },
    strike:    { sw: 6, dash: '13 8', opacity: 0.9, tip: 0.42, headL: 14, headW: 8, ms: 900 },
    // struck / glow / badge are the base row because that is where a mark's
    // defaults live; only the Field Manual's diagram draws them today
    struck:    { sw: 2.5, r: { unit: 12, hq: 13 } },   // the ✕ over a piece that fell
    glow:      { side: { sw: 11, rad: 0.85 }, trench: { sw: 10, rad: 0.74 } },
    badge:     { dx: 0.55, dy: -0.6, r: 7.5, fs: 10, textDY: 3.5, sw: 1 },
    highlight: { inset: 2 },           // inside the tile, so the tile's edge still reads
    ghost:     { inset: 3, sw: 1.4, dash: '6 5' },
    tile:      { sw: null },           // null = the .hex class paints it
    // every board ink the stylesheet also paints is a var read back here; the
    // pill fills the stylesheet never sees are named once
    ink: {
      outline: 'var(--ink-plate)',     // the near-black board ink (piece + pill strokes)
      star:    'var(--star)',          // HQ star + pill text
      brass:   'var(--brass)',         // the HQ's inner ring
      barrage: 'var(--attack)',        // barrage action marks
      // the attack-math pill by combat outcome (neutral = the manual's "no clear side")
      hint: { attacker: 'rgba(58,99,48,.92)', tie: 'rgba(138,108,60,.94)',
              defender: 'rgba(111,29,25,.92)', neutral: 'rgba(74,61,38,.92)' }
    }
  },
  // the Field Manual's mini-board: the same marks with weights tuned for 34px hexes
  manual: {
    hq:     { outerSW: 1.6, brassSW: 1.3, starFS: 15, starDY: 5.5 },
    pill:   { charW: 6.4, pad: 14, h: 16, rx: 8, dy: 0.52, textDY: 11.5, fs: 10.5, noOutcome: 'neutral' },
    ring:   { r: 0.82, sw: 4 },
    strike: { sw: 4.5, dash: '10 6', opacity: null, tip: 0.46, headL: 11, headW: 6.5 }
  },
  // the map-library thumbnails: no CSS reaches a string-built SVG, so the tile
  // paints itself, and an HQ is a bare side-coloured hex at 11px
  thumb: {
    frame: { gutter: 1.4 },
    tile:  { sw: 0.8, inline: true },
    hq:    { inner: false, star: false, outerSW: 0.8, opacity: 1 }
  },
  // the dashboard's hex lenses: the data paints the tile, so only the HQ ring's
  // shape is a dial here — a ring just inside the tile (0.864 * 44 = 38 = tile - 2)
  mapPane: {
    tile: { sw: 1, inline: true },
    hq:   { outer: 0.864, inner: false, outerSW: 3, starFS: 16, starDY: 5.5, opacity: 1 }
  }
});
