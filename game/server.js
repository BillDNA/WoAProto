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

// --- #168 launch bridge: the ONE Workbench Launch path. POST /api/runloop spawns the
// #167 CONTENT loop (dev/content-loop.js: author -> grade -> balance -> feels -> commit) —
// NOT the condemned deck-drafter (dev/loop.js / runDeckLoop). The run is isolated in its
// own git worktree on a content-run-<ts> branch (main untouched); the child is controllable
// (SIGSTOP/SIGCONT/SIGTERM via /api/runloopctl) and watchable (its stdout tees to a log a
// visible Terminal tails). ONE run at a time — a new Launch replaces the old process.
//
// TRANSPORT (spec: pty/tee/file-tail, never a captured-stdout fold): status is derived by
// FILE-TAIL of the child's run-record (dev/run-record.js -> recDir/latest.json), read on
// each GET /api/runloop. The child's stdout is TEE'd to a log file for the terminal window —
// it is NOT folded into status. A paused child cannot write its own 'paused' state (SIGSTOP
// froze it), so /api/runloopctl overlays the control state onto the tailed record.
var execFile = require('child_process');
var REPO = path.join(ROOT, '..');          // server.js is in game/; the repo root is one up
function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }  // POSIX single-quote one arg
var loop = null;   // { child, runId, branch, worktree, recDir, log, controlState, startedAt }

function loopRunId() {
  var ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  return 'content-run-' + ts;
}

// Pure arg-assembler for the content-loop session (the AC1/AC2/AC7 falsifiers read this).
// Default entry is dev/content-loop.js (RELATIVE — resolved against the spawn cwd, so a
// worktree run runs the worktree's own copy and commits there); cfg.entry / cfg.recDir are
// test levers (like cfg.db / cfg.maps) that point the spawn at the faithful stand-in.
function buildLoopArgs(cfg) {
  cfg = cfg || {};
  var runId = cfg.runId || loopRunId();
  var entry = cfg.entry || path.join('dev', 'content-loop.js');
  var recDir = cfg.recDir || path.join(REPO, 'logs', 'content-runs');
  // --non-interactive: unattended auto-approve posture (no prompt ever). --stop: the
  // stop-datetime wall forwarded from the Plan config. Both are AC7's contract.
  var args = [entry, '--run-id', runId, '--rec-dir', recDir, '--non-interactive',
    '--stop', String(cfg.stop || '+45m')];
  if (cfg.nudge) args.push('--nudge', String(cfg.nudge));
  if (cfg.temperature) args.push('--temperature', String(cfg.temperature));
  // Tolerance: the Plan sends the EDITED Tolerance OBJECT ({name:'Card', tolerances}) so its
  // per-axis escalations flow into the run — forward it as inline JSON (content-loop resolves an
  // object OR a profile-key string). Passing just the display name ('Card') would not resolve
  // (the profile KEYS are lowercase: card/map/ai).
  var tol = (cfg.profile && typeof cfg.profile === 'object') ? cfg.profile
    : (cfg.tolerance && typeof cfg.tolerance === 'object') ? cfg.tolerance
      : (cfg.profile || cfg.tolerance);
  if (tol) args.push('--tolerance', typeof tol === 'object' ? JSON.stringify(tol) : String(tol));
  if (cfg.mapset) args.push('--mapset', String(cfg.mapset));
  if (cfg.panel && cfg.panel.length) args.push('--panel', cfg.panel.join(','));
  if (cfg.n) args.push('--n', String(cfg.n | 0));
  if (cfg.maps) args.push('--maps', String(cfg.maps | 0));
  if (cfg.iters) args.push('--iters', String(cfg.iters | 0));
  if (cfg.iterMs) args.push('--iter-ms', String(cfg.iterMs | 0));   // stand-in tick lever (tests)
  if (cfg.feelsMatch) args.push('--feels-match', String(cfg.feelsMatch | 0));
  if (cfg.feelsTurns) args.push('--feels-turns', String(cfg.feelsTurns | 0));
  if (cfg.db) args.push('--db', String(cfg.db));     // isolate a test run from the shared woa.db
  if (cfg.mock) args.push('--mock');                 // offline launch (mechanism/CI test)
  // The Author feed the morning review reads (cfg.feedFile isolates a test/proof run from it).
  args.push('--feed-file', cfg.feedFile || path.join(REPO, 'logs', 'authored', 'latest.json'));
  return args;
}

