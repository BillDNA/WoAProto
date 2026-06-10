/* War of Attrition — built-in boards & maps.
   ============================================================================
   RAPID PROTOTYPING FILE. Everything assigned to WOA_BUILTIN below is PURE
   JSON — edit it freely (double-quoted keys, no trailing commas), save, and
   refresh the browser. `node test.js` validates every map and will point at
   exactly what is wrong.

   SHAPES — a board outline. "rows" is a list of [r, qFrom, qTo] spans of
   pointy-top axial coordinates (row r, hexes q=qFrom..qTo inclusive).
   Smaller r = higher on screen; within a row, larger q = further right.
   Keep shapes point-symmetric (the engine checks) so the editor's Mirror
   tool and fair HQ placement work. Keep boards <= 24 hexes: that is the
   laser-cutter ceiling for the physical board, and with all units deployed
   both sides only ever control 22 hexes.

   MAPS — "shape" names a shape above. HQs are [q,r]. Each terrain piece is
   {"t":"F"|"M","edges":[[q,r,d],...]}: a side d (0=E 1=NE 2=NW 3=W 4=SW 5=SE)
   of hex (q,r). ALL sides of one piece must belong to THE SAME hex and wrap
   adjacent corners (contiguous directions) — exactly like the physical
   pieces. Forest in hex X: +1 attacking OUT of X across a covered side.
   Mountain in hex X: +1 defending X when attacked across a covered side.
   Physical stock per type: 2 pieces of length 3 + 4 pieces of length 2.
   There is no automatic mirroring here: list both halves of the map.
   ============================================================================ */
