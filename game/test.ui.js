/* UI-element glossary gate. game/test.js delegates here; run alone with
   `node game/test.ui.js`. Checks ROSTER is complete on the current tree, that the scan
   detects an unregistered primitive of every definitional form, and that ui.md still
   names each base-primitive home. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const glossary = require('./ui-glossary.js');
const fs = require('fs');

test('ui-glossary: the four base primitives are each a registered role', () => {
  const ids = new Set(glossary.ROSTER.roles.map(r => r.id));
  for (const id of ['card-face', 'chart-builders', 'design-tokens', 'svg-factory']) {
    assert.ok(ids.has(id), 'ROSTER registers the "' + id + '" role');
  }
  assert.ok(glossary.ROSTER.roles.some(r => r.id === 'design-tokens' && r.form === 'obj'),
    'the design-token object is registered as the obj form');
});

test('ui-glossary: roster is complete — no unregistered primitive on the current tree', () => {
  const { violations, defs } = glossary.scan();
  assert.ok(defs.length > 40, 'the scan actually enumerates the UI primitives (found ' + defs.length + ')');
  assert.deepStrictEqual(violations, [],
    'every detected primitive is registered; unregistered: ' +
    violations.map(v => v.form + ':' + v.name + '@' + v.rel).join(', '));
});

test('ui-glossary: the scan detects an unregistered factory of EVERY definitional form', () => {
  // one unregistered factory per form; the scan must red on each, so no form is a blind spot
  const forms = {
    'function-returning-markup': {
      rel: 'game/ui/__fixture__.js', type: 'js',
      // a single-letter tag (`<b>`), so the detector can't lean on multi-char tag names
      src: 'function zzFixtureFace(x){ return \'<b>\' + x + \'</b>\'; }\n',
      expect: 'zzFixtureFace',
    },
    'class': {
      rel: 'game/ui/__fixture__.js', type: 'js',
      src: 'class ZzFixtureWidget { render(){ return this; } }\n',
      expect: 'ZzFixtureWidget',
    },
    'object-literal token bag': {
      rel: 'game/ui/__fixture__.js', type: 'js',
      src: 'var ZZ_FIXTURE_TOKENS = { ink: \'#123456\', paper: \'#abcdef\' };\n',
      expect: 'ZZ_FIXTURE_TOKENS',
    },
    'object-method builder': {
      rel: 'game/ui/__fixture__.js', type: 'js',
      // an object-method-shorthand builder, not a hex token bag — the other obj flavour
      src: 'var ZZ_FIXTURE_BUILDER = { make: function(x){ return \'<b>\' + x + \'</b>\'; } };\n',
      expect: 'ZZ_FIXTURE_BUILDER',
    },
    'expression-arrow markup': {
      rel: 'game/ui/__fixture__.js', type: 'js',
      // a brace-less arrow that returns markup — the syntax the return-statement shape misses
      src: 'var zzFixtureArrow = x => \'<b>\' + x + \'</b>\';\n',
      expect: 'zzFixtureArrow',
    },
    'modifier class': {
      rel: 'game/__fixture__.css', type: 'css',
      // `.card` is a registered base primitive, so a new `.card.<mod>` is in scope —
      // and unregistered, so it must red.
      src: '.card.zzFixtureMod { color: red; }\n',
      expect: 'card.zzFixtureMod',
    },
    'modifier class (base not written first)': {
      rel: 'game/__fixture__.css', type: 'css',
      // ordering must not hide it: `.x.card` is normalised base-first to `card.x`
      src: '.zzFixtureFirst.card { color: red; }\n',
      expect: 'card.zzFixtureFirst',
    },
  };
  for (const [form, fx] of Object.entries(forms)) {
    const { violations } = glossary.scan({ extra: [{ rel: fx.rel, type: fx.type, src: fx.src }] });
    assert.ok(violations.some(v => v.name === fx.expect),
      'scan reds on the unregistered ' + form + ' fixture (' + fx.expect + '); ' +
      'detected violations: ' + (violations.map(v => v.name).join(', ') || '(none)'));
  }
});

test('ui-glossary: the shared vocabulary doc still names each base-primitive home', () => {
  // keep ui.md pointing at where each base primitive lives (no drift off ROSTER)
  const doc = fs.readFileSync(glossary.UI_VOCAB_DOC, 'utf8');
  const baseIds = new Set(['card-face', 'chart-builders', 'design-tokens', 'svg-factory']);
  for (const r of glossary.ROSTER.roles) {
    if (!baseIds.has(r.id)) continue;
    assert.ok(doc.includes(r.home),
      'ui.md names the ' + r.id + ' home (' + r.home + ')');
  }
});
