/* dev/llm-session.test.js — tests for the persistent-session claude transport.
   Run: node --test dev/llm-session.test.js          (no CLI needed: pure units + fake binaries)
        LIVE=1 node --test dev/llm-session.test.js    (adds a real two-turn haiku session)
   node:test harness (ADR-0003). Fake-binary tests skip on win32; live test needs LIVE=1
   (env, not argv: node --test re-spawns each file in a child that drops positional flags). */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LlmSession, buildPrompt, encodeUserTurn, splitLines, parseEventLine } =
  require('./llm-session.js');

const LIVE = process.env.LIVE === '1' || process.argv.indexOf('--live') >= 0; // env survives node --test child spawn
const isWin = process.platform === 'win32';
const ERRORED = { text: '', inputTokens: 0, outputTokens: 0, finishReason: 'error' };

/* ---------- pure: buildPrompt ---------- */
const SCHEMA_INSTR = '\n\nRespond with ONLY a single JSON object — no markdown code fences, no commentary ' +
  'before or after — matching exactly this JSON schema:\n';

test('buildPrompt: no schema -> message verbatim', function () {
  assert.strictEqual(buildPrompt('hello\nworld'), 'hello\nworld');
});
test('buildPrompt: empty-string schema counts as unset', function () {
  assert.strictEqual(buildPrompt('hi', ''), 'hi');
});
test('buildPrompt: schema -> exact inline instruction appended', function () {
  const schema = '{"type":"object","properties":{"choice":{"type":"integer"}}}';
  assert.strictEqual(buildPrompt('pick one', schema), 'pick one' + SCHEMA_INSTR + schema);
});
test('buildPrompt: null/undefined message -> empty string, no throw', function () {
  assert.strictEqual(buildPrompt(null), '');
  assert.strictEqual(buildPrompt(undefined, undefined), '');
});

/* ---------- pure: encodeUserTurn ---------- */
test('encodeUserTurn: write-ready stream-json line', function () {
  const line = encodeUserTurn('go A1');
  assert.ok(line.endsWith('\n'));
  assert.deepStrictEqual(JSON.parse(line),
    { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'go A1' }] } });
});
test('encodeUserTurn: newlines and quotes survive the round trip', function () {
  const txt = 'line1\nline2 "quoted" \\backslash';
  assert.strictEqual(JSON.parse(encodeUserTurn(txt)).message.content[0].text, txt);
  assert.strictEqual(encodeUserTurn(txt).indexOf('\n'), encodeUserTurn(txt).length - 1); // one wire line
});

/* ---------- pure: splitLines ---------- */
test('splitLines: partial line carries over', function () {
  let r = splitLines('', '{"a":1}\n{"b"');
  assert.deepStrictEqual(r.lines, ['{"a":1}']);
  assert.strictEqual(r.carry, '{"b"');
  r = splitLines(r.carry, ':2}\n');
  assert.deepStrictEqual(r.lines, ['{"b":2}']);
  assert.strictEqual(r.carry, '');
});
test('splitLines: multiple lines in one chunk', function () {
  const r = splitLines('', 'x\ny\nz\n');
  assert.deepStrictEqual(r.lines, ['x', 'y', 'z']);
  assert.strictEqual(r.carry, '');
});
test('splitLines: chunk with no newline is all carry', function () {
  const r = splitLines('ab', 'cd');
  assert.deepStrictEqual(r.lines, []);
  assert.strictEqual(r.carry, 'abcd');
});

