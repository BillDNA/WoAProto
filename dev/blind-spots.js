#!/usr/bin/env node
/* dev/blind-spots.js — the Feels-loop blind-spot flag (#87, #58 track G).
   ONE capture, two destinations. The debrief questionnaire (game/content/
   questionnaire.js, id `blind-spot`) asks the LLM to flag — on its own line —
   an eval input it can't see (`ai-input`) or a balance number the report lacks
   (`balance-metric`). This module parses those tagged lines out of the debrief
   prose stored in the skirmish master log, accumulates them across a whole
   overnight balance-loop, and renders the "Blind spots flagged" section that
   review-reports drops into its analysis artifact.

   PROPOSED ONLY. Nothing here writes to 05-ai.js or report-model.js — the tag
   just names which file a human would touch, under golden discipline. The human
   is the anti-bloat gate; the render restates the goal so the reject-a-wrapper
   call is easy to make.

   Run: node dev/blind-spots.js [claude-plays-log.jsonl]   (prints the section) */
'use strict';

const fs = require('fs');
const path = require('path');

const DEST = {
  'ai-input': 'game/engine/05-ai.js (a new AI eval input — a human implements the knob under golden discipline)',
  'balance-metric': 'game/report-model.js (a new balance metric — one-file column add per the metric seam)'
};
// Machine-greppable tagged line the questionnaire teaches. "BLIND-SPOT: none" is
// the explicit no-flag answer and matches nothing here. Tolerant of the markdown
// the LLM tends to add: a leading list/quote/emphasis prefix and bold `**` around
// the tag or the whole line. Tag is lower-cased so `[AI-INPUT]` routes correctly.
const FLAG_RE = /^[\s>*_-]*BLIND-?SPOT\s*\[(ai-input|balance-metric)\]\**\s*:\s*\**\s*(\S.*?)\s*\**$/gim;

// Parse every tagged flag out of one debrief's prose.
function parseFlags(text) {
  if (typeof text !== 'string') return [];
  const out = [];
  let m;
  FLAG_RE.lastIndex = 0;
  while ((m = FLAG_RE.exec(text)) !== null) out.push({ tag: m[1].toLowerCase(), text: m[2] });
  return out;
}

// Fold a whole master log (one JSON rec per skirmish) into flags with source
// context. Skips malformed lines — a partial overnight log must never crash the
// morning review. Returns null when the log can't be read at all, so the caller
// can tell "no log" apart from "log with no flags" (a silent [] would render as a
// confident zero and hide the whole feature failing).
function collect(jsonlPath) {
  let raw;
  try { raw = fs.readFileSync(jsonlPath, 'utf8'); } catch (e) { return null; }
  const flags = [];
  raw.split('\n').forEach(function (line) {
    if (!line.trim()) return;
    let rec;
    try { rec = JSON.parse(line); } catch (e) { return; }
    const notes = rec && rec.notes;
    if (!notes) return;
    Object.keys(notes).forEach(function (side) {
      parseFlags(notes[side]).forEach(function (f) {
        flags.push({ tag: f.tag, text: f.text, side: side,
          map: rec.map || '?', skirmish: rec.skirmishIndex || null });
      });
    });
  });
  return flags;
}

// Dedup a group by identical flag text (case/space-insensitive), keeping the
// first-seen source and counting repeats — an overnight loop repeats the same
// complaint every debrief, and the human gate wants one line per idea, not ten.
function dedup(group) {
  const seen = {};
  const out = [];
  group.forEach(function (f) {
    const key = f.text.trim().toLowerCase();
    if (seen[key]) { seen[key].count++; return; }
    seen[key] = { text: f.text, where: f.map + (f.skirmish ? ' #' + f.skirmish : '') + ', ' + f.side, count: 1 };
    out.push(seen[key]);
  });
  return out;
}

// Render the "Blind spots flagged" section. Prose + tag routing only — no score,
// ratio, or numeric pin (the whole loop is a taste layer). `flags === null` means
// the log was unreadable — say so, don't fake a zero.
function render(flags) {
  const md = ['## Blind spots flagged', '',
    '_Free-prose flags from the Feels-loop debrief (#87). **Proposed only** — a human ' +
    'decides whether any is worth wiring, and rejects renames/wrappers/blends of signals ' +
    'the game already weighs._', ''];
  if (flags === null) {
    md.push('_No skirmish log found to read — flags could not be collected._');
    return md.join('\n');
  }
  if (!flags.length) {
    md.push('None flagged this loop.');
    return md.join('\n');
  }
  Object.keys(DEST).forEach(function (tag) {
    const group = dedup(flags.filter(function (f) { return f.tag === tag; }));
    if (!group.length) return;
    md.push('### `' + tag + '` → ' + DEST[tag], '');
    group.forEach(function (f) {
      md.push('- ' + f.text + '  _(' + f.where + (f.count > 1 ? ', ×' + f.count : '') + ')_');
    });
    md.push('');
  });
  return md.join('\n').replace(/\n+$/, '');
}

module.exports = { parseFlags: parseFlags, collect: collect, render: render, DEST: DEST };

if (require.main === module) {
  const file = process.argv[2] ||
    path.join(__dirname, '..', 'logs', 'reports', 'skirmish', 'claude-plays-log.jsonl');
  process.stdout.write(render(collect(file)) + '\n');
}
