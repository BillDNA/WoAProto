/* dev/llm-client.js — LLM transport over the Claude Code subscription CLI (`claude -p`).
   Node port of specs/cli-responder-transport.md (C# reference). Zero dependencies.

   send(request) spawns one cold `claude -p` process per call:
     request  = { systemPrompt, userMessage, model, outputSchema?, timeoutMs?, binaryPath? }
     response = { text, inputTokens, outputTokens, finishReason: 'stop'|'max_tokens'|'error' }

   Fail-open everywhere (mandatory per spec): missing binary, non-zero exit, timeout,
   is_error:true, empty/garbage stdout -> errored response, never a throw. A batch keeps
   running; the firing shows as errored.

   buildPrompt / parseEnvelope are pure — unit-tested in dev/llm-client.test.js. */
'use strict';

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEFAULT_TIMEOUT_MS = 180000;

function errored() {
  return { text: '', inputTokens: 0, outputTokens: 0, finishReason: 'error' };
}

// Pure: user message, + the inline-schema instruction only when outputSchema is set.
// (No structured-output param on the CLI — the schema rides inside the prompt.)
function buildPrompt(request) {
  const user = (request && request.userMessage) || '';
  if (!request || !request.outputSchema) return user;
  return user +
    '\n\nRespond with ONLY a single JSON object — no markdown code fences, no commentary ' +
    'before or after — matching exactly this JSON schema:\n' + request.outputSchema;
}

// Pure: `claude -p --output-format json` envelope -> response. All failures -> errored.
function parseEnvelope(stdout, exitCode) {
  if (exitCode !== 0 || !stdout || !String(stdout).trim()) return errored();
  try {
    const o = JSON.parse(String(stdout).trim());
    if (o.is_error === true) return errored();
    if (typeof o.result !== 'string') return errored();
    const usage = o.usage || {};
    return {
      text: o.result,
      inputTokens: Number(usage.input_tokens) || 0,
      outputTokens: Number(usage.output_tokens) || 0,
      finishReason: o.stop_reason === 'max_tokens' ? 'max_tokens' : 'stop'
    };
  } catch (e) { return errored(); }
}

// Windows: a spawned process cannot exec a .cmd/.ps1 shim without shell:true, and
// shell:true would mangle multi-line system prompts. Resolve the real binary instead:
// prefer the .exe `where` finds (the native installer puts claude.exe in ~/.local/bin);
// for an npm .cmd shim, spawn node on the adjacent cli.js. Cache the answer.
let RESOLVED = null;
function resolveBinary(override) {
  if (override) return { cmd: override, extraArgs: [] };
  if (RESOLVED) return RESOLVED;
  let r = { cmd: 'claude', extraArgs: [] }; // POSIX (and libuv's own PATH+.exe search) fallback
  if (process.platform === 'win32') {
    try {
      const w = spawnSync('where.exe', ['claude'], { encoding: 'utf8', windowsHide: true });
      const lines = String(w.stdout || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      const exe = lines.find(function (l) { return /\.exe$/i.test(l); });
      const shim = lines.find(function (l) { return /\.(cmd|bat|ps1)$/i.test(l); });
      if (exe) r = { cmd: exe, extraArgs: [] };
      else if (shim) {
        const cli = path.join(path.dirname(shim), 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
        if (fs.existsSync(cli)) r = { cmd: process.execPath, extraArgs: [cli] };
      }
    } catch (e) { /* fall through to bare 'claude' */ }
  }
  RESOLVED = r;
  return r;
}

// Async spawn. Prompt goes on STDIN (assembled context blows the argv length cap);
// stdout/stderr reads are wired up BEFORE stdin is written (pipe-buffer deadlock
// otherwise). Timeout kills the process and fails open.
function send(request) {
  return new Promise(function (resolve) {
    if (!request) return resolve(errored());
    let bin;
    try { bin = resolveBinary(request.binaryPath); } catch (e) { return resolve(errored()); }
    const args = bin.extraArgs.concat([
      '-p',
      '--model', request.model || '',
      '--system-prompt', request.systemPrompt || '', // full override: no CLAUDE.md ambient, pinned model
      '--output-format', 'json'
    ]);
    let proc;
    try { proc = spawn(bin.cmd, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) { return resolve(errored()); }

    let out = '';
    let done = false;
    function finish(res) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(res);
    }
    const timer = setTimeout(function () {
      try { proc.kill(); } catch (e) { /* already gone */ }
      finish(errored());
    }, request.timeoutMs || DEFAULT_TIMEOUT_MS);

    proc.on('error', function () { finish(errored()); }); // binary missing / spawn failure
    proc.stdout.on('data', function (d) { out += d; });   // reading starts before stdin write completes
    proc.stderr.on('data', function () { });              // drain so a chatty stderr can't block
    proc.on('close', function (code) { finish(parseEnvelope(out, code === 0 ? 0 : 1)); });

    proc.stdin.on('error', function () { });              // ignore EPIPE if the process dies early
    try { proc.stdin.write(buildPrompt(request)); proc.stdin.end(); } catch (e) { /* close handler fails open */ }
  });
}

module.exports = { buildPrompt, parseEnvelope, send, resolveBinary };
