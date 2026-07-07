/* The one place the content-kind list lives (V1 standing goal: adding a
   content kind is a one-file diff plus its consumers). Node-only — the
   browser's kind list is baked into the server-generated content/manifest.js,
   whose generator reads this file. */
module.exports = ['decks', 'maps', 'mapsets'];
