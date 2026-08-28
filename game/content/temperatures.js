/* War of Attrition — loop-config: the default Temperature profiles the content-
   iteration loop's accept-settings bind to (#93/#94, Track A of the #108 build order).
   Loop-config, NOT a content kind — it sits beside content/kinds.js but is not in the
   manifest (nothing in a skirmish reads it). The MECHANISM (RANGES + bands(metric,
   grace)) lives in game/report-model.js; only the authored default PROFILES live here.

   A Temperature is a sparse, hold-default object:
     { name, step, tolerances: { metricKey: graceClass } }
   metricKey = a BANDS[].key (red, first, hq, zeroKill, tie, drag, swings, control);
   graceClass ∈ hold | nudge | bold | bypass (omit a key ⇒ hold, the fixed ruler).
   `step` names the iterated axis; it rides the profile (a #82 / Track-B input) but
   NOT bands() — the grader never reads it.

   #94 axis→Tolerance mapping; loosened cells default to `nudge` (bold/bypass are
   manual per-run escalations). Red%/1st% are HARD-GATED in every default profile
   (never loosen — breaking side/first-player fairness must read as broken, not as
   exploration); Red% is the one manual-loosen, reserved for asymmetric-deck runs.
   Dual-exported (WOA_TEMPERATURES global + module.exports) like maps.js. */

var WOA_TEMPERATURES = (function () {
  // Resolve the mechanism dual (like report-model resolves the engine) so the gate
  // validates metric keys against the ONE band table — no duplicated key list here.
  var REPORT = (typeof window !== 'undefined' && window.WOA_REPORT) ? window.WOA_REPORT
    : (typeof require === 'function' ? require('../report-model.js') : null);
  var BAND_KEYS = REPORT ? Object.keys(REPORT.RANGES) : null;   // null ⇒ mechanism not loaded (browser order); key check skipped

  var ALWAYS_GATED = ['first'];              // never loosened, in ANY profile (default or manual)
  var HARD_GATED = ['red', 'first'];         // additionally gated in the shipped DEFAULT profiles
  var GRACE = ['hold', 'nudge', 'bold', 'bypass'];

  var PROFILES = {
    card: { name: 'Card', step: 'card',
      tolerances: { hq: 'nudge', zeroKill: 'nudge', drag: 'nudge', swings: 'nudge' } },
    map: { name: 'Map', step: 'map',
      tolerances: { hq: 'nudge', zeroKill: 'nudge', tie: 'nudge', drag: 'nudge', control: 'nudge' } },
    ai: { name: 'AI', step: 'ai',
      tolerances: { hq: 'nudge', drag: 'nudge', swings: 'nudge', control: 'nudge' } }
  };

  /* Schema/load gate — throws on a malformed or fairness-loosening profile, so a bad
     edit fails loud at require()/script-load, not silently at grade time. `1st%` is
     ALWAYS gated; `Red%` is gated for the shipped default profiles but loosenable per
     run — pass opts.asymmetric to permit the one manual Red% loosen for an asymmetric
     deck. `label` names the profile in the error. */
  function validate(p, label, opts) {
    label = label || (p && p.name) || 'profile';
    var gated = (opts && opts.asymmetric) ? ALWAYS_GATED : HARD_GATED;
    if (!p || !p.name || !p.step || !p.tolerances) throw new Error('temperatures: "' + label + '" missing name/step/tolerances');
    Object.keys(p.tolerances).forEach(function (metric) {
      var g = p.tolerances[metric];
      if (BAND_KEYS && BAND_KEYS.indexOf(metric) < 0) throw new Error('temperatures: "' + label + '" tolerance "' + metric + '" is not a band metric key');
      if (GRACE.indexOf(g) < 0) throw new Error('temperatures: "' + label + '" gives ' + metric + ' unknown grace "' + g + '"');
      if (gated.indexOf(metric) >= 0 && g !== 'hold') throw new Error('temperatures: ' + metric + '% is hard-gated — "' + label + '" must not loosen it (got "' + g + '")');
    });
    return p;
  }
  Object.keys(PROFILES).forEach(function (key) { validate(PROFILES[key], key); });

  return { profiles: PROFILES, validate: validate, ALWAYS_GATED: ALWAYS_GATED, HARD_GATED: HARD_GATED, GRACE: GRACE };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WOA_TEMPERATURES;
