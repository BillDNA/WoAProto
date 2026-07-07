/* War of Attrition — engine entry point (node).
   The engine lives in engine/ as ordered classic-script parts; filename sort
   IS the load order (the same convention content/ uses). The browser loads
   the parts via index.html's script-tag chain; node loads them here. Both
   roads end at globalThis.Engine, which this file re-exports so every
   consumer's require('./engine.js') / require('../game/engine.js') keeps
   working unchanged. */
'use strict';
var fs = require('fs');
var path = require('path');
var dir = path.join(__dirname, 'engine');
fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f); }).sort().forEach(function (f) {
  require(path.join(dir, f));
});
module.exports = globalThis.Engine;
