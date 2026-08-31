#!/usr/bin/env node
/* dev/run-record.js — the content loop's STRUCTURED per-iteration run record (#167).
 *
 * This is the ONE machine-readable contract the dashboard (#170) and "Review with
 * Claude" (#171) consume. It is deliberately NOT a stdout/log stream and NOT
 * reconstructed ad hoc from logs/woa.db — it is a single JSON document, at a known
 * path, that carries the whole night's story: the run-config knobs, the currently
 * running stage (so the feed can show "author running now" BEFORE a commit), and per
 * iteration the authored card ids, their rubric findings, their per-card balance
 * columns, the feels/non-selection findings, and the iteration's commit sha.
 *
 * Paths (opts.dir default logs/content-runs):
 *   <dir>/<runId>/run.json   the durable per-run record
 *   <dir>/latest.json        a mirror of the active run — what GET /api/contentrun and
 *                            the Workbench feed read (so the render never needs the runId)
 * Every mutation flushes both, so a reader (the dashboard poller) always sees the live
 * in-flight stage. The committed markdown reports stay the human-readable artifact; this
 * file is the machine surface that points at them.
 *
 * One implementation per fact: the authored cards + findings originate in the Author's
 * feed (logs/authored/latest.json, via author-card.js / grade-card.js). The loop reads a
 * slice of that feed and hands the records here — this file COMPOSES them per iteration,
 * it does not re-derive them.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_DIR = path.join(ROOT, 'logs', 'content-runs');

function dirOf(dir) { return dir || DEFAULT_DIR; }
function runFile(dir, runId) { return path.join(dirOf(dir), runId, 'run.json'); }
function latestPath(dir) { return path.join(dirOf(dir), 'latest.json'); }

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
}
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

/* Open (create) a run record. opts = { runId, kind, config, dir? }.
   config = { nudge, temperature, tolerance, stopAt, questionnaire } — the run-config
   block #164/#169/#171 read the knobs back from. Returns a handle { rec, file, dir }. */
function open(opts) {
  opts = opts || {};
  if (!opts.runId) throw new Error('run-record.open: needs a runId');
  const now = new Date().toISOString();
  const rec = {
    runId: opts.runId,
    kind: opts.kind || 'card',
    startedAt: now,
    updatedAt: now,
    state: 'running',
    config: normalizeConfig(opts.config),
    stage: null,          // the live in-flight stage { iter, name, at }
    iterations: []
  };
  const h = { rec, file: runFile(opts.dir, opts.runId), dir: dirOf(opts.dir) };
  flush(h);
  return h;
}

function normalizeConfig(c) {
  c = c || {};
  return {
    nudge: c.nudge != null ? c.nudge : '',
    temperature: c.temperature != null ? c.temperature : '',
    // Tolerance may be a profile key ('card') or an inline object — carry it verbatim.
    tolerance: c.tolerance != null ? c.tolerance : '',
    stopAt: c.stopAt != null ? c.stopAt : '',
    questionnaire: c.questionnaire != null ? c.questionnaire : ''
  };
}

// Flush both the durable per-run file and the latest.json pointer the feed reads.
function flush(h) {
  h.rec.updatedAt = new Date().toISOString();
  writeJson(h.file, h.rec);
  writeJson(latestPath(h.dir), h.rec);
  return h;
}

// The currently-running stage (author|grade|balance|feels|commit|…) for the in-flight
// iteration — set BEFORE the work, so the feed shows it live, before any commit.
function setStage(h, stage) {
  h.rec.stage = { iter: stage.iter, name: stage.name, at: new Date().toISOString() };
  return flush(h);
}

function iterEntry(h, iter) {
  return h.rec.iterations.filter(function (it) { return it.iter === iter; })[0];
}

function startIteration(h, iter) {
  if (iterEntry(h, iter)) return flush(h);           // idempotent
  h.rec.iterations.push({
    iter: iter, startedAt: new Date().toISOString(), finishedAt: null,
    stages: [], authored: [], feels: null,
    balanceReportPath: null, feelsReportPath: null, failure: null, commit: null
  });
  return flush(h);
}

// Append a stage name in the order it ran (author -> grade -> balance -> feels -> commit).
function markStage(h, iter, name) {
  const it = iterEntry(h, iter) || (startIteration(h, iter), iterEntry(h, iter));
  if (it.stages.indexOf(name) < 0) it.stages.push(name);
  return flush(h);
}

