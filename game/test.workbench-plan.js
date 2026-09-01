/* #169 — Plan-panel rebuild: the LOGIC/INVARIANT falsifiers that live in the engine
   gate (the existence/interaction ACs live in dev/smoke.js; the fidelity AC in a
   dev/ui-review review-spec). Run alone with `node game/test.workbench-plan.js`;
   game/test.js delegates here via test-files.js.

   AC3 (logic) — every Plan knob reaches the LAUNCHED loop's config, not just the DOM.
   Asserted against the REAL transport: the real game/server.js content-loop launch
   (POST /api/contentloop -> startContentLoop) with only the OS syscalls (the git
   worktree add, the child spawn) captured — the whole config->args/record assembly
   runs. The generic "a real child actually spawns" is separately proven live in
   dev/smoke.js's loop-bridge; here we read the assembled config the launch hands the loop.

   AC4 (invariant-flavoured pin) — the default Temperature/Tolerance are loose enough
   that a normal run keeps something. */
'use strict';
const { test } = require('./test.helpers.js'); // records each as a pin (#189 deletion guard)
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const GAME = __dirname;
const REPO = path.join(GAME, '..');
const SERVER = require.resolve('./server.js');

// Drive the REAL content-loop launch route once with a fully-populated Plan config,
// capturing the syscalls so nothing actually runs. Returns the captured spawn
// ({cmd,args}) plus the run-record config block startContentLoop wrote.
function launchWith(cfg) {
  const cp = require('child_process');
  const origSpawn = cp.spawn, origExecFileSync = cp.execFileSync;
  const latestFile = path.join(REPO, 'logs', 'content-runs', 'latest.json');
  let latestBackup = null; try { latestBackup = fs.readFileSync(latestFile, 'utf8'); } catch (e) {}
  let captured = null;
  cp.execFileSync = function () { return Buffer.from(''); };                 // no-op the worktree-add syscall
  cp.spawn = function (cmd, args, opts) { captured = { cmd: cmd, args: args, opts: opts }; return { unref: function () {}, on: function () {} }; };
  delete require.cache[SERVER];                                              // rebind server.js's top-level `spawn` to our capture
  try {
    const srv = require(SERVER);
    let out = null, status = 0;
    const res = { writeHead: function (s) { status = s; }, end: function (b) { out = b; } };
    // headless:true => startContentLoop spawns the node content-loop (capturable), never `open -a Terminal`.
    srv.ROUTES['POST /api/contentloop']({}, res, Object.assign({ headless: true }, cfg));
    assert.strictEqual(status, 200, 'the content-loop launch route returned 200 (body ' + out + ')');
    let record = null; try { record = JSON.parse(fs.readFileSync(latestFile, 'utf8')); } catch (e) {}
    return { captured: captured, record: record };
  } finally {
    cp.spawn = origSpawn; cp.execFileSync = origExecFileSync;
    delete require.cache[SERVER];
    try { if (latestBackup != null) fs.writeFileSync(latestFile, latestBackup); else fs.rmSync(latestFile, { force: true }); } catch (e) {}
  }
}

// AC3 — the stop-datetime the operator sets in Plan must reach the launched run's config.
test('#169 AC3: the Plan stop-datetime reaches the launched loop config, not just the DOM', () => {
  const stopAt = '2026-09-15T18:30';
  const { captured, record } = launchWith({
    nudge: 'build out toward 30 cards', temperature: 'bold',
    profile: { name: 'Card', tolerances: { hq: 'nudge' } },
    stop: stopAt, questionnaire: 'debrief-A', panel: ['hard'], n: 2, iters: 1, mock: true
  });
  // the launch really reached the spawn (config -> args assembly ran end to end)
  assert.ok(captured && /content-loop\.js/.test((captured.args || []).join(' ')),
    'the launch assembled and spawned dev/content-loop.js (args: ' + (captured && (captured.args || []).join(' ')) + ')');
  // the record the launch writes IS the launched run's config the dashboard/consumers read.
  assert.ok(record && record.config, 'the launched run wrote a config block');
  assert.strictEqual(record.config.stopAt, stopAt,
    'the stop-datetime set in Plan reaches the launched run config (record.config.stopAt); got "' + record.config.stopAt + '"');
});

