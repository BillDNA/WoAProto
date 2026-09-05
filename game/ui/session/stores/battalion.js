/* The BATTALION-OVERRIDE record: the battalion this browser plays.

   Unversioned and bare on purpose. game/applied-battalion.js reads it to resolve
   the override before the engine snapshots the card list, long before this file
   loads; an envelope would hide the payload from that read. */
'use strict';

var STORE_BATTALION = uiStore({ id: 'battalion', key: 'woa-custom-battalion' });

// Clearing the override is the same act from the editor's "Restore built-in" and
// from the badge in normal play chrome: drop the record, drop the in-flight
// save it no longer matches, rewrite the drop-in file, reload.
function resetCustomBattalion(){
  STORE_BATTALION.clear();
  clearSave();
  syncBattalionFile(null, function(){ location.reload(); });
}
