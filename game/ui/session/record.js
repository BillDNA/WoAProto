/* What a finished skirmish leaves behind: one row in logs/woa.db.

   A room of the session house because the two things a row cannot be written
   without — who played each side, and what kind of run this was — are the
   seat's own answers. The dashboard is the one caller that overrides both: its
   skirmishes are a measured sweep, not a seat.

   Every source lands here. The live hook (a human, hot-seat, watch or LAN game,
   and the serial dashboard loop) and the parallel sweep's main-thread result
   handler both call it; the parallel workers run the engine with no
   onSkirmishEnd subscriber, so a skirmish is persisted exactly once. Search
   clones never fire it (__sim). Persistence is best-effort — a lost row must
   never cost a player their game. */
'use strict';

function recordSkirmish(st) {
  var v = E.view(st);
  var dash = (typeof DASH !== 'undefined') && DASH.running;
  var kind = dash ? 'balance' : seatRunKind();
  function aiOf(side){
    if (dash) return side === 'red' ? DASH.meta.dr : DASH.meta.db;
    return seatAiName(side);
  }
  var m = st.battle; st.battle = null; // the cycle never crosses the wire (battle is the identity handle)
  try {
    api('recordskirmish', {
      runKey: dash ? DASH.runKey : undefined,
      run: { version: E.VERSION, kind: kind, redAi: aiOf('red'), blueAi: aiOf('blue'),
        n: dash ? DASH.meta.n : 1, tool: dash ? 'dashboard' : 'browser',
        // run identity for the A/B picker: both battalions fielded, read from the
        // battalion the ENGINE actually resolved THIS load — never
        // content/battalions/'s active flag directly (the Battalion Editor's
        // applied override sandbox overrides it, see index.html's
        // WOA_APPLIED_BATTALION wiring). Symmetric today: both sides field it.
        battalionRed: E.ACTIVE_BATTALION && E.ACTIVE_BATTALION.id,
        battalionBlue: E.ACTIVE_BATTALION && E.ACTIVE_BATTALION.id,
        mapset: dash ? DASH.meta.mapset : undefined,
        seedBase: dash ? DASH.meta.seedBase : undefined },
      state: st, firstPlayer: E.other(v.second), seed: v.seed
    }).catch(function(){ /* best-effort */ });
  } finally { st.battle = m; }
}

E.hooks.onSkirmishEnd.push(recordSkirmish);
