/* dev/ui-review.test.js — Phase 1, THE GATE (spec #185, ADR-0004, ticket #192).
 * Run: node --test dev/ui-review.test.js   (part of `npm test`).
 *
 * The feature IS a gate, so the test surface is the EXTERNAL behaviour at the command boundary —
 * the process EXIT CODE against a violating fixture and a clean one, and the artifacts the run
 * writes (never the internal prompt wording of a subprocess). The LLM's judgment is stood in for
 * by a deterministic fake transport (fixtures/ui-review/fake-transport.js) so the plumbing under
 * test — capture -> blind describe -> compare -> decide -> exit code — is real while the answer is
 * derived from fixture content, not hard-coded per test. */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const U = require('./ui-review.js');
const ROOT = path.join(__dirname, '..');
const FIX = 'dev/proto/fixtures/ui-review';
const CLI = path.join(__dirname, 'ui-review.js');
const FAKE = path.join(ROOT, FIX, 'fake-transport.js');
const fake = require(FAKE);

function tmp(pfx) { return fs.mkdtempSync(path.join(os.tmpdir(), pfx)); }

// Run the CLI as a real process with the deterministic transport injected; return {code, out}.
function runCli(specRel, extraEnv) {
  const outDir = tmp('woa-uiv-out-');
  const shotsDir = tmp('woa-uiv-shots-');
  const args = [CLI, path.join(ROOT, specRel), '--out', outDir, '--shots', shotsDir, '--no-stage'];
  const env = Object.assign({}, process.env, {
    WOA_UI_REVIEW_CAPTURE: FAKE, WOA_UI_REVIEW_ASK: FAKE
  }, extraEnv || {});
  let code = 0, out = '';
  try { out = execFileSync('node', args, { cwd: ROOT, env: env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { code = e.status == null ? 1 : e.status; out = String(e.stdout || '') + String(e.stderr || ''); }
  const verdict = JSON.parse(fs.readFileSync(path.join(outDir, 'verdict.json'), 'utf8'));
  return { code: code, out: out, outDir: outDir, verdict: verdict };
}

/* ---------------- decide(): the deterministic gate core (pure) ---------------- */

test('decide: a clean review with a present target passes (code 0)', () => {
  const d = U.decide({ targetPresent: true, afterPresent: true, bounces: [] });
  assert.equal(d.pass, true);
  assert.equal(d.code, 0);
});

test('decide: any comparator bounce fails the gate (code 1)', () => {
  const d = U.decide({ targetPresent: true, afterPresent: true, bounces: [{ kind: 'ac', ref: 'x', why: 'missing' }] });
  assert.equal(d.code, 1);
  assert.equal(d.bounces.length, 1);
});

test('decide: an absent target is a bounce EVEN with zero comparator bounces (no vacuous pass)', () => {
  const d = U.decide({ targetPresent: false, afterPresent: true, bounces: [] });
  assert.equal(d.code, 1);
  assert.ok(d.bounces.some(b => b.kind === 'no-target'), 'a null target must red deterministically');
});

/* ---------------- parseVerdict(): fail-closed parsing ---------------- */

test('parseVerdict: reads bounces[], tolerates a fenced block', () => {
  assert.deepEqual(U.parseVerdict('{"bounces":[]}').bounces, []);
  assert.equal(U.parseVerdict('```json\n{"bounces":[{"kind":"ac","ref":"a","why":"b"}]}\n```').bounces.length, 1);
});

test('parseVerdict: garbage/empty is an error (caller fails closed to a bounce)', () => {
  assert.ok(U.parseVerdict('not json').error);
  assert.ok(U.parseVerdict('').error);
  assert.ok(U.parseVerdict('{"ok":true}').error, 'no bounces[] array is an error, not a pass');
});

/* ---------------- AC: blindness observable at the boundary ---------------- */

test('describe-input artifact carries NO ticket-derived text (blindness reds if leaked)', async () => {
  const base = { before: FIX + '/before.html', after: FIX + '/after-good.html', target: FIX + '/target.html' };
  const specA = Object.assign({ ticket: 'blind-A', acs: ['The dashboard shows a live match feed [feed]', 'Anomaly signals surface [anomaly]'] }, base);
  const specB = Object.assign({ ticket: 'blind-B', acs: ['A totally different requirement about widgets [widget]'] }, base);
  // Share the shots dir across both runs so the ONLY thing that could differ between the two
  // describe-inputs is ticket-derived — the volatile tmp shots path is held constant.
  const shotsDir = tmp('woa-uiv-shots-');
  const runOne = (s) => U.review(s, { capture: fake.capture, ask: fake.ask, stageShots: false, outDir: tmp('woa-uiv-out-'), shotsDir: shotsDir })
    .then(r => fs.readFileSync(path.join(r.outDir, 'describe-input.json'), 'utf8'));
  const rawA = await runOne(specA);
  const rawB = await runOne(specB);

  // The load-bearing property: the blind input is a pure function of the before/after renders — it
  // does NOT vary with the ticket. If a future edit folds ticket text into the blind step, these
  // two (same renders, different tickets/ACs) diverge and this reds.
  assert.equal(rawA, rawB, 'describe-input varied with the ticket — the blind step is not blind');

  // And, concretely, none of the distinctive ticket text appears in it (ticket id, AC markers/words).
  [specA, specB].forEach(function (s) {
    const raw = s === specA ? rawA : rawB;
    assert.ok(raw.indexOf(s.ticket) < 0, 'describe-input leaked the ticket id');
    assert.ok(!/acceptance|criteri/i.test(raw), 'describe-input leaked the acceptance-criteria framing');
    assert.ok(!/target\.html|calibration|after-good/.test(raw), 'describe-input named the target/after by identity');
    s.acs.forEach(function (ac) {
      (ac.match(/\[([a-z0-9_-]+)\]/gi) || []).forEach(function (tok) {
        assert.ok(raw.indexOf(tok.replace(/[\[\]]/g, '')) < 0, 'describe-input leaked AC marker "' + tok + '"');
      });
      ['anomaly', 'widget', 'dashboard'].forEach(function (w) {
        if (ac.indexOf(w) >= 0) assert.ok(raw.indexOf(w) < 0, 'describe-input leaked distinctive AC word "' + w + '"');
      });
    });
  });
});

test('a new-screen ticket with no "before" does not reference a before.png that was never written', async () => {
  const spec = { ticket: 'new-screen', acs: ['shows a feed [feed]'], before: null,
    after: FIX + '/after-good.html', target: FIX + '/target.html' };
  const res = await U.review(spec, { capture: fake.capture, ask: fake.ask, stageShots: false, outDir: tmp('woa-uiv-out-'), shotsDir: tmp('woa-uiv-shots-') });
  const di = JSON.parse(fs.readFileSync(path.join(res.outDir, 'describe-input.json'), 'utf8'));
  assert.deepEqual(di.images, ['after'], 'only the present renders are listed');
  assert.ok(di.prompt.indexOf('before.png') < 0, 'the blind prompt must not tell the model to open a nonexistent before.png');
});

/* ---------------- AC: exit-code seam against fixtures (the process boundary) ---------------- */

test('CLI exits NON-ZERO on a fixture whose "after" omits a target element / an AC', () => {
  const r = runCli(FIX + '/spec-bad.json');
  assert.notEqual(r.code, 0, 'a punted (80%) after must red');
  assert.equal(r.verdict.pass, false);
  assert.ok(r.verdict.bounces.some(b => b.ref.indexOf('anomaly') >= 0 || b.ref === 'anomaly'),
    'the missing anomaly panel/AC must be a bounce');
});

test('CLI exits ZERO on a fixture whose "after" matches its target and evidences every AC', () => {
  const r = runCli(FIX + '/spec-good.json');
  assert.equal(r.code, 0, 'a complete after that matches the target must pass; got: ' + r.out);
  assert.equal(r.verdict.pass, true);
  assert.equal(r.verdict.ranAgainstTarget, true);
});

test('CLI exits NON-ZERO when the TARGET capture is empty/absent (no vacuous pass)', () => {
  const r = runCli(FIX + '/spec-no-target.json');
  assert.notEqual(r.code, 0, 'a null target must red — the comparator cannot verify fidelity against nothing');
  assert.ok(r.verdict.bounces.some(b => b.kind === 'no-target'));
});

/* ---------------- AC: screenshots go to a shots-branch, never the working tree ---------------- */

test('shots are staged onto a pr-shots branch and NO screenshot lands in the working tree', async () => {
  // A throwaway git repo so staging does not touch the real repo's refs. Real PNG bytes here so
  // the git plumbing is exercised for what it will actually carry.
  const repo = tmp('woa-uiv-repo-');
  execFileSync('git', ['init', '-q'], { cwd: repo });
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo });
  const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'); // PNG magic + IHDR start
  const spec = { ticket: 'shots-1', acs: ['x [feed]'],
    before: FIX + '/before.html', after: FIX + '/after-good.html', target: FIX + '/target.html' };
  const shotsDir = tmp('woa-uiv-shots-');
  await U.review(spec, {
    capture: () => Promise.resolve(PNG), ask: fake.ask,
    outDir: tmp('woa-uiv-out-'), shotsDir: shotsDir, repoRoot: repo
  });
  // (a) no png anywhere in the working tree (tracked or untracked)
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: repo, encoding: 'utf8' });
  assert.ok(!/\.png\s*$/m.test(status), 'a screenshot dirtied the working tree: ' + status);
  // (b) the shots-branch exists and carries the pngs
  const ls = execFileSync('git', ['ls-tree', '--name-only', 'refs/heads/pr-shots/shots-1'], { cwd: repo, encoding: 'utf8' });
  assert.ok(/before\.png/.test(ls) && /after\.png/.test(ls) && /target\.png/.test(ls),
    'pr-shots branch is missing the shots: ' + ls);
});

