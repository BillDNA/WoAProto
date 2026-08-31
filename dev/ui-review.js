#!/usr/bin/env node
/* dev/ui-review.js — Phase 1, THE GATE (spec #185, ADR-0004, ticket #192).
 *
 * A zero-interaction Node CLI that runs the fresh blind UI review in place of the biased
 * inline code-review. Modeled on the `claude -p` transport used by dev/llm-client.js /
 * dev/grade-card.js. Given a ticket reference it captures BEFORE / AFTER / TARGET renders
 * with Playwright (jsdom renders no pixels), then runs Phase 1:
 *
 *   - a BLIND DESCRIBER given ONLY the before/after images and NO ticket ("what changed,
 *     and what would a human want to do here?"). Blindness is the load-bearing anti-80%
 *     property, so it is observable at the boundary: the exact describe-phase input is
 *     written as an artifact (describe-input.json) that carries no ticket-derived text —
 *     a future edit that leaks the ticket into the blind step reds the blindness test.
 *   - a COMPARATOR that checks the blind description against BOTH the TARGET render (bounce
 *     on any target element the after-description omits — the anti-80% oracle) AND the
 *     ticket's acceptance criteria (bounce on any AC or human interaction not evidenced).
 *
 * Any bounce -> non-zero exit; the review stops here and never reaches a rubric (Phase 2 is
 * a later ticket). It writes a verdict artifact; screenshots go to a shots-branch (git ref
 * refs/heads/pr-shots/<ticket>, written via plumbing) and NEVER to the working tree.
 *
 * The GATE (spec vocabulary, docs/context/test.md) is the deterministic fact that THE REVIEW
 * RAN AGAINST THE TARGET AND EMITTED A VERDICT — decide() below is that gate: it is pure and
 * fail-CLOSED. The Phase-1 BOUNCE itself is a judgment (the describer/comparator are the LLM).
 * A gate must not pass vacuously: an empty/absent TARGET capture is a deterministic bounce in
 * decide() BEFORE the comparator is even consulted, so a null target can never read as "matches".
 * Every LLM leg fails closed — an errored/empty describe or comparator becomes a bounce, never a
 * silent pass (a gate that fails open is an escape valve).
 *
 * CLI:
 *   node dev/ui-review.js <ticket>            # <ticket> = path to a review-spec .json (see below)
 *     [--out <dir>] [--shots <dir>] [--no-stage]
 *
 * Review-spec (what woa-implement writes for a UI ticket; see dev/proto/fixtures/ui-review/):
 *   { "ticket": "192",
 *     "acs": ["The dashboard shows a live match feed", ...],   // the ticket's acceptance criteria
 *     "before": "path/to/before.html",   // rendered as BEFORE (repo-relative or absolute)
 *     "after":  "path/to/after.html",    // rendered as AFTER
 *     "target": "dev/proto/<x>.proto.html" }   // the fidelity oracle (a dev/proto mock)
 *
 * The pure pieces (decide / parseVerdict / buildDescribeRequest / buildCompareRequest) are
 * unit-tested; the exit-code seam is exercised against fixtures in dev/ui-review.test.js.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');

// ---------------------------------------------------------------- prompts (frozen, blind)
// The describer NEVER sees the ticket. These constants carry no ticket-derived text, and the
// describe-input artifact records them verbatim — so a future edit that leaks the ticket (into
// the user prompt OR the system prompt) shows up in the artifact and reds the blindness test.
const DESCRIBER_SYSTEM =
  'You are a fresh UI reviewer. You are shown only two screenshots of a screen — a BEFORE and ' +
  'an AFTER — and nothing else. You have not seen any ticket, spec, or requirements, and you ' +
  'must not guess at them. Describe only what you can actually see.';
const BLIND_PROMPT =
  'Compare the BEFORE and AFTER screenshots. Answer two questions:\n' +
  '1. What changed between before and after? List every element that appears, changes, or ' +
  'disappears, by what it visibly is (a button, a panel, a list, a label and its text).\n' +
  '2. Looking only at the AFTER screen, what would a human want to DO here? Name every action ' +
  'the screen invites (a click, a keypress, an input) and whether the screen looks able to serve it.';
const COMPARATOR_SYSTEM =
  'You are a strict UI comparator. You are given a blind description of an AFTER screen, the ' +
  'TARGET screenshot that AFTER is meant to match, and a list of acceptance criteria. Your job ' +
  'is to BOUNCE: report every target element the description omits, and every acceptance ' +
  'criterion or human interaction the description does not evidence. Do not give the benefit of ' +
  'the doubt — an item you cannot positively confirm from the description is a bounce.';

// The comparator's output shape. bounces:[] means the review found nothing missing.
const VERDICT_SCHEMA = JSON.stringify({
  bounces: [{ kind: 'ac | target-element | interaction', ref: 'the AC text or element name', why: 'what is missing' }]
}, null, 2);

// ---------------------------------------------------------------- pure helpers
function present(buf) { return !!(buf && buf.length > 0); }
function absPath(p) { return path.isAbsolute(p) ? p : path.join(ROOT, p); }

// THE GATE. Pure, deterministic, fail-closed. Given the capture facts and the comparator's
// bounces, decide the exit code. An absent target/after is a deterministic bounce PREPENDED
// here — so the comparator's opinion cannot make a null-target review pass vacuously.
function decide(state) {
  const bounces = Array.isArray(state.bounces) ? state.bounces.slice() : [];
  if (!state.afterPresent) {
    bounces.unshift({ kind: 'no-after', ref: 'after', why: 'after capture empty/absent — nothing to review' });
  }
  if (!state.targetPresent) {
    bounces.unshift({ kind: 'no-target', ref: 'target',
      why: 'target capture empty/absent — the comparator cannot verify fidelity against a null target' });
  }
  const pass = bounces.length === 0;
  return { pass: pass, code: pass ? 0 : 1, bounces: bounces };
}

// Parse the comparator envelope text -> { bounces:[...] } or { error }. Fail-closed: anything
// unparseable is an error the caller turns into a bounce (never a silent pass).
function parseVerdict(text) {
  if (typeof text !== 'string' || !text.trim()) return { error: 'empty comparator output' };
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);   // tolerate a fenced block
  if (fence) s = fence[1].trim();
  let o;
  try { o = JSON.parse(s); } catch (e) { return { error: 'unparseable comparator output: ' + e.message }; }
  if (!o || typeof o !== 'object' || !Array.isArray(o.bounces)) return { error: 'comparator output has no bounces[] array' };
  const bounces = o.bounces.map(function (b) {
    return { kind: String((b && b.kind) || 'bounce'), ref: String((b && b.ref) || ''), why: String((b && b.why) || '') };
  });
  return { bounces: bounces };
}

// A stable, image-role-labelled block that lists ONLY the images that were actually captured
// (an absent render is not listed — the model is never told to open a file that was never written).
// The image references are the FINAL user-message text a transport sends verbatim, so the request
// the describe-input artifact records is exactly what reaches the model (no transport-side append).
function imageBlock(images) {
  if (!images.length) return '';
  return '\n\nScreenshots — open and view each file, then answer:\n' +
    images.map(function (i) { return '- ' + i.role + ': ' + i.path; }).join('\n');
}

// The blind describe request — before/after images ONLY, the frozen blind prompt, no ticket.
// imageRoles is what the describe-input artifact records (neutral roles, never a ticket path).
function buildDescribeRequest(shotsDir, beforeBuf, afterBuf) {
  const images = [];
  if (present(beforeBuf)) images.push({ role: 'before', path: path.join(shotsDir, 'before.png'), buf: beforeBuf });
  if (present(afterBuf)) images.push({ role: 'after', path: path.join(shotsDir, 'after.png'), buf: afterBuf });
  return {
    phase: 'describe',
    systemPrompt: DESCRIBER_SYSTEM,
    userMessage: BLIND_PROMPT + imageBlock(images),
    images: images,
    imageRoles: images.map(function (i) { return i.role; })
  };
}

// The comparator request — the blind description + the TARGET image + the ACs. `description`
// and `acs` are surfaced as explicit fields (not only folded into userMessage) so a transport
// can read them structurally; the real transport also embeds them in the prompt text.
function buildCompareRequest(shotsDir, description, targetBuf, acs) {
  const list = (acs || []).map(function (a, i) { return (i + 1) + '. ' + a; }).join('\n');
  const images = present(targetBuf) ? [{ role: 'target', path: path.join(shotsDir, 'target.png'), buf: targetBuf }] : [];
  const userMessage =
    'BLIND DESCRIPTION OF THE AFTER SCREEN (the reviewer never saw the ticket):\n' + description +
    '\n\nACCEPTANCE CRITERIA the AFTER screen must evidence:\n' + list +
    '\n\nThe TARGET screenshot is what AFTER must match. Bounce on every target element the ' +
    'description omits and every acceptance criterion or human interaction it does not evidence. ' +
    'Respond with ONLY the JSON verdict.' + imageBlock(images);
  return {
    phase: 'compare',
    systemPrompt: COMPARATOR_SYSTEM,
    userMessage: userMessage,
    description: description,
    acs: (acs || []).slice(),
    images: images,
    outputSchema: VERDICT_SCHEMA
  };
}

// ---------------------------------------------------------------- spec loading
function loadSpec(ref) {
  if (!ref) throw new Error('a ticket reference is required: node dev/ui-review.js <review-spec.json>');
  const file = absPath(ref);
  if (!fs.existsSync(file)) throw new Error('review-spec not found: ' + ref + ' (expected a .json path)');
  let spec;
  try { spec = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw new Error('review-spec is not valid JSON (' + ref + '): ' + e.message); }
  if (!spec || typeof spec !== 'object') throw new Error('review-spec must be a JSON object');
  if (spec.ticket == null) spec.ticket = path.basename(file).replace(/\.json$/, '');
  spec.ticket = String(spec.ticket);
  if (!Array.isArray(spec.acs)) spec.acs = [];
  return spec;
}

// ---------------------------------------------------------------- Playwright capture (real pixels)
// Resolve Playwright from wherever it is installed. dev/package.json is gitignored (deps are a
// user-level assumption, per ADR-0004), so we try the dev install first, then a bare require.
function loadPlaywright() {
  const tries = [path.join(__dirname, 'node_modules', 'playwright'), 'playwright'];
  for (let i = 0; i < tries.length; i++) {
    try { return require(tries[i]); } catch (e) { /* next */ }
  }
  throw new Error('Playwright is not installed (dev/node_modules/playwright). ' +
    'Install it: (cd dev && npm install playwright && node node_modules/playwright/cli.js install chromium-headless-shell)');
}

