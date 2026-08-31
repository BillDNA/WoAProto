/* Subsystem: the UI-element glossary (ADR-0004, #187). Frozen-API entry
   game/test.js delegates here; run alone with `node game/test.ui.js` or the whole
   gate with `node game/test.js`.

   Proves the role-keyed ROSTER in game/ui-glossary.js is a COMPLETE census of the
   front-end's rendering primitives (green today) AND that the scan that guards it is
   not a hollow oracle: it detects an unregistered factory of EVERY definitional form
   the codebase uses, not just the one the happy path matches. A last test keeps the
   shared vocabulary in docs/context/ui.md from drifting off the code it names. */
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
  // AC2: the scan enumerates every element-factory / modifier-class definition and is
  // green on the current tree (every detected primitive is claimed by a role).
  const { violations, defs } = glossary.scan();
  assert.ok(defs.length > 40, 'the scan actually enumerates the UI primitives (found ' + defs.length + ')');
  assert.deepStrictEqual(violations, [],
    'every detected primitive is registered; unregistered: ' +
    violations.map(v => v.form + ':' + v.name + '@' + v.rel).join(', '));
});

test('ui-glossary: the scan detects an unregistered factory of EVERY definitional form', () => {
  // AC3 — exhaustiveness, red-at-base. Each fixture is one unregistered factory of a
  // distinct definitional form the codebase uses; the scan must red on each in turn,
  // proving it detects the form and cannot be defeated by only matching the happy path.
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
  // Keep docs/context/ui.md (the vocabulary) from drifting off ROSTER (the authority):
  // every base-primitive role must still be locatable from the doc, so the glossary a
  // reader learns can't silently stop pointing at where the primitive lives.
  const doc = fs.readFileSync(glossary.UI_VOCAB_DOC, 'utf8');
  const baseIds = new Set(['card-face', 'chart-builders', 'design-tokens', 'svg-factory']);
  for (const r of glossary.ROSTER.roles) {
    if (!baseIds.has(r.id)) continue;
    assert.ok(doc.includes(r.home),
      'ui.md names the ' + r.id + ' home (' + r.home + ')');
  }
});