function startLoop(cfg) {
  cfg = cfg || {};
  if (loop && loop.child) { try { loop.child.kill('SIGKILL'); } catch (e) {} loop.child = null; }
  // Remove the PRIOR run's stale worktree dir on relaunch — its branch + commits stay for
  // Bill's morning review (`git worktree remove` keeps the branch); otherwise the dirs pile up
  // and a stale one can later make `git worktree add` fail (a 500 on the next Launch).
  if (loop && loop.worktree) { try { execFile.execFileSync('git', ['worktree', 'remove', '--force', loop.worktree], { cwd: REPO, stdio: 'pipe' }); } catch (e) {} }
  var runId = loopRunId();
  var recDir = cfg.recDir || path.join(REPO, 'logs', 'content-runs');
  // Isolate a REAL run in its own worktree/branch off HEAD (main untouched). A test run
  // (cfg.entry = the stand-in) needs no git and runs in-place.
  var wt = null, cwd = REPO;
  if (!cfg.entry && !cfg.noWorktree) {
    wt = path.join(REPO, '.claude', 'worktrees', runId);
    execFile.execFileSync('git', ['worktree', 'add', '-b', runId, wt, 'HEAD'], { cwd: REPO, stdio: 'pipe' });
    cwd = wt;
  }
  var args = buildLoopArgs(Object.assign({}, cfg, { runId: runId, recDir: recDir }));
  var tolName = cfg.profile && typeof cfg.profile === 'object' ? cfg.profile.name : (cfg.profile || cfg.tolerance);
  // Seed latest.json SYNCHRONOUSLY before the child boots + RR.open() rewrites it, so the
  // Workbench's first poll doesn't read a prior run's stale done-state and stop polling.
  try {
    fs.mkdirSync(recDir, { recursive: true });
    fs.writeFileSync(path.join(recDir, 'latest.json'), JSON.stringify({ runId: runId, state: 'starting', startedAt: new Date().toISOString(), config: { nudge: cfg.nudge || '', temperature: cfg.temperature || '', tolerance: tolName || '', stopAt: '', questionnaire: cfg.questionnaire || '' }, stage: null, iterations: [] }, null, 2) + '\n');
  } catch (e) { /* the child writes the real record shortly regardless */ }
  // TEE transport (no server-side stdout fold): the child's stdout+stderr are written by the
  // OS straight to one log-file fd — the attach-able terminal a `tail -f` window (below) reads.
  // Status is NEVER read from this stream; it is file-tailed off the run-record (GET /api/runloop).
  // detached + unref so an unattended run survives a server restart to its stop-datetime (AC7),
  // while the pid stays signal-controllable for as long as the server lives.
  var logFile = path.join(os.tmpdir(), runId + '.log');
  var logFd = null; try { logFd = fs.openSync(logFile, 'a'); } catch (e) { /* a missing log is fine */ }
  var stdio = ['ignore', logFd != null ? logFd : 'ignore', logFd != null ? logFd : 'ignore'];
  var child = spawn(process.execPath, args, { cwd: cwd, detached: true, stdio: stdio });
  child.on('close', function () { if (loop && loop.child === child) loop.child = null; });
  child.unref();
  loop = { child: child, runId: runId, branch: wt ? runId : null, worktree: wt, recDir: recDir, log: logFile, controlState: null, startedAt: new Date().toISOString() };
  // Watchable: open a visible Terminal that tails the tee log so Bill alt-tabs and watches
  // it play out (spec §3). The child stays controllable via signals; this window is a viewer.
  // Headless off-mac, in tests/CI, or for a stand-in run (cfg.headless / cfg.entry / WOA_NO_TERMINAL).
  var headless = cfg.headless || cfg.entry || process.env.WOA_NO_TERMINAL || process.platform !== 'darwin';
  if (!headless) {
    try {
      var script = '#!/bin/bash\n' +
        'echo "════════ War of Attrition · content loop — watch it happen ════════"\n' +
        'echo "run ' + runId + '   ·   own worktree/branch, main untouched   ·   pause/stop from the dashboard ──"\n' +
        'echo ""\n' + 'tail -f ' + shq(logFile) + '\n';
      var scriptPath = path.join(os.tmpdir(), runId + '.command');
      fs.writeFileSync(scriptPath, script, { mode: 0o755 });
      spawn('open', ['-a', 'Terminal', scriptPath], { detached: true, stdio: 'ignore' }).unref();
    } catch (e) { /* no window is fine — the dashboard mirror is the primary surface */ }
  }
  return loop;
}

