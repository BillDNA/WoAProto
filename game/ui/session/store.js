/* The STORED RECORD: everything this browser remembers between visits.

   Four records, and every one of them used to answer "what key, what version,
   what happens to an older one" for itself — three of the four by not asking.
   They are declared here instead, so what this game stores is one file.

   uiStore({id, key, version, migrate}) -> { read, write, clear, has }
   A record with a `version` is stored inside an envelope and a stale one is
   discarded on read; `migrate` gets the parsed legacy value and returns the
   payload to keep, or null to discard. A record with NO version is stored bare,
   because something outside the app reads it — see `battalion` below. */
'use strict';

var UI_STORES = {};

function uiStore(spec){
  if (UI_STORES[spec.id]) throw new Error('uiStore: duplicate id ' + JSON.stringify(spec.id));
  var rec = {
    id: spec.id,
    key: spec.key,
    version: spec.version,
    read: function(){
      var raw = null;
      try { raw = localStorage.getItem(spec.key); } catch(e){ return null; }
      if (raw == null) return null;
      var val;
      try { val = JSON.parse(raw); } catch(e){ return null; }
      if (spec.version == null) return val;
      if (val && val.v === spec.version) return val.d;
      return spec.migrate ? spec.migrate(val) : null;
    },
    write: function(payload){
      try {
        localStorage.setItem(spec.key, JSON.stringify(
          spec.version == null ? payload : { v: spec.version, d: payload }));
        return true;
      } catch(e){ return false; }
    },
    clear: function(){ try { localStorage.removeItem(spec.key); } catch(e){} },
    has: function(){ return rec.read() != null; }
  };
  UI_STORES[spec.id] = rec;
  return rec;
}

// The skirmish in progress. Bump the version whenever an older saved state can
// no longer be loaded; resume then silently clears instead of crashing.
var STORE_SAVE = uiStore({ id: 'save', key: 'woa-save', version: 7 });

// Dev mode. Was a bare '1'; that spelling still reads as on.
var STORE_DEV = uiStore({ id: 'dev', key: 'woa-dev', version: 1,
  migrate: function(v){ return v === 1 || v === '1' ? true : null; } });

// The five named battalion slots of the Battalion Editor. Was an unversioned
// {active, slots}; that spelling still reads.
var STORE_BATTALIONS = uiStore({ id: 'battalions', key: 'woa-battalions', version: 1,
  migrate: function(v){ return v && v.slots ? v : null; } });

// The battalion this browser plays. UNVERSIONED and bare on purpose: it is read
// by game/applied-battalion.js, which resolves the override before the engine
// snapshots the card list and long before this file loads.
var STORE_BATTALION = uiStore({ id: 'battalion', key: 'woa-custom-battalion' });

// Clearing the override is the same act from the editor's "Restore built-in" and
// from the badge in normal play chrome: drop the record, drop the in-flight
// save it no longer matches, rewrite the drop-in file, reload.
function resetCustomBattalion(){
  STORE_BATTALION.clear();
  clearSave();
  syncBattalionFile(null, function(){ location.reload(); });
}
