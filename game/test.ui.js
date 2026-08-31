/* Subsystem: the UI-element glossary (ADR-0004, #187). Frozen-API entry
   game/test.js delegates here; run alone with `node game/test.ui.js` or the whole
   gate with `node game/test.js`.

   Proves the role-keyed roster in docs/context/ui.md is a COMPLETE census of the
   front-end's rendering primitives (green today) AND that the scan that guards it is
   not a hollow oracle: it detects an unregistered factory of EVERY definitional form
   the codebase uses, not just the one the happy path matches. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const glossary = require('./ui-glossary.js');
const fs = require('fs');
const path = require('path');

const rosterText = fs.readFileSync(path.join(__dirname, '..', 'docs', 'context', 'ui.md'), 'utf8');

test('ui-glossary: the four base primitives are each a registered role', () => {
  const { roles } = glossary.parseRoster(rosterText);
  const ids = new Set(roles.map(r => r.id));
  // AC1: the one card face, the chart-primitive builders + shared design-token object,
  // and the SVG element factory each appear as a registered role.
  for (const id of ['card-face', 'chart-builders', 'design-tokens', 'svg-factory']) {
    assert.ok(ids.has(id), 'roster registers the "' + id + '" role');
  }
  assert.ok(roles.some(r => r.id === 'design-tokens' && r.form === 'obj'),
    'the design-token object is registered as the obj form');
});

test('ui-glossary: roster is complete — no unregistered primitive on the current tree', () => {
  // AC2: the scan enumerates every element-factory / modifier-class definition and is
  // green on the current tree (every detected primitive is claimed by a role).
  const { violations, defs } = glossary.scan({ rosterText });
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
    'object-literal builder': {
      rel: 'game/ui/__fixture__.js', type: 'js',
      src: 'var ZZ_FIXTURE_TOKENS = { ink: \'#123456\', paper: \'#abcdef\' };\n',
      expect: 'ZZ_FIXTURE_TOKENS',
    },
    'modifier class': {
      rel: 'game/__fixture__.css', type: 'css',
      // `.card` is a registered base primitive, so a new `.card.<mod>` is in scope —
      // and unregistered, so it must red.
      src: '.card.zzFixtureMod { color: red; }\n',
      expect: 'card.zzFixtureMod',
    },
  };
  for (const [form, fx] of Object.entries(forms)) {
    const { violations } = glossary.scan({ rosterText, extra: [{ rel: fx.rel, type: fx.type, src: fx.src }] });
    assert.ok(violations.some(v => v.name === fx.expect),
      'scan reds on the unregistered ' + form + ' fixture (' + fx.expect + '); ' +
      'detected violations: ' + violations.map(v => v.name).join(', ') || '(none)');
  }
});
