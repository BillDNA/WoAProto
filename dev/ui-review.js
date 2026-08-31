#!/usr/bin/env node
/* dev/ui-review.js — Phase 1 THE GATE (#192) + Phase 2 THE AIM (#195). (spec #185, ADR-0004.)
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
 * Any bounce -> non-zero exit; the review stops at the gate and never reaches the rubric. On a
 * clean Phase 1 pass, PHASE 2 — the AIM (#195) — runs: a rubric read over after+target against
 * `ui-rubric` AND the ticket's goals ("do we approach each?"), which may DRIVE the running UI with
 * Playwright (hover/click) to judge the affordance/response/motion axes a frozen still can't show.
 * Phase 2 emits FINDINGS ONLY and never changes Phase 1's exit code — a rubric never gates. That is
 * ENFORCED, not asked: normalizeRubricFindings THROWS (harness error, exit 2) if the rubric output
 * is shaped like a verdict (a score/band/verdict/pass-fail), mirroring grade-card's guard.
 *
 * It writes a verdict artifact (Phase 1) plus a rubric block + rubric-input.json (Phase 2);
 * screenshots go to a shots-branch (git ref refs/heads/pr-shots/<ticket>, written via plumbing)
 * and NEVER to the working tree.
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
 *     "target": "dev/proto/<x>.proto.html",   // the fidelity oracle (a dev/proto mock)
 *     "goals": ["A tester can start a sweep without the terminal", ...] }   // Phase-2 aim axes
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
  'the doubt — an item you cannot positively confirm from the description is a bounce. ' +
  'Respond with ONLY a JSON object of the form {"bounces":[{"kind","ref","why"}]} and nothing ' +
  'else — no prose before or after. When nothing is missing, return exactly {"bounces":[]}.';

// The comparator's output shape. bounces:[] means the review found nothing missing.
const VERDICT_SCHEMA = JSON.stringify({
  bounces: [{ kind: 'ac | target-element | interaction', ref: 'the AC text or element name', why: 'what is missing' }]
}, null, 2);

// ---------------------------------------------------------------- Phase 2 — THE AIM (rubric, findings-only)
// Phase 2 runs ONLY on a clean Phase-1 pass. It is an AIM, not a gate: it reads the ui-rubric axes AND
// the ticket's goals ("do we approach each?") and emits per-axis FINDINGS (position + velocity, prose).
// It can NEVER bounce — a findings-only output leaves Phase 1's exit code untouched. The one thing that
// DOES red is a mechanical guard (mirroring grade-card): if the rubric output is shaped like a verdict
// (a score/band/verdict/pass-fail), normalizeRubricFindings THROWS and the CLI turns that into a harness
// error (exit 2). So "a rubric never gates" is ENFORCED, not requested.
const RUBRIC_PATH = 'docs/rubrics/ui-rubric.md';
const RUBRIC_SYSTEM =
  'You are a designer critiquing a RUNNING interface, not QA checking a slide. You are shown ' +
  'screenshots of a screen — including states captured while it was driven (a hover, a click) — and ' +
  'you read the ui-rubric and the ticket goals you are given. For each ui-rubric axis and each ticket ' +
  'goal, ask "do we approach it?" and answer with an OBSERVATION (where the screen sits) and a ' +
  'DIRECTION to move (the fix toward the aim). This is an AIM, not a gate: you do NOT pass, fail, ' +
  'score, band, grade, or rank it, and you cannot reject the screen. Respond with ONLY the keyed JSON ' +
  'findings object and nothing else — no prose before or after.';

// The rubric read's output shape (findings only — position + velocity prose per axis/goal).
const RUBRIC_SCHEMA = JSON.stringify({
  reviewer: 'fresh-rubric',
  axes: [{ axis: 'the ui-rubric axis or ticket goal, by its name', source: 'rubric | goal',
    position: 'where the screen sits on this axis', velocity: 'the fix that moves it toward the aim' }]
}, null, 2);

// The guard's vocabulary. A rubric read is FINDINGS; a verdict word as a KEY at any level (or a bare
// verdict/number VALUE in a finding) is refused, so a gate can't slip in. Benign extra keys are NOT
// verdict-shaped and are tolerated — the aim never gates on mere shape. Same verdict doctrine as
// grade-card.js, kept local so ui-review stays self-contained.
const RUBRIC_VERDICT_KEYS = ['score', 'band', 'verdict', 'grade', 'rating', 'pass', 'fail', 'enum', 'points', 'value', 'tier'];

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
  let o = null;
  try { o = JSON.parse(s); } catch (e) { o = null; }
  // Tolerate a JSON object wrapped in prose: pull the widest {...} that actually has a bounces array.
  if (!o || typeof o !== 'object' || !Array.isArray(o.bounces)) {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { o = JSON.parse(m[0]); } catch (e) { o = null; } }
  }
  if (!o || typeof o !== 'object') return { error: 'unparseable comparator output (no JSON object found)' };
  if (!Array.isArray(o.bounces)) return { error: 'comparator output has no bounces[] array' };
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

// ---------------------------------------------------------------- Phase 2 pure pieces
// Pull the ui-rubric's axis prompts (the ==**…**== headers under "Axes of evaluation") so the request
// can name them and rubric-input.json can record exactly which axes Phase 2 read — the AC1 boundary.
function rubricAxisTitles(rubricText) {
  if (typeof rubricText !== 'string') return [];
  const body = rubricText.split(/##\s*Axes of evaluation/i)[1] || '';
  const out = [];
  const re = /==\*\*(.+?)\*\*==/g;
  let m;
  while ((m = re.exec(body))) out.push(m[1].trim());
  return out;
}

// The rubric read request — the ui-rubric axes AND the ticket goals, over the after/target stills plus
// any interaction stills Phase 2 drove. `axesRead`/`goals` are surfaced as fields so rubric-input.json
// can record them (the AC1 boundary: Phase 2 demonstrably read both the rubric and the ticket goals).
function buildRubricRequest(shotsDir, stills, goals, rubricText) {
  const axes = rubricAxisTitles(rubricText);
  const axisList = axes.map(function (a, i) { return (i + 1) + '. ' + a; }).join('\n');
  const goalList = (goals || []).map(function (g, i) { return (i + 1) + '. ' + g; }).join('\n');
  const userMessage =
    'Read the ui-rubric in full: ' + RUBRIC_PATH + '.\n\n' +
    'Walk EACH ui-rubric axis and EACH ticket goal below and ask "do we approach it?" — an observation ' +
    '(where the screen sits) and a direction to move (the fix toward the aim). Findings only: no pass, ' +
    'fail, score, band, grade, or ranking.\n\n' +
    'ui-rubric axes:\n' + (axisList || '(load them from ' + RUBRIC_PATH + ')') +
    '\n\nThe ticket\'s goals (read each as an axis — "do we approach it?"):\n' + (goalList || '(none stated)') +
    '\n\nRespond with ONLY the keyed JSON findings object.' + imageBlock(stills);
  return {
    phase: 'rubric',
    systemPrompt: RUBRIC_SYSTEM,
    userMessage: userMessage,
    axesRead: axes,
    goals: (goals || []).slice(),
    images: stills,
    outputSchema: RUBRIC_SCHEMA
  };
}

// Parse the rubric read's text -> { obj } (a JSON object to guard+normalize) or { empty } (no
// structured findings). Fail-OPEN, unlike the Phase-1 comparator: Phase 2 is an aim, so an empty or
// unparseable read records nothing and never reds. Only a positively verdict-shaped OBJECT reds — via
// normalizeRubricFindings, on the object this returns.
function parseRubricFindings(text) {
  if (typeof text !== 'string' || !text.trim()) return { empty: true };
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  let o = null;
  try { o = JSON.parse(s); } catch (e) { o = null; }
  if (!o || typeof o !== 'object') {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { o = JSON.parse(m[0]); } catch (e) { o = null; } }
  }
  if (!o || typeof o !== 'object') return { empty: true };
  return { obj: o };
}

// The guard: red ONLY on a verdict-shaped key (score/band/verdict/pass-fail…). A benign extra key
// ('summary', 'evidence', …) is NOT a smuggled gate, so it is tolerated and dropped during
// normalization — the aim never gates on mere shape. Only the verdict vocabulary reds.
function refuseVerdictKeys(obj, where) {
  const verdicts = Object.keys(obj).filter(function (k) { return RUBRIC_VERDICT_KEYS.indexOf(k) >= 0; });
  if (verdicts.length) throw new Error(where + ' carries verdict field(s) [' + verdicts.join(', ') +
    '] — a ui-rubric read is FINDINGS, never a score/band/pass-fail (Phase 2 is an aim, not a gate). Recast it as prose.');
}

// A finding coordinate must be a described sentence, never a verdict masquerading as prose (a bare
// number, a band, or a pass/fail/grade word).
function rubricProse(v, axis, which) {
  if (typeof v !== 'string' || !v.trim()) throw new Error('axis "' + axis + '" needs a ' + which + ' (a described sentence)');
  const t = v.trim();
  if (/^\s*[-+]?\d+(\.\d+)?\s*(\/\s*\d+)?\s*$/.test(t)) throw new Error('axis "' + axis + '" ' + which + ' is a bare number — findings are prose, not a score/band');
  if (/^(pass|fail|good|bad|ok|okay|yes|no|strong|weak|green|amber|red|[a-df][+-]?)$/i.test(t))
    throw new Error('axis "' + axis + '" ' + which + ' is a bare verdict word ("' + t + '") — findings are prose, not a pass/fail/grade');
  return t;
}

// Validate the rubric read into the recorded shape, or THROW (the guard). Prose-only, per-axis, no
// verdict-shaped key or value at any level. THIS is the mechanical enforcement of "a rubric never
// gates": a verdict-shaped output throws here, and the CLI turns the throw into a harness red (exit 2).
function normalizeRubricFindings(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('rubric findings must be a JSON object');
  refuseVerdictKeys(raw, 'the rubric findings object');   // a top-level verdict/score/band -> red
  const reviewer = raw.reviewer || raw.grader || 'fresh-rubric';
  const axesIn = raw.axes || raw.findings;
  // Fail-OPEN, not a gate: a parseable object with nothing to say (no/empty axes) records a note and
  // passes — an aim never reds for silence. Only a verdict-shaped output (caught above / below) reds.
  if (!Array.isArray(axesIn) || !axesIn.length) {
    return { readAt: new Date().toISOString(), reviewer: reviewer, axes: [],
      note: 'no structured findings (an aim, not a gate — nothing to record)' };
  }
  const axes = axesIn.map(function (f, i) {
    if (!f || typeof f !== 'object') throw new Error('rubric axis finding #' + (i + 1) + ' must be an object');
    refuseVerdictKeys(f, 'rubric axis finding "' + (f.axis || i) + '"');   // a per-axis verdict key -> red
    const axis = (typeof f.axis === 'string' && f.axis.trim()) ? f.axis.trim() : String(i + 1);
    return {
      axis: axis,
      source: f.source === 'goal' ? 'goal' : 'rubric',
      position: rubricProse(f.position, axis, 'position'),
      velocity: rubricProse(f.velocity, axis, 'velocity')
    };
  });
  return { readAt: new Date().toISOString(), reviewer: reviewer, axes: axes };
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
  if (!Array.isArray(spec.goals)) spec.goals = [];   // Phase-2 aim axes ("do we approach each?")
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

// Phase-2 DRIVE: the same Playwright driver Phase 1 uses to capture, but now ACTING on the running
// interface — hover the first actionable mark, then click it — and screenshotting the states a frozen
// still can't show (affordance, response/feel, motion). Fail-SOFT to [] at every step: Phase 2 is an
// aim, so a missing browser or a drive that can't complete just yields fewer interaction stills, never
// a red. Returns an array of { role, buf }.
async function defaultDrive(htmlPathAbs) {
  if (!htmlPathAbs || !fs.existsSync(htmlPathAbs)) return [];
  let pw;
  try { pw = loadPlaywright(); } catch (e) { return []; }
  if (!BROWSER) { try { BROWSER = await pw.chromium.launch(); } catch (e) { return []; } }
  let page;
  try { page = await BROWSER.newPage(); } catch (e) { return []; }
  const stills = [];
  try {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('file://' + htmlPathAbs, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(300);
    const startUrl = page.url();
    // Prefer in-page controls (buttons, form fields, the rig's [data-el] game marks). Deliberately
    // EXCLUDE a[href] and [onclick]: a click there can navigate away or fire a destructive action, and
    // the 'after-click' still would then show an unrelated page — a false observation for the grader.
    const sel = 'button, [role="button"], input[type="button"], input[type="submit"], [data-el], .btn';
    const el = await page.$(sel);
    if (el) {
      // Hover is side-effect-free: always safe to capture (the affordance/response answer).
      try { await el.hover({ timeout: 2000 }); await page.waitForTimeout(150);
        stills.push({ role: 'hover', buf: await page.screenshot({ fullPage: true }) }); } catch (e) {}
      // Click WITHOUT force (force bypasses actionability and can hit an overlapped/off-screen control).
      // Then guard against navigation: if the URL changed, the surface under review is gone — discard the
      // still rather than feed the grader a screenshot of somewhere else.
      try {
        await el.click({ timeout: 2000 });
        await page.waitForTimeout(300);
        if (page.url() === startUrl) {
          stills.push({ role: 'after-click', buf: await page.screenshot({ fullPage: true }) });
        }
      } catch (e) {}
    }
  } catch (e) { /* aim: a partial/failed drive yields fewer stills, never a red */ }
  finally { try { await page.close(); } catch (e) {} }
  return stills;
}

