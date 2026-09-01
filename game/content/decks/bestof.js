(function(g){(g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[]}).decks.push(
{
 "id": "bestof",
 "name": "Best Of - Mix",
 "active": false,
 "cards": [
  {
   "id": "vanguard",
   "name": "Vanguard",
   "count": 1,
   "starting": true,
   "text": "Place an Infantry unit adjacent to any controlled hex. Then reposition a unit.",
   "steps": [ { "type": "deploy", "unit": "infantry" }, { "type": "reposition" } ]
  },
  {
   "id": "deploy_artillery",
   "name": "Deploy Artillery",
   "count": 1,
   "text": "Place an Artillery unit adjacent to any controlled hex.",
   "steps": [ { "type": "deploy", "unit": "artillery" } ]
  },
  {
   "id": "deploy_inf_trench",
   "name": "Entrench",
   "count": 3,
   "text": "Place an Infantry unit adjacent to any controlled hex. Then build a trench on any controlled hex.",
   "steps": [ { "type": "deploy", "unit": "infantry" }, { "type": "trench" } ]
  },
  {
   "id": "airdrop",
   "name": "Airdrop",
   "count": 1,
   "noOpener": true,
   "text": "Place an Infantry unit on any empty hex. (Never in your opening hand.)",
   "steps": [ { "type": "deploy", "unit": "infantry", "anywhere": true } ]
  },
  {
   "id": "deploy_cavalry",
   "name": "Deploy Cavalry",
   "count": 1,
   "text": "Place two Cavalry units adjacent to any controlled hex, in sequence.",
   "steps": [ { "type": "deploy", "unit": "cavalry" }, { "type": "deploy", "unit": "cavalry" } ]
  },
  {
   "id": "attack_plus1",
   "name": "Attack +1",
   "count": 2,
   "text": "Order an attack with +1 support.",
   "steps": [ { "type": "attack", "mod": 1 } ]
  },
  {
   "id": "reckless_maneuvers",
   "name": "Reckless Maneuvers",
   "count": 1,
   "text": "Order an attack. Then reposition a unit.",
   "steps": [ { "type": "attack" }, { "type": "reposition" } ]
  },
  {
   "id": "naval_barrage",
   "name": "Naval Barrage",
   "count": 1,
   "text": "Remove any trench or forest on the board (optional). Then order an attack.",
   "steps": [ { "type": "barrage" }, { "type": "attack" } ]
  },
  {
   "id": "shock_troops",
   "name": "Shock Troops",
   "count": 2,
   "text": "Place an Infantry unit adjacent to any controlled hex. Then order an attack.",
   "steps": [ { "type": "deploy", "unit": "infantry" }, { "type": "attack" } ]
  },
  {
   "id": "storm_and_hold",
   "name": "Storm and Hold",
   "count": 1,
   "text": "Order an attack with +1 support. Then build a trench on any controlled hex.",
   "steps": [ { "type": "attack", "mod": 1 }, { "type": "trench" } ]
  },
  {
   "id": "over_the_top",
   "name": "Over the Top",
   "count": 1,
   "text": "Reposition a unit. Then order an attack; your attacker survives a tie.",
   "steps": [ { "type": "reposition" }, { "type": "attack", "tieSpare": true } ]
  },
  {
   "id": "creeping_barrage",
   "name": "Creeping Barrage",
   "count": 1,
   "text": "Remove any trench or forest on the board (optional). Then order an attack with +1 support; your attacker holds its ground.",
   "steps": [ { "type": "barrage" }, { "type": "attack", "mod": 1, "noAdvance": true } ]
  }
 ]
}
);})(typeof window!=='undefined'?window:globalThis);
