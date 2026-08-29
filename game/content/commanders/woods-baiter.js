/* DATA-ONLY commander stub, inline-weights `personality` + object `deck` forms
   (wayfinder #88, #112). Both hold their own values: a cagey, terrain-hugging
   baiter (AI_WEIGHTS override) whose deck affinity tilts toward cavalry, trench
   postures, and a stocked opener. Inert: read by nothing yet, golden path
   untouched. Schema + facet values: docs/commander-cheatsheet.md. */
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
 "deck": {
  "unit": { "cavalry": 2, "infantry": 1 },
  "posture": { "trench": 2, "deploy": 1, "attack": 0.5 },
  "curve": { "starting": 1.5 }
 },
 "abilities": []
}
);})(typeof window!=='undefined'?window:globalThis);
