/* War of Attrition — CORE tunable game data: units, board shapes, terrain stock, AI.
   ============================================================================
   RAPID PROTOTYPING FILE. Everything assigned to WOA_BUILTIN below is PURE
   JSON — edit it freely (double-quoted keys, no trailing commas), save, and
   refresh the browser. `node test.js` validates everything and will point at
   exactly what is wrong. `node balance.js` shows what your change did.

   NOTE: the MAP LIBRARY and the CARD BATTALIONS do not live here — they are per-item
   files under game/content/ (maps/<slug>.js,
   battalions/<slug>.js) that each register into a WOA_CONTENT global, so you can
   delete a map or a battalion by deleting its file (no more localStorage tombstones).
   The engine assembles the full data set from THIS file (shapes/units/stock/ai)
   plus WOA_CONTENT (maps + the active battalion's cards). See content/manifest.js.

   UNITS — stats per unit type: atk/def/sup (support given to adjacent
   fights), worth (bounty the enemy scores for killing it), count (pieces per
   player). Terrain dials live in "terrain" below.

   SHAPES — a board outline. "rows" is a list of [r, qFrom, qTo] spans of
   pointy-top axial coordinates (row r, hexes q=qFrom..qTo inclusive).
   Smaller r = higher on screen; within a row, larger q = further right.
   Keep shapes point-symmetric (the engine checks) so the editor's Mirror
   tool and fair HQ placement work. Keep boards <= 24 hexes: that is the
   laser-cutter ceiling for the physical board, and with all units deployed
   both sides only ever control 22 hexes.

   Card + map field guides now live with the content files and in
   ../docs/reference/card-cheatsheet.md. What a terrain does is written in its
   own file in engine/board/terrain/.
   ============================================================================ */
var WOA_BUILTIN =
{
  "units": {
    "infantry":  { "name": "Infantry",  "atk": 1, "def": 1, "sup": 1, "worth": 1, "count": 7 },
    "cavalry":   { "name": "Cavalry",   "atk": 3, "def": 0, "sup": 0, "worth": 2, "count": 2 },
    "artillery": { "name": "Artillery", "atk": 0, "def": 0, "sup": 2, "worth": 3, "count": 1 }
  },
  /* TERRAIN — one row per type, keyed by its game word (the rooms in
     engine/board/terrain/). "pieces" is how many physical chits of each side
     length the box holds; the editor warns past it. Trench "perSide" is
     trenches per player. A type's combat dials sit in its row too. */
  "terrain": {
    "forest":   { "attack": 1,  "pieces": { "2": 4, "3": 2 } },
    "mountain": { "defense": 1, "pieces": { "2": 4, "3": 2 } },
    "river":    { "pieces": { "2": 4, "3": 2 } },
    "trench":   { "perSide": 3 }
  },

  /* AI — extra personalities as data (easy/normal/hard are built in). A config
     is { noise, breadth, replySamples, replyWeight, weights:{...} }: noise =
     evaluation randomness (mistakes), breadth = top candidates re-scored by the
     enemy's sampled best reply (0 = pure greedy; 3 = the hard AI's search),
     weights override engine AI_WEIGHTS terms (attrWin, fsDiff, fsDiffUrgent,
     unitOnBoard, unitReserve, advance, hqGuard, enemyDist, myThreatHQ,
     myThreatKill, threatHQ, threatKill, threatTie, trenchHome, trenchFacing,
     noopPenalty, antiShuffle, fallbackBias, shortlist). New AI = new row. Pit them:
     node balance.js matchup 16 brawler turtle */
  "ai": {
    "brawler": { "noise": 0, "breadth": 0,
      "weights": { "myThreatKill": 7, "threatKill": 3, "advance": 4, "unitReserve": 10 } },
    "turtle":  { "noise": 0, "breadth": 0,
      "weights": { "hqGuard": 12, "enemyDist": 3, "advance": 0.8, "trenchHome": 12, "unitOnBoard": 26 } },
    "hawk": {"noise": 0, "breadth": 0,
      "weights": {
        "unitOnBoard": 28, "advance": 3.25, "myThreatKill": 5, "threatKill": 5, "threatTie": 0.5
      }
    },
    /* A weight-sweep survivor, REJECTED for the AI_WEIGHTS defaults: it lost the
       matchup gate to hard. Kept as an inactive pit-able personality. */
    "tuned": { "noise": 0, "breadth": 3, "replySamples": 2, "replyWeight": 0.7,
      "weights": { "enemyDist": 2.4, "fsDiff": 4, "threatTie": 1.88 } }
  },

  "shapes": {
    "classic":   { "label": "Classic (4-5-6-5-4, 24 hexes)",
                   "rows": [[-2,-1,2],[-1,-2,2],[0,-3,2],[1,-3,1],[2,-3,0]] },
    "compact":   { "label": "Compact (3-4-5-4-3, 19 hexes)",
                   "rows": [[-2,0,2],[-1,-1,2],[0,-2,2],[1,-2,1],[2,-2,0]] },
    "hourglass": { "label": "Hourglass (5-4-3-4-5, 21 hexes)",
                   "rows": [[-2,-1,3],[-1,-1,2],[0,-1,1],[1,-2,1],[2,-3,1]] },
    "ridge":     { "label": "Ridge (4 slanted rows of 5, 20 hexes)",
                   "rows": [[-1,-2,2],[0,-2,2],[1,-2,2],[2,-2,2]] },
    "spear":     { "label": "Spear (2-3-4-5-4-3-2, 23 hexes)",
                   "rows": [[-3,1,2],[-2,0,2],[-1,-1,2],[0,-2,2],[1,-2,1],[2,-2,0],[3,-2,-1]] }
  }
};
if (typeof module !== 'undefined' && module.exports) module.exports = WOA_BUILTIN;
