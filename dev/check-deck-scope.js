#!/usr/bin/env node
/* dev/check-deck-scope.js — keeps "deck" a SCOPED token.

   decks → battalions renamed the whole build layer (content kind, content/
   battalions/, the engine's content-resolution surface, the editor UI, the
   army-points cap). What still legitimately says "deck" is exactly two things:

     1. the IN-SKIRMISH DRAW PILE — buildDeck + st.cards.decks + sideDecks, the
        pile a battalion instantiates at skirmish start (draw → run out →
        Attrition). Its home is the skirmish engine and the tests that drive it.
     2. the PERSISTED run-identity `deck` COLUMN in logs/woa.db — a schema name,
        not a pure rename (a data migration, deferred with report-data).

   Every OTHER .js "deck" is build-layer drift that a grep missed. This scan is
   the guard: it FAILS on any `deck`/`Deck` in a .js file outside the allowlist
   below, so a future stray fails CI instead of rotting the rename. A single
   sanctioned line elsewhere opts out with a `deck-scope-ok` marker comment.

   Usage: node dev/check-deck-scope.js     full report + exit code (0 clean, 1 dirty)
   Exported: scan() -> [ 'file:line', … ] for the test that pins it green. */

'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');

// The draw-pile runtime + its tests: "deck" is the draw pile here.
var RUNTIME = [
  'game/engine/04-skirmish.js',   // buildDeck, st.cards.decks, sideDecks
  'game/engine/05-ai.js',         // reads the draw pile for the attrition sim
  'game/test/test.cards.js',      // draw / reshuffle / opening-hand mechanics
  'game/test/test.ai.js',         // AI over the draw pile
  'dev/claude-plays.test.js',     // sentinel seeded into the draw pile
];
// The persistence layer: "deck" is the logs/woa.db run-identity column.
var PERSISTENCE = [
  'dev/db.js',                    // schema + insert/select of the `deck` column
  'dev/db.test.js',
  'dev/server.test.js',
  'dev/balance-report.js',        // report tooling that stamps the column
  'game/server.js',              // /api/recordskirmish proxy forwards it
];
// Lint scanners that necessarily NAME the token (this file included).
var SCANNERS = [
  'dev/check-context.js',         // its _Avoid_ table names a retired map-card alias
  'dev/check-deck-scope.js',
  'dev/check-deck-scope.test.js',
];
var ALLOW = {};
RUNTIME.concat(PERSISTENCE, SCANNERS).forEach(function (f) { ALLOW[f] = true; });

var SKIP_DIR = ['.git', 'node_modules', 'graphify-out', 'logs', '.obsidian', '.vscode', 'worktrees', '.claude'];
function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (SKIP_DIR.indexOf(e.name) >= 0) return;
    var full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (path.extname(e.name) === '.js') out.push(full);
  });
  return out;
}

var DECK = /deck/i;                 // the scoped token
var MARKER = /deck-scope-ok/;        // a line's explicit opt-out

// Returns violations (build-layer "deck" outside the allowlist) as file:line
// strings, plus any allowlist entry that has gone deck-free (a stale entry to
// drop, so the allowlist can't rot into a silent hole).
function scan() {
  var violations = [], seen = {};
  walk(ROOT, []).forEach(function (abs) {
    var rel = path.relative(ROOT, abs);
    var lines = fs.readFileSync(abs, 'utf8').split('\n');
    var allowed = ALLOW[rel];
    lines.forEach(function (ln, i) {
      if (!DECK.test(ln)) return;
      if (allowed) { seen[rel] = true; return; }
      if (MARKER.test(ln)) return;
      violations.push(rel + ':' + (i + 1));
    });
  });
  var stale = Object.keys(ALLOW).filter(function (f) {
    return f !== 'dev/check-deck-scope.test.js' && !seen[f] && fs.existsSync(path.join(ROOT, f));
  });
  return { violations: violations, stale: stale };
}

module.exports = { scan: scan };

if (require.main === module) {
  var r = scan();
  var ok = true;
  if (r.violations.length) {
    ok = false;
    console.log('deck-scope: ' + r.violations.length + ' build-layer "deck" hit(s) outside the allowlist —');
    console.log('  rename to "battalion", or add a `deck-scope-ok` marker if it is the draw pile / db column:');
    console.log('    ' + r.violations.join('\n    '));
  } else {
    console.log('deck-scope: no build-layer "deck" outside the runtime + persistence allowlist');
  }
  if (r.stale.length) {
    ok = false;
    console.log('deck-scope: allowlisted file(s) now deck-free — drop them from the allowlist:');
    console.log('    ' + r.stale.join('\n    '));
  }
  console.log(ok ? 'check-deck-scope: PASS' : 'check-deck-scope: FAIL');
  process.exit(ok ? 0 : 1);
}
