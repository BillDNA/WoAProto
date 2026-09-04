/* dev/lab-config.js — dev-lab config tier: the knobs a developer tunes for a lab run.

   The third config home, one tier below Engine.CONFIG (rules dials) and UI_CONFIG (UI
   guardrails). Made by the SAME shared helper — defineConfigHome — so it carries the
   identical digest getter; a hand-rolled home would fail the seam check. Node only: the
   dev lab never loads in the browser. It requires JUST the engine's config part (00-config)
   for the maker, not the whole engine — the transports that read the timeout stay light.

   Organized into intentional named sections (one per lab tool / concern), never one flat
   bag — each field is read by name at its point of use:
     · llm           — transport timeout shared by the cold (llm-client) and session
                       (llm-session) call paths; one owner, both reference it.
     · claudePlays   — run defaults for dev/claude-plays.js (a single skirmish or a
                       first-to-N series); each CLI flag falls back to the value here.
     · balance       — dev/balance.js run defaults (sweep sample count, opponent, the
                       matchup luck-o-meter sample count).
     · balanceReport — dev/balance-report.js run defaults (its own heavier sample count
                       and hard-vs-hard opponent — the accumulating balance loop).
     · tuneWeights   — dev/tune-weights.js run defaults (sample count, opponent, passes);
                       its sweep-algorithm shape (which weights, step scales, regression
                       bands) stays inline — that is the tool's design, not a run knob.
     · sweep         — dev/sweep.js parallel-pool tunable (cores held back).

   NOT a home for pure infra — schema versions, request-body/GC windows, DB batch sizing,
   the deterministic seed schedule, hex/axial math and runaway-loop guards stay inline at
   their sites (confirmed by sweep, not assumed). */
'use strict';

// Just the config part — the shared maker without the full engine (see header).
var defineConfigHome = require('../game/engine/00-config.js').defineConfigHome;

module.exports = defineConfigHome({
  llm: {
    // Per-call wall-clock ceiling. On expiry the `claude -p` process is killed and the
    // call fails open (errored response). Shared owner for both transports — the cold
    // llm-client.send and the persistent llm-session both read this.
    timeoutMs: 180000
  },

  claudePlays: {
    redModel: 'haiku',   // --red default: the RED player (heuristic name or model id)
    blueModel: 'normal', // --blue default: the BLUE player
    seed: 1234,          // --seed default: the series seed (drives map order + shuffles)
    maxTurns: 60,        // --max-turns default: per-skirmish turn cap (a runaway guard)
    matchTarget: 3,      // --match with no number: first-to-N series target
    typicalN: 40,        // typicality-baseline sample size for the felt-notes read
    optionCap: 15        // move-option cap shown to the model before pruning (the `k` knob)
  },

  balance: {
    samplesPerMap: 24,   // default skirmishes per map for a mapReport sweep
    ai: 'normal',        // default opponent personality (both sides) for a plain sweep
    matchupSamples: 12   // default skirmishes per pairing for the matchup luck-o-meter
  },

  balanceReport: {
    samplesPerMap: 60,   // default skirmishes per map for the accumulating balance loop
    ai: 'hard'           // default red opponent (hard-vs-hard is the balance-loop baseline)
  },

  tuneWeights: {
    samplesPerMap: 16,   // default skirmishes per map per candidate weight vector
    ai: 'normal',        // default base personality the sweep perturbs from
    iters: 1             // default coordinate-descent passes
  },

  sweep: {
    workerReserve: 1     // cores held back from the parallel pool (workers = cores - this)
  }
});
