/* dev/llm-client.test.js — unit tests for the pure halves of the claude -p transport.
   Run: node dev/llm-client.test.js  (no framework, plain asserts) */
'use strict';

const assert = require('assert');
const { buildPrompt, parseEnvelope, send } = require('./llm-client.js');

let n = 0;
function t(name, fn) { fn(); n++; console.log('  ok  ' + name); }

const ERRORED = { text: '', inputTokens: 0, outputTokens: 0, finishReason: 'error' };
const SCHEMA_INSTR = '\n\nRespond with ONLY a single JSON object — no markdown code fences, no commentary ' +
  'before or after — matching exactly this JSON schema:\n';

/* ---- buildPrompt ---- */
t('buildPrompt: no schema -> user message verbatim', function () {
  assert.strictEqual(buildPrompt({ userMessage: 'hello\nworld' }), 'hello\nworld');
});
t('buildPrompt: empty-string schema counts as unset', function () {
  assert.strictEqual(buildPrompt({ userMessage: 'hi', outputSchema: '' }), 'hi');
});
t('buildPrompt: schema -> exact inline instruction appended', function () {
  const schema = '{"type":"object","properties":{"choice":{"type":"integer"}}}';
  assert.strictEqual(buildPrompt({ userMessage: 'pick one', outputSchema: schema }),
    'pick one' + SCHEMA_INSTR + schema);
});
t('buildPrompt: null request -> empty string, no throw', function () {
  assert.strictEqual(buildPrompt(null), '');
  assert.strictEqual(buildPrompt({}), '');
});

/* ---- parseEnvelope ---- */
const HAPPY = JSON.stringify({
  type: 'result', subtype: 'success', is_error: false,
  result: 'Blue.', stop_reason: 'end_turn',
  usage: { input_tokens: 10, output_tokens: 318, cache_creation_input_tokens: 24343 }
});
t('parseEnvelope: happy path', function () {
  assert.deepStrictEqual(parseEnvelope(HAPPY, 0),
    { text: 'Blue.', inputTokens: 10, outputTokens: 318, finishReason: 'stop' });
});
t('parseEnvelope: stop_reason max_tokens passes through', function () {
  const r = parseEnvelope(JSON.stringify({ is_error: false, result: 'x', stop_reason: 'max_tokens', usage: {} }), 0);
  assert.strictEqual(r.finishReason, 'max_tokens');
  assert.strictEqual(r.text, 'x');
});
t('parseEnvelope: missing usage -> zero tokens, still ok', function () {
  const r = parseEnvelope(JSON.stringify({ is_error: false, result: 'y', stop_reason: 'end_turn' }), 0);
  assert.deepStrictEqual(r, { text: 'y', inputTokens: 0, outputTokens: 0, finishReason: 'stop' });
});
t('parseEnvelope: is_error true -> errored', function () {
  assert.deepStrictEqual(parseEnvelope(JSON.stringify({ is_error: true, result: 'oops' }), 0), ERRORED);
});
t('parseEnvelope: garbage stdout -> errored', function () {
  assert.deepStrictEqual(parseEnvelope('not json at all {', 0), ERRORED);
});
t('parseEnvelope: empty / whitespace stdout -> errored', function () {
  assert.deepStrictEqual(parseEnvelope('', 0), ERRORED);
  assert.deepStrictEqual(parseEnvelope('   \n ', 0), ERRORED);
  assert.deepStrictEqual(parseEnvelope(null, 0), ERRORED);
});
t('parseEnvelope: nonzero exit -> errored even with a valid envelope', function () {
  assert.deepStrictEqual(parseEnvelope(HAPPY, 1), ERRORED);
});
t('parseEnvelope: result missing / not a string -> errored', function () {
  assert.deepStrictEqual(parseEnvelope(JSON.stringify({ is_error: false, stop_reason: 'end_turn' }), 0), ERRORED);
  assert.deepStrictEqual(parseEnvelope(JSON.stringify({ is_error: false, result: 42 }), 0), ERRORED);
});

/* ---- send (shape only; the real spawn is covered by the manual end-to-end) ---- */
assert.strictEqual(typeof send, 'function');
send({ userMessage: 'x', model: 'haiku', binaryPath: 'definitely-not-a-real-binary-xyz', timeoutMs: 5000 })
  .then(function (r) {
    assert.deepStrictEqual(r, ERRORED);
    n++;
    console.log('  ok  send: fails open (errored response, no throw) on a missing binary');
    console.log('llm-client.test.js: ' + n + ' tests passed');
  })
  .catch(function (e) { console.error('FAIL: send fail-open —', e); process.exit(1); });
