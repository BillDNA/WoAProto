#!/usr/bin/env node
// PreToolUse: the first PR-opening call in a session is refused with Bill's question; the next passes.
const fs = require('fs'), os = require('os'), path = require('path');
let raw = ''; process.stdin.on('data', c => raw += c).on('end', () => {
  const p = JSON.parse(raw || '{}'), cmd = String((p.tool_input || {}).command || '');
  if (p.tool_name === 'Bash' && !/\bgh\s+pr\s+create\b/.test(cmd)) return;
  const mark = path.join(os.tmpdir(), 'woa-pr-check-' + (p.session_id || 'na'));
  if (fs.existsSync(mark)) return;
  fs.writeFileSync(mark, '');
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
    permissionDecisionReason: 'Bill: are we sure you\'re done? did you look at it like a human would? did you drive it like a human would? Answer that, then open the PR.' } }));
});
