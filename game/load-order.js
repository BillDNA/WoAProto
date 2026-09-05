/* The one ordered list of scripts the game loads.

   Classic scripts declare no dependencies, so the order is asserted here and
   nowhere else: index.html, game/engine.js (node) and game/sweep-worker.js all
   read these arrays. A path appears exactly once, and its position — not its
   filename, not its directory — is what schedules it, so a file may live at any
   depth and be named for what it is.

   Adding a file: put its path in the array that matches when it must run, in
   the slot its load-time reads require. Engine parts reach each other through
   I.* at the CALL site, so a part only constrains order when it reads something
   while loading (07-export reads the whole namespace, so it is last).

   Loaded with no module system and no document (the sweep worker) it just
   publishes WOA_LOAD_ORDER; in the page it writes the PAGE chain as tags. */
(function (g) {
  'use strict';

  // Content and the battalion override — the page resolves both before the
  // engine snapshots the card list. Page only; node reads content/ directly.
  var CONTENT = [
    'maps.js',
    'custom-battalion.js',
    'content/manifest.js',
    'applied-battalion.js'
  ];

  // The engine, in dependency order. Page, node and the sweep worker load
  // exactly this list.
  var ENGINE = [
    'engine/00-config.js',
    'engine/ai/ai-config.js',
    'engine/board/terrain/terrain-config.js',
    'engine/board/terrain/terrain.js',
    'engine/board/terrain/forest.js',
    'engine/board/terrain/mountain.js',
    'engine/board/terrain/river.js',
    'engine/board/terrain/trench.js',
    'engine/01-core.js',
    'engine/02-board.js',
    'engine/03-rules.js',
    'engine/03a-commander-effects.js',
    'engine/04-skirmish.js',
    'engine/05-ai.js',
    'engine/06-drive.js',
    'engine/07-export.js'
  ];

  // Everything over the engine. ui/boot.js owns all load-time wiring, so it is
  // last; the sweep worker takes sim.js only.
  var APP = [
    'sim.js',
    'report-model.js',
    'ui/chart-model.js',
    'ui/app.js',
    'ui/ui-config.js',
    'ui/screens.js',
    'ui/ui-primitives.js',
    'ui/kit/kind.js',
    'ui/modals/modal.js',
    'ui/board/mark.js',
    'ui/board/overlay.js',
    'ui/board/thumbnail.js',
    'ui/board/terrain/terrain-marks.js',
    'ui/board/terrain/forest-mark.js',
    'ui/board/terrain/mountain-mark.js',
    'ui/board/terrain/river-mark.js',
    'ui/board/terrain/trench-mark.js',
    'ui/board/mat.js',
    'ui/board/attack.js',
    'ui/board/fx.js',
    'ui/board/board.js',
    'ui/session/store.js',
    'ui/session/seat.js',
    'ui/session/save.js',
    'ui/session/snapshot.js',
    'ui/session/net.js',
    'ui/session/session.js',
    'ui/turn/turn.js',
    'ui/turn/hand.js',
    'ui/turn/prompt.js',
    'ui/turn/journal.js',
    'ui/turn/glossary.js',
    'ui/turn/ai-turn.js',
    'ui/screens/skirmish/region.js',
    'ui/screens/skirmish/topbar.js',
    'ui/screens/skirmish/debug.js',
    'ui/screens/skirmish/skirmish.js',
    'ui/commander-panel.js',
    'ui/commander-picker.js',
    'ui/maps-screen.js',
    'ui/map-editor.js',
    'ui/battalion-editor.js',
    'ui/build-battalion.js',
    'ui/chart-primitives.js',
    'ui/screens/dashboard/dashboard.js',
    'ui/screens/dashboard/rows.js',
    'ui/screens/dashboard/panes/pane.js',
    'ui/screens/dashboard/panes/overview.js',
    'ui/screens/dashboard/panes/maps.js',
    'ui/screens/dashboard/panes/cards.js',
    'ui/screens/dashboard/panes/units.js',
    'ui/screens/dashboard/panes/crosscuts.js',
    'ui/screens/dashboard/panes/runs.js',
    'ui/screens/dashboard/panes/tables.js',
    'ui/manual.js',
    'ui/modals/cards.js',
    'ui/modals/confirm.js',
    'ui/modals/handoff.js',
    'ui/modals/journal.js',
    'ui/modals/manual.js',
    'ui/modals/mats.js',
    'ui/modals/play.js',
    'ui/modals/skirmish.js',
    'ui/boot.js'
  ];

  var LOAD_ORDER = {
    CONTENT: CONTENT,
    ENGINE: ENGINE,
    APP: APP,
    PAGE: CONTENT.concat(ENGINE, APP)
  };

  g.WOA_LOAD_ORDER = LOAD_ORDER;
  if (typeof module !== 'undefined' && module.exports) module.exports = LOAD_ORDER;
  else if (typeof document !== 'undefined' && document.write) {
    LOAD_ORDER.PAGE.forEach(function (src) { document.write('<script src="' + src + '"><\/script>'); });
  }
})(typeof window !== 'undefined' ? window : globalThis);
