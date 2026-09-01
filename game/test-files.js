/* The ONE ordered list of subsystem test files the engine gate runs (ADR-0003).
   Single source of truth: game/test.js requires these (then test.invariants.js),
   test.invariants.js requires them to populate the suite-guard collections
   regardless of entry point, and dev/gen-test-manifest.js walks the same set. Add
   a new subsystem file HERE and every consumer picks it up — a one-file diff, so
   a new file cannot be wired into the runner yet slip past the deletion guard
   (#189). test.invariants.js is deliberately NOT listed: it is the guard file
   that requires this list, not a member of it. */
'use strict';
module.exports = [
  './test.geometry.js',
  './test.terrain.js',
  './test.cards.js',
  './test.maps.js',
  './test.ai.js',
  './test.reports.js',
  './test.commanders.js',
  './test.ui.js',
  './test.server.js',
];
