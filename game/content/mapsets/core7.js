/* "Core Six" — the active match pool: exactly one mapset is active
   (D.A:one-active-mapset) and it is THE draw pool everywhere via --mapset. These
   six are the best-balanced maps in the library by balanceScore ideal-range
   ranking (game/report-model.js, SOT: docs/balance/best-map-score.md); the id
   stays "core7" as a frozen reference. Map files for every map stay on disk
   under content/maps/, in or out of the pool.

   KEPT (balanceScore, lower = better):
   - causeway    (0.0)  best balance in the fleet — Red 52/1st 55/HQ 25%, anchors the pool.
   - frontier    (0.0)  no side bias, 0% zero-kill — classic-shape control case.
   - saber-ridge (0.0)  ridge shape, healthy HQ-path mix (HQ 35%).
   - long-march  (2.0)  spear-shape outlier, mostly-attrition but inside the ideal band.
   - the-marshes (3.0)  reads clean under hard-vs-hard despite a normal-AI
                        directional side-bias flag; balanceScore is the tiebreak.
   - the-narrows (4.7)  hourglass shape, most back-and-forth of the keepers (swings 2.7). */
(function(g){var c=g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[],mapsets:[]};(c.mapsets=c.mapsets||[]).push(
{
 "id": "core7",
 "name": "Core Six",
 "active": true,
 "maps": [
  "causeway",
  "frontier",
  "long-march",
  "saber-ridge",
  "the-marshes",
  "the-narrows"
 ]
}
);})(typeof window!=='undefined'?window:globalThis);
