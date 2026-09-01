#!/usr/bin/env node
/* dev/pr-lint.test.js — the callout tooth (#196, ADR-0004 §3).
   A PR body must foreground the callout block with every field filled: the lint
   reds on an unreplaced sentinel or a missing field, and greens on a fully-filled
   body. Run: node --test dev/pr-lint.test.js   (offline) */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const lint = require(path.join(__dirname, 'pr-lint.js'));

const FIX = path.join(__dirname, 'fixtures');
const unfilled = fs.readFileSync(path.join(FIX, 'pr-body.unfilled.md'), 'utf8');
const filled = fs.readFileSync(path.join(FIX, 'pr-body.filled.md'), 'utf8');
const templateBody = fs.readFileSync(
  path.join(__dirname, '..', '.github', 'pull_request_template.md'), 'utf8');

test('the template declares every AC-required callout field', () => {
  const fields = lint.templateFields();
  for (const needle of [/ui primitive/i, /invariant/i, /pin/i, /rules.?version/i, /ui-review\.js/i]) {
    assert.ok(fields.some(f => needle.test(f)),
      'a callout field matches ' + needle + ' (found: ' + fields.join(' | ') + ')');
  }
});

test('every template field ships a FILL sentinel placeholder', () => {
  // The submitted-PR contract of AC#2: each field bullet carries a replaceable sentinel.
  const block = lint.calloutBlock(templateBody);
  const fieldLines = block.split('\n').filter(l => /^\s*[-*]\s*\*\*(.+?):\*\*/.test(l));
  assert.strictEqual(fieldLines.length, lint.templateFields().length, 'sanity: all fields matched');
  for (const l of fieldLines) {
    assert.ok(lint.SENTINEL_RE.test(l), 'field line carries a <!-- FILL: --> sentinel: ' + l);
  }
});

test('RED: the committed template itself is not a valid submitted body', () => {
  // The template is the base state — a PR that never edited it must fail.
  const res = lint.lint(templateBody);
  assert.strictEqual(res.ok, false, 'template body reds (unreplaced sentinels)');
  assert.ok(res.violations.some(v => /sentinel/i.test(v)), 'the red names the unfilled sentinels');
});

test('RED: a fixture PR body carrying an unreplaced sentinel fails', () => {
  const res = lint.lint(unfilled);
  assert.strictEqual(res.ok, false, 'unfilled fixture reds');
  assert.ok(res.violations.length > 0, 'at least one violation reported');
  assert.ok(res.violations.some(v => /sentinel/i.test(v)), 'violation names the sentinel');
});

test('GREEN: a fully-filled PR body passes', () => {
  const res = lint.lint(filled);
  assert.deepStrictEqual(res.violations, [], 'no violations on a filled body');
  assert.strictEqual(res.ok, true, 'filled fixture greens');
});

test('RED: dropping the callout block entirely fails', () => {
  const res = lint.lint('Just a description, no callout.\n');
  assert.strictEqual(res.ok, false, 'a body with no callout block reds');
  assert.ok(res.violations.some(v => /callout/i.test(v)), 'the red names the missing callout block');
});

test('RED: a filled body missing one required field fails', () => {
  // Drop the ui-review line from the filled body — the field is now absent.
  const maimed = filled.split('\n').filter(l => !/ui-review\.js/i.test(l)).join('\n');
  const res = lint.lint(maimed);
  assert.strictEqual(res.ok, false, 'a missing field reds even with no sentinel left');
  assert.ok(res.violations.some(v => /field/i.test(v)), 'the red names the missing field');
});