/* Attach the batch the Author wrote this iteration. `cards` are the feed slice records
   ({ action, id, name, points, note }) — the loop reads them from the Author feed, so
   nothing is re-derived here. */
function recordAuthored(h, iter, cards) {
  const it = iterEntry(h, iter) || (startIteration(h, iter), iterEntry(h, iter));
  (cards || []).forEach(function (c) {
    let row = it.authored.filter(function (a) { return a.id === c.id; })[0];
    // `legal`/`problems` carry the author-time legality guard onto the row itself — a card
    // the Author's hands refused (bad id/steps/over-budget) is a first-class finding here
    // (#167 AC "authored cards that fail deckProblems are caught and recorded as a finding").
    if (!row) { row = { id: c.id, name: c.name || c.id, action: c.action || 'add', points: c.points != null ? c.points : null, note: c.note || '', legal: c.legal !== false, problems: c.problems || [], card: c.card || null, findings: null, balance: null }; it.authored.push(row); }
    else { row.action = c.action || row.action; row.name = c.name || row.name; if (c.points != null) row.points = c.points; if (c.note) row.note = c.note; if (c.card) row.card = c.card; if (c.legal === false) { row.legal = false; row.problems = c.problems || row.problems; } }
  });
  return flush(h);
}

function authoredRow(h, iter, cardId) {
  const it = iterEntry(h, iter);
  if (!it) throw new Error('run-record: iteration ' + iter + ' not started');
  let row = it.authored.filter(function (a) { return a.id === cardId; })[0];
  if (!row) { row = { id: cardId, name: cardId, action: 'add', points: null, note: '', findings: null, balance: null }; it.authored.push(row); }
  return row;
}

// Attach the fresh grader's rubric findings to a card (position + velocity, an aim not a gate).
function recordGrade(h, iter, cardId, findings) {
  authoredRow(h, iter, cardId).findings = findings || null;
  return flush(h);
}

/* Attach a card's balance pin result: { legal, problems, swept, columns, flags }.
   `columns` = the card's own measured columns (plays/win/simple/1stSight/points);
   `flags` = tolerance flags (a band that flags, never a reject). An illegal card carries
   legal:false + problems and no columns — the record of "caught, never swept". */
function recordBalance(h, iter, cardId, balance) {
  authoredRow(h, iter, cardId).balance = balance || null;
  return flush(h);
}

/* The feels pass result: { reportPath, redPicks, bluePicks, nothingWanted, findings }.
   nothingWanted = catalog ids neither free draft picked — kept as a finding, never dropped. */
function recordFeels(h, iter, feels) {
  const it = iterEntry(h, iter) || (startIteration(h, iter), iterEntry(h, iter));
  it.feels = feels || null;
  if (feels && feels.reportPath) it.feelsReportPath = feels.reportPath;
  return flush(h);
}

// A genuine unrecoverable break in one iteration — recorded as a finding so the loop can
// advance (self-recovery is driver discipline, not a watchdog).
function recordFailure(h, iter, failure) {
  const it = iterEntry(h, iter) || (startIteration(h, iter), iterEntry(h, iter));
  it.failure = { stage: failure.stage || 'unknown', message: String(failure.message || failure), at: new Date().toISOString() };
  return flush(h);
}

// Close out the iteration: stamp the commit sha (the batch IS the commit) + report paths.
function finishIteration(h, iter, done) {
  done = done || {};
  const it = iterEntry(h, iter) || (startIteration(h, iter), iterEntry(h, iter));
  it.finishedAt = new Date().toISOString();
  it.commit = done.commit != null ? done.commit : it.commit;
  if (done.balanceReportPath) it.balanceReportPath = done.balanceReportPath;
  if (done.feelsReportPath) it.feelsReportPath = done.feelsReportPath;
  return flush(h);
}

function finish(h, state) {
  h.rec.state = state || 'done';
  h.rec.stage = null;
  return flush(h);
}

module.exports = {
  open, setStage, startIteration, markStage,
  recordAuthored, recordGrade, recordBalance, recordFeels, recordFailure,
  finishIteration, finish, read, latestPath, runFile, DEFAULT_DIR
};