test('a reused shots dir does not stage a stale screenshot from a prior run', async () => {
  const repo = tmp('woa-uiv-repo-');
  execFileSync('git', ['init', '-q'], { cwd: repo });
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: repo });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: repo });
  const shotsDir = tmp('woa-uiv-shots-');
  fs.writeFileSync(path.join(shotsDir, 'target.png'), Buffer.from('89504e470d0a1a0a', 'hex')); // stale from a "prior run"
  const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
  // This run has NO target (target absent), so only before/after are captured — the stale target.png
  // must NOT be carried onto the shots-branch.
  const spec = { ticket: 'stale-1', acs: ['x [feed]'], before: FIX + '/before.html', after: FIX + '/after-good.html', target: null };
  await U.review(spec, { capture: () => Promise.resolve(PNG), ask: fake.ask, outDir: tmp('woa-uiv-out-'), shotsDir: shotsDir, repoRoot: repo });
  const ls = execFileSync('git', ['ls-tree', '--name-only', 'refs/heads/pr-shots/stale-1'], { cwd: repo, encoding: 'utf8' });
  assert.ok(/before\.png/.test(ls) && /after\.png/.test(ls), 'this run\'s shots should be staged');
  assert.ok(!/target\.png/.test(ls), 'a stale target.png from a prior run must not be staged: ' + ls);
});

