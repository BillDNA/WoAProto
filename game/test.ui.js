/* UI-element glossary gate. game/test.js delegates here; run alone with
   `node game/test.ui.js`. Checks ROSTER is complete on the current tree, that the scan
   detects an unregistered primitive of every definitional form, and that ui.md still
   names each base-primitive home. */
'use strict';
const { test } = require('./test.helpers.js'); // records each as a pin (#189 deletion guard)
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

// ---- register-or-extend diff gate (#194; general case of #190) ----------------------
// The whole-tree census above proves the ROSTER complete. These prove the register-OR-
// -extend *diff* logic: given a change (before → after source lists + the ui.md text a
// change edits), a newly-added element-factory / modifier must EITHER extend a
// registered role OR register a genuinely new role in docs/context/ui.md that same diff.
// An unregistered new primitive reds; a FORK of an already-served role reds even when
// registered (you must extend the base, not re-implement it).

test('register-or-extend: an unregistered new factory reds (AC1)', () => {
  const after = [{ rel: 'game/ui/zz-widget.js', type: 'js',
    src: 'function zzMedalRow(x){ return \'<b>\' + x + \'</b>\'; }\n' }];
  const { violations } = glossary.registerOrExtend({ before: [], after, uiDocBefore: '', uiDocAfter: '' });
  assert.ok(violations.some(v => v.def.name === 'zzMedalRow' && v.why === 'unregistered'),
    'a new element-factory with no glossary entry and no extension reds; violations: ' +
    violations.map(v => v.def.name + '/' + v.why).join(', '));
});

test('register-or-extend: registering the new role in ui.md greens the same change (AC2)', () => {
  const after = [{ rel: 'game/ui/zz-widget.js', type: 'js',
    src: 'function zzMedalRow(x){ return \'<b>\' + x + \'</b>\'; }\n' }];
  const uiDocAfter = '- **medal row** — zzMedalRow, a genuinely new podium primitive. Lives in game/ui/zz-widget.js.';
  const { violations } = glossary.registerOrExtend({ before: [], after, uiDocBefore: '', uiDocAfter });
  assert.deepStrictEqual(violations, [],
    'the same change is green once it registers the role in ui.md (names zzMedalRow)');
});

test('register-or-extend: a modifier on a registered base is an extend, not a red (AC3)', () => {
  const after = [{ rel: 'game/style.css', type: 'css', src: '.card.zzHighlight { outline: 2px solid gold; }\n' }];
  const { violations } = glossary.registerOrExtend({ before: [], after, uiDocBefore: '', uiDocAfter: '' });
  assert.deepStrictEqual(violations, [],
    'a new .card.<mod> extends the registered card base — a legal extend, not a fork');
});

test('register-or-extend: an opts-flag variant introduces no primitive, so nothing reds (AC3)', () => {
  const before = [{ rel: 'game/ui/app.js', type: 'js',
    src: 'function cardFace(c, opts){ return \'<div class="corner c1"></div>\' + c.name; }\n' }];
  const after = before.concat([{ rel: 'game/ui/hand.js', type: 'js',
    src: 'function renderHand(cs){ return cs.map(c => cardFace(c, { deal: true })).join(""); }\n' }]);
  const { violations } = glossary.registerOrExtend({ before, after, uiDocBefore: '', uiDocAfter: '' });
  assert.deepStrictEqual(violations, [],
    'reusing the base renderer via an opts flag (cardFace(c,{deal})) adds no new primitive to register');
});

test('register-or-extend: a fork of an already-served role reds even if registered (#194 thesis)', () => {
  // a second card face built outside app.js — the card-face role is already served, so
  // registering it in ui.md does not save it: extend cardFace, never re-implement it.
  const after = [{ rel: 'game/ui/evil.js', type: 'js',
    src: 'function cardFace2(c){ return \'<div class="corner c1"></div><div class="corner c2"></div>\'; }\n' }];
  const uiDocAfter = '- **card face 2** — cardFace2, a second card face. Lives in game/ui/evil.js.';
  const { violations } = glossary.registerOrExtend({ before: [], after, uiDocBefore: '', uiDocAfter });
  assert.ok(violations.some(v => v.def.name === 'cardFace2' && v.why === 'fork'),
    'a second card-face built outside app.js reds as a FORK despite the ui.md entry; violations: ' +
    violations.map(v => v.def.name + '/' + v.why).join(', '));
});

test('register-or-extend: the fork check spans base roles, not just the card face (#194)', () => {
  // a second SVG element factory (createElementNS) outside board.js is a fork of the
  // svg-factory role — proves FORK_SIGNATURES is a general table, not card-only.
  const after = [{ rel: 'game/ui/evil-svg.js', type: 'js',
    src: 'function makeNode(t){ return document.createElementNS("http://www.w3.org/2000/svg", t); }\n' }];
  const { violations } = glossary.registerOrExtend({ before: [], after,
    uiDocBefore: '', uiDocAfter: '- **node maker** — makeNode. Lives in game/ui/evil-svg.js.' });
  assert.ok(violations.some(v => v.def.name === 'makeNode' && v.why === 'fork' && v.role === 'svg-factory'),
    'a second createElementNS factory outside board.js reds as an svg-factory fork; violations: ' +
    violations.map(v => v.def.name + '/' + v.why).join(', '));
});