/* ---------- pure: parseEventLine (shapes captured from the live probe) ---------- */
test('parseEventLine: non-result events and noise -> null', function () {
  assert.strictEqual(parseEventLine(''), null);
  assert.strictEqual(parseEventLine('   '), null);
  assert.strictEqual(parseEventLine('not json {'), null);
  assert.strictEqual(parseEventLine('{"type":"system","subtype":"init","session_id":"x"}'), null);
  assert.strictEqual(parseEventLine('{"type":"system","subtype":"thinking_tokens","estimated_tokens":6}'), null);
  assert.strictEqual(parseEventLine('{"type":"assistant","message":{"content":[{"type":"text","text":"OK"}]}}'), null);
  assert.strictEqual(parseEventLine('{"type":"rate_limit_event","rate_limit_info":{}}'), null);
});
test('parseEventLine: happy result (live shape)', function () {
  const line = JSON.stringify({
    type: 'result', subtype: 'success', is_error: false, api_error_status: null,
    duration_ms: 1678, num_turns: 1, result: 'OK', stop_reason: 'end_turn',
    session_id: '05e588b0', total_cost_usd: 0.036473,
    usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 18099, cache_read_input_tokens: 0 }
  });
  assert.deepStrictEqual(parseEventLine(line),
    { text: 'OK', inputTokens: 10, outputTokens: 5, finishReason: 'stop' });
});
test('parseEventLine: stop_reason max_tokens passes through', function () {
  const r = parseEventLine(JSON.stringify({ type: 'result', is_error: false, result: 'x', stop_reason: 'max_tokens', usage: {} }));
  assert.strictEqual(r.finishReason, 'max_tokens');
});
test('parseEventLine: missing usage -> zero tokens, still ok', function () {
  assert.deepStrictEqual(parseEventLine(JSON.stringify({ type: 'result', is_error: false, result: 'y', stop_reason: 'end_turn' })),
    { text: 'y', inputTokens: 0, outputTokens: 0, finishReason: 'stop' });
});
test('parseEventLine: is_error / non-string result -> errored (fatal to the session)', function () {
  assert.deepStrictEqual(parseEventLine(JSON.stringify({ type: 'result', is_error: true, result: 'boom' })), ERRORED);
  assert.deepStrictEqual(parseEventLine(JSON.stringify({ type: 'result', is_error: false, result: 42 })), ERRORED);
  assert.deepStrictEqual(parseEventLine(JSON.stringify({ type: 'result', subtype: 'error_during_execution' })), ERRORED);
});

/* ---------- fake binaries (no real CLI): full plumbing, fail-open, timeout ----------
   Each fake is a /bin/sh wrapper exec-ing node on a .js body, so binaryPath can point
   at it like a real claude. exec (not a child) so kill() reaches the node process.
   POSIX-only; skipped on win32 (the shipped code's Windows path is resolveBinary's,
   already exercised by llm-client). */

