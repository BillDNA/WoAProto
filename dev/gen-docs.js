#!/usr/bin/env node
/* dev/gen-docs.js — regenerate the drift-prone doc tables from the code/data
   that owns them (V1 architecture review: the judges' pick to kill doc drift).

   Rewrites, IN PLACE, the text between explicit marker pairs:

     <!-- GEN:weights -->        AI_WEIGHTS table (from game/engine AI_WEIGHTS
                                 + the hand-maintained descriptions map BELOW)
     <!-- GEN:personalities -->  the extra AI personalities (AI_PRESETS minus
                                 easy/normal/hard, i.e. the maps.js "ai" rows)
     in design-docs/human-instructions/ai-heuristic-model.md, and

     <!-- GEN:content -->        the current content roster (maps with shape +
                                 custom flag, decks, map-sets with the active
                                 marker) in design-docs/onboarding/code-overview.md.

   Usage: node dev/gen-docs.js
   - Idempotent: running it twice produces no diff.
   - Prints every block it rewrote (or that it was already current).
   - Exits 1 if a marker pair is missing or malformed — the markers are part
     of the docs on purpose; don't delete them, move them.

   Adding a weight? Give it a row in WEIGHT_DESC below or the table renders
   'TODO — describe me' so the gap is loud. Adding a generated block? Add a
   row to BLOCKS at the bottom. */
'use strict';

var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var E = require(path.join(ROOT, 'game', 'engine.js'));

/* ---------- hand-maintained plain-English descriptions ----------------------
   One row per AI_WEIGHTS key. These are prose, not data — they live here so
   the table can never list a weight the engine doesn't have (or miss one it
   does), while the wording stays human. */
var WEIGHT_DESC = {
  attrWin: 'Huge swing for being the projected attrition winner if the decks ran out now. Ramps up as cards run low. This is the anti-stalemate term — **don\'t zero it.**',
  fsDiff: 'Value per point of field-score lead (surviving units on board), always on.',
  fsDiffUrgent: 'Extra value per point of field-score lead, scaled up as the game nears its end.',
  unitOnBoard: 'Value of each of my deployed units (× the unit\'s worth).',
  unitReserve: 'Value of each of my un-deployed reserves. Lower than on-board = mild nudge to actually field them.',
  unitValInfantry: 'The AI\'s worth of one infantry, multiplied into the unit/threat terms. V1: a weight, so the tuner and personalities can sweep it.',
  unitValCavalry: 'The AI\'s worth of one cavalry (see `unitValInfantry`).',
  unitValArtillery: 'The AI\'s worth of one artillery (see `unitValInfantry`).',
  advance: 'Reward for my units being *closer* to the enemy HQ (per hex). Raise it to make the AI pushy.',
  hqGuard: 'Bonus for a unit sitting next to my own HQ.',
  enemyDist: 'Reward for keeping enemy units *far* from my HQ.',
  myThreatHQ: 'Reward for having an attack that could take the enemy HQ next step.',
  myThreatKill: 'Reward per point of enemy unit I threaten to kill next step.',
  threatHQ: 'Penalty for the enemy being able to take *my* HQ next step.',
  threatKill: 'Penalty per point of my unit the enemy threatens to kill.',
  threatTie: 'Penalty per point of my unit the enemy could trade with (tie).',
  trenchHome: 'Bonus per trench dug near my own HQ.',
  trenchFacing: 'V1: bonus per covered trench edge that faces a **live enemy lane** (an enemy unit within 2 hexes of the far side of the denied border). This is what makes trench *orientation* a real choice — see below.',
  noopPenalty: 'Penalty for a plan that resolves **zero** actions (a dead turn). Anti-degeneracy — **don\'t zero it.**',
  antiShuffle: 'Penalty for re-swapping the same pair of units it swapped last turn. Anti-degeneracy.',
  fallbackBias: 'Mild preference for a card\'s printed action over burning it.',
  shortlist: 'V1 search dial: when a step has more options than this, keep the top N by a cheap static pre-rank (winning attacks first, advances next, swaps last). Replaces the old **random** 80-cap that could discard the best move. Lower = faster + more approximate — lab personalities can crank it down.'
};

/* ---------- generators ---------- */

function genWeights() {
  var L = ['| Weight | Default | Plain English |', '|--------|--------:|---------------|'];
  Object.keys(E.AI_WEIGHTS).forEach(function (k) {
    L.push('| `' + k + '` | ' + E.AI_WEIGHTS[k] + ' | ' + (WEIGHT_DESC[k] || 'TODO — describe me') + ' |');
  });
  // orphaned descriptions are only a warning — the table itself stays truthful
  Object.keys(WEIGHT_DESC).forEach(function (k) {
    if (!(k in E.AI_WEIGHTS)) console.warn('gen-docs: WEIGHT_DESC has "' + k + '" but AI_WEIGHTS does not — stale description?');
  });
  return L.join('\n');
}

