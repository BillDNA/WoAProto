(function(g){(g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],battalions:[]}).cards.push(
{
 "id": "raiding_party",
 "name": "Raiding Party",
 "abbr": "RP",
 "faction": null,
 "text": "Place an Infantry unit adjacent to any controlled hex. Then order an attack: your attacker survives a tie and never advances into the hex. (A tie against a trench spares both sides.)",
 "steps": [
  {
   "type": "deploy",
   "unit": "infantry"
  },
  {
   "type": "attack",
   "tieSpare": true,
   "noAdvance": true
  }
 ]
}
);})(typeof window!=='undefined'?window:globalThis);
