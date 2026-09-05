/* Frozen-API path (CLAUDE.md): game/test.js now DELEGATES to the subsystem test
   files split out under ADR-0003. Requiring them registers every node:test block,
   so `node game/test.js` (and `node --test game/test.js`) still runs the whole
   engine gate and exits non-zero on failure. */
'use strict';
require('./test.geometry.js');
require('../engine/board/terrain/terrain.test.js');  // the terrain house keeps its own tests
require('./test.cards.js');
require('./test.maps.js');
require('./test.ai.js');
require('./test.commanders.js');
require('./test.reports.js');
require('./test.seams.js');
require('./test.ui.js');
require('./test.integration.js');