/* ---------------- AC: real Playwright capture writes a verdict artifact ---------------- */

test('captures before/after/target with real Playwright and writes a verdict artifact', async (t) => {
  // Real pixels via Playwright (jsdom renders none). Skip only if the browser is genuinely absent —
  // this probes the tool's stated external dependency, it is not the gate.
  let ok = true;
  try { await U.defaultCapture(path.join(ROOT, FIX, 'before.html')).then(b => { ok = !!(b && b.length); }); }
  catch (e) { ok = false; }
  if (!ok) { await U.closeBrowser(); return t.skip('Playwright chromium not installed'); }
  const spec = U.loadSpec(path.join(ROOT, FIX, 'spec-good.json'));
  const outDir = tmp('woa-uiv-out-');
  const shotsDir = tmp('woa-uiv-shots-');
  const res = await U.review(spec, { capture: U.defaultCapture, ask: fake.ask, stageShots: false, outDir: outDir, shotsDir: shotsDir });
  await U.closeBrowser();
  // real PNGs were captured
  const shot = fs.readFileSync(path.join(shotsDir, 'after.png'));
  assert.equal(shot.slice(1, 4).toString(), 'PNG', 'after.png is a real PNG');
  // a verdict artifact was written
  assert.ok(fs.existsSync(path.join(outDir, 'verdict.json')));
  assert.ok(fs.existsSync(path.join(outDir, 'verdict.md')));
  assert.equal(res.verdict.ranAgainstTarget, true);
});

test('captures a real dev/proto/*.proto.html target with Playwright (the shipped mock)', async (t) => {
  let ok = true;
  try { await U.defaultCapture(path.join(ROOT, FIX, 'before.html')).then(b => { ok = !!(b && b.length); }); }
  catch (e) { ok = false; }
  if (!ok) { await U.closeBrowser(); return t.skip('Playwright chromium not installed'); }
  const spec = {
    ticket: 'proto-capture', acs: ['the workbench shows a one-pager [oneliner]'],
    before: FIX + '/before.html', after: FIX + '/after-good.html',
    target: 'dev/proto/calibration-dashboard.proto.html'   // the existing shipped proto, per #192
  };
  const shotsDir = tmp('woa-uiv-shots-');
  const res = await U.review(spec, { capture: U.defaultCapture, ask: fake.ask, stageShots: false, outDir: tmp('woa-uiv-out-'), shotsDir: shotsDir });
  await U.closeBrowser();
  const target = fs.readFileSync(path.join(shotsDir, 'target.png'));
  assert.equal(target.slice(1, 4).toString(), 'PNG');
  assert.ok(target.length > 1000, 'the rendered proto target should be a non-trivial PNG');
  assert.equal(res.verdict.ranAgainstTarget, true);
});
