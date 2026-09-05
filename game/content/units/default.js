/* The shipped army — the unit set every skirmish uses unless another file here
   is flagged active, exactly as content/battalions/default.js works for cards.
   One row per type, keyed by its game word (the rooms in engine/board/unit/).
   Retune a number, refresh, play. */
(function(g){var c=g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],battalions:[],mapsets:[],units:[],commanders:[]};(c.units=c.units||[]).push(
{
 "id": "default",
 "name": "Line Army",
 "active": true,
 "units": {
  //             the game word            attacking out  defending  lent to a neighbour  bounty  in the box  deploy surcharge
  "infantry":  { "name": "Infantry",  "atk": 1,      "def": 1,  "sup": 1,            "worth": 1, "count": 7, "deployCost": 0 },
  "cavalry":   { "name": "Cavalry",   "atk": 3,      "def": 0,  "sup": 0,            "worth": 2, "count": 2, "deployCost": 1 },
  "artillery": { "name": "Artillery", "atk": 0,      "def": 0,  "sup": 2,            "worth": 3, "count": 1, "deployCost": 2 }
  // counts must total Engine.CONFIG.pieceTotal, and every type here needs a room
  // in engine/board/unit/ — both throw at load
 }
}
);})(typeof window!=='undefined'?window:globalThis);
