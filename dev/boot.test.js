/* Real-path gates for two browser-inline hand-offs, driven through
   the actual page in jsdom (same inline-every-script boot as dev/smoke.js):
   - E3: localStorage['woa-custom-battalion'] -> the index.html battalion bootstrap ->
     WOA_CONTENT.battalions -> the engine's ACTIVE_BATTALION snapshot (localStorage wins).
   - F2: a maps-bundle file -> the importFile lenient parser (bare array /
     assignment prefix / trailing semicolon / single map) -> libraryReplace -> E.MAPS.
   Run: node --test dev/boot.test.js  (needs dev/node_modules/jsdom). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const GAME = path.join(__dirname, '..', 'game');
function read(f) { return fs.readFileSync(path.join(GAME, f), 'utf8'); }
function readContent() {
  let out = '';
  ['cards', 'battalions', 'maps'].forEach(function (kind) {
    const d = path.join(GAME, 'content', kind);
    fs.readdirSync(d).filter(function (f) { return /\.js$/.test(f); }).sort().forEach(function (f) {
      out += fs.readFileSync(path.join(d, f), 'utf8') + '\n';
    });
  });
  return out;
}
// Inline every <script src> (manifest -> the content files) so jsdom needs no
// loader — the same technique dev/smoke.js uses. `prefix` is injected before the
// whole chain (used to seed localStorage ahead of the inline battalion bootstrap).
function bootHtml(prefix) {
  let html = read('index.html').replace(/<script src="([^"]+)"><\/script>/g, function (tag, src) {
    if (src === 'content/manifest.js') return '<script>' + readContent() + '</script>';
    return '<script>' + read(src) + '</script>';
  });
  if (/<script [^>]*src=/.test(html)) throw new Error('un-inlined <script src> survived');
  return (prefix || '') + html;
}
function makeDom(prefix) {
  const dom = new JSDOM(bootHtml(prefix), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/game/index.html' });
  dom.window.confirm = function () { return true; };
  dom.window.fetch = function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve([]); } }); };
  return dom;
}

test('E3: localStorage battalion override wins and becomes ACTIVE_BATTALION', function () {
  // A non-empty applied battalion seeded into localStorage BEFORE the chain runs — the
  // inline bootstrap must deactivate the shipped battalions and snapshot this one.
  const applied = [
    { id: 'deploy_inf_start', name: 'Start', count: 1, starting: true, steps: [{ type: 'deploy', unit: 'infantry' }] },
    { id: 'attack_plus1', name: 'Assault', count: 15, steps: [{ type: 'attack', mod: 1 }] }
  ];
  const seed = '<script>try{localStorage.setItem("woa-custom-battalion",' + JSON.stringify(JSON.stringify(applied)) + ')}catch(e){}</script>\n';
  const win = makeDom(seed).window;
  assert.ok(win.Engine, 'engine booted');
  assert.strictEqual(win.Engine.ACTIVE_BATTALION.id, '__applied',
    'localStorage override became the active battalion (id __applied), winning over the shipped active battalion');
  const ids = win.Engine.ACTIVE_BATTALION.cards.map(function (c) { return c.id; });
  assert.ok(ids.indexOf('attack_plus1') >= 0 && ids.indexOf('deploy_inf_start') >= 0,
    'the applied battalion carries the overridden cards (got ' + ids.join(',') + ')');
  assert.ok(win.WOA_CONTENT.battalions.filter(function (d) { return d.active; }).length === 1,
    'exactly one battalion is active after the override (the shipped ones were deactivated)');
});

test('F2: maps-bundle import lenient parser lands the map in E.MAPS', function () {
  return new Promise(function (resolve, reject) {
    const dom = makeDom('');
    const win = dom.window, doc = win.document;
    if (!win.Engine) return reject(new Error('engine did not boot'));
    const NAME = 'ZZ Import Seam';
    if (win.Engine.MAPS.some(function (m) { return m.name === NAME; })) return reject(new Error('fixture name already present'));
    const map = { name: NAME, shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2], pieces: [] };
    // A deliberately LENIENT bundle: an assignment prefix + a trailing semicolon
    // wrapping a single map object (not a bare array) — the parser must strip both.
    const bundleText = 'WOA_CUSTOM_MAPS = ' + JSON.stringify(map) + ';\n';

    const input = doc.getElementById('importFile');
    assert.ok(input, 'the import file input exists');
    const file = new win.File([bundleText], 'maps-bundle.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new win.Event('change'));

    // FileReader.onload is async; poll briefly for libraryReplace to add the map.
    let waited = 0;
    (function poll() {
      if (win.Engine.MAPS.some(function (m) { return m.name === NAME && m.custom; })) {
        assert.ok(true, 'the imported map (assignment-prefixed, semicolon-terminated, single object) landed in E.MAPS via the lenient parser + libraryReplace');
        try { dom.window.close(); } catch (e) {}
        return resolve();
      }
      if ((waited += 10) > 3000) return reject(new Error('imported map never appeared in E.MAPS (parser/hand-off broke)'));
      setTimeout(poll, 10);
    })();
  });
});
