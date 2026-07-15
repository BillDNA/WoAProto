/* WOA-013 — the trimmed active pool (12 -> 7), replacing `tournament` as the
   loop default (D.A:one-active-mapset — exactly one mapset active, THE match
   pool everywhere via --mapset). Picked by WOA-007's balanceScore ideal-range
   ranking (game/report-model.js, SOT: grading-rubrics.md "Best map") over the
   fresh 1.1 hard-vs-hard n60 read (logs/reports/balance/1.1/2026-07-10-1823-
   hard-vs-hard-n60.md, 720 battles) — top 7 of `tournament`'s 12 by score,
   sanity-checked against the 1.0 final report's per-map read. Roster files for
   every map (kept or cut) stay on disk under content/maps/.

   KEPT (balanceScore, lower = better):
   - causeway    (0.0)  best balance in the fleet — Red 52/1st 55/HQ 25%, anchors the pool.
   - frontier    (0.0)  no side bias, 0% zero-kill — classic-shape control case.
   - saber-ridge (0.0)  ridge shape, healthy HQ-path mix (HQ 35%).
   - long-march  (2.0)  spear-shape outlier, mostly-attrition but inside the ideal band.
   - the-marshes (3.0)  reads clean under hard-vs-hard n60 despite an n24 normal-AI
                        directional side-bias flag; balanceScore is the tiebreak.
   - the-void    (4.4)  weakest keeper (HQ 8%, below the 10-40 ideal range costs points)
                        but still beats every cut map; keeps a carved-outline shape.
   - the-narrows (4.7)  hourglass shape, most back-and-forth of the keepers (swings 2.7).

   CUT (balanceScore):
   - twin-gates    (37.3) worst in the fleet — extreme 2nd-mover bias (1st 22%), tie 22%, HQ 0%.
   - killing-ground(24.5) SIDE-BIASED 2nd-mover-strong, attrition-only (Red 70/1st 37/HQ 7%).
   - riverbend     (13.5) same failure mode as Killing Ground (1st 35%, HQ 3%) — redundant to keep both.
   - the-ford      (10.0) biggest 1st-mover skew of the remainder (1st 60%) — cut to make room.
   - the-cockpit   (6.0)  solid but ranked 8th of 12 — edged out, pool only needed 7.

   WOA-020 (2026-07-15): the-void CUT — its donut geometry is broken (HQs only 3
   apart, split by a 2-hex hole; the AI commits attackers into outright losses 44%
   of the time). Its balanceScore 4.4 was a FALSE-good: healthy aggregate metrics
   masking a geometric pathology. Repair-first was tried (fill (-1,0)/(0,0)) but the
   filled centre is a straight HQ-rush lane — 1st-mover 84% / HQ 78% / 0-kill 42% at
   n50, far worse — so cut per the ticket's fallback. Pool is now 6 (id stays "core7",
   a frozen reference; name -> "Core Six"). Restore to 7 later by redesigning The Void
   (HQs farther apart) or promoting the-cockpit — a roster call for Bill. */
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
