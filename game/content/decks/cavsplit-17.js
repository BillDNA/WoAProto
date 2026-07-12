(function(g){(g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[]}).decks.push(
{
 "id": "cavsplit-17",
 "name": "Cav Split (17 - gate relaxed)",
 "active": false,
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
   "id": "airdrop",
   "name": "Airdrop",
   "count": 1,
   "noOpener": true,
   "text": "Place an Infantry unit on any empty hex. (Never in your opening hand.)",
   "steps": [
    {
     "type": "deploy",
     "unit": "infantry",
     "anywhere": true
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
   "count": 2,
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
   "id": "ordered_withdraw",
   "name": "Ordered Withdraw",
   "count": 1,
   "text": "Order an attack. Your attacker survives a tie, and never advances into the hex.",
   "steps": [
    {
     "type": "attack",
     "tieSpare": true,
     "noAdvance": true
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
  }
 ]
}
);})(typeof window!=='undefined'?window:globalThis);
