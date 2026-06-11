/* War of Attrition — ALL tunable game data: boards, maps, units, cards.
   ============================================================================
   RAPID PROTOTYPING FILE. Everything assigned to WOA_BUILTIN below is PURE
   JSON — edit it freely (double-quoted keys, no trailing commas), save, and
   refresh the browser. `node test.js` validates everything and will point at
   exactly what is wrong. `node balance.js` shows what your change did.

   UNITS — stats per unit type: atk/def/sup (support given to adjacent
   fights), vp (bounty the enemy scores for killing it), count (pieces per
   player). "trenchCount" is trenches per player. "terrainStock" caps the
   physical terrain pieces per type+length (the editor warns past it).

   CARDS — the 16-card deck. "count" = copies. "starting": true marks the
   guaranteed first-hand card. "steps" run in order; types: deploy (unit,
   optional anywhere:true), trench, attack (optional mod, tieSpare:true),
   reposition, barrage. The ids "airdrop" (kept out of opening hands) and
   the starting card id are meaningful to the engine — rename with care.

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
   There is no automatic mirroring here: list both halves of the map.
   ============================================================================ */
var WOA_BUILTIN =
{
  "units": {
    "infantry":  { "name": "Infantry",  "atk": 1, "def": 1, "sup": 1, "vp": 1, "count": 7 },
    "cavalry":   { "name": "Cavalry",   "atk": 3, "def": 0, "sup": 0, "vp": 2, "count": 2 },
    "artillery": { "name": "Artillery", "atk": 0, "def": 0, "sup": 2, "vp": 3, "count": 1 }
  },
  "trenchCount": 3,
  "terrainStock": { "F3": 2, "F2": 4, "M3": 2, "M2": 4 },

  "cards": [
    { "id": "deploy_inf_start", "name": "Deploy Infantry", "count": 1, "starting": true,
      "text": "Place an Infantry unit adjacent to any controlled hex.",
      "steps": [{ "type": "deploy", "unit": "infantry" }] },
    { "id": "deploy_artillery", "name": "Deploy Artillery", "count": 1,
      "text": "Place an Artillery unit adjacent to any controlled hex.",
      "steps": [{ "type": "deploy", "unit": "artillery" }] },
    { "id": "deploy_inf_trench", "name": "Entrench", "count": 3,
      "text": "Place an Infantry unit adjacent to any controlled hex. Then build a trench on any controlled hex.",
      "steps": [{ "type": "deploy", "unit": "infantry" }, { "type": "trench" }] },
    { "id": "airdrop", "name": "Airdrop", "count": 1,
      "text": "Place an Infantry unit on any empty hex. (Never in your opening hand.)",
      "steps": [{ "type": "deploy", "unit": "infantry", "anywhere": true }] },
    { "id": "conscription", "name": "Conscription", "count": 1,
      "text": "Place two Infantry units adjacent to any controlled hex, in sequence.",
      "steps": [{ "type": "deploy", "unit": "infantry" }, { "type": "deploy", "unit": "infantry" }] },
    { "id": "deploy_cavalry", "name": "Deploy Cavalry", "count": 1,
      "text": "Place two Cavalry units adjacent to any controlled hex, in sequence.",
      "steps": [{ "type": "deploy", "unit": "cavalry" }, { "type": "deploy", "unit": "cavalry" }] },
    { "id": "attack_plus1", "name": "Attack +1", "count": 2,
      "text": "Order an attack with +1 support.",
      "steps": [{ "type": "attack", "mod": 1 }] },
    { "id": "mass_assault", "name": "Mass Assault", "count": 1,
      "text": "Order an attack. Then order another attack.",
      "steps": [{ "type": "attack" }, { "type": "attack" }] },
    { "id": "careful_maneuvers", "name": "Careful Maneuvers", "count": 1,
      "text": "Reposition a unit. Then order an attack with −1 support.",
      "steps": [{ "type": "reposition" }, { "type": "attack", "mod": -1 }] },
    { "id": "reckless_maneuvers", "name": "Reckless Maneuvers", "count": 1,
      "text": "Order an attack. Then reposition a unit.",
      "steps": [{ "type": "attack" }, { "type": "reposition" }] },
    { "id": "ordered_withdraw", "name": "Ordered Withdraw", "count": 1,
      "text": "Order an attack. On a tie, your attacker survives but does not take the hex.",
      "steps": [{ "type": "attack", "tieSpare": true }] },
    { "id": "naval_barrage", "name": "Naval Barrage", "count": 1,
      "text": "Remove any trench or forest on the board (optional). Then order an attack.",
      "steps": [{ "type": "barrage" }, { "type": "attack" }] },
    { "id": "forced_march", "name": "Forced March", "count": 1,
      "text": "Reposition up to three times, in sequence.",
      "steps": [{ "type": "reposition" }, { "type": "reposition" }, { "type": "reposition" }] }
  ],

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