// AC3 — the chosen questionnaire must reach the launched loop's config (the spawned process),
// not merely sit in the mirror record.
test('#169 AC3: the chosen questionnaire reaches the spawned loop config', () => {
  const { captured } = launchWith({
    nudge: 'n', temperature: 'standard', profile: { name: 'Card', tolerances: {} },
    stop: '2026-09-15T18:30', questionnaire: 'debrief-A', panel: ['hard'], n: 2, iters: 1, mock: true
  });
  const argStr = (captured && captured.args || []).join(' ');
  assert.ok(argStr.indexOf('--questionnaire') >= 0 && argStr.indexOf('debrief-A') >= 0,
    'the launched loop process is told the chosen questionnaire (--questionnaire debrief-A); got args: ' +
    (captured && (captured.args || []).join(' ')));
});

// AC4 — Temperature/Tolerance defaults must be loose enough that a normal run keeps something.
test('#169 AC4: the default Temperature/Tolerance are loose enough to keep something', () => {
  const TOL = require('./content/tolerances.js');
  const WB = fs.readFileSync(path.join(GAME, 'ui', 'workbench.js'), 'utf8');
  // the Plan default Temperature (WB_PLAN.temperature) is a real, non-empty passthrough level.
  const m = WB.match(/temperature:\s*'([^']*)'/);
  const defTemp = m && m[1];
  assert.ok(defTemp && (!/WB_TEMPERATURES\s*=\s*\[/.test(WB) || new RegExp("'" + defTemp + "'").test(WB)),
    'the default Temperature is a real level (got "' + defTemp + '")');
  // the default loop-type Tolerance profile flags-but-never-locks-everything: it must carry
  // at least one loosened (non-hold) axis, or a run at defaults keeps nothing worth keeping.
  const card = TOL.profiles && TOL.profiles.card;
  assert.ok(card && card.tolerances && Object.keys(card.tolerances).length >= 1,
    'the default (card) Tolerance profile loosens at least one axis, so a default run keeps something');
  const loosened = Object.keys(card.tolerances).filter(function (k) { return card.tolerances[k] !== 'hold'; });
  assert.ok(loosened.length >= 1,
    'at least one axis is graced beyond the fixed ruler at the default profile (loosened: ' + loosened.join(',') + ')');
});

// AC8 (fidelity) — the rebuilt Plan panel must read as a real wired launch panel matching the
// calibration-dashboard Plan design. The actual judgment is dev/ui-review.js's blind describe +
// compare against the target (run by the implementer, NOT here). This pins the review-spec that
// names the oracle, and a deterministic red-at-base: the after-render does not yet present the
// wired panel (its meta-loop seam is absent), so it cannot match the target design.
test('#169 AC8: the fidelity review-spec names the target and the after does not yet match', () => {
  const specPath = path.join(REPO, 'dev', 'proto', 'fixtures', 'ui-review', '169.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  assert.strictEqual(spec.ticket, '169', 'review-spec is for ticket 169');
  assert.ok(Array.isArray(spec.acs) && spec.acs.length >= 8, 'review-spec carries the ticket ACs (' + (spec.acs || []).length + ')');
  assert.strictEqual(spec.target, 'dev/proto/calibration-dashboard.proto.html', 'review-spec points at the calibration-dashboard Plan design as the oracle');
  const target = path.join(REPO, spec.target);
  assert.ok(fs.existsSync(target), 'the fidelity target render exists (a real dev/proto mock, not a stub): ' + spec.target);
  const proto = fs.readFileSync(target, 'utf8');
  assert.ok(/Opening nudge/i.test(proto) && /questionnaire/i.test(proto),
    'the target proto really is the Plan design oracle (opening nudge + questionnaire present)');
  assert.ok(spec.before && spec.after, 'review-spec names a before and an after render for the blind compare');
  // red-at-base: the after-render (game Plan panel) does not yet present the wired rebuilt panel —
  // its grayed meta-loop seam button is absent, so a blind compare against the design would bounce.
  const wb = fs.readFileSync(path.join(GAME, 'ui', 'workbench.js'), 'utf8');
  assert.ok(/wbMetaLoop/.test(wb),
    'the after-render presents the wired Plan panel the design shows (the meta-loop seam button is rendered) — absent at base, so the after does not yet match the target');
});
