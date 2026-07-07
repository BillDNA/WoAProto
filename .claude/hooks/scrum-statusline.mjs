import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Claude Code `statusLine` command: renders the DynamicScrum board readout pinned to the bottom of the
// TUI (never scrolls). Wired via project `.claude/settings.json`:
//   "statusLine": { "type": "command", "command": "node .claude/hooks/scrum-statusline.mjs" }
// It reads `<project>/.claude-status`, a single pipe-delimited line the board skills write:
//   `<sprint-title> | <TICKET> | <state>`   e.g.  `M4.2 · Workflow-tooling debt | DS-061 | inprogress`
// Sprint field is the sprint title (milestone code + short name), not a bare code.
// State vocab: next | starting | inprogress | testing. `session-start` writes it on orient; on close
// `close-ticket` advances the line to the proposed-next ticket with state `next` (clearing only when the
// sprint is done); any work-phase step may rewrite the line (e.g. flip to `testing`).
// Missing/empty file -> blank statusLine (silent) — so non-board sessions render nothing.

// Pure: raw file contents -> the colored bracketed line (or '' when there's nothing to show).
export function render(raw) {
  const line = (raw || '').split(/\r?\n/)[0].trim();
  const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return '';
  const esc = String.fromCharCode(27); // 38;5;108 = muted green (the slot this replaces used it too)
  return `${esc}[38;5;108m[${parts.join(' | ')}]${esc}[0m`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  let cwd = process.cwd();
  try {
    const payload = JSON.parse(await readStdin());
    cwd = payload.workspace?.current_dir || payload.cwd || cwd;
  } catch { /* no/!JSON stdin -> process.cwd() is correct (CC runs statusLine at project root) */ }
  try {
    const out = render(fs.readFileSync(path.join(cwd, '.claude-status'), 'utf8'));
    if (out) process.stdout.write(out);
  } catch { /* no status file -> silent */ }
}

// Run only as a CLI, not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
