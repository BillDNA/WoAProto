#!/usr/bin/env node
/* dev/db-query.js — tiny READ-ONLY console for the skirmish DB (dev/db.js).

   Usage:
     node dev/db-query.js "SELECT map, COUNT(*) n, AVG(turns) FROM skirmishes GROUP BY map"
     node dev/db-query.js --db /some/other.db "SELECT ..."
     node dev/db-query.js --anchors  # the cited balance anchors, read from the views
     node dev/db-query.js            # no SQL: prints the schema + row counts

   Prints an aligned text table (column-name header + rows). The connection
   is opened read-only, so any statement that writes is rejected by SQLite.

   --anchors is the official balance-anchor read (docs/balance/balance-baselines.md):
   it reads v_global_balance for the live rules version's largest slice (the
   accumulating version-sliced pool) so the cited figures come from the DB, never a
   hand-typed markdown snapshot — more games converge them (LLN). */
'use strict';

var fs = require('fs');
var path = require('path');
var sqlite = require('node:sqlite');

var DEFAULT_DB = path.join(__dirname, '..', 'logs', 'woa.db');

function fmt(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 1000) / 1000);
  return String(v);
}

// Aligned text table: numbers right-aligned, everything else left-aligned.
function printTable(cols, rows) {
  var cells = rows.map(function (r) { return cols.map(function (c) { return fmt(r[c]); }); });
  var numeric = cols.map(function (c) {
    return rows.length > 0 && rows.every(function (r) { return typeof r[c] === 'number' || r[c] === null; });
  });
  var widths = cols.map(function (c, i) {
    return cells.reduce(function (w, row) { return Math.max(w, row[i].length); }, c.length);
  });
  function pad(s, w, right) { var sp = new Array(w - s.length + 1).join(' '); return right ? sp + s : s + sp; }
  console.log(cols.map(function (c, i) { return pad(c, widths[i], numeric[i]); }).join('  '));
  console.log(widths.map(function (w) { return new Array(w + 1).join('-'); }).join('  '));
  cells.forEach(function (row) {
    console.log(row.map(function (s, i) { return pad(s, widths[i], numeric[i]); }).join('  '));
  });
  console.log('(' + rows.length + ' row' + (rows.length === 1 ? '' : 's') + ')');
}

// The cited balance anchors, read from v_global_balance. Defaults to the LIVE
// rules version's largest-n slice (so a just-bumped version isn't graded against
// an older version that happens to hold more games); falls back to the overall
// largest-n slice only when the live version has none. Percentages render ×100 to
// match docs/balance/balance-baselines.md. One implementation of each figure — the view.
function printAnchors(db, file) {
  var live = null;
  try { live = require(path.join(__dirname, '..', 'game', 'engine.js')).VERSION; } catch (e) {}
  var slice, fellBack = false;
  try {
    if (live) slice = db.prepare('SELECT * FROM v_global_balance WHERE version = ? ORDER BY n DESC LIMIT 1').get(live);
    if (!slice) { slice = db.prepare('SELECT * FROM v_global_balance ORDER BY n DESC, version DESC LIMIT 1').get(); fellBack = !!(slice && live); }
  } catch (e) { console.error('No views in ' + file + ' (is this a star-schema DB?): ' + e.message); process.exit(1); }
  if (!slice) { console.error('No skirmishes recorded yet — run `node dev/balance-report.js` first.'); process.exit(1); }
  function p(x) { return x == null ? '—' : Math.round(x * 100) + '%'; }
  function d(x) { return x == null ? '—' : (Math.round(x * 10) / 10).toString(); }
  var attr = db.prepare("SELECT COUNT(*) c FROM skirmishes WHERE version=? AND config_digest=? AND win_type='attrition'").get(slice.version, slice.config_digest).c;
  console.log('Balance anchors — slice ' + slice.version + '/' + slice.config_digest + ', n=' + slice.n + ' (from v_global_balance)' +
    (fellBack ? '\n(no games recorded at the live version ' + live + ' yet — showing the largest slice)' : '') + '\n');
  var rows = [
    ['First mover win%', p(slice.first_win_pct)],
    ['Red win%', p(slice.red_win_pct)],
    ['HQ endings', p(slice.hq_pct)],
    ['Zero-kill games', p(slice.zero_kill_pct)],
    ['Tie-goes-to-2nd', p(slice.tie_pct) + '  (of ' + attr + ' attrition endings)'],
    ['Attack share', p(slice.attack_share)],
    ['Swap share', p(slice.swap_share)],
    ['First-blood → win', p(slice.first_blood_win_pct)],
    ['Control', p(slice.control_pct)],
    ['Drag', d(slice.drag) + '  (attrition endings)'],
    ['Swings', d(slice.swings)],
    ['Avg turns', d(slice.avg_turns)]
  ];
  var w = rows.reduce(function (m, r) { return Math.max(m, r[0].length); }, 0);
  rows.forEach(function (r) { console.log(r[0] + new Array(w - r[0].length + 2).join(' ') + r[1]); });
}

function run() {
  var argv = process.argv.slice(2);
  var file = DEFAULT_DB;
  var di = argv.indexOf('--db');
  if (di >= 0) { file = argv[di + 1]; argv.splice(di, 2); }
  if (!file) { console.error('--db needs a path'); process.exit(1); }
  var sql = argv.join(' ').trim();

  if (!fs.existsSync(file)) {
    console.error('No DB at ' + file + ' — nothing has been recorded yet (dev/db.js creates it).');
    process.exit(1);
  }
  var db = new sqlite.DatabaseSync(file, { readOnly: true });

  if (argv.indexOf('--anchors') >= 0) { printAnchors(db, file); db.close(); return; }

  if (!sql) { // no args: schema + row counts per table
    var tables = db.prepare(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    console.log('DB: ' + file + '\n');
    tables.forEach(function (t) {
      var n = db.prepare('SELECT COUNT(*) c FROM "' + t.name + '"').get().c;
      console.log(t.sql.trim() + ';');
      console.log('-- ' + n + ' row' + (n === 1 ? '' : 's') + '\n');
    });
    var idx = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY name").all();
    idx.forEach(function (i) { console.log(i.sql.trim() + ';'); });
    db.close();
    return;
  }

  try {
    var stmt = db.prepare(sql);
    var rows = stmt.all();
    var cols = rows.length ? Object.keys(rows[0])
      : (stmt.columns ? stmt.columns().map(function (c) { return c.name; }) : []);
    if (cols.length) printTable(cols, rows);
    else console.log('(no result set)');
  } catch (e) {
    console.error('SQL error: ' + e.message);
    db.close();
    process.exit(1);
  }
  db.close();
}
run();
