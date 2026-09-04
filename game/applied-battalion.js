/* Which battalion this browser is actually playing, resolved before the engine
   snapshots the card list.

   Precedence: a battalion applied in the Battalion Editor (localStorage) beats a
   dropped custom-battalion.js, which beats the active-flagged battalion in
   content/battalions/. WOA_BATTALION_SRC tells the editor what it is editing and
   ui/boot.js whether to show the override badge.

   WOA_APPLY_BATTALION is the mutation itself, published for the sweep worker:
   a worker cannot read the page's localStorage, so the page resolves the winner
   and hands the card list over, and both sides run this one function — otherwise
   the sweep would play a different battalion than the screen. Resolution is
   page-only; node and the dev lab read content/battalions/ directly. */
(function (g) {
  'use strict';

  // The override rule. Deactivates the shipped battalions and installs `cards`
  // as the active one; no cards means no override, so nothing moves.
  g.WOA_APPLY_BATTALION = function (cards) {
    if (!cards || !cards.length) return false;
    g.WOA_CONTENT = g.WOA_CONTENT || { maps: [], cards: [], battalions: [] };
    g.WOA_CONTENT.battalions.forEach(function (d) { d.active = false; });
    g.WOA_CONTENT.battalions.push({ id: '__applied', name: 'Applied battalion', active: true, cards: cards });
    return true;
  };

  g.WOA_BATTALION_SRC = 'builtin';
  if (typeof document === 'undefined') return;   // a worker is handed the winner instead
  try {
    g.WOA_CONTENT = g.WOA_CONTENT || { maps: [], cards: [], battalions: [] };
    var local = null;
    try { local = JSON.parse(localStorage.getItem('woa-custom-battalion')); } catch (e) {}
    var applied = (local && local.length) ? local
      : (g.WOA_CUSTOM_BATTALION && g.WOA_CUSTOM_BATTALION.length) ? g.WOA_CUSTOM_BATTALION : null;
    g.WOA_APPLIED_BATTALION = applied;
    if (g.WOA_APPLY_BATTALION(applied)) g.WOA_BATTALION_SRC = (local && local.length) ? 'local' : 'file';
  } catch (e) {}
})(typeof window !== 'undefined' ? window : globalThis);
