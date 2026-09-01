#!/usr/bin/env node
/* Implement-router (#198, ADR-0004). A UserPromptSubmit hook: when a submitted prompt invokes
   an implement skill on a ticket, it INJECTS the woa-implement protocol (docs/woa-implement.md)
   into the session's context via hookSpecificOutput.additionalContext. This is how the teeth
   reach the SAME thin volley a future session gets — the mattpocock /implement skill stays
   human-invoked and unmodified, and nothing here lets the model self-trigger implement; it only
   augments a human's invocation. Wired in .claude/settings.json (UserPromptSubmit, no matcher).
   dev/impl-route.test.js is the gate. */
'use strict';
const fs = require('fs');
const path = require('path');

const PROTOCOL_FILE = path.resolve(__dirname, '..', '..', 'docs', 'woa-implement.md');

// A prompt invokes implement when it carries the command's signature. Slash form, the
// harness command-name tag, or the mattpocock skill-body first line — any one is enough.
const SIGNATURES = [
  /(^|\s)\/(?:[\w-]+:)?implement\b/i,               // /implement or /mattpocock-skills:implement
  /command-name>\s*[^<]*implement/i,                // <command-name>…implement</command-name>
  /Implement the work described by the user in the spec or tickets/i, // skill body first line
];

function invokesImplement(prompt) {
  const s = String(prompt || '');
  return SIGNATURES.some(re => re.test(s));
}

// The protocol body, frontmatter stripped, under a mandatory preamble.
function protocolContext(file) {
  let body = '';
  try { body = fs.readFileSync(file || PROTOCOL_FILE, 'utf8'); } catch { return ''; }
  body = body.replace(/^---\n[\s\S]*?\n---\n/, '');
  return (
    'MANDATORY — this is an implement run. Follow the woa-implement protocol below exactly; ' +
    'it is not advisory. A ticket is done only when FEATURE-COMPLETE against every acceptance ' +
    'criterion, verified by a separate reviewer through the built gates. Do not report done or ' +
    'open the PR before then, and never hand the "are you sure?" judgment back to the human.\n\n' +
    body
  );
}

/* Pure routing decision for a submitted prompt: { inject, context }. */
function routeDecision(prompt, file) {
  if (!invokesImplement(prompt)) return { inject: false, context: '' };
  return { inject: true, context: protocolContext(file) };
}

module.exports = { invokesImplement, protocolContext, routeDecision, PROTOCOL_FILE, SIGNATURES };

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(raw || '{}'); } catch { /* malformed → inject nothing */ }
    const { inject, context } = routeDecision(payload.prompt);
    if (inject && context) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: context,
        },
      }));
    }
    process.exit(0);
  });
}
