/* War of Attrition — tiny zero-dependency LAN server.
   Run:  node server.js   (or double-click run-server.bat on Windows)
   Then open the printed address on both devices (same wifi). */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');

var PORT = process.env.PORT || 8420;
var ROOT = __dirname;
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

var rooms = {}; // code -> { state, seq, updated }

function code4() {
  var letters = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I/L/O
  var c = '';
  for (var i = 0; i < 4; i++) c += letters[Math.floor(Math.random() * letters.length)];
  return rooms[c] ? code4() : c;
}

function cleanup() {
  var now = Date.now();
  for (var c in rooms) if (now - rooms[c].updated > 6 * 3600 * 1000) delete rooms[c];
}
setInterval(cleanup, 600000);

function json(res, status, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, cb) {
  var chunks = [];
  var size = 0;
  req.on('data', function (d) {
    size += d.length;
    if (size > 2e6) { req.destroy(); return; }
    chunks.push(d);
  });
  req.on('end', function () {
    try { cb(null, JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
    catch (e) { cb(e); }
  });
}

http.createServer(function (req, res) {
  var u = new URL(req.url, 'http://x');
  var p = u.pathname;

  /* ---- API ---- */
  if (p === '/api/create' && req.method === 'POST') {
    return readBody(req, function (err, body) {
      if (err || !body.state) return json(res, 400, { error: 'bad request' });
      var room = code4();
      rooms[room] = { state: body.state, seq: 1, updated: Date.now() };
      json(res, 200, { room: room, seq: 1 });
    });
  }
  if (p === '/api/join' && req.method === 'POST') {
    return readBody(req, function (err, body) {
      var r = body && rooms[(body.room || '').toUpperCase()];
      if (err || !r) return json(res, 404, { error: 'room not found' });
      r.updated = Date.now();
      json(res, 200, { state: r.state, seq: r.seq });
    });
  }
  if (p === '/api/push' && req.method === 'POST') {
    return readBody(req, function (err, body) {
      var r = body && rooms[(body.room || '').toUpperCase()];
      if (err || !r) return json(res, 404, { error: 'room not found' });
      r.updated = Date.now();
      if (body.seq !== r.seq + 1) return json(res, 200, { conflict: true, state: r.state, seq: r.seq });
      r.seq = body.seq;
      r.state = body.state;
      json(res, 200, { ok: true, seq: r.seq });
    });
  }
  if (p === '/api/savemaps' && req.method === 'POST') {
    return readBody(req, function (err, body) {
      if (err || !Array.isArray(body.maps)) return json(res, 400, { error: 'bad request' });
      if (body.maps.length === 0 && !body.allowEmpty) return json(res, 200, { ok: true, skipped: 'empty list; keeping existing maps file' });
      var content = 'window.WOA_CUSTOM_MAPS = ' + JSON.stringify(body.maps, null, 1) + ';\n';
      fs.writeFile(path.join(ROOT, 'custom-maps.js'), content, function (werr) {
        if (werr) return json(res, 500, { error: 'write failed' });
        json(res, 200, { ok: true });
      });
    });
  }
  if (p === '/api/poll' && req.method === 'GET') {
    var r = rooms[(u.searchParams.get('room') || '').toUpperCase()];
    if (!r) return json(res, 404, { error: 'room not found' });
    r.updated = Date.now();
    var seq = parseInt(u.searchParams.get('seq') || '0', 10);
    if (r.seq > seq) return json(res, 200, { state: r.state, seq: r.seq });
    res.writeHead(204); return res.end();
  }

  /* ---- static files ---- */
  var file = p === '/' ? '/index.html' : p;
  file = path.normalize(file).replace(/^(\.\.[\/\\])+/, '');
  var full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, function (err, data) {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('');
  console.log('  WAR OF ATTRITION — server running');
  console.log('  ---------------------------------');
  console.log('  On this computer:  http://localhost:' + PORT);
  var ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function (name) {
    (ifaces[name] || []).forEach(function (i) {
      if (i.family === 'IPv4' && !i.internal) {
        console.log('  Other devices:     http://' + i.address + ':' + PORT + '   (same wifi)');
      }
    });
  });
  console.log('');
  console.log('  One player clicks "Host a Room", the other enters the 4-letter code.');
  console.log('  Press Ctrl+C to stop.');
});
