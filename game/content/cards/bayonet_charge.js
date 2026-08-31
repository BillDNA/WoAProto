(function(g){var c=g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[],mapsets:[]};(c.cards=c.cards||[]).push(
{
 "id": "bayonet_charge",
 "name": "Bayonet Charge",
 "text": "Deploy an Infantry unit adjacent to a controlled hex, then order an attack that never advances into the hex.",
 "steps": [
  {
   "type": "deploy",
   "unit": "infantry"
  },
  {
   "type": "attack",
   "noAdvance": true
  }
 ]
}
);})(typeof window!=='undefined'?window:globalThis);
