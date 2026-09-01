/* War of Attrition — tiny zero-dependency LAN + dev server.
   Run:  node server.js   (or double-click run-server.command / run-server.bat)
   Then open the printed address on both devices (same wifi).

   Also the browser's write proxy: content saves (maps/decks), report/debug
   saves, and — V1 — per-skirmish persistence into logs/woa.db via dev/db.js.
   The db require is guarded: a zipped game/ without dev/ still serves and
   plays; /api/recordskirmish just answers 501. */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');
var spawn = require('child_process').spawn;

var PORT = process.env.PORT || 8420;
var ROOT = __dirname;
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.md': 'text/markdown' };

// --- content files (Feedback Round 4 Pass 2): maps/decks are per-item files
// under content/, each registering into WOA_CONTENT; content/manifest.js is
// regenerated (by scanning the dirs) so the browser loads exactly what's there.
var CONTENT_DIR = path.join(ROOT, 'content');
function contentSlug(s) { return String(s || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'map'; }
function wrapContent(kind, obj) {
  // defensive: files written before a kind existed init WOA_CONTENT without it,
  // so every file ensures its own array rather than trusting the initializer
  return "(function(g){var c=g.WOA_CONTENT=g.WOA_CONTENT||{maps:[],cards:[],decks:[],mapsets:[]};(c." + kind + "=c." + kind + "||[]).push(\n" +
    JSON.stringify(obj, null, 1) + "\n);})(typeof window!=='undefined'?window:globalThis);\n";
}
var regenContentManifest = require(path.join(CONTENT_DIR, 'manifest-gen.js')).regen;
// Regenerate at boot too, not just on save/delete — hand-added content files
// (or a git pull) otherwise leave the browser on a stale roster.
try { regenContentManifest(); } catch (e) { console.log('  (manifest regen failed: ' + e.message + ')'); }

// --- V1 skirmish persistence (guarded: dev/ may be absent from a zip) ---------
var db = null, dbHandle = null, dbRuns = {}; // runKey -> runId (per server boot)
try { db = require(path.join(ROOT, '..', 'dev', 'db.js')); } catch (e) { /* persistence off */ }
function recordSkirmish(body) {
  if (!db) return { status: 501, out: { error: 'persistence unavailable (dev/db.js not present)' } };
  if (!body || !body.state || body.state.phase !== 'skirmish-over' || !body.run)
    return { status: 400, out: { error: 'need a finished state + run info' } };
  if (!dbHandle) dbHandle = db.open();
  var runKey = String(body.runKey || (body.run.kind + '|' + (body.run.version || '?') + '|' + (body.run.redAi || '?') + '|' + (body.run.blueAi || '?')));
  if (!dbRuns[runKey]) dbRuns[runKey] = db.insertRun(dbHandle, body.run);
  var skirmishId = db.insertSkirmish(dbHandle, dbRuns[runKey], body.state, body.firstPlayer || 'red',
    { seed: body.seed, version: body.run.version });
  return { status: 200, out: { ok: true, runId: dbRuns[runKey], skirmishId: skirmishId } };
}

// --- #154 loop bridge: the browser Workbench's Launch spawns dev/loop.js here and
// the Run phase polls GET /api/runloop for a folded status. One run at a time — a
// new Launch replaces the old process. loopStatus is the exact shape wbSetRunStatus
// renders ({ loopType, state, iter, iters, swept, best, steps }); we fold each
// LOOP_STEP stdout line into it (same stdout-line contract balance-report.js uses).
var loopProc = null, loopStatus = null, loopBuf = '';
function foldLoopLine(line) {
  var m = /^(LOOP_STEP|LOOP_RESULT) (.*)$/.exec(line);
  if (!m || !loopStatus) return;
  var obj; try { obj = JSON.parse(m[2]); } catch (e) { return; }
  if (m[1] === 'LOOP_STEP') {
    loopStatus.iter = obj.iter;
    loopStatus.steps.push(obj);
    loopStatus.swept = obj.swept != null ? obj.swept : loopStatus.swept;
    if (obj.score != null && (!loopStatus.best || obj.score < loopStatus.best.score))
      loopStatus.best = { candidate: obj.candidate, score: obj.score };  // lower score = healthier
  } else { // LOOP_RESULT — the run finished cleanly
    loopStatus.result = obj;
    loopStatus.state = 'done';
  }
}
function startLoop(cfg) {
  if (loopProc) { try { loopProc.kill('SIGKILL'); } catch (e) {} loopProc = null; }
  var iters = Math.max(1, (cfg.iters | 0) || 6);   // missing/0 -> 6, then floor at 1
  var n = Math.max(2, (cfg.n | 0) || 20);          // missing/0 -> 20, then floor at 2
  var args = [path.join(ROOT, '..', 'dev', 'loop.js'),
    '--iters', String(iters), '--n', String(n),
    '--ai', (cfg.panel && cfg.panel.length ? cfg.panel : ['hard']).join(','),
    // profile may be an edited Tolerance object — forward it as inline JSON (loop.js parses it)
    '--profile', typeof cfg.profile === 'object' && cfg.profile ? JSON.stringify(cfg.profile) : String(cfg.profile || 'card'),
    '--mapset', String(cfg.mapset || 'all')];
  // #164: forward the author-boldness Temperature (a plain passthrough) so the run records it.
  if (cfg.temperature != null && cfg.temperature !== '') args.push('--temperature', String(cfg.temperature));
  if (cfg.maps) args.push('--maps', String(cfg.maps | 0));  // test lever: cap the roster
  if (cfg.db) args.push('--db', String(cfg.db));            // test lever: isolate the db
  loopStatus = { loopType: cfg.loopType || 'card', state: 'running', iter: 0, iters: iters, swept: 0, best: null, steps: [] };
  loopBuf = '';
  var p = loopProc = spawn(process.execPath, args, { cwd: path.join(ROOT, '..') });
  p.stdout.on('data', function (d) {
    loopBuf += d.toString('utf8');
    var lines = loopBuf.split('\n'); loopBuf = lines.pop();
    lines.forEach(foldLoopLine);
  });
  p.stderr.on('data', function () {});  // loop's own warnings — surfaced in its process, not fatal here
  p.on('close', function () {
    if (loopProc !== p) return;  // a newer launch already replaced us — don't clobber its status
    if (loopStatus && loopStatus.state !== 'done' && loopStatus.state !== 'stopped') loopStatus.state = 'stopped';
    loopProc = null;
  });
}
function controlLoop(action) {
  if (!loopProc) return { status: 409, out: { error: 'no loop running' } };
  // ponytail: POSIX SIGSTOP/SIGCONT pause/resume, SIGTERM stop — dev tooling on
  // darwin/linux; no Windows pause (would need a stop-flag file the loop polls).
  try {
    if (action === 'pause') { loopProc.kill('SIGSTOP'); loopStatus.state = 'paused'; }
    else if (action === 'resume') { loopProc.kill('SIGCONT'); loopStatus.state = 'running'; }
    else if (action === 'stop') { loopProc.kill('SIGTERM'); loopStatus.state = 'stopped'; }
    else return { status: 400, out: { error: 'unknown action "' + action + '"' } };
  } catch (e) { return { status: 500, out: { error: e.message } }; }
  return { status: 200, out: { ok: true, state: loopStatus.state } };
}

// --- #167 content loop: the Workbench Run button launches the content loop as a
// WATCHABLE terminal — a visible Terminal.app window Bill alt-tabs to and watches play out,
// zero interaction (spec §3/§11.2). The run is isolated in its own git worktree on a
// content-run-<ts> branch (main untouched); its run-record + author feed are mirrored into
// THIS server's logs so the dashboard feed (GET /api/contentrun) shows the same story live.
var execFile = require('child_process');
var REPO = path.join(ROOT, '..');          // server.js is in game/; the repo root is one up
var contentRun = null;                     // { runId, branch, worktree, startedAt }
function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }  // POSIX single-quote one arg
function startContentLoop(cfg) {
  cfg = cfg || {};
  var ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  var runId = 'content-run-' + ts;
  var wt = path.join(REPO, '.claude', 'worktrees', runId);
  // 1) isolate the run in a fresh worktree on a new branch off the server's current HEAD.
  execFile.execFileSync('git', ['worktree', 'add', '-b', runId, wt, 'HEAD'], { cwd: REPO, stdio: 'pipe' });
  // 2) assemble the content-loop args from the Plan config (defaults keep a first-run watch quick).
  var args = ['dev/content-loop.js', '--run-id', runId];
  if (cfg.nudge) args.push('--nudge', String(cfg.nudge));
  if (cfg.temperature) args.push('--temperature', String(cfg.temperature));
  var tolName = cfg.profile && typeof cfg.profile === 'object' ? cfg.profile.name : (cfg.profile || cfg.tolerance);
  if (tolName) args.push('--tolerance', String(tolName));
  args.push('--stop', String(cfg.stop || '+45m'));
  if (cfg.questionnaire) args.push('--questionnaire', String(cfg.questionnaire));
  if (cfg.panel && cfg.panel.length) args.push('--panel', cfg.panel.join(','));
  if (cfg.n) args.push('--n', String(cfg.n | 0));
  if (cfg.maps) args.push('--maps', String(cfg.maps | 0));
  if (cfg.iters) args.push('--iters', String(cfg.iters | 0));
  if (cfg.feelsMatch) args.push('--feels-match', String(cfg.feelsMatch | 0));
  if (cfg.feelsTurns) args.push('--feels-turns', String(cfg.feelsTurns | 0));
  if (cfg.db) args.push('--db', String(cfg.db));     // isolate a test run from the shared woa.db
  if (cfg.mock) args.push('--mock');                 // offline launch (mechanism/CI test)
  // mirror the machine-readable record + author feed back into THIS server's logs, so the
  // dashboard renders the same run the terminal is playing (one run, two windows on it).
  var recDir = path.join(REPO, 'logs', 'content-runs');
  args.push('--rec-dir', recDir);
  args.push('--feed-file', path.join(REPO, 'logs', 'authored', 'latest.json'));
  // Overwrite latest.json with a 'starting' placeholder SYNCHRONOUSLY, before the detached
  // child boots and RR.open() rewrites it: otherwise the Workbench's first poll (fired right
  // after this returns) reads a PRIOR run's stale state:'done' and stops polling the new run.
  try {
    fs.mkdirSync(recDir, { recursive: true });
    fs.writeFileSync(path.join(recDir, 'latest.json'), JSON.stringify({ runId: runId, state: 'starting', startedAt: new Date().toISOString(), config: { nudge: cfg.nudge || '', temperature: cfg.temperature || '', tolerance: tolName || '', stopAt: (cfg.stop && cfg.stop !== '+45m') ? String(cfg.stop) : '', questionnaire: cfg.questionnaire || '' }, stage: null, iterations: [] }, null, 2) + '\n');
  } catch (e) { /* the child will write the real record shortly regardless */ }
  // 3) write a .command launch script and open it in a visible Terminal (macOS). Off-mac,
  // fall back to a detached headless child (the dashboard mirror still works; no window).
  var cmd = 'cd ' + shq(wt) + ' && node ' + args.map(shq).join(' ');
  var script = '#!/bin/bash\n' +
    'echo "════════ War of Attrition · content loop — watch it happen ════════"\n' +
    'echo "run ' + runId + '   ·   own worktree/branch, main untouched   ·   Ctrl-C stops early"\n' +
    'echo ""\n' + cmd + '\n' +
    'echo ""; echo "── content loop finished. Press any key to close this window. ──"; read -n 1\n';
  var scriptPath = path.join(os.tmpdir(), runId + '.command');
  fs.writeFileSync(scriptPath, script, { mode: 0o755 });
  // Open a visible Terminal (macOS) so Bill watches it play; headless off-mac or when asked
  // (cfg.headless / WOA_NO_TERMINAL — tests, CI, and remote sessions with no desktop). The
  // dashboard mirror is identical either way; only the window differs.
  var headless = cfg.headless || process.env.WOA_NO_TERMINAL || process.platform !== 'darwin';
  if (headless) spawn(process.execPath, args, { cwd: wt, detached: true, stdio: 'ignore' }).unref();
  else spawn('open', ['-a', 'Terminal', scriptPath], { detached: true, stdio: 'ignore' }).unref();
  contentRun = { runId: runId, branch: runId, worktree: wt, startedAt: new Date().toISOString() };
  return contentRun;
}

