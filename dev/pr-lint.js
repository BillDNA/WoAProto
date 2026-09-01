/* PR callout lint (node-only, not in the browser chain). The callout tooth of
   ADR-0004 §3 (#196): a submitted PR body must foreground the callout block from
   .github/pull_request_template.md with every field present and every FILL
   sentinel replaced. dev/pr-lint.test.js is the gate; the template is the single
   source of the required field set (parsed here, never re-listed). */
'use strict';
const fs = require('fs');
const path = require('path');

const TEMPLATE = path.join(__dirname, '..', '.github', 'pull_request_template.md');
const MARKERS = { start: '<!-- CALLOUT:START -->', end: '<!-- CALLOUT:END -->' };
const SENTINEL_RE = /<!--\s*FILL:/i;
// A callout field is a bullet line "- **Label:** ...". Label is the field identity.
const FIELD_RE = /^\s*[-*]\s*\*\*(.+?):\*\*/;

// The required field labels, read from the committed template so the two can't drift.
function templateFields(body) {
  const src = body != null ? body : fs.readFileSync(TEMPLATE, 'utf8');
  const block = calloutBlock(src);
  const scope = block != null ? block : src;
  const out = [];
  for (const line of scope.split('\n')) {
    const m = line.match(FIELD_RE);
    if (m) out.push(m[1].trim());
  }
  return out;
}

// The text strictly between the START/END markers, or null if either is absent.
function calloutBlock(body) {
  const i = body.indexOf(MARKERS.start);
  const j = body.indexOf(MARKERS.end);
  if (i === -1 || j === -1 || j < i) return null;
  return body.slice(i + MARKERS.start.length, j);
}

// { ok, violations[] }. Reds on: no callout block, a missing required field, or any
// unreplaced FILL sentinel. `required` defaults to the template's own field set.
function lint(body, required) {
  const violations = [];
  const fields = required || templateFields();
  const block = calloutBlock(body);
  if (block == null) {
    violations.push('missing callout block (no ' + MARKERS.start + ' … ' + MARKERS.end + ' fence)');
    return { ok: false, violations };
  }
  const present = new Set(templateFields(body).map(f => f.toLowerCase()));
  for (const f of fields) {
    if (!present.has(f.toLowerCase())) violations.push('missing callout field: "' + f + '"');
  }
  for (const line of block.split('\n')) {
    if (!SENTINEL_RE.test(line)) continue;
    const m = line.match(FIELD_RE);
    violations.push('unreplaced FILL sentinel' + (m ? ' in field "' + m[1].trim() + '"' : ''));
  }
  return { ok: violations.length === 0, violations };
}

module.exports = { lint, templateFields, calloutBlock, MARKERS, SENTINEL_RE, TEMPLATE };
