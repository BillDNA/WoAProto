/* DATA-ONLY commander stub — the INLINE-WEIGHTS form (wayfinder #88). Where
   `forestier` points at a named personality by string, this commander HOLDS its
   own personality as an AI_WEIGHTS override row (engine/05-ai.js). The keys are
   real AI_WEIGHTS terms; the values here bias a cagey, terrain-hugging baiter —
   keep the enemy far from my HQ, sit on home trenches, value cavalry — the kind
   of "personality projected into gameplay" a woods theme suggests. Inert today:
   loaded into WOA_CONTENT.commanders, read by nothing. Difficulty (search depth)
   is applied separately at pilot time; these are ONLY the weights. */
(function(g){var c=g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[],mapsets:[],units:[],commanders:[]};(c.commanders=c.commanders||[]).push(
{
 "id": "woods-baiter",
 "name": "The Baiter",
 "side": null,
 "theme": "woods",
 "personality": {
  "enemyDist": 3.0,
  "hqGuard": 7,
  "trenchHome": 10,
  "unitValCavalry": 6,
  "advance": 1.2
 },
 "abilities": []
}
);})(typeof window!=='undefined'?window:globalThis);