var VERSION = (function () { // engine's rules version, for LAN mismatch warnings
  try { return require(path.join(ROOT, 'engine.js')).VERSION; } catch (e) { return null; }
})();

var rooms = {}; // code -> { state, seq, updated }

function code4() {
  var letters = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I/L/O
  var c = '';
  for (var i = 0; i < 4; i++) c += letters[Math.floor(Math.random() * letters.length)];
  return rooms[c] ? code4() : c;
}

function stamp() { return new Date().toTimeString().slice(0, 8); }
function logRooms(msg) {
  var open = Object.keys(rooms).sort().join(' ') || 'none';
  console.log('  [' + stamp() + '] ' + msg + '   (open rooms: ' + open + ')');
}

function cleanup() {
  var now = Date.now();
  for (var c in rooms) {
    if (now - rooms[c].updated > 6 * 3600 * 1000) {
      delete rooms[c];
      logRooms('room ' + c + ' expired after 6h idle');
    }
  }
}
// unref so requiring this module for its handler (dev/smoke.js's loop-bridge test)
// doesn't keep the process alive on this timer alone.
setInterval(cleanup, 600000).unref();

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

// One "save a file under a whitelisted repo dir" helper — the shared shape of
// savereport/savedebug (filename + version regexes are the path-injection fence).
function saveUnderRepo(res, relDirParts, name, nameRe, content) {
  if (!nameRe.test(name)) return json(res, 400, { error: 'bad filename' });
  var rel = path.join.apply(path, relDirParts);
  var dir = path.join(ROOT, '..', rel);
  fs.mkdir(dir, { recursive: true }, function (merr) {
    if (merr) return json(res, 500, { error: 'mkdir failed' });
    fs.writeFile(path.join(dir, name), content, function (werr) {
      if (werr) return json(res, 500, { error: 'write failed' });
      json(res, 200, { ok: true, path: rel + '/' + name });
    });
  });
}