var WOA_BUILTIN =
{
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
  },

  "maps": [
    { "name": "Frontier", "shape": "classic",
      "redHQ": [0,-2], "blueHQ": [-1,2],
      "pieces": [
        { "t": "F", "edges": [[0,0,1],[0,0,2]] },
        { "t": "F", "edges": [[-1,0,4],[-1,0,5]] },
        { "t": "M", "edges": [[2,-1,3],[2,-1,4]] },
        { "t": "M", "edges": [[-3,1,0],[-3,1,1]] }
      ] },

    { "name": "The Bulge", "shape": "classic",
      "redHQ": [2,-2], "blueHQ": [-3,2],
      "pieces": [
        { "t": "M", "edges": [[0,-1,4],[0,-1,5],[0,-1,0]] },
        { "t": "M", "edges": [[-1,1,1],[-1,1,2],[-1,1,3]] },
        { "t": "F", "edges": [[1,0,1],[1,0,2]] },
        { "t": "F", "edges": [[-2,0,4],[-2,0,5]] }
      ] },

    { "name": "Twin Woods", "shape": "classic",
      "redHQ": [-1,-2], "blueHQ": [0,2],
      "pieces": [
        { "t": "F", "edges": [[-1,0,1],[-1,0,2],[-1,0,3]] },
        { "t": "F", "edges": [[0,0,4],[0,0,5],[0,0,0]] },
        { "t": "M", "edges": [[1,-2,5],[1,-2,0]] },
        { "t": "M", "edges": [[-2,2,2],[-2,2,3]] }
      ] },

    { "name": "Killing Ground", "shape": "classic",
      "redHQ": [1,-2], "blueHQ": [-3,1],
      "pieces": [
        { "t": "M", "edges": [[0,0,2],[0,0,3]] },
        { "t": "F", "edges": [[-1,1,5],[-1,1,0]] },
        { "t": "F", "edges": [[1,-1,3],[1,-1,4]] },
        { "t": "M", "edges": [[-2,0,1],[-2,0,2]] }
      ] },

    { "name": "The Cockpit", "shape": "compact",
      "redHQ": [0,-2], "blueHQ": [0,2],
      "pieces": [
        { "t": "F", "edges": [[0,0,1],[0,0,2]] },
        { "t": "F", "edges": [[0,0,4],[0,0,5]] },
        { "t": "M", "edges": [[2,-2,3],[2,-2,4]] },
        { "t": "M", "edges": [[-2,2,0],[-2,2,1]] }
      ] },

    { "name": "Highwater", "shape": "compact",
      "redHQ": [2,-2], "blueHQ": [-2,2],
      "pieces": [
        { "t": "F", "edges": [[0,-1,3],[0,-1,4]] },
        { "t": "F", "edges": [[0,1,0],[0,1,1]] },
        { "t": "M", "edges": [[-1,0,5],[-1,0,0]] },
        { "t": "M", "edges": [[1,0,2],[1,0,3]] }
      ] },

    { "name": "The Narrows", "shape": "hourglass",
      "redHQ": [1,-2], "blueHQ": [-1,2],
      "pieces": [
        { "t": "M", "edges": [[0,0,1],[0,0,2]] },
        { "t": "M", "edges": [[0,0,4],[0,0,5]] },
        { "t": "F", "edges": [[1,-2,4],[1,-2,5]] },
        { "t": "F", "edges": [[-1,2,1],[-1,2,2]] },
        { "t": "F", "edges": [[2,-1,2],[2,-1,3]] },
        { "t": "F", "edges": [[-2,1,5],[-2,1,0]] }
      ] },

    { "name": "Twin Gates", "shape": "hourglass",
      "redHQ": [3,-2], "blueHQ": [-3,2],
      "pieces": [
        { "t": "F", "edges": [[0,-1,3],[0,-1,4]] },
        { "t": "F", "edges": [[0,1,0],[0,1,1]] },
        { "t": "M", "edges": [[1,0,2],[1,0,3]] },
        { "t": "M", "edges": [[-1,0,5],[-1,0,0]] }
      ] },

    { "name": "Saber Ridge", "shape": "ridge",
      "redHQ": [2,-1], "blueHQ": [-2,2],
      "pieces": [
        { "t": "M", "edges": [[-1,0,5],[-1,0,0],[-1,0,1]] },
        { "t": "M", "edges": [[1,1,2],[1,1,3],[1,1,4]] },
        { "t": "M", "edges": [[0,0,1],[0,0,2]] },
        { "t": "M", "edges": [[0,1,4],[0,1,5]] },
        { "t": "F", "edges": [[2,0,2],[2,0,3]] },
        { "t": "F", "edges": [[-2,1,5],[-2,1,0]] }
      ] },

    { "name": "Thornfield", "shape": "ridge",
      "redHQ": [-2,0], "blueHQ": [2,1],
      "pieces": [
        { "t": "F", "edges": [[0,0,0],[0,0,1]] },
        { "t": "F", "edges": [[-1,2,1],[-1,2,2]] },
        { "t": "M", "edges": [[1,0,1],[1,0,2]] },
        { "t": "M", "edges": [[-1,1,4],[-1,1,5]] }
      ] },

    { "name": "Long March", "shape": "spear",
      "redHQ": [2,-3], "blueHQ": [-2,3],
      "pieces": [
        { "t": "M", "edges": [[1,0,2],[1,0,3]] },
        { "t": "M", "edges": [[-1,0,5],[-1,0,0]] },
        { "t": "F", "edges": [[1,-1,2],[1,-1,3]] },
        { "t": "F", "edges": [[-1,1,5],[-1,1,0]] },
        { "t": "F", "edges": [[-1,-1,4],[-1,-1,5]] },
        { "t": "F", "edges": [[1,1,1],[1,1,2]] }
      ] },

    { "name": "Vanguard", "shape": "spear",
      "redHQ": [1,-3], "blueHQ": [-1,3],
      "pieces": [
        { "t": "M", "edges": [[1,-2,3],[1,-2,4]] },
        { "t": "M", "edges": [[-1,2,0],[-1,2,1]] },
        { "t": "F", "edges": [[2,-1,3],[2,-1,4]] },
        { "t": "F", "edges": [[-2,1,0],[-2,1,1]] },
        { "t": "F", "edges": [[0,0,1],[0,0,2]] },
        { "t": "F", "edges": [[0,0,4],[0,0,5]] }
      ] }
  ]
};
if (typeof module !== 'undefined' && module.exports) module.exports = WOA_BUILTIN;
