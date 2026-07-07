#!/usr/bin/env node
/* dev/db-query.js — tiny READ-ONLY console for the battle DB (dev/db.js).

   Usage:
     node dev/db-query.js "SELECT map, COUNT(*) n, AVG(turns) FROM battles GROUP BY map"
     node dev/db-query.js --db /some/other.db "SELECT ..."
     node dev/db-query.js            # no SQL: prints the schema + row counts

   Prints an aligned text table (column-name header + rows). The connection
   is opened read-only, so any statement that writes is rejected by SQLite. */
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