let tmpDir = null;
before(function () { if (!isWin) tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-session-test-')); });
after(function () { if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { } } });

function makeFake(name, jsBody) {
  const js = path.join(tmpDir, name + '.js');
  const sh = path.join(tmpDir, name + '.sh');
  fs.writeFileSync(js, jsBody);
  fs.writeFileSync(sh, '#!/bin/sh\nexec "' + process.execPath + '" "' + js + '" "$@"\n');
  fs.chmodSync(sh, 0o755);
  return sh;
}

// Echoes each user turn as a result event, numbering turns to prove one process
// serves them all; splits the result line across two writes to exercise the carry.
const FAKE_OK = [
  "'use strict';",
  "let carry = '', turn = 0;",
  "process.stdin.setEncoding('utf8');",
  "process.stdin.on('data', function (d) {",
  "  carry += d;",
  "  let i;",
  "  while ((i = carry.indexOf('\\n')) >= 0) {",
  "    const line = carry.slice(0, i); carry = carry.slice(i + 1);",
  "    if (!line.trim()) continue;",
  "    let text = ''; try { text = JSON.parse(line).message.content[0].text; } catch (e) {}",
  "    turn++;",
  "    process.stdout.write('{\"type\":\"system\",\"subtype\":\"init\"}\\n');",
  "    process.stdout.write('this line is not json noise\\n');",
  "    const res = JSON.stringify({ type: 'result', subtype: 'success', is_error: false,",
  "      result: 'echo' + turn + ':' + text, stop_reason: 'end_turn',",
  "      usage: { input_tokens: 7, output_tokens: 3 } }) + '\\n';",
  "    const cut = (res.length / 2) | 0;",
  "    process.stdout.write(res.slice(0, cut));",
  "    setTimeout(function () { process.stdout.write(res.slice(cut)); }, 15);",
  "  }",
  "});",
  "process.stdin.on('end', function () { process.exit(0); });"
].join('\n');

const FAKE_GARBAGE = "process.stdout.write('utter <<garbage>> not events\\n'); setTimeout(function(){process.exit(0);},50);";
const FAKE_SILENT = "process.stdin.on('data', function(){}); setInterval(function(){}, 1000);"; // reads, never replies
const FAKE_IS_ERROR = [
  "process.stdin.on('data', function () {",
  "  process.stdout.write(JSON.stringify({ type: 'result', subtype: 'error', is_error: true, result: 'boom' }) + '\\n');",
  "});"
].join('\n');

test('fake ok: serialized asks share one process; carry + usage mapped', { skip: isWin }, async function () {
  const s = new LlmSession({ model: 'haiku', systemPrompt: 'x', binaryPath: makeFake('ok', FAKE_OK), timeoutMs: 10000 });
  const p1 = s.ask('one');                                   // fired together on purpose:
  const p2 = s.ask('two', { outputSchema: '{"type":"object"}' }); // second must queue
  const r1 = await p1;
  const r2 = await p2;
  assert.deepStrictEqual(r1, { text: 'echo1:one', inputTokens: 7, outputTokens: 3, finishReason: 'stop' });
  assert.strictEqual(r2.text.indexOf('echo2:two'), 0);       // turn 2 of the SAME process
  assert.ok(r2.text.indexOf('JSON schema') > 0);             // outputSchema instruction rode along
  assert.strictEqual(s.alive, true);
  s.close();
  assert.strictEqual(s.alive, false);
  s.close();                                                 // idempotent, no throw
  const r3 = await s.ask('three');                           // after close: immediate errored
  assert.deepStrictEqual(r3, ERRORED);
});

test('fake garbage: no result before exit -> errored, alive false, queued ask too', { skip: isWin }, async function () {
  const s = new LlmSession({ model: 'haiku', systemPrompt: 'x', binaryPath: makeFake('garbage', FAKE_GARBAGE), timeoutMs: 10000 });
  const p1 = s.ask('one');
  const p2 = s.ask('two');
  assert.deepStrictEqual(await p1, ERRORED);
  assert.deepStrictEqual(await p2, ERRORED);
  assert.strictEqual(s.alive, false);
});

test('fake silent: per-ask timeout kills the session and fails open', { skip: isWin }, async function () {
  const s = new LlmSession({ model: 'haiku', systemPrompt: 'x', binaryPath: makeFake('silent', FAKE_SILENT) });
  const t0 = Date.now();
  const r = await s.ask('one', { timeoutMs: 400 });
  assert.deepStrictEqual(r, ERRORED);
  assert.ok(Date.now() - t0 < 5000, 'timeout should fire around 400ms');
  assert.strictEqual(s.alive, false);
});

test('fake is_error result: errored and the session dies', { skip: isWin }, async function () {
  const s = new LlmSession({ model: 'haiku', systemPrompt: 'x', binaryPath: makeFake('iserr', FAKE_IS_ERROR), timeoutMs: 10000 });
  assert.deepStrictEqual(await s.ask('one'), ERRORED);
  assert.strictEqual(s.alive, false);
});

test('missing binary: both asks errored, alive false, post-death ask immediate', { skip: isWin }, async function () {
  const s = new LlmSession({ model: 'haiku', systemPrompt: 'x', binaryPath: '/nonexistent/claude-nope', timeoutMs: 5000 });
  assert.strictEqual(s.alive, true);                         // not dead until it actually fails
  const p1 = s.ask('one');
  const p2 = s.ask('two');
  assert.deepStrictEqual(await p1, ERRORED);
  assert.deepStrictEqual(await p2, ERRORED);
  assert.strictEqual(s.alive, false);
  const t0 = Date.now();
  assert.deepStrictEqual(await s.ask('three'), ERRORED);
  assert.ok(Date.now() - t0 < 1000, 'dead-session ask must not spawn or wait');
});

test('start(): explicit pre-spawn is idempotent and still fails open', { skip: isWin }, async function () {
  const s = new LlmSession({ model: 'haiku', systemPrompt: 'x', binaryPath: '/nonexistent/claude-nope', timeoutMs: 5000 });
  assert.strictEqual(s.start(), true);                       // spawn error arrives async
  assert.strictEqual(s.start(), true);                       // no double spawn, no throw
  assert.deepStrictEqual(await s.ask('one'), ERRORED);
  assert.strictEqual(s.alive, false);
});

/* ---------- live (only with --live): real CLI, real session memory ---------- */
test('live: two turns in one haiku session; turn 2 recalls turn 1', { skip: !LIVE }, async function () {
  const s = new LlmSession({
    model: 'haiku',
    effort: 'low',
    systemPrompt: 'You are a terse test assistant. Obey exactly.',
    timeoutMs: 120000
  });
  const r1 = await s.ask("Remember the word 'quicksilver'. Reply OK.");
  assert.strictEqual(r1.finishReason, 'stop', 'turn 1 errored: ' + JSON.stringify(r1));
  const r2 = await s.ask('What word did I ask you to remember? Reply with just the word.');
  assert.strictEqual(r2.finishReason, 'stop', 'turn 2 errored: ' + JSON.stringify(r2));
  assert.ok(/quicksilver/i.test(r2.text), 'no session memory — got: ' + JSON.stringify(r2.text));
  assert.ok(r1.inputTokens >= 0 && r1.outputTokens > 0, 'usage should be populated');
  assert.strictEqual(s.alive, true);
  s.close();
  assert.strictEqual(s.alive, false);
  console.log('       (turn1=' + JSON.stringify(r1.text) + ' turn2=' + JSON.stringify(r2.text) + ')');
});