/* ---- the API, one route per row ------------------------------------------ */
var ROUTES = {
  'POST /api/create': function (req, res, body) {
    if (!body.state) return json(res, 400, { error: 'bad request' });
    var room = code4();
    rooms[room] = { state: body.state, seq: 1, updated: Date.now() };
    logRooms('room ' + room + ' hosted by ' + (req.socket.remoteAddress || '?'));
    json(res, 200, { room: room, seq: 1, version: VERSION });
  },
  'POST /api/join': function (req, res, body) {
    var r = rooms[(body.room || '').toUpperCase()];
    if (!r) return json(res, 404, { error: 'room not found' });
    r.updated = Date.now();
    logRooms('room ' + (body.room || '').toUpperCase() + ' joined by ' + (req.socket.remoteAddress || '?'));
    json(res, 200, { state: r.state, seq: r.seq, version: VERSION });
  },
  'POST /api/push': function (req, res, body) {
    var r = rooms[(body.room || '').toUpperCase()];
    if (!r) return json(res, 404, { error: 'room not found' });
    r.updated = Date.now();
    if (body.seq !== r.seq + 1) return json(res, 200, { conflict: true, state: r.state, seq: r.seq });
    r.seq = body.seq;
    r.state = body.state;
    json(res, 200, { ok: true, seq: r.seq });
  },
  'POST /api/savemap': function (req, res, body) {
    // write one map to content/maps/<id>.js and refresh the manifest
    var m = body.map;
    if (!m || !m.name) return json(res, 400, { error: 'bad request' });
    var id = contentSlug(m.id || m.name); m.id = id;
    var dir = path.join(CONTENT_DIR, 'maps');
    fs.mkdir(dir, { recursive: true }, function (merr) {
      if (merr) return json(res, 500, { error: 'mkdir failed' });
      fs.writeFile(path.join(dir, id + '.js'), wrapContent('maps', m), function (werr) {
        if (werr) return json(res, 500, { error: 'write failed' });
        try { regenContentManifest(); } catch (e) {}
        json(res, 200, { ok: true, path: 'content/maps/' + id + '.js' });
      });
    });
  },
  'POST /api/deletemap': function (req, res, body) {
    // delete content/maps/<id>.js (id is slug-sanitized — no path escape) + refresh
    if (!body.id) return json(res, 400, { error: 'bad request' });
    var id = contentSlug(body.id);
    fs.unlink(path.join(CONTENT_DIR, 'maps', id + '.js'), function () {
      try { regenContentManifest(); } catch (e) {}      // ENOENT is fine — already gone
      json(res, 200, { ok: true, deleted: 'content/maps/' + id + '.js' });
    });
  },
  'POST /api/savedeck': function (req, res, body) {
    // the Deck Editor's applied-deck file: deck = card list, or null to fall
    // back to the default deck (content/decks/default.js)
    if (!('deck' in body)) return json(res, 400, { error: 'bad request' });
    var content = 'window.WOA_CUSTOM_DECK = ' + JSON.stringify(body.deck, null, 1) + ';\n';
    fs.writeFile(path.join(ROOT, 'custom-deck.js'), content, function (werr) {
      if (werr) return json(res, 500, { error: 'write failed' });
      json(res, 200, { ok: true });
    });
  },
  'POST /api/savequestionnaire': function (req, res, body) {
    // The Plan phase's debrief-questionnaire editor (#142): rewrite just the
    // QUESTIONS rows of content/questionnaire.js in place, leaving the header,
    // validate() gate, DECK_CONSTRUCTION rows, and exports untouched. Mirrors the
    // questionnaire.js validate() so a bad edit fails loud here, not at debrief time.
    var qs = body.questions;
    if (!Array.isArray(qs) || !qs.length) return json(res, 400, { error: 'need a non-empty questions list' });
    var seen = {};
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (!q || !q.id || typeof q.text !== 'string' || !q.text.trim())
        return json(res, 400, { error: 'row ' + i + ' needs a non-empty id + text' });
      if (seen[q.id]) return json(res, 400, { error: 'duplicate id "' + q.id + '"' });
      seen[q.id] = true;
    }
    var file = path.join(CONTENT_DIR, 'questionnaire.js');
    fs.readFile(file, 'utf8', function (rerr, src) {
      if (rerr) return json(res, 500, { error: 'read failed' });
      // Anchor to the line-start declaration (2-space indent) so a comment that
      // merely mentions "var QUESTIONS = [" can't be matched instead.
      var marker = '\n  var QUESTIONS = [', tail = '\n  ];';
      var s = src.indexOf(marker);
      var e = s < 0 ? -1 : src.indexOf(tail, s + marker.length);
      if (s < 0 || e < 0) return json(res, 500, { error: 'questionnaire.js: QUESTIONS block not found' });
      var rows = qs.map(function (r) { return '    { id: ' + JSON.stringify(r.id) + ', text: ' + JSON.stringify(r.text) + ' }'; }).join(',\n');
      var out = src.slice(0, s) + marker + '\n' + rows + tail + src.slice(e + tail.length);
      fs.writeFile(file, out, function (werr) {
        if (werr) return json(res, 500, { error: 'write failed' });
        json(res, 200, { ok: true, path: 'content/questionnaire.js' });
      });
    });
  },
  'POST /api/savereport': function (req, res, body) {
    // Balance Dashboard report -> logs/reports/balance/<version>/ (Round 4)
    if (!body.filename || typeof body.content !== 'string') return json(res, 400, { error: 'bad request' });
    var ver = String(body.version || '0.0');
    if (!/^[A-Za-z0-9._-]+$/.test(ver)) return json(res, 400, { error: 'bad version' });
    saveUnderRepo(res, ['logs', 'reports', 'balance', ver], String(body.filename), /^[A-Za-z0-9._-]+\.md$/, body.content);
  },
  'POST /api/savedebug': function (req, res, body) {
    // game-state snapshot -> logs/debug/ so Bill can point Claude at an exact
    // situation instead of pasting a screenshot (Round 4)
    if (!body.filename || typeof body.content !== 'string') return json(res, 400, { error: 'bad request' });
    saveUnderRepo(res, ['logs', 'debug'], String(body.filename), /^[A-Za-z0-9._-]+\.json$/, body.content);
  },
  'POST /api/savemapsets': function (req, res, body) {
    // The Map-Sets panel owns the full slot state (like the deck slots): it
    // POSTs every named set + which one is active; we rewrite the whole
    // content/mapsets/ dir to match (files not in the list are deleted).
    var sets = body.mapsets;
    if (!Array.isArray(sets) || sets.length > 8) return json(res, 400, { error: 'bad request' });
    var dir = path.join(CONTENT_DIR, 'mapsets');
    try {
      fs.mkdirSync(dir, { recursive: true });
      var keep = {};
      sets.forEach(function (m) {
        if (!m || !m.name || !Array.isArray(m.maps)) throw new Error('bad mapset');
        var id = contentSlug(m.id || m.name);
        keep[id + '.js'] = true;
        fs.writeFileSync(path.join(dir, id + '.js'),
          wrapContent('mapsets', { id: id, name: String(m.name), active: !!m.active, maps: m.maps.map(String) }));
      });
      fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f) && !keep[f]; })
        .forEach(function (f) { fs.unlinkSync(path.join(dir, f)); });
      regenContentManifest();
      json(res, 200, { ok: true, files: Object.keys(keep) });
    } catch (e) { json(res, 500, { error: e.message }); }
  },
  'POST /api/recordskirmish': function (req, res, body) {
    // V1: one finished skirmish -> a per-skirmish row in logs/woa.db.
    // body = { run:{version,kind,redAi,blueAi,n,tool,notes,deck,mapset,seedBase,label,baseline},
    //   runKey?, state, firstPlayer, seed } — run is forwarded to db.insertRun as-is
    // (WOA-032, SPEC §7: run identity); the caller (the dashboard Run loop) stamps
    // deck/mapset/seedBase, never this proxy — the server stays a dumb pass-through.
    try {
      var r = recordSkirmish(body);
      json(res, r.status, r.out);
    } catch (e) { json(res, 500, { error: e.message }); }
  },
  'GET /api/authored': function (req, res) {
    // #165: the Workbench "Authored this run" feed — the card-Author's renderable
    // record of what it add/edit/removed this run (logs/authored/latest.json, written by
    // dev/author-card.js). A pure read; the Author owns the write. Absent file (no run
    // yet) answers a clean empty feed rather than 404, so the pane shows an idle note.
    var f = path.join(ROOT, '..', 'logs', 'authored', 'latest.json');
    fs.readFile(f, 'utf8', function (err, src) {
      if (err) return json(res, 200, { cards: [] });
      try { json(res, 200, JSON.parse(src)); }
      catch (e) { json(res, 200, { cards: [] }); }
    });
  },
  'GET /api/contentrun': function (req, res) {
    // #167: the content loop's structured per-iteration run record — the machine-
    // readable feed the Workbench renders (author -> grade -> balance -> feels ->
    // commit, in order, incl. failed-iteration findings). A pure read of
    // logs/content-runs/latest.json (dev/run-record.js owns the write). Absent file
    // (no run yet) answers a clean idle marker rather than 404.
    var f = path.join(ROOT, '..', 'logs', 'content-runs', 'latest.json');
    fs.readFile(f, 'utf8', function (err, src) {
      if (err) return json(res, 200, { state: 'idle', iterations: [] });
      try { json(res, 200, JSON.parse(src)); }
      catch (e) { json(res, 200, { state: 'idle', iterations: [] }); }
    });
  },
  'GET /api/runs': function (req, res) {
    // WOA-034: the dashboard header's run-A/B pickers. Guarded like recordSkirmish
    // above — a zipped game/ without dev/ (or a db that's never been opened)
    // answers a clean [] rather than 501/error; the dashboard's fetch().catch
    // falls back the same way under file:// where this is never even called.
    if (!db) return json(res, 200, []);
    try {
      if (!dbHandle) dbHandle = db.open();
      json(res, 200, db.listRuns(dbHandle));
    } catch (e) { json(res, 500, { error: e.message }); }
  },
  'GET /api/skirmishes': function (req, res, body, u) {
    // WOA-035: the Overview screen's fetch — every skirmish row for one run,
    // scalar columns + the trace TEXT blob (parsed client-side by
    // WOA_REPORT.envelopeFromRow). Guarded like /api/runs above — a zipped
    // game/ without dev/, a db that's never been opened, or a missing/bad
    // ?run= all answer a clean [] rather than 501/error.
    if (!db) return json(res, 200, []);
    var runId = parseInt(u.searchParams.get('run'), 10);
    if (!runId) return json(res, 200, []);
    try {
      if (!dbHandle) dbHandle = db.open();
      var rows = db.listSkirmishes(dbHandle, runId);
      // WOA-037: attach each skirmish's per-turn field-score timeline as a
      // sibling `fs: [[fsRed,fsBlue], ...]` (turn-ordered) — env.fs for
      // WOA_REPORT.vpDiffTrack/envelopeFromRow. ONE grouped query over the
      // `timeline` table for this run's skirmish ids (never N+1 per skirmish).
      // dev/db.js owns the write path (insertTimeline, tested by db.test.js)
      // and stays untouched — this read is dashboard-only, so it lives here.
      // Fails open: a timeline-read hiccup still returns the scalar skirmish
      // rows, just without fs (same shape as before this ticket).
      var ids = rows.map(function (r) { return r.id; });
      if (ids.length) {
        try {
          var qs = ids.map(function () { return '?'; }).join(',');
          var stmt = dbHandle.db.prepare(
            'SELECT skirmish_id, turn, fs_red, fs_blue FROM timeline WHERE skirmish_id IN (' + qs + ') ORDER BY skirmish_id, turn');
          var bySkirmish = {};
          stmt.all.apply(stmt, ids).forEach(function (t) {
            (bySkirmish[t.skirmish_id] || (bySkirmish[t.skirmish_id] = [])).push([t.fs_red, t.fs_blue]);
          });
          rows.forEach(function (r) { if (bySkirmish[r.id]) r.fs = bySkirmish[r.id]; });
        } catch (e2) { /* fail open: rows above are still valid without fs */ }
      }
      json(res, 200, rows);
    } catch (e) { json(res, 500, { error: e.message }); }
  },
  'POST /api/runloop': function (req, res, body) {
    // #154: the Workbench Launch — spawn dev/loop.js from the assembled run-config.
    try { startLoop(body || {}); json(res, 200, { ok: true, state: loopStatus.state }); }
    catch (e) { json(res, 500, { error: e.message }); }
  },
  'GET /api/runloop': function (req, res) {
    // The Run phase's status feed (poll pattern, like /api/poll) — the folded status
    // object wbSetRunStatus renders, or a null-ish idle marker before any launch.
    json(res, 200, loopStatus || { state: 'idle' });
  },
  'POST /api/runloopctl': function (req, res, body) {
    // #144 pause/stop, now live: signal the spawned loop process.
    var r = controlLoop((body && body.action) || '');
    json(res, r.status, r.out);
  },
  'POST /api/contentloop': function (req, res, body) {
    // #167: the Workbench Run button — launch the content loop as a WATCHABLE terminal
    // (its own worktree/branch; run-record mirrored to logs/content-runs for the dashboard).
    try { var r = startContentLoop(body || {}); json(res, 200, { ok: true, runId: r.runId, worktree: r.worktree }); }
    catch (e) { json(res, 500, { error: 'content-loop launch failed: ' + e.message }); }
  },
  'GET /api/poll': function (req, res, body, u) {
    var r = rooms[(u.searchParams.get('room') || '').toUpperCase()];
    if (!r) return json(res, 404, { error: 'room not found' });
    r.updated = Date.now();
    var seq = parseInt(u.searchParams.get('seq') || '0', 10);
    if (r.seq > seq) return json(res, 200, { state: r.state, seq: r.seq });
    res.writeHead(204); return res.end();
  }
};

