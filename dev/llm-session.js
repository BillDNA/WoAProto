/* dev/llm-session.js — persistent-session LLM transport over the Claude Code CLI.
   Sibling of dev/llm-client.js (cold spawn per call); this one keeps ONE long-lived
   `claude` process per player per match so the rules ride in the system prompt once
   and each turn only pays for the new state (subsequent turns hit the prompt cache).
   Zero dependencies.

     const { LlmSession } = require('./llm-session.js');
     const s = new LlmSession({ model, systemPrompt, effort?, binaryPath?, timeoutMs? });
     const res = await s.ask(userMessage, { outputSchema?, timeoutMs? });
     // res = { text, inputTokens, outputTokens, finishReason: 'stop'|'max_tokens'|'error' }
     s.alive   // false once the process died/errored/was closed
     s.close() // kills the process; idempotent

   Lifecycle: lazy start — the process spawns on the first ask(). Call start() early
   if you want CLI boot to overlap other work; it is optional and idempotent.
   Asks are serialized: one in flight, the rest queue.

   Wire protocol (verified live 2026-07-06 against `claude` CLI, model haiku):
     spawn: claude -p --input-format stream-json --output-format stream-json --verbose
                   --no-session-persistence --model <m> --system-prompt <s> [--effort <e>]
     - --verbose is REQUIRED: without it the CLI exits with
       "When using --print, --output-format=stream-json requires --verbose".
     - --no-session-persistence coexists fine with stream-json (verified: two-turn
       session ran clean, exit 0) — no transcript file is written.
     - --system-prompt is a full override, so no CLAUDE.md ambient context leaks in.
     stdin — one JSON line per user turn:
       {"type":"user","message":{"role":"user","content":[{"type":"text","text":"..."}]}}
     stdout — newline-delimited JSON events per turn (shapes observed live):
       {"type":"system","subtype":"init",...}            // once per turn, ignorable
       {"type":"system","subtype":"thinking_tokens",...} // progress noise, ignorable
       {"type":"assistant","message":{...}}              // streamed content, ignorable
       {"type":"rate_limit_event",...}                   // ignorable
       {"type":"result","subtype":"success","is_error":false,"result":"<text>",
        "stop_reason":"end_turn","usage":{"input_tokens":10,"output_tokens":...,
        "cache_creation_input_tokens":18099,"cache_read_input_tokens":0,...},...}
     The result event terminates the turn. The process then idles awaiting the next
     stdin line; closing stdin ends it (exit 0). Same-session memory verified: turn 2
     recalled a word given in turn 1, with turn 1's context arriving as cache_read.
     inputTokens reports usage.input_tokens only (cache_* excluded) — parity with
     llm-client.parseEnvelope, so cold and session numbers compare apples-to-apples.

   Fail-open guarantee (same creed as llm-client.send): ask() NEVER rejects. Spawn
   failure, process death, per-ask timeout, an is_error result, or stdout closing
   without a result all resolve {text:'', tokens 0, finishReason:'error'}, kill the
   session and set alive=false; queued and future asks resolve errored immediately.
   Callers fall back to cold llm-client.send per call when a session dies.

   buildPrompt / encodeUserTurn / splitLines / parseEventLine are pure — unit-tested
   in dev/llm-session.test.js without spawning the CLI. */
'use strict';

const { spawn } = require('child_process');
const { resolveBinary } = require('./llm-client.js'); // shared Windows .cmd-shim workaround

const DEFAULT_TIMEOUT_MS = 180000;

function errored() {
  return { text: '', inputTokens: 0, outputTokens: 0, finishReason: 'error' };
}

// Pure: user message, + the inline-schema instruction only when outputSchema is set.
// Same wording as llm-client.buildPrompt (no structured-output param on this path;
// the schema rides inside the prompt).
function buildPrompt(userMessage, outputSchema) {
  const user = userMessage || '';
  if (!outputSchema) return user;
  return user +
    '\n\nRespond with ONLY a single JSON object — no markdown code fences, no commentary ' +
    'before or after — matching exactly this JSON schema:\n' + outputSchema;
}

// Pure: one stream-json input line (trailing \n included so it's write-ready).
function encodeUserTurn(text) {
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'text', text: String(text == null ? '' : text) }] }
  }) + '\n';
}

// Pure: fold a stdout chunk into the carry, return the complete lines. The stream
// uses setEncoding('utf8') so Node's decoder holds partial multi-byte sequences;
// by the time text reaches here splitting on \n cannot tear a character.
function splitLines(carry, chunk) {
  const parts = (carry + chunk).split('\n');
  return { lines: parts.slice(0, -1), carry: parts[parts.length - 1] };
}

// Pure: one stdout line -> null if it isn't a (parseable) result event, else a
// response object. is_error / missing result text -> errored response, which the
// session layer treats as fatal (fail open, let the caller fall back to cold calls).
function parseEventLine(line) {
  if (!line || !line.trim()) return null;
  let o;
  try { o = JSON.parse(line); } catch (e) { return null; } // stray non-JSON verbose noise: skip
  if (!o || o.type !== 'result') return null;
  if (o.is_error === true || typeof o.result !== 'string') return errored();
  const usage = o.usage || {};
  return {
    text: o.result,
    inputTokens: Number(usage.input_tokens) || 0,
    outputTokens: Number(usage.output_tokens) || 0,
    finishReason: o.stop_reason === 'max_tokens' ? 'max_tokens' : 'stop'
  };
}

