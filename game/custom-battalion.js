// War of Attrition — browser battalion-override drop-in.
//
// Ships as a NO-OP (WOA_CUSTOM_BATTALION = null) so a fresh checkout / zip plays
// the active-flagged battalion in content/battalions/ (see index.html's
// WOA_APPLIED_BATTALION wiring — localStorage 'woa-custom-battalion' still wins over
// this file when a player has saved a battalion in the Battalion Editor).
//
// This file STAYS in the index.html script chain on purpose: it is also the
// drop-in contract for sharing a battalion without a server. The Battalion Editor's
// "Export battalion file" button downloads a real custom-battalion.js in this exact
// shape (window.WOA_CUSTOM_BATTALION = [...]) — drop it next to index.html (LAN
// play needs the same file on both devices) and it overrides the shipped
// battalion, file:// or served. The server's "Restore built-in" path
// (POST /api/savebattalion with battalion:null) writes this same null shape back when
// an in-browser override is cleared.
window.WOA_CUSTOM_BATTALION = null;
