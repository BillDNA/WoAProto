#!/usr/bin/env node
/* dev/check-context.js — the run that keeps CONTEXT.md honest (WoAProto#219).

   Two checks over CONTEXT.md's term→code spine:

     1. HOME POINTERS (hard gate). Every term carries a `_Home_:` line. A code
        home is `file:line` + a backticked anchor that must sit ON that line;
        a not-yet-in-code concept is `none yet — <reason>`. Fails if any term
        lacks a home, any pointed file:line is gone, or an anchor has drifted
        off its line (reporting the line it drifted to, so the fix is a
        one-liner). This is what "every term resolves to a real file:line home"
        is checked by.

     2. ALIAS RESIDUALS. The retired names on each term's `_Avoid_` list, scanned
        across the whole codebase. `locked` aliases are canonical-clean and any
        new hit FAILS (the regression guard). `pending` aliases are the ones a
        migration hasn't reached yet (player-facing renames need Bill's sign-off,
        data/DB renames aren't pure renames) — their hits print as a tracked
        count, not a failure, so the burndown is visible. Promote a term to
        `locked` in the same commit that drives it to zero.

   Usage: node dev/check-context.js            full report + exit code
          node dev/check-context.js --aliases  alias residuals only
          node dev/check-context.js --homes     home pointers only
   Exits 0 when every home resolves and no locked alias has any hit; 1 otherwise. */

'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var CONTEXT = path.join(ROOT, 'CONTEXT.md');

/* ---- the tree we scan for alias residuals ------------------------------- */
var SCAN_EXT = ['.js', '.md', '.css', '.html'];
var SKIP_DIR = ['.git', 'node_modules', 'graphify-out', 'logs', '.obsidian', '.vscode', 'art'];
function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (SKIP_DIR.indexOf(e.name) >= 0) return;
    var full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (SCAN_EXT.indexOf(path.extname(e.name)) >= 0) out.push(full);
  });
  return out;
}

/* ---- 1. home pointers ---------------------------------------------------- */
// Each term block is `**Term**:` ... `_Home_: ...`. Parse the pairs in order.
function parseTerms(md) {
  var lines = md.split('\n');
  var terms = [], cur = null;
  lines.forEach(function (ln, i) {
    var m = ln.match(/^\*\*(.+?)\*\*:\s*$/);
    if (m) { cur = { name: m[1].trim(), line: i + 1, home: null }; terms.push(cur); return; }
    var h = ln.match(/^_Home_:\s*(.+?)\s*$/);
    if (h && cur && !cur.home) cur.home = h[1];
  });
  return terms;
}

function checkHomes(terms) {
  var fails = [], concepts = 0, resolved = 0;
  terms.forEach(function (t) {
    if (!t.home) { fails.push('· ' + t.name + ' — no _Home_ line'); return; }
    if (/^none yet\b/i.test(t.home)) { concepts++; return; }
    var m = t.home.match(/^`([^`]+):(\d+)`\s*—\s*`([^`]+)`/);
    if (!m) { fails.push('· ' + t.name + ' — malformed _Home_: ' + t.home); return; }
    var file = m[1], want = parseInt(m[2], 10), anchor = m[3];
    var abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) { fails.push('· ' + t.name + ' — file gone: ' + file); return; }
    var flines = fs.readFileSync(abs, 'utf8').split('\n');
    if (flines[want - 1] !== undefined && flines[want - 1].indexOf(anchor) >= 0) { resolved++; return; }
    var at = [];
    flines.forEach(function (fl, i) { if (fl.indexOf(anchor) >= 0) at.push(i + 1); });
    fails.push('· ' + t.name + ' — anchor `' + anchor + '` not at ' + file + ':' + want +
      (at.length ? ' (found at ' + file + ':' + at.join(',') + ' — update the pointer)' : ' (anchor not in file)'));
  });
  return { fails: fails, concepts: concepts, resolved: resolved, total: terms.length };
}