function LlmSession(opts) {
  opts = opts || {};
  this._model = opts.model || '';
  this._systemPrompt = opts.systemPrompt || '';
  this._effort = opts.effort || null;
  this._binaryPath = opts.binaryPath || null;
  this._timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  this._proc = null;
  this._dead = false;
  this._carry = '';
  this._queue = [];    // waiting asks: { line, timeoutMs, resolve }
  this._current = null; // in-flight ask: { resolve, timer }
}

Object.defineProperty(LlmSession.prototype, 'alive', {
  get: function () { return !this._dead; }
});

// Optional pre-spawn (the first ask() spawns lazily otherwise). Idempotent.
LlmSession.prototype.start = function () {
  if (!this._dead && !this._proc) this._spawn();
  return this.alive;
};

// Never rejects. Serialized: concurrent asks queue behind the one in flight.
LlmSession.prototype.ask = function (userMessage, opts) {
  const self = this;
  opts = opts || {};
  return new Promise(function (resolve) {
    if (self._dead) return resolve(errored()); // dead session: fail fast, caller falls back
    self._queue.push({
      line: encodeUserTurn(buildPrompt(userMessage, opts.outputSchema)),
      timeoutMs: opts.timeoutMs || self._timeoutMs,
      resolve: resolve
    });
    self._pump();
  });
};

LlmSession.prototype.close = function () { this._die(); };

// Single funnel for every failure AND for close(): kill the process, flip alive,
// resolve the in-flight and queued asks errored. Re-entry safe (kill triggers
// 'close', which lands back here and hits the guard).
LlmSession.prototype._die = function () {
  if (this._dead) return;
  this._dead = true;
  if (this._current) {
    clearTimeout(this._current.timer);
    this._current.resolve(errored());
    this._current = null;
  }
  while (this._queue.length) this._queue.shift().resolve(errored());
  if (this._proc) {
    try { this._proc.kill(); } catch (e) { /* already gone */ }
  }
};

LlmSession.prototype._spawn = function () {
  let bin;
  try { bin = resolveBinary(this._binaryPath); } catch (e) { return this._die(); }
  const args = bin.extraArgs.concat([
    '-p',
    '--input-format', 'stream-json',  // one JSON line per user turn on stdin
    '--output-format', 'stream-json', // NDJSON events; the result event ends each turn
    '--verbose',                      // mandatory with stream-json output (CLI errors without it)
    '--no-session-persistence',       // no transcript file; verified compatible with stream-json
    '--model', this._model,
    '--system-prompt', this._systemPrompt // full override: no CLAUDE.md ambient context
  ]);
  if (this._effort) args.push('--effort', this._effort);
  let proc;
  try { proc = spawn(bin.cmd, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch (e) { return this._die(); }
  this._proc = proc;
  const self = this;
  // All handlers wired here, BEFORE _pump ever writes stdin (pipe-buffer deadlock otherwise).
  proc.on('error', function () { self._die(); });      // binary missing / spawn failure
  proc.stdout.setEncoding('utf8');                     // decoder carries partial multi-byte chars across chunks
  proc.stdout.on('data', function (d) { self._onData(d); });
  proc.stderr.on('data', function () { });             // drain so a chatty stderr can't block
  proc.on('close', function () { self._die(); });      // process death mid-session fails everything open
  proc.stdin.on('error', function () { });             // ignore EPIPE if the process dies first
};

// Start the next queued ask if nothing is in flight. Spawns lazily on first use.
LlmSession.prototype._pump = function () {
  if (this._dead || this._current || !this._queue.length) return;
  if (!this._proc) {
    this._spawn();
    if (this._dead) return; // spawn failed synchronously; queue already drained errored
  }
  const job = this._queue.shift();
  const self = this;
  this._current = {
    resolve: job.resolve,
    timer: setTimeout(function () { self._die(); }, job.timeoutMs) // timeout kills the session, fails open
  };
  try { this._proc.stdin.write(job.line); } catch (e) { this._die(); }
};

LlmSession.prototype._onData = function (chunk) {
  const r = splitLines(this._carry, chunk);
  this._carry = r.carry;
  for (let i = 0; i < r.lines.length; i++) {
    const res = parseEventLine(r.lines[i]);
    if (!res) continue;                    // init/thinking/assistant/rate-limit noise
    if (this._dead) return;
    if (res.finishReason === 'error') return this._die(); // is_error result: session is suspect
    const cur = this._current;
    if (!cur) continue;                    // unsolicited result (shouldn't happen): ignore
    this._current = null;
    clearTimeout(cur.timer);
    cur.resolve(res);
    this._pump();
  }
};

module.exports = { LlmSession, buildPrompt, encodeUserTurn, splitLines, parseEventLine };
