/* The SESSION house's STORED-RECORD base: everything this browser remembers
   between visits.

   Four records, and every one of them used to answer "what key, what version,
   what happens to an older one" for itself — three of the four by not asking.
   Each is a room of stores/ now, declaring its own answers beside the code that
   reads it; this file is only what they share.

   uiStore({id, key, version, migrate}) -> { read, write, clear, has }
   A record with a `version` is stored inside an envelope and a stale one is
   discarded on read; `migrate` gets the parsed legacy value and returns the
   payload to keep, or null to discard. A record with NO version is stored bare,
   because something outside the app reads it — see stores/battalion.js. */
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
