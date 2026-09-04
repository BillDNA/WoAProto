#!/usr/bin/env node
/* dev/check-context.js — the run that keeps the term→code spine honest.

   Two spine docs carry `_Home_:` pointers: CONTEXT.md (domain terms) and
   docs/reference/context-ui-components.md (UI primitives). Two checks:

     1. HOME POINTERS (hard gate). Every term carries a `_Home_:` line. A code
        home is a backticked `file` + a backticked anchor (a symbol or
        expression) that must APPEAR SOMEWHERE in that file; a not-yet-in-code
        concept is `none yet — <reason>`. Fails if any term lacks a home, a
        pointed file is gone, or an anchor no longer appears in its file
        (renamed, moved to another file, or deleted — fix it in that commit).
        Deliberately line-number-free: a line shift is not drift, so editing a
        file never churns these pointers. The anchor is the greppable key.

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
// The spine docs whose _Home_ pointers are gated (domain terms + UI primitives).
var SPINE = [CONTEXT, path.join(ROOT, 'docs', 'reference', 'context-ui-components.md')];

/* ---- the tree we scan for alias residuals ------------------------------- */
var SCAN_EXT = ['.js', '.md', '.css', '.html'];
var SKIP_DIR = ['.git', 'node_modules', 'graphify-out', 'logs', '.obsidian', '.vscode', 'art', 'worktrees'];
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
    // A home is `file` — `anchor`; the anchor must appear somewhere in the file.
    // No line number: only a rename / move-out / delete of the anchor is drift.
    var m = t.home.match(/^`([^`]+)`\s*—\s*`([^`]+)`/);
    if (!m) { fails.push('· ' + t.name + ' — malformed _Home_: ' + t.home); return; }
    var file = m[1], anchor = m[2];
    if (/:\d+$/.test(file)) { fails.push('· ' + t.name + ' — home carries a line number (`' + file + '`); drop it, the anchor is the key'); return; }
    var abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) { fails.push('· ' + t.name + ' — file gone: ' + file); return; }
    if (fs.readFileSync(abs, 'utf8').indexOf(anchor) >= 0) { resolved++; return; }
    fails.push('· ' + t.name + ' — anchor `' + anchor + '` no longer in ' + file +
      ' (renamed, moved to another file, or removed — fix the pointer)');
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
  { term: 'VP / victory point (→ Field score)', pattern: /\bvictory points?\b|vp-?diff|\bvp\b/gi,
    ignore: /LLM|token/i, status: 'locked', note: 'the quantity is field score; a unit\'s worth is `worth`; the kills tally is `st.result.kills`; the report margin is `fsDiff`' },
  { term: 'Map Card / Map Deck (→ Map)', pattern: /\bmap (cards?|deck)\b/gi, status: 'locked' },
  { term: 'difficulty (→ AI personality / strength)', pattern: /\bdifficult(y|ies)\b/gi, status: 'locked', note: 'the AI param is `personality`; a preset\'s tier is its strength' },
  { term: 'map-set (→ Mapset)', pattern: /\bmap-sets?\b/gi, status: 'locked' },
  { term: 'map pool (→ Mapset)', pattern: /\bmap ?pool\b/gi, status: 'locked', note: 'the active mapset is the draw pool; its maps are `activeMaps()`' },
  // roster meant three things; the mapset + map-library senses are migrated, so
  // the only allowed "roster" is the player piece-mats overlay UI (a distinct
  // concept) and the `map-roster-and-shapes` spec codename.
  { term: 'roster (→ Mapset / map library)', pattern: /\broster/gi,
    ignore: /rostersOvr|rostersBody|fabRosters|syncRostersOverlay|RostersOverlay|BOTH rosters|>Rosters<|map-roster-and-shapes/, status: 'locked',
    note: 'active-set → Mapset; full collection → map library; piece mats stay the mats overlay' },
  // The engine best-of object is now st.battle / newBattle. What stays "match":
  // the claude-plays `--match` CLI flag + its jsonl log schema, the `matchup`
  // luck-o-meter (a distinct pairing tool), "matched" battalions (CONTEXT sanctions
  // it), and ordinary English (a map "matches", `.match(`). Too broad to lock.
  { term: 'match — best-of (→ Battle)', pattern: /\bmatch(es|up|ed|ing)?\b/gi,
    ignore: /matchup|matched|\.match\(|--match|match mode|match seed|MATCH mode/i,
    status: 'pending', note: 'engine object → st.battle/newBattle; residual is the --match CLI flag + matchup tool + prose' },
  // Order (noun, the card) is cleared in prose, but the word "order" is too common
  // (var order, attack order, enumeration order) to lock without false positives.
  { term: 'Order — noun (→ Card)', pattern: /\borders?\b/gi,
    ignore: /order an|order a |turn[- ]order|load[- ]order|z-order|in order to|reorder|ordering/i,
    status: 'pending', note: 'card-sense prose cleared; pattern still catches ordinary "order"' },
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
  var ok = true;

  if (only !== '--aliases') {
    SPINE.forEach(function (doc) {
      var rel = path.relative(ROOT, doc);
      var terms = parseTerms(fs.readFileSync(doc, 'utf8'));
      var h = checkHomes(terms);
      console.log('HOME POINTERS (' + rel + ') — ' + h.resolved + ' code homes resolved, ' +
        h.concepts + ' concept-only, ' + h.total + ' terms total');
      if (h.fails.length) { ok = false; console.log(h.fails.join('\n')); }
      else console.log('· all pointers resolve');
      console.log('');
    });
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

if (require.main === module) main();
else module.exports = { parseTerms: parseTerms, checkHomes: checkHomes, ROOT: ROOT };