/* ---- 2. alias residuals -------------------------------------------------- */
// pattern: a RegExp (global). ignore: RegExp — a matching LINE is not a hit
// (the sanctioned other-meaning of a word CONTEXT itself allows). status:
// 'locked' (any hit fails) | 'pending' (hits tracked, not failed).
var ALIASES = [
  // Locked: driven to zero and guarded against regression.
  { term: 'per-battle (→ Skirmish fact)', pattern: /\bper-battle\b/gi, status: 'locked' },
  // Pending: canonical name agreed, migration awaiting Bill's sign-off
  // (player-facing) or a non-pure data/DB change (out of a rename's scope).
  { term: 'VP / victory point (→ Field score)', pattern: /\bvictory points?\b|\bVP\b/g,
    ignore: /LLM|token/i, status: 'pending', note: 'player-facing labels + `vp` data key/DB column; st.vp also tracks kills (distinct)' },
  { term: 'map-set (→ Mapset)', pattern: /\bmap-sets?\b/gi, status: 'pending', note: 'hyphenated form in README (player-facing) + docs' },
  { term: 'map pool (→ Mapset)', pattern: /\bmap ?pool\b/gi, ignore: /mapPool\(|E\.mapPool/, status: 'pending', note: '`mapPool()` exported engine API + UI wrappers' },
  { term: 'roster (→ Mapset)', pattern: /\broster/gi, status: 'pending', note: 'Rosters UI overlay + rosterFor/rosterReplace identifiers' },
  { term: 'match — best-of (→ Battle)', pattern: /\bmatch(es|up|ed|ing)?\b/gi,
    ignore: /matchup|matched in|\.match\(|match\.maps|match\.wins|st\.match|newMatch|skirmishWinner/i,
    status: 'pending', note: 'st.match / newMatch identifiers + runbook prose' },
  { term: 'Order — noun (→ Card)', pattern: /\borders?\b/gi,
    ignore: /order an|order a |turn[- ]order|load[- ]order|z-order|in order to|reorder|ordering/i,
    status: 'pending', note: 'rule book + README + journal string' },
  { term: 'Map Card / Map Deck (→ Map)', pattern: /\bmap (cards?|deck)\b/gi, status: 'pending', note: 'legacy rule book only' },
  { term: 'difficulty (→ AI personality)', pattern: /\bdifficult(y|ies)\b/gi, status: 'pending', note: 'aiPlanTurn(st, difficulty) param — holds strength presets, borderline' },
];

function scanAliases(files) {
  var byTerm = {};
  ALIASES.forEach(function (a) { byTerm[a.term] = { spec: a, hits: [] }; });
  files.forEach(function (abs) {
    var rel = path.relative(ROOT, abs);
    if (rel === 'CONTEXT.md') return;                 // the _Avoid_ list lives here
    if (rel === path.relative(ROOT, __filename)) return; // this scanner names them all
    var text = fs.readFileSync(abs, 'utf8').split('\n');
    text.forEach(function (ln, i) {
      ALIASES.forEach(function (a) {
        a.pattern.lastIndex = 0;
        if (!a.pattern.test(ln)) return;
        if (a.ignore && a.ignore.test(ln)) return;
        byTerm[a.term].hits.push(rel + ':' + (i + 1));
      });
    });
  });
  return byTerm;
}

/* ---- run ----------------------------------------------------------------- */
function main() {
  var only = process.argv[2];
  var md = fs.readFileSync(CONTEXT, 'utf8');
  var terms = parseTerms(md);
  var ok = true;

  if (only !== '--aliases') {
    var h = checkHomes(terms);
    console.log('HOME POINTERS — ' + h.resolved + ' code homes resolved, ' +
      h.concepts + ' concept-only, ' + h.total + ' terms total');
    if (h.fails.length) { ok = false; console.log(h.fails.join('\n')); }
    else console.log('· all pointers resolve');
    console.log('');
  }

  if (only !== '--homes') {
    var files = walk(ROOT, []);
    var scan = scanAliases(files);
    console.log('ALIAS RESIDUALS — scanned ' + files.length + ' files');
    Object.keys(scan).forEach(function (term) {
      var r = scan[term], n = r.hits.length, locked = r.spec.status === 'locked';
      var tag = locked ? (n ? 'FAIL ' : 'ok   ') : 'pend ';
      console.log('· [' + tag + '] ' + term + ' — ' + n + ' hit' + (n === 1 ? '' : 's') +
        (r.spec.note ? '  (' + r.spec.note + ')' : ''));
      if (locked && n) { ok = false; console.log('    ' + r.hits.join('\n    ')); }
    });
    console.log('');
  }

  console.log(ok ? 'check-context: PASS' : 'check-context: FAIL');
  process.exit(ok ? 0 : 1);
}
main();