function controlLoop(action) {
  if (!loop || !loop.child) return { status: 409, out: { error: 'no loop running' } };
  // POSIX SIGSTOP/SIGCONT pause/resume, SIGTERM stop — dev tooling on darwin/linux; no
  // Windows pause (would need a stop-flag file the loop polls). controlState is overlaid on
  // the file-tailed record by GET /api/runloop: a SIGSTOP'd child can't write 'paused' itself,
  // and resume clears the overlay so the live file state ('running') wins again.
  try {
    if (action === 'pause') { loop.child.kill('SIGSTOP'); loop.controlState = 'paused'; }
    else if (action === 'resume') { loop.child.kill('SIGCONT'); loop.controlState = null; }
    else if (action === 'stop') { loop.child.kill('SIGTERM'); loop.controlState = 'stopped'; }
    else return { status: 400, out: { error: 'unknown action "' + action + '"' } };
  } catch (e) { return { status: 500, out: { error: e.message } }; }
  return { status: 200, out: { ok: true, state: loop.controlState || 'running' } };
}

// GET /api/runloop's status surface: the file-tailed run-record with the control state
// overlaid. Idle marker before any launch / if the record isn't written yet.
function loopStatus(cb) {
  if (!loop) return cb({ state: 'idle', iterations: [] });
  fs.readFile(path.join(loop.recDir, 'latest.json'), 'utf8', function (err, src) {
    var rec = null;
    if (!err) { try { rec = JSON.parse(src); } catch (e) { rec = null; } }
    if (!rec) rec = { state: 'idle', iterations: [] };
    if (loop.controlState) rec.state = loop.controlState;   // paused/stopped overlay
    cb(rec);
  });
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
    // #168: the Workbench Launch — spawn the #167 CONTENT loop (author->grade->balance->
    // feels->commit) in its own worktree/branch, controllable + watchable. NOT dev/loop.js.
    try { var r = startLoop(body || {}); json(res, 200, { ok: true, runId: r.runId, worktree: r.worktree }); }
    catch (e) { json(res, 500, { error: 'content-loop launch failed: ' + e.message }); }
  },
  'GET /api/runloop': function (req, res) {
    // The Run phase's status feed (poll pattern, like /api/poll): the file-tailed run
    // record (dev/run-record.js) with the control state overlaid, or an idle marker.
    loopStatus(function (rec) { json(res, 200, rec); });
  },
  'POST /api/runloopctl': function (req, res, body) {
    // pause/resume/stop, live: signal the spawned content-loop child.
    var r = controlLoop((body && body.action) || '');
    json(res, r.status, r.out);
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
module.exports = { handler: handler, ROUTES: ROUTES, startLoop: startLoop, controlLoop: controlLoop, buildLoopArgs: buildLoopArgs };

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
