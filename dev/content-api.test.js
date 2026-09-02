#!/usr/bin/env node
/* Real-path content-write gate. Drives the ACTUAL server's content
   routes over real HTTP against a THROWAWAY content dir (WOA_CONTENT_DIR) copied
   from the real one, so the file-write -> manifest-regen hand-off is exercised for
   real without ever touching committed content. Seams: A3 savemap, A8 deletemap,
   A5 savemapsets (the destructive dir rewrite), A4 savebattalion.

   Node runs each --test file in its own process, so the env set here is isolated
   from dev/server.test.js. Run via npm test or `node --test dev/content-api.test.js`. */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GAME = path.join(__dirname, '..', 'game');
const realContent = path.join(GAME, 'content');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-content-'));
const sandbox = path.join(tmpDir, 'content');
fs.cpSync(realContent, sandbox, { recursive: true });   // a real content tree to mutate safely
process.env.WOA_CONTENT_DIR = sandbox;
process.env.WOA_DB_PATH = path.join(tmpDir, 'unused.db');

const server = require(path.join(GAME, 'server.js'));

const customBattalionPath = path.join(GAME, 'custom-battalion.js');
const customBattalionBackup = fs.readFileSync(customBattalionPath, 'utf8'); // savebattalion writes game/, not content/ — snapshot + restore

let srv, port;
before(function () { return new Promise(function (r) { srv = server.listen(0, function () { port = srv.address().port; r(); }); }); });
after(function () {
  try { srv.close(); } catch (e) {}
  try { fs.writeFileSync(customBattalionPath, customBattalionBackup); } catch (e) {} // restore the committed no-op file
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
});

function req(method, pathname, body) {
  return new Promise(function (resolve, reject) {
    const data = body != null ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port: port, path: pathname, method: method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      function (res) { let b = ''; res.on('data', function (c) { b += c; }); res.on('end', function () { let j = null; try { j = JSON.parse(b); } catch (e) {} resolve({ status: res.statusCode, body: b, json: j }); }); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
function manifest() { return fs.readFileSync(path.join(sandbox, 'manifest.js'), 'utf8'); }

test('savemap writes a content file AND the manifest lists it (A3)', async function () {
  const r = await req('POST', '/api/savemap', { map: { name: 'ZZ Seam Test', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2], pieces: [] } });
  assert.strictEqual(r.status, 200, 'savemap accepted (' + r.body + ')');
  const file = path.join(sandbox, 'maps', 'zz-seam-test.js');
  assert.ok(fs.existsSync(file), 'the map file landed on disk (slug-sanitized id)');
  assert.ok(manifest().indexOf('zz-seam-test.js') >= 0, 'the regenerated manifest now lists the new map (write -> manifest hand-off)');
});

test('deletemap removes the file AND the manifest drops it (A8)', async function () {
  const r = await req('POST', '/api/deletemap', { id: 'zz-seam-test' });
  assert.strictEqual(r.status, 200, 'deletemap accepted');
  assert.ok(!fs.existsSync(path.join(sandbox, 'maps', 'zz-seam-test.js')), 'the map file is gone');
  assert.ok(manifest().indexOf('zz-seam-test.js') < 0, 'the regenerated manifest no longer lists it');
});

test('savemapsets rewrites the whole dir to the posted slots, deleting the rest (A5)', async function () {
  const before = fs.readdirSync(path.join(sandbox, 'mapsets')).filter(function (f) { return /\.js$/.test(f); });
  assert.ok(before.length > 1, 'sandbox seeded with several mapsets (' + before.length + ')');
  const r = await req('POST', '/api/savemapsets', { mapsets: [{ id: 'solo', name: 'Solo Set', active: true, maps: ['Causeway'] }] });
  assert.strictEqual(r.status, 200, 'savemapsets accepted (' + r.body + ')');
  const after = fs.readdirSync(path.join(sandbox, 'mapsets')).filter(function (f) { return /\.js$/.test(f); });
  assert.deepStrictEqual(after, ['solo.js'], 'exactly the posted slot survives; every other mapset file was deleted (destructive rewrite)');
  assert.ok(fs.readFileSync(path.join(sandbox, 'mapsets', 'solo.js'), 'utf8').indexOf('"active": true') >= 0, 'the active flag is written through');
  // Check the manifest's mapsets slice specifically (a name like "bestof.js" also
  // exists under battalions/, so a whole-file search would give a false positive).
  const mapsetsInManifest = /"mapsets":\s*(\[[^\]]*\])/.exec(manifest());
  assert.ok(mapsetsInManifest && JSON.parse(mapsetsInManifest[1]).join(',') === 'solo.js',
    'the regenerated manifest lists exactly the rewritten mapsets dir (write -> manifest hand-off)');
});

test('savebattalion writes the applied-battalion file, and null restores the default (A4)', async function () {
  const applied = await req('POST', '/api/savebattalion', { battalion: [{ id: 'x', name: 'X', count: 1, steps: [{ type: 'attack' }] }] });
  assert.strictEqual(applied.status, 200, 'savebattalion accepted a card list');
  const written = fs.readFileSync(customBattalionPath, 'utf8');
  assert.ok(/window\.WOA_CUSTOM_BATTALION\s*=/.test(written) && written.indexOf('"id": "x"') >= 0, 'the applied battalion was written to custom-battalion.js');
  const cleared = await req('POST', '/api/savebattalion', { battalion: null });
  assert.strictEqual(cleared.status, 200, 'savebattalion accepted null');
  assert.ok(/WOA_CUSTOM_BATTALION\s*=\s*null/.test(fs.readFileSync(customBattalionPath, 'utf8')), 'null resets custom-battalion.js to the no-op default');
});
