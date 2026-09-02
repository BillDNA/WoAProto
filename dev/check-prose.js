#!/usr/bin/env node
/* dev/check-prose.js — the grep-clean backstop that keeps docs and comments
   stating the current fact, not the war story.

   A rule states what is true now; the why, the when, and the ticket live in the
   commit and the issue tracker. This run walks the repo tree — every .js/.md/.css/
   .html file outside the generated/vendored dirs in SKIP_DIR — for the narrative
   residue that drifts and misleads:

     · ticket refs        WOA-044, WoAProto#221, #217, SPEC §4
     · round narration    Feedback Round 4, Round-3, Pass 2, Batch B
     · dated storytelling  July 2026, 2026-07-18, "as of 0.3"
     · era labels          V0, V1
     · rules-version prose "rules 1.0 bump" (the bare version string stays a value)

   Two files are exempt because naming the patterns IS their job: this scanner
   and the style guide (docs/code-style.md), the definitional home of the rule.

   Usage: node dev/check-prose.js         full report + exit code
   Exits 0 when the tree is clean, 1 with a per-file hit list otherwise. */

'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');

var SCAN_EXT = ['.js', '.md', '.css', '.html'];
var SKIP_DIR = ['.git', 'node_modules', 'graphify-out', 'logs', '.obsidian', '.vscode', 'art', 'art-originals', 'worktrees'];
var EXEMPT = ['dev/check-prose.js', 'dev/check-prose.test.js', 'docs/code-style.md'];

// Each pattern is global; `ignore` is tested against the matched token itself
// (per-match, not per-line), so a real ref sharing a line with an ignorable
// shape is still caught. The one ignore is a full-length CSS hex colour (6 or 8
// digits) — the unambiguous case. A 1–4 digit `#nnn` reads as an issue ref; an
// all-numeric 3–4 digit CSS colour (rare) would be flagged, so spell those as a
// 6-digit or named colour.
var HEX_COLOUR = /^[\s(]*#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
var PATTERNS = [
  { name: 'ticket ref (WOA-nnn)', re: /\bWOA-\d+\b/g },
  { name: 'ticket ref (WoAProto#nnn)', re: /\bWoAProto#\d+/g },
  { name: 'spec-section ref', re: /\bSPEC\s*§\s*\d+/gi },
  { name: 'issue/PR # ref', re: /(?:^|[\s(])#\d{1,4}\b/g, ignore: HEX_COLOUR },
  { name: 'round narration', re: /\b(?:Feedback\s+)?Round[- ]\d+\b/gi },
  { name: 'pass narration', re: /\bPass \d+\b/g },
  { name: 'batch narration', re: /\bBatch [A-Z]\b/g },
  { name: 'dated narration (Month YYYY)', re: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d\d\b/gi },
  { name: 'dated narration (ISO date)', re: /\b20\d\d-\d\d-\d\d\b/g },
  { name: 'as-of narration', re: /\bas of\b/gi },
  { name: 'era label (V0/V1)', re: /\bV[01]\b/g },
  { name: 'rules-version narration', re: /\brules 1\.\d\b/gi },
];

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (SKIP_DIR.indexOf(e.name) >= 0) return;
    var full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (SCAN_EXT.indexOf(path.extname(e.name)) >= 0) out.push(full);
  });
  return out;
}

// A line has a hit for pattern p if any match survives its per-match `ignore`.
function lineHits(ln, p) {
  p.re.lastIndex = 0;
  var m;
  while ((m = p.re.exec(ln)) !== null) {
    if (!(p.ignore && p.ignore.test(m[0]))) return true;
  }
  return false;
}

function scan(files) {
  var byFile = {};
  files.forEach(function (abs) {
    var rel = path.relative(ROOT, abs).split(path.sep).join('/'); // POSIX rels for EXEMPT
    if (EXEMPT.indexOf(rel) >= 0) return;
    var lines = fs.readFileSync(abs, 'utf8').split('\n');
    lines.forEach(function (ln, i) {
      PATTERNS.forEach(function (p) {
        if (!lineHits(ln, p)) return;
        (byFile[rel] = byFile[rel] || []).push({ line: i + 1, pat: p.name, text: ln.trim().slice(0, 100) });
      });
    });
  });
  return byFile;
}

function main() {
  var files = walk(ROOT, []);
  var byFile = scan(files);
  var names = Object.keys(byFile).sort();
  var total = names.reduce(function (n, f) { return n + byFile[f].length; }, 0);

  console.log('check-prose — scanned ' + files.length + ' files');
  names.forEach(function (f) {
    console.log('\n' + f + ' (' + byFile[f].length + ')');
    byFile[f].forEach(function (h) {
      console.log('  :' + h.line + '  [' + h.pat + ']  ' + h.text);
    });
  });
  console.log('');
  if (total) console.log('check-prose: FAIL — ' + total + ' war-story hit' + (total === 1 ? '' : 's') + ' in ' + names.length + ' file' + (names.length === 1 ? '' : 's'));
  else console.log('check-prose: PASS');
  process.exit(total ? 1 : 0);
}
main();