// The request handler, exported so dev/smoke.js can drive the /api routes over a
// throwaway server (the loop bridge is tested through the real route, #154).
function handler(req, res) {
  var u = new URL(req.url, 'http://x');
  var route = ROUTES[req.method + ' ' + u.pathname];
  if (route) {
    if (req.method === 'GET') return route(req, res, null, u);
    return readBody(req, function (err, body) {
      if (err || !body) return json(res, 400, { error: 'bad request' });
      route(req, res, body, u);
    });
  }

  /* ---- static files ---- */
  var file = u.pathname === '/' ? '/index.html' : u.pathname;
  file = path.normalize(file).replace(/^(\.\.[\/\\])+/, '');
  var full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, function (err, data) {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}
module.exports = { handler: handler, ROUTES: ROUTES };

if (require.main !== module) return;  // required for its handler (tests) — don't bind a port

http.createServer(handler).on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.log('');
    console.log('  Port ' + PORT + ' is already taken — the server is probably already running');
    console.log('  in another window (check http://localhost:' + PORT + '). Close that window,');
    console.log('  or run with a different port:  PORT=8421 node server.js   (Windows: set PORT=8421 && node server.js)');
    process.exit(1);
  }
  throw err;
}).listen(PORT, function () {
  console.log('');
  console.log('  WAR OF ATTRITION — server running' + (VERSION ? '   (rules ' + VERSION + ')' : ''));
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
  console.log('  Skirmish persistence: ' + (db ? 'ON -> logs/woa.db' : 'off (dev/db.js not found — fine for a zipped copy)'));
  console.log('');
  console.log('  One player clicks "Host a Room", the other enters the 4-letter code.');
  console.log('  Press Ctrl+C to stop.');
});
