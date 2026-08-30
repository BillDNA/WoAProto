#!/usr/bin/env node
/* dev/blind-spots.test.js — the #87 blind-spot flag: capture + render, no pin.
   Run: node --test dev/blind-spots.test.js   (offline) */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const bs = require(path.join(__dirname, 'blind-spots.js'));
const Q = require(path.join(__dirname, '..', 'game', 'content', 'questionnaire.js'));

test('questionnaire carries the standing blind-spot question, tagged both ways', () => {
  const q = Q.questions.find(function (x) { return x.id === 'blind-spot'; });
  assert.ok(q, 'a row with id "blind-spot" exists');
  assert.match(q.text, /BLIND-SPOT \[ai-input\]/);
  assert.match(q.text, /BLIND-SPOT \[balance-metric\]/);
});

test('parseFlags pulls tagged lines and ignores "none"', () => {
  const prose = 'The game felt tight.\n' +
    'BLIND-SPOT [ai-input]: the AI never weighs how exposed its HQ is\n' +
    'nice game overall.';
  const flags = bs.parseFlags(prose);
  assert.strictEqual(flags.length, 1);
  assert.strictEqual(flags[0].tag, 'ai-input');
  assert.match(flags[0].text, /HQ/);
  assert.strictEqual(bs.parseFlags('BLIND-SPOT: none').length, 0);
  assert.strictEqual(bs.parseFlags(null).length, 0);
});

test('parseFlags tolerates markdown + upper-case tag (lower-cased for routing)', () => {
  const bullet = bs.parseFlags('- **BLIND-SPOT [AI-INPUT]:** reserve depth is invisible**');
  assert.strictEqual(bullet.length, 1);
  assert.strictEqual(bullet[0].tag, 'ai-input', 'tag lower-cased so render can route it');
  assert.match(bullet[0].text, /reserve depth is invisible/);
  assert.ok(!/\*\*$/.test(bullet[0].text), 'trailing bold stripped from the flag text');
});

test('collect accumulates across a jsonl log and render routes by tag, no numeric pin', () => {
  const tmp = path.join(os.tmpdir(), 'bs-' + process.pid + '.jsonl');
  fs.writeFileSync(tmp,
    JSON.stringify({ map: 'Ravine', skirmishIndex: 1,
      notes: { red: 'BLIND-SPOT [ai-input]: reserve depth is invisible', blue: 'BLIND-SPOT: none' } }) + '\n' +
    JSON.stringify({ map: 'Delta', skirmishIndex: 2,
      notes: { blue: 'BLIND-SPOT [balance-metric]: no metric for turns-to-first-kill' } }) + '\n' +
    'not json — must be skipped\n');
  const flags = bs.collect(tmp);
  fs.unlinkSync(tmp);
  assert.strictEqual(flags.length, 2, 'both flags collected across two skirmishes');

  const md = bs.render(flags);
  assert.match(md, /## Blind spots flagged/);
  assert.match(md, /Proposed only/);
  assert.match(md, /05-ai\.js/);
  assert.match(md, /report-model\.js/);
  assert.match(md, /reserve depth is invisible/);
  assert.match(md, /turns-to-first-kill/);
  assert.ok(!/\b\d+(\.\d+)?%/.test(md), 'no numeric/percent pin in the section');

  assert.match(bs.render([]), /None flagged/);
  assert.strictEqual(bs.collect('/no/such/log.jsonl'), null, 'unreadable log returns null, not []');
  assert.match(bs.render(null), /could not be collected/, 'missing log is not faked as a zero');
});

test('render dedups a repeated flag and counts it', () => {
  const same = { tag: 'ai-input', text: 'reserve depth is invisible', map: 'Ravine', skirmish: 1, side: 'red' };
  const md = bs.render([same, Object.assign({}, same, { skirmish: 2 }), Object.assign({}, same, { skirmish: 3 })]);
  const hits = md.match(/reserve depth is invisible/g) || [];
  assert.strictEqual(hits.length, 1, 'the repeated flag appears once');
  assert.match(md, /×3/, 'with an occurrence count');
});
