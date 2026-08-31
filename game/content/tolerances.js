/* War of Attrition — loop-config: the default Tolerance profiles the content-
   iteration loop's accept-settings bind to (#93/#94/#164, Track A of the #108 build
   order). Loop-config, NOT a content kind — it sits beside content/kinds.js but is not
   in the manifest (nothing in a skirmish reads it). The MECHANISM (RANGES + bands(metric,
   grace)) lives in game/report-model.js; only the authored default PROFILES live here.

   A Tolerance is a sparse, hold-default object:
     { name, tolerances: { metricKey: graceClass } }
   metricKey = a BANDS[].key (red, first, hq, zeroKill, tie, drag, swings, control);
   graceClass ∈ hold | nudge | bold | bypass (omit a key ⇒ hold, the fixed ruler).
   A Tolerance is the balance BAND: it shapes and flags a candidate's drift from
   baseline — it never discards a run (#164/#162 §4.4). (The separate author-boldness
   knob is Temperature, a plain passthrough value the loop hands the Author subagent;
   it is NOT this file — nothing to gate, nothing to fold.)

   #94 axis→Tolerance mapping; loosened cells default to `nudge` (bold/bypass are
   manual per-run escalations). Red%/1st% are always LOUD FLAGS in every default
   profile (never loosen — breaking side/first-player balance must read as broken, not
   as exploration), reported at the fixed `hold` ruler but never a reject; Red% is the
   one manual-loosen, reserved for asymmetric-deck runs.
   Dual-exported (WOA_TOLERANCES global + module.exports) like maps.js. */

var WOA_TOLERANCES = (function () {
  // Resolve the mechanism dual (like report-model resolves the engine) so the band
  // validates metric keys against the ONE band table — no duplicated key list here.
  var REPORT = (typeof window !== 'undefined' && window.WOA_REPORT) ? window.WOA_REPORT
    : (typeof require === 'function' ? require('../report-model.js') : null);
  var BAND_KEYS = REPORT ? Object.keys(REPORT.RANGES) : null;   // null ⇒ mechanism not loaded (browser order); key check skipped

  var ALWAYS_FLAGGED = ['first'];              // never loosened, in ANY profile (default or manual)
  var HARD_FLAGGED = ['red', 'first'];         // the always-flagged pair in the shipped DEFAULT profiles
  var GRACE = ['hold', 'nudge', 'bold', 'bypass'];

  var PROFILES = {
    card: { name: 'Card',
      tolerances: { hq: 'nudge', zeroKill: 'nudge', drag: 'nudge', swings: 'nudge' } },
    map: { name: 'Map',
      tolerances: { hq: 'nudge', zeroKill: 'nudge', tie: 'nudge', drag: 'nudge', control: 'nudge' } },
    ai: { name: 'AI',
      tolerances: { hq: 'nudge', drag: 'nudge', swings: 'nudge', control: 'nudge' } }
  };

  /* Schema/load gate — throws on a malformed or balance-loosening profile, so a bad
     edit fails loud at require()/script-load, not silently at grade time. This guards
     the PROFILE shape at load; it never rejects a measured run (a drift only flags,
     #164). `1st%` is ALWAYS locked; `Red%` is locked for the shipped default profiles
     but loosenable per run — pass opts.asymmetric to permit the one manual Red% loosen
     for an asymmetric deck. `label` names the profile in the error. */
  function validate(p, label, opts) {
    label = label || (p && p.name) || 'profile';
    var flagged = (opts && opts.asymmetric) ? ALWAYS_FLAGGED : HARD_FLAGGED;
    if (!p || !p.name || !p.tolerances) throw new Error('tolerances: "' + label + '" missing name/tolerances');
    Object.keys(p.tolerances).forEach(function (metric) {
      var g = p.tolerances[metric];
      if (BAND_KEYS && BAND_KEYS.indexOf(metric) < 0) throw new Error('tolerances: "' + label + '" tolerance "' + metric + '" is not a band metric key');
      if (GRACE.indexOf(g) < 0) throw new Error('tolerances: "' + label + '" gives ' + metric + ' unknown grace "' + g + '"');
      if (flagged.indexOf(metric) >= 0 && g !== 'hold') throw new Error('tolerances: ' + metric + '% is a locked flag — "' + label + '" must not loosen it (got "' + g + '")');
    });
    return p;
  }
  Object.keys(PROFILES).forEach(function (key) { validate(PROFILES[key], key); });

  return { profiles: PROFILES, validate: validate, ALWAYS_FLAGGED: ALWAYS_FLAGGED, HARD_FLAGGED: HARD_FLAGGED, GRACE: GRACE };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WOA_TOLERANCES;