// One lazily-launched browser reused across captures within a process. ui-review.js is a one-shot
// CLI (one review per process), so a module-global is fine here; closeBrowser() tears it down at the
// end. Do NOT run two review() calls concurrently in one process against defaultCapture — they would
// share (and one's closeBrowser would invalidate) this instance. A batch runner should own a browser.
let BROWSER = null;
async function defaultCapture(htmlPathAbs) {
  if (!htmlPathAbs || !fs.existsSync(htmlPathAbs)) return null;   // absent render -> null buffer (a bounce upstream)
  const pw = loadPlaywright();
  if (!BROWSER) BROWSER = await pw.chromium.launch();
  const page = await BROWSER.newPage();
  try {
    await page.setViewportSize({ width: 1200, height: 900 });
    // 'load' (not 'networkidle'): the targets are live-feed UIs that poll/stream, so networkidle
    // never settles and would time out. Wait for load, then a short beat for fonts/layout/animation.
    await page.goto('file://' + htmlPathAbs, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(300);
    return await page.screenshot({ fullPage: true });
  } finally { await page.close(); }
}
async function closeBrowser() { if (BROWSER) { try { await BROWSER.close(); } catch (e) {} BROWSER = null; } }

// ---------------------------------------------------------------- LLM transport (vision, fail-closed)
// Real ask: `claude -p` reads the referenced image files (the request's userMessage already lists
// their paths — buildDescribeRequest/buildCompareRequest put them there, so this transport sends the
// message VERBATIM and cannot fold in anything the describe-input artifact did not record). We spawn
// directly (rather than reuse llm-client.send) for one reason: --allowedTools 'Read', WITHOUT which
// the headless CLI has no way to open the PNGs and the whole vision review is blind. The blob
// parsing is shared with llm-client (buildPrompt/parseEnvelope/resolveBinary — one impl). Fails
// CLOSED: any spawn/timeout/parse failure -> errored -> empty text -> a bounce upstream, never a pass.
function defaultAsk(request) {
  const LLM = require(path.join(__dirname, 'llm-client.js'));
  const errored = { text: '', inputTokens: 0, outputTokens: 0, finishReason: 'error' };
  return new Promise(function (resolve) {
    let bin;
    try { bin = LLM.resolveBinary(request.binaryPath); } catch (e) { return resolve(errored); }
    const args = bin.extraArgs.concat([
      '-p', '--no-session-persistence',
      '--model', request.model || '',
      '--system-prompt', request.systemPrompt || '',   // full override: no ambient CLAUDE.md, pinned role
      '--allowedTools', 'Read',                          // the CLI needs Read to open the screenshots
      '--output-format', 'json'
    ]);
    let proc;
    try { proc = spawn(bin.cmd, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) { return resolve(errored); }
    let out = '', done = false;
    function finish(r) { if (done) return; done = true; clearTimeout(timer); resolve(r); }
    const timer = setTimeout(function () { try { proc.kill(); } catch (e) {} finish(errored); }, request.timeoutMs || 180000);
    proc.on('error', function () { finish(errored); });
    proc.stdout.on('data', function (d) { out += d; });
    proc.stderr.on('data', function () {});
    proc.on('close', function (code) { finish(LLM.parseEnvelope(out, code === 0 ? 0 : 1)); });
    proc.stdin.on('error', function () {});
    try { proc.stdin.write(LLM.buildPrompt(request)); proc.stdin.end(); } catch (e) { /* close handler fails open */ }
  });
}

// ---------------------------------------------------------------- shots -> shots-branch (never the tree)
// Write the PNG blobs onto refs/heads/pr-shots/<ticket> via git plumbing — object db + a branch
// ref only, NEVER the working tree or the main index. Best-effort/fail-soft: staging shots must
// not fail the gate (the gate is the review verdict), but it also must never dirty the tree.
function stageShots(shotsDir, ticket, opts) {
  opts = opts || {};
  const cwd = opts.repoRoot || ROOT;
  let files;
  try { files = fs.readdirSync(shotsDir).filter(function (f) { return f.endsWith('.png'); }); }
  catch (e) { return { staged: false, reason: 'no shots dir' }; }
  if (!files.length) return { staged: false, reason: 'no shots' };
  const branch = 'pr-shots/' + ticket;
  const ref = 'refs/heads/' + branch;
  if (opts.only) files = files.filter(function (f) { return opts.only.indexOf(f) >= 0; });  // this run's shots only
  if (!files.length) return { staged: false, reason: 'no shots' };
  const git = function (args, o) { return execFileSync('git', args, Object.assign({ cwd: cwd, encoding: 'utf8' }, o || {})).trim(); };
  try {
    const entries = files.sort().map(function (f) {
      const sha = git(['hash-object', '-w', '--', path.join(shotsDir, f)]);
      return '100644 blob ' + sha + '\t' + f;
    }).join('\n');
    const tree = git(['mktree'], { input: entries + '\n' });
    let parent = '';
    try { parent = git(['rev-parse', '--verify', '-q', ref]); } catch (e) { /* new branch */ }
    const args = ['commit-tree', tree, '-m', 'ui-review shots for ' + ticket];
    if (parent) args.push('-p', parent);
    const commit = git(args);
    git(['update-ref', ref, commit]);
    return { staged: true, branch: branch, commit: commit, files: files };
  } catch (e) { return { staged: false, reason: String(e.message || e) }; }
}

// ---------------------------------------------------------------- verdict artifact (human-readable)
function writeVerdictMd(outDir, v) {
  const lines = [
    '# UI review — ticket ' + v.ticket, '',
    '- ran: ' + v.at,
    '- ran against target: ' + v.ranAgainstTarget,
    '- verdict: ' + (v.pass ? 'PASS (Phase 1 gate cleared)' : 'BOUNCE (' + v.bounces.length + ')'), ''
  ];
  if (v.bounces.length) {
    lines.push('## Bounces');
    v.bounces.forEach(function (b) { lines.push('- **' + b.kind + '** `' + b.ref + '` — ' + b.why); });
    lines.push('');
  }
  lines.push('## Blind description (describer never saw the ticket)', '', (v.description || '(none)'), '');
  fs.writeFileSync(path.join(outDir, 'verdict.md'), lines.join('\n'));
}

// ---------------------------------------------------------------- orchestration
async function review(spec, opts) {
  opts = opts || {};
  const capture = opts.capture || defaultCapture;
  const ask = opts.ask || defaultAsk;
  const outDir = opts.outDir || path.join(ROOT, 'logs', 'reports', 'ui-review', spec.ticket);
  const shotsDir = opts.shotsDir || fs.mkdtempSync(path.join(os.tmpdir(), 'woa-uishots-'));
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(shotsDir, { recursive: true });

  // 1. capture before/after/target (real pixels via Playwright, or an injected capture)
  const beforeBuf = spec.before ? await capture(absPath(spec.before)) : null;
  const afterBuf = spec.after ? await capture(absPath(spec.after)) : null;
  const targetBuf = spec.target ? await capture(absPath(spec.target)) : null;

  // shots to the out-of-tree shots dir, then onto the shots-branch — never the working tree. Track
  // exactly the files THIS run wrote so a reused --shots dir cannot stage a stale prior screenshot.
  const written = [];
  [['before.png', beforeBuf], ['after.png', afterBuf], ['target.png', targetBuf]].forEach(function (pair) {
    if (present(pair[1])) { fs.writeFileSync(path.join(shotsDir, pair[0]), pair[1]); written.push(pair[0]); }
  });
  let shots = { staged: false, reason: 'skipped' };
  if (opts.stageShots !== false) shots = stageShots(shotsDir, spec.ticket, { repoRoot: opts.repoRoot, only: written });

  const targetPresent = present(targetBuf);
  const afterPresent = present(afterBuf);

  // 2. Phase 1a — BLIND describe (before/after only). Write the describe-input artifact FIRST:
  // it is exactly what the describer is fed, and it must carry no ticket-derived text.
  const describeReq = buildDescribeRequest(shotsDir, beforeBuf, afterBuf);
  const describeInput = {
    phase: 'describe', systemPrompt: describeReq.systemPrompt, prompt: describeReq.userMessage,
    images: describeReq.imageRoles
  };
  fs.writeFileSync(path.join(outDir, 'describe-input.json'), JSON.stringify(describeInput, null, 2));
  const describeRes = await ask(describeReq);
  const description = (describeRes && describeRes.text) || '';

  // 3. Phase 1b — COMPARE against target + ACs. Only when BOTH target and after are present:
  // an absent target is handled by decide() as a deterministic bounce (no vacuous pass), and
  // there is nothing to compare a null after against.
  let bounces = [];
  let compared = false;
  if (targetPresent && afterPresent) {
    const cmpReq = buildCompareRequest(shotsDir, description, targetBuf, spec.acs);
    const cmpRes = await ask(cmpReq);
    const parsed = parseVerdict(cmpRes && cmpRes.text);
    if (parsed.error) {
      bounces = [{ kind: 'review-error', ref: 'comparator', why: 'failing closed — ' + parsed.error }];
    } else {
      bounces = parsed.bounces;
    }
    compared = true;
  }

  const d = decide({ targetPresent: targetPresent, afterPresent: afterPresent, bounces: bounces });
  const verdict = {
    ticket: spec.ticket, at: new Date().toISOString(),
    ranAgainstTarget: targetPresent, targetPresent: targetPresent, afterPresent: afterPresent,
    compared: compared, description: description, bounces: d.bounces, pass: d.pass,
    shots: { staged: shots.staged, branch: shots.branch || null }
  };
  fs.writeFileSync(path.join(outDir, 'verdict.json'), JSON.stringify(verdict, null, 2));
  writeVerdictMd(outDir, verdict);
  return { code: d.code, verdict: verdict, describeInput: describeInput, outDir: outDir, shotsDir: shotsDir, shots: shots };
}

module.exports = {
  review, decide, parseVerdict, loadSpec, stageShots,
  buildDescribeRequest, buildCompareRequest, defaultCapture, defaultAsk, closeBrowser,
  DESCRIBER_SYSTEM, BLIND_PROMPT, COMPARATOR_SYSTEM
};

// ---------------------------------------------------------------- CLI
if (require.main === module) {
  const argv = process.argv.slice(2);
  function flag(name) { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; }
  const ref = argv.find(function (a) { return !a.startsWith('--'); });
  (async function () {
    try {
      const spec = loadSpec(ref);
      const opts = {};
      if (flag('out')) opts.outDir = absPath(flag('out'));
      if (flag('shots')) opts.shotsDir = absPath(flag('shots'));
      if (argv.indexOf('--no-stage') >= 0) opts.stageShots = false;
      // Test seam: inject a deterministic capture/ask so the exit-code contract can be exercised
      // against fixtures without a browser or a live model. Unset in production -> real transports.
      if (process.env.WOA_UI_REVIEW_CAPTURE) opts.capture = require(absPath(process.env.WOA_UI_REVIEW_CAPTURE)).capture;
      if (process.env.WOA_UI_REVIEW_ASK) opts.ask = require(absPath(process.env.WOA_UI_REVIEW_ASK)).ask;
      const res = await review(spec, opts);
      await closeBrowser();
      const v = res.verdict;
      if (v.pass) {
        console.error('UI-REVIEW PASS  ticket ' + v.ticket + '  (ran against target, no bounces)  -> ' + res.outDir + '/verdict.json');
      } else {
        console.error('UI-REVIEW BOUNCE  ticket ' + v.ticket + '  (' + v.bounces.length + ')');
        v.bounces.forEach(function (b) { console.error('  - [' + b.kind + '] ' + b.ref + ' — ' + b.why); });
        console.error('  -> ' + res.outDir + '/verdict.json');
      }
      process.exit(res.code);
    } catch (e) {
      await closeBrowser();
      console.error('ui-review error: ' + String(e.message || e));
      process.exit(2);   // a harness error is not a clean pass — distinct from a bounce (1)
    }
  })();
}
