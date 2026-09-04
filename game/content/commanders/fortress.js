(function(g){(g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],battalions:[],commanders:[]}).commanders=(g.WOA_CONTENT.commanders||[]);g.WOA_CONTENT.commanders.push(
{
 "id": "fortress",
 "name": "Fortress",
 "story": "",
 "weights": {},
 "traits": [
  {
   "primitive": "combatMod",
   "source": "passive",
   "role": "strength",
   "terrain": "forest|mountain",
   "when": "defense",
   "delta": 1,
   "name": "Dug In",
   "text": "+1 defense when defending across a forest or mountain edge."
  },
  {
   "primitive": "drawMod",
   "source": "passive",
   "role": "weakness",
   "phase": "normal",
   "delta": -1,
   "name": "Overstretched",
   "text": "one fewer card on each normal-turn draw."
  }
 ]
}
);})(typeof window!=='undefined'?window:globalThis);
