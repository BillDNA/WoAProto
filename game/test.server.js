/* Subsystem: server launch bridge (#168, ADR-0004 §2). The logic/source-scan
   falsifiers for repointing POST /api/runloop from the condemned deck-drafter
   (dev/loop.js / runDeckLoop) to the #167 content loop (dev/content-loop.js) over
   a real attach-able transport. The transport-runtime halves (AC3/AC5/AC8) live in
   dev/runloop.test.js; the Workbench-live half (AC6) lives in dev/smoke.js.

   Frozen-API entry game/test.js delegates here via test-files.js; run this file
   directly with `node game/test.server.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('./test.helpers.js');
const assert = require('node:assert');
const path = require('node:path');

const SERVER = require('./server.js');

// The entry the child is spawned on is argv[0] of buildLoopArgs — the first arg
// ending in .js. (cfg passthroughs may add other paths; the entry is the script.)
function entryOf(argv) { return String((argv || []).filter(function (a) { return /\.js$/.test(String(a)); })[0] || ''); }

// AC1 — buildLoopArgs launches the content-loop entrypoint on a content-run-<ts>
// run, not dev/loop.js / runDeckLoop.
test('#168 AC1: buildLoopArgs launches content-loop.js, not dev/loop.js/runDeckLoop', () => {
  assert.strictEqual(typeof SERVER.buildLoopArgs, 'function',
    'server exports buildLoopArgs (the pure arg-assembler startLoop spawns)');
  var argv = SERVER.buildLoopArgs({ stop: '+5m' });
  assert.ok(Array.isArray(argv), 'buildLoopArgs returns the argv array');
  var entry = entryOf(argv);
  var base = path.basename(entry);
  assert.strictEqual(base, 'content-loop.js', 'the launched entry basename is content-loop.js (got "' + base + '")');
  assert.ok(!/(^|\/)loop\.js$/.test(entry), 'the entry is not the condemned dev/loop.js (got "' + entry + '")');
  var joined = argv.join(' ');
  assert.ok(!/runDeckLoop|deckbuild/.test(joined), 'no runDeckLoop / deckbuild token in the argv');
  assert.ok(/content-run-/.test(joined), 'the run id / branch matches content-run-<ts>');
});

// AC2 — the launched run is the #167 content loop (author->grade->balance->feels
// run record), carrying the --rec-dir run-record home, not a deck-drafter run.
test('#168 AC2: the launched run is the content-loop kind (--rec-dir), not a deck drafter', () => {
  assert.strictEqual(typeof SERVER.buildLoopArgs, 'function', 'server exports buildLoopArgs');
  var argv = SERVER.buildLoopArgs({ stop: '+5m' });
  var joined = argv.join(' ');
  assert.ok(/content-loop\.js/.test(joined), 'the argv references the content-loop entrypoint');
  assert.ok(argv.indexOf('--rec-dir') >= 0, 'the argv carries --rec-dir (the run-record home the loop writes)');
  assert.ok(!/deckbuild|draftSide|runDeckLoop/.test(joined),
    'no deck-drafter token (deckbuild/draftSide/runDeckLoop) in the argv');
});

// AC4 — startLoop derives status over a real attach-able transport, never a
// captured-stdout fold. Source scan (the runtime half is dev/runloop.test.js AC3).
test('#168 AC4: startLoop uses a real transport (file-tail/tee/pty), not a stdout-data fold', () => {
  assert.strictEqual(typeof SERVER.startLoop, 'function', 'server exports startLoop');
  var src = String(SERVER.startLoop);
  assert.ok(!/\.stdout\.on\(\s*['"]data['"]/.test(src),
    'startLoop does NOT fold child status from p.stdout.on("data", ...) (the condemned capture)');
  assert.ok(/file-tail|file tail|filetail|tee|pty/i.test(src),
    'startLoop names the real transport (file-tail / tee / pty) it derives status over');
});

// AC7 — the spawn runs unattended to the stop-datetime: both a non-interactive /
// auto-approve flag AND the forwarded stop value are present.
test('#168 AC7: buildLoopArgs is non-interactive and forwards the stop value', () => {
  assert.strictEqual(typeof SERVER.buildLoopArgs, 'function', 'server exports buildLoopArgs');
  var argv = SERVER.buildLoopArgs({ stop: '+45m' });
  var joined = argv.join(' ');
  assert.ok(/--non-interactive/.test(joined),
    'the argv carries an explicit non-interactive / auto-approve flag (--non-interactive)');
  var i = argv.indexOf('--stop');
  assert.ok(i >= 0 && String(argv[i + 1]) === '+45m',
    'the Plan stop value is forwarded through to --stop (got ' + (i >= 0 ? JSON.stringify(argv[i + 1]) : 'no --stop') + ')');
});