// The ui-rubric text (fail-soft to '' — Phase 2 is an aim; a missing rubric just narrows the read).
function readRubric() {
  try { return fs.readFileSync(path.join(ROOT, RUBRIC_PATH), 'utf8'); } catch (e) { return ''; }
}

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
    const args = bin.extraArgs.concat(['-p', '--no-session-persistence']);
    if (request.model) args.push('--model', request.model);   // else the CLI's default (vision-capable); '' reds as unrecognized_model
    args.push(
      '--system-prompt', request.systemPrompt || '',   // full override: no ambient CLAUDE.md, pinned role
      '--allowedTools', 'Read',                          // the CLI needs Read to open the screenshots
      '--output-format', 'json'
    );
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
  if (v.rubric) {
    lines.push('## Phase 2 — the aim (ui-rubric + ticket goals; findings only, never a gate)', '');
    if (v.rubric.axes && v.rubric.axes.length) {
      v.rubric.axes.forEach(function (a) {
        lines.push('- **' + a.axis + '** _(' + a.source + ')_');
        lines.push('  - position: ' + a.position);
        lines.push('  - velocity: ' + a.velocity);
      });
    } else {
      lines.push('_' + (v.rubric.note || 'no findings recorded') + '_');
    }
    lines.push('');
  }
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
  let rawCompare = '';
  if (targetPresent && afterPresent) {
    const cmpReq = buildCompareRequest(shotsDir, description, targetBuf, spec.acs);
    const cmpRes = await ask(cmpReq);
    rawCompare = (cmpRes && cmpRes.text) || '';
    const parsed = parseVerdict(rawCompare);
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
    compared: compared, description: description, rawCompare: rawCompare, bounces: d.bounces, pass: d.pass,
    shots: { staged: shots.staged, branch: shots.branch || null }
  };
  // Write the Phase-1 verdict FIRST — it is the gate's record, and it must stand even if Phase 2's
  // guard later throws (the artifact then shows Phase 1 passed; the exit-2 red is the guard, not a bounce).
  fs.writeFileSync(path.join(outDir, 'verdict.json'), JSON.stringify(verdict, null, 2));
  writeVerdictMd(outDir, verdict);

  // 4. Phase 2 — THE AIM. ONLY on a clean Phase-1 pass. Findings only; never changes d.code. The one
  // red path is the guard inside normalizeRubricFindings (a verdict-shaped output) -> throw -> CLI exit 2.
  if (d.pass) {
    const drive = opts.drive || defaultDrive;
    const driveStills = spec.after ? await drive(absPath(spec.after)) : [];
    const stills = [];
    if (afterPresent) stills.push({ role: 'after', path: path.join(shotsDir, 'after.png') });
    if (targetPresent) stills.push({ role: 'target', path: path.join(shotsDir, 'target.png') });
    const driveFiles = [];
    (driveStills || []).forEach(function (s, i) {
      if (!present(s && s.buf)) return;
      const role = s.role || ('drive-' + i);
      const fn = role + '.png';
      fs.writeFileSync(path.join(shotsDir, fn), s.buf);
      stills.push({ role: role, path: path.join(shotsDir, fn) });
      driveFiles.push(fn);
    });
    // Stage the Phase-2 interaction stills onto the SAME pr-shots branch (a second commit on top of the
    // Phase-1 one) so the affordance/response/motion evidence Phase 2 exists to produce is durable proof,
    // not discarded with the temp dir. Re-stage the full set so the branch tip's tree carries every shot.
    if (opts.stageShots !== false && driveFiles.length) {
      const restaged = stageShots(shotsDir, spec.ticket, { repoRoot: opts.repoRoot, only: written.concat(driveFiles) });
      if (restaged.staged) verdict.shots = { staged: true, branch: restaged.branch };
    }
    const rubReq = buildRubricRequest(shotsDir, stills, spec.goals, readRubric());
    // rubric-input.json records what Phase 2 READ — the ui-rubric axes AND the ticket goals — observable
    // at the boundary (the AC1 seam), just like describe-input.json is for Phase 1's blindness.
    fs.writeFileSync(path.join(outDir, 'rubric-input.json'), JSON.stringify({
      phase: 'rubric', systemPrompt: rubReq.systemPrompt, prompt: rubReq.userMessage,
      rubric: RUBRIC_PATH, axesRead: rubReq.axesRead, goals: rubReq.goals,
      images: stills.map(function (s) { return s.role; })
    }, null, 2));
    const rubRes = await ask(rubReq);
    const parsed = parseRubricFindings((rubRes && rubRes.text) || '');
    const rubric = parsed.obj
      ? normalizeRubricFindings(parsed.obj)   // THROWS on a verdict-shaped output -> CLI exit 2 (the guard)
      : { readAt: new Date().toISOString(), reviewer: 'fresh-rubric', axes: [],
          note: 'no structured findings (an aim, not a gate — nothing to record)' };
    verdict.rubric = rubric;
    fs.writeFileSync(path.join(outDir, 'verdict.json'), JSON.stringify(verdict, null, 2));
    writeVerdictMd(outDir, verdict);
  }

  return { code: d.code, verdict: verdict, describeInput: describeInput, outDir: outDir, shotsDir: shotsDir, shots: shots };
}

module.exports = {
  review, decide, parseVerdict, loadSpec, stageShots,
  buildDescribeRequest, buildCompareRequest, defaultCapture, defaultAsk, closeBrowser,
  DESCRIBER_SYSTEM, BLIND_PROMPT, COMPARATOR_SYSTEM,
  // Phase 2 — the aim
  buildRubricRequest, parseRubricFindings, normalizeRubricFindings, rubricAxisTitles, defaultDrive,
  RUBRIC_SYSTEM, RUBRIC_PATH
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
      if (process.env.WOA_UI_REVIEW_DRIVE) opts.drive = require(absPath(process.env.WOA_UI_REVIEW_DRIVE)).drive;
      const res = await review(spec, opts);
      await closeBrowser();
      const v = res.verdict;
      if (v.pass) {
        console.error('UI-REVIEW PASS  ticket ' + v.ticket + '  (ran against target, no bounces)  -> ' + res.outDir + '/verdict.json');
        if (v.rubric && v.rubric.axes && v.rubric.axes.length) {
          console.error('  Phase 2 (aim): ' + v.rubric.axes.length + ' rubric/goal finding(s) — findings only, no gate');
        }
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
