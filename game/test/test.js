/* Frozen-API path (CLAUDE.md): game/test.js now DELEGATES to the subsystem test
   files split out under ADR-0003. Requiring them registers every node:test block,
   so `node game/test.js` (and `node --test game/test.js`) still runs the whole
   engine gate and exits non-zero on failure. */
'use strict';
require('../engine/board/hex/hex.test.js');        // the hex house — the coordinate dialect
require('../ui/board/hex/hex-screen.test.js');     // and its screen dialect
require('./test.board.js');           // the board's outline, shapes and grid labels
require('./test.combat.js');
require('../engine/board/terrain/terrain.test.js');   // the terrain house keeps its own tests
require('../ui/board/terrain/terrain-marks.test.js'); // and its drawing half likewise
require('./test.cards.js');
require('./test.maps.js');
require('./test.ai.js');
require('./test.commanders.js');
require('./test.reports.js');
require('./test.seams.js');
require('./test.ui.js');
require('./test.integration.js');
// The unit house last: its contract test registers a fourth type, and the
// registry is append-only, so every file above sees the shipped three.
require('../engine/unit/unit.test.js');        // the unit house — the pieces a side owns
require('../ui/unit/unit-marks.test.js');      // and its drawing half likewise
