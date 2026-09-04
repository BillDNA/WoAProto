/* War of Attrition — engine entry point (node).
   The engine lives in engine/ as classic-script parts loaded in the order
   load-order.js declares; the browser and the sweep worker read the same list.
   Both roads end at globalThis.Engine, which this file re-exports so every
   consumer's require('./engine.js') / require('../game/engine.js') keeps
   working unchanged. */
'use strict';
var path = require('path');
require(path.join(__dirname, 'load-order.js')).ENGINE.forEach(function (src) {
  require(path.join(__dirname, src));
});
module.exports = globalThis.Engine;
