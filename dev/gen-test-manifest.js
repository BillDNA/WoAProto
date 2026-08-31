/* Regenerate game/test-manifest.json — the base-commit set the deletion guard
   (game/test.invariants.js, ADR-0004 #189) protects. Run this atomically with a
   RULES_VERSION bump when legitimately pruning a pin, so the new baseline reflects
   the post-prune suite:  node dev/gen-test-manifest.js

   Requiring the suite registers every test through the test.helpers.js wrapper,
   which records its name; we read that collection and dump it BEFORE node:test
   runs (process.exit skips the run). Existing pin-prune records are dropped: once
   a pruned pin is out of `tests`, its record has served its purpose. */
'use strict';
var path = require('node:path');
var fs = require('node:fs');
var ROOT = path.join(__dirname, '..');

require(path.join(ROOT, 'game/test.invariants.js')); // pulls in every sibling test file
var H = require(path.join(ROOT, 'game/test.helpers.js'));
var E = require(path.join(ROOT, 'game/engine.js'));

var manifest = { rulesVersion: E.VERSION, tests: H.activeTestNames(), prunedPins: [] };
var out = path.join(ROOT, 'game/test-manifest.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write('wrote ' + out + ' — ' + manifest.tests.length + ' tests at rules ' + manifest.rulesVersion + '\n');
process.exit(0);
