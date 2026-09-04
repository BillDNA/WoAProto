/* War of Attrition — the AI-config home.

   The AI's tunable dials as named data, made by the shared defineConfigHome helper
   (attaches the digest getter). Two sibling homes, published as I.AI_WEIGHTS /
   I.AI_TUNING (Engine.AI_WEIGHTS / Engine.AI_TUNING) and read by nested name at every
   site in 05-ai.js (no flat value-aliases). load-order.js schedules it after
   00-config, whose defineConfigHome it calls while loading.

   Kept OUT of the rules home (I.CONFIG) on purpose: only Engine.CONFIG.digest is stamped
   onto DB rows, so AI-side tuning must never live there or it would reshuffle the data.
   Sibling config files: engine/00-config.js (rules), ui/ui-config.js (UI), dev/lab-config.js (dev-lab).
   Classic script (browser + node), g.WOA_E alias I. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // Guardrails baked in (don't lose them in a new personality config): the noopPenalty
  // and antiShuffle weights and the attrition projection are the anti-degeneracy fixes —
  // zero them and the swap-dance stalemate returns.
  // A config home (shared defineConfigHome helper → non-enumerable `digest`): the SOLE
  // owner of the eval weights, and the one surface a per-Commander weight override merges
  // over. Only weights live here, so the digest moves iff a weight does.
  I.AI_WEIGHTS = I.defineConfigHome({
    attrWin: 500,      // attrition-projection swing at full urgency
    fsDiff: 8, fsDiffUrgent: 40, // field-score diff, flat + urgency-scaled
    unitOnBoard: 22, unitReserve: 16, // unitValue multipliers
    unitValInfantry: 3, unitValCavalry: 4, unitValArtillery: 5, // the AI's own worth-per-unit
    advance: 2.2,      // pressure toward the enemy HQ (per hex of distance)
    hqGuard: 4,        // bonus for sitting next to my own HQ
    enemyDist: 1.6,    // keep enemy units far from my HQ
    myThreatHQ: 220, myThreatKill: 3,   // my available attacks next step
    threatHQ: 600, threatKill: 6, threatTie: 2.5, // enemy threats on me
    trenchHome: 6,     // trenches near my HQ
    trenchFacing: 3,   // per covered trench edge that faces a LIVE enemy lane
                       // (enemy unit within 2 of the far hex) — orientation matters
    noopPenalty: 80,   // dead-turn plans (keep > fallbackBias + reply noise)
    antiShuffle: 10,   // re-swapping the same pair as last turn
    fallbackBias: 12,  // mild preference for printed actions over card-burning
    // Search dial (lives with the weights so personalities/tuner can set it):
    // when a step has more options than this, keep the top N by cheap static
    // pre-rank instead of the old RANDOM shuffle+slice(80) — the cap can no
    // longer discard the best move. Lower = faster + more approximate.
    shortlist: 40
  });

  // The AI's other tunable dials — a sibling config home (same shared helper) for the
  // numbers that shape the search + eval but are NOT per-personality weights (a
  // personality overrides AI_WEIGHTS terms, never these). Its own digest. Read by
  // nested name at each site; no flat copies.
  I.AI_TUNING = I.defineConfigHome({
    // aiConfig's base personality shape, merged UNDER any preset/maps.js row.
    // noise = evaluation randomness; breadth = look-ahead candidates re-scored by
    // the sampled enemy reply; replySamples/replyWeight tune that reply search.
    defaults: { noise: 0, breadth: 0, replySamples: 2, replyWeight: 0.7 },
    urgencyWindow: 12,   // turnsLeft window over which the attrition-projection urgency ramps to full
    laneRange: 2,        // hexes: an enemy this close to a trench edge's far side makes it a LIVE lane
    threatCardMod: 1,    // attack mod the threat scan assumes the enemy could add from a card
    skipBias: 1,         // score nudge subtracted from a skip so the AI mildly prefers acting
    optionCap: 15        // rankChoices default k: options shown to the LLM harness before
                         // pruning. The ONE owner — dev/claude-plays.js reads it for its --k default.
  });
})(typeof window !== 'undefined' ? window : globalThis);
