// War of Attrition — browser deck-override drop-in.
//
// Ships as a NO-OP (WOA_CUSTOM_DECK = null) so a fresh checkout / zip plays
// the active-flagged deck in content/decks/ (see index.html's
// WOA_APPLIED_DECK wiring — localStorage 'woa-custom-deck' still wins over
// this file when a player has saved a deck in the Deck Editor).
//
// This file STAYS in the index.html script chain on purpose: it is also the
// drop-in contract for sharing a deck without a server. The Deck Editor's
// "Export deck file" button downloads a real custom-deck.js in this exact
// shape (window.WOA_CUSTOM_DECK = [...]) — drop it next to index.html (LAN
// play needs the same file on both devices) and it overrides the shipped
// deck, file:// or served. The server's "Restore built-in" path
// (POST /api/savedeck with deck:null) writes this same null shape back when
// an in-browser override is cleared.
window.WOA_CUSTOM_DECK = null;