function genPersonalities() {
  var core = { easy: 1, normal: 1, hard: 1 };
  var names = Object.keys(E.AI_PRESETS).filter(function (n) { return !core[n]; });
  var mapsAi = (require(path.join(ROOT, 'game', 'maps.js')).ai) || {};
  var L = ['```'];
  names.forEach(function (n, i) {
    var p = E.AI_PRESETS[n];
    var head = JSON.stringify(n) + ': { "noise": ' + (p.noise || 0) + ', "breadth": ' + (p.breadth || 0) + ',';
    var w = p.weights || {};
    var body = '  "weights": { ' + Object.keys(w).map(function (k) {
      return JSON.stringify(k) + ': ' + w[k];
    }).join(', ') + ' } }' + (i < names.length - 1 ? ',' : '');
    L.push(head, body + (mapsAi[n] ? '' : '   /* engine-coded, not a maps.js row */'));
  });
  L.push('```');
  return L.join('\n');
}

function genContent() {
  var maps = E.MAPS.map(function (m) {
    var label = (m.shapeDef && m.shapeDef.hexes) ? 'carved outline, ' + m.shapeDef.hexes.length + ' hexes'
      : String(m.shape || '?');
    return '`' + m.id + '` (' + label + (m.custom ? ', custom' : '') + ')';
  });
  var decks = (globalThis.WOA_CONTENT.decks || []).map(function (d) {
    var copies = (d.cards || []).reduce(function (s, c) { return s + (c.count || 0); }, 0);
    return '`' + d.id + '` (' + (d.cards || []).length + ' cards / ' + copies + ' copies' + (d.active ? ', ACTIVE' : '') + ')';
  });
  var sets = E.MAPSETS.map(function (s) {
    return '`' + s.id + '` (' + s.maps.length + ' maps' + (s.active ? ', ACTIVE — this is the match pool' : '') + ')';
  });
  return [
    '_Generated by `node dev/gen-docs.js` — rerun it after content changes._',
    '',
    '- **Maps (' + maps.length + '):** ' + maps.join(', '),
    '- **Decks (' + decks.length + '):** ' + decks.join(', '),
    '- **Map-sets (' + sets.length + '):** ' + sets.join(', ')
  ].join('\n');
}

/* ---------- marker plumbing ---------- */

var BLOCKS = [
  { file: 'design-docs/human-instructions/ai-heuristic-model.md', name: 'weights', gen: genWeights },
  { file: 'design-docs/human-instructions/ai-heuristic-model.md', name: 'personalities', gen: genPersonalities },
  { file: 'design-docs/onboarding/code-overview.md', name: 'content', gen: genContent }
];

function replaceBlock(src, name, body, file) {
  var open = '<!-- GEN:' + name + ' -->';
  var close = '<!-- /GEN:' + name + ' -->';
  var i = src.indexOf(open);
  var j = src.indexOf(close);
  if (i < 0 || j < 0) throw new Error(file + ': marker pair GEN:' + name + ' missing (need both ' + open + ' and ' + close + ')');
  if (j < i) throw new Error(file + ': marker pair GEN:' + name + ' malformed (close before open)');
  if (src.indexOf(open, i + 1) >= 0 || src.indexOf(close, j + 1) >= 0)
    throw new Error(file + ': marker GEN:' + name + ' appears more than once');
  return src.slice(0, i + open.length) + '\n' + body + '\n' + src.slice(j);
}

var failed = false;
var byFile = {};
BLOCKS.forEach(function (b) { (byFile[b.file] = byFile[b.file] || []).push(b); });

Object.keys(byFile).forEach(function (rel) {
  var full = path.join(ROOT, rel);
  var before, after;
  try { before = fs.readFileSync(full, 'utf8'); }
  catch (e) { console.error('gen-docs: cannot read ' + rel + ' (' + e.message + ')'); failed = true; return; }
  after = before;
  try {
    byFile[rel].forEach(function (b) { after = replaceBlock(after, b.name, b.gen(), rel); });
  } catch (e) { console.error('gen-docs: ' + e.message); failed = true; return; }
  if (after !== before) {
    fs.writeFileSync(full, after);
    console.log('rewrote  ' + rel + '  (' + byFile[rel].map(function (b) { return 'GEN:' + b.name; }).join(', ') + ')');
  } else {
    console.log('current  ' + rel + '  (' + byFile[rel].map(function (b) { return 'GEN:' + b.name; }).join(', ') + ' — no change)');
  }
});

process.exit(failed ? 1 : 0);
