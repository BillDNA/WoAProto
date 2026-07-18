(function(g){(g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[]}).decks.push(
{
 "id": "cavsplit17-raid-paid",
 "name": "Cav split + Raiding Party (-OrdWdrw, -Airdrop)",
 "active": true,
 "cards": [
  {
   "id": "deploy_inf_start",
   "name": "Deploy Infantry",
   "count": 1,
   "starting": true,
   "text": "Place an Infantry unit adjacent to any controlled hex.",
   "steps": [
    {
     "type": "deploy",
     "unit": "infantry"
    }
   ]
  },
  {
   "id": "deploy_artillery",
   "name": "Deploy Artillery",
   "count": 1,
   "text": "Place an Artillery unit adjacent to any controlled hex.",
   "steps": [
    {
     "type": "deploy",
     "unit": "artillery"
    }
   ]
  },
  {
   "id": "deploy_inf_trench",
   "name": "Entrench",
   "count": 3,
   "text": "Place an Infantry unit adjacent to any controlled hex. Then build a trench on any controlled hex.",
   "steps": [
    {
     "type": "deploy",
     "unit": "infantry"
    },
    {
     "type": "trench"
    }
   ]
  },
  {
   "id": "conscription",
   "name": "Conscription",
   "count": 1,
   "text": "Place two Infantry units adjacent to any controlled hex, in sequence.",
   "steps": [
    {
     "type": "deploy",
     "unit": "infantry"
    },
    {
     "type": "deploy",
     "unit": "infantry"
    }
   ]
  },
  {
   "id": "deploy_cavalry",
   "name": "Deploy Cavalry",
   "count": 2,
   "text": "Place a Cavalry unit adjacent to any controlled hex.",
   "steps": [
    {
     "type": "deploy",
     "unit": "cavalry"
    }
   ]
  },
  {
   "id": "attack_plus1",
   "name": "Attack +1",
   "count": 3,
   "text": "Order an attack with +1 support.",
   "steps": [
    {
     "type": "attack",
     "mod": 1
    }
   ]
  },
  {
   "id": "mass_assault",
   "name": "Mass Assault",
   "count": 1,
   "text": "Order an attack. Then order another attack.",
   "steps": [
    {
     "type": "attack"
    },
    {
     "type": "attack"
    }
   ]
  },
  {
   "id": "careful_maneuvers",
   "name": "Careful Maneuvers",
   "count": 1,
   "text": "Reposition a unit. Then order an attack with −1 support.",
   "steps": [
    {
     "type": "reposition"
    },
    {
     "type": "attack",
     "mod": -1
    }
   ]
  },
  {
   "id": "reckless_maneuvers",
   "name": "Reckless Maneuvers",
   "count": 1,
   "text": "Order an attack. Then reposition a unit.",
   "steps": [
    {
     "type": "attack"
    },
    {
     "type": "reposition"
    }
   ]
  },
  {
   "id": "naval_barrage",
   "name": "Naval Barrage",
   "count": 1,
   "text": "Remove any trench or forest on the board (optional). Then order an attack.",
   "steps": [
    {
     "type": "barrage"
    },
    {
     "type": "attack"
    }
   ]
  },
  {
   "id": "forced_march",
   "name": "Forced March",
   "count": 1,
   "text": "Reposition up to three times, in sequence.",
   "steps": [
    {
     "type": "reposition"
    },
    {
     "type": "reposition"
    },
    {
     "type": "reposition"
    }
   ]
  },
  {
   "id": "raiding_party",
   "name": "Raiding Party",
   "count": 1,
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
 ]
}
);})(typeof window!=='undefined'?window:globalThis);
