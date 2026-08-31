#!/usr/bin/env node
/* dev/content-loop.js — the CONTENT loop, end to end, headless (card kind) (#167,
 * spec §2/§8 B1). This is the machine the dashboard later mirrors: one launch drives
 * INTAKE -> AUTHOR -> RUBRIC (fresh grade + one fix pass) -> PLAYTEST (BALANCE + FEELS)
 * -> reports -> INTAKE, in auto mode, committing one batch per iteration, until the
 * stop-datetime wall.
 *
 * This is NOT the condemned pool-drafter (dev/loop.js). It authors and edits the
 * CATALOG (game/content/cards/*.js) via the Author's hands; it never drafts 16 ids out
 * of the existing pool, and there is NO auto-reject gate anywhere — Temperature and
 * Tolerance SHAPE and FLAG, the Author shapes (add/edit/cut), curation is Bill's
 * morning review + git (spec §4).
 *
 * The LLM "brains" are injected transports (author / grade / feels), exactly as
 * dev/loop.js injects its draft `ask` — so the orchestration is unit-tested with fakes,
 * and the CLI wires the real transports (create-card's brain, a fresh grade-card
 * subagent, claude-plays --draft). The DETERMINISTIC machinery is all real and here:
 * the harness-deck pin + round-robin balance sweep (real Engine, real woa.db rows), the
 * Tolerance flag (never a reject), the legality guard, the feels non-selection finding,
 * the run-record, the stop-datetime wall, and retry-once-then-record self-recovery.
 *
 * Seam: over the exported Engine surface + report-model + the Author/Grader hands
 * (author-card.js / grade-card.js) + harness-deck.js + run-record.js + db.js. No game/
 * engine change.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
const R = require(path.join(__dirname, '..', 'game', 'report-model.js'));
const TOL = require(path.join(__dirname, '..', 'game', 'content', 'tolerances.js'));
const A = require(path.join(__dirname, 'author-card.js'));      // the Author's hands
const G = require(path.join(__dirname, 'grade-card.js'));       // the fresh Grader's hands
const harness = require(path.join(__dirname, 'harness-deck.js'));
const RR = require(path.join(__dirname, 'run-record.js'));
const deckbuild = require(path.join(__dirname, 'deckbuild.js'));
const db = require(path.join(__dirname, 'db.js'));

const STAGES = ['author', 'grade', 'balance', 'feels', 'commit'];

/* ---------- pure helpers (unit-tested directly) ---------- */

/* The feels signal: catalog card ids that NEITHER free draft picked — "nothing wanted
   this". A first-class FINDING, kept and flagged, never dropped (spec §4.5 / §11.5). */
function nonSelection(catalogIds, redPicks, bluePicks) {
  const wanted = {};
  (redPicks || []).concat(bluePicks || []).forEach(function (id) { if (id) wanted[id] = 1; });
  return (catalogIds || []).filter(function (id) { return !wanted[id]; });
}

// Resolve a Tolerance (profile key or inline object) — the balance BAND that flags, never
// rejects. Throws only on a malformed/balance-loosening PROFILE (a load-time schema guard,
// not a per-run reject).
function resolveTolerance(tol) {
  const profile = (tol && typeof tol === 'object') ? tol : TOL.profiles[tol || 'card'];
  if (!profile) throw new Error('content-loop: unknown tolerance "' + tol + '" — known: ' + Object.keys(TOL.profiles).join(', '));
  TOL.validate(profile, profile.name);
  return profile;
}

// Format a foldPanel balance flag member as a loud one-line flag (never a reject).
function flagLabel(m) {
  const band = (m.lo == null ? '' : m.lo) + '–' + (m.hi == null ? '' : m.hi);
  return m.label + ' ' + m.val + '% on ' + m.name + ' (band ' + band + ')';
}

/* ---------- the BALANCE pin sweep (real Engine, real woa.db rows) ---------- */

/* Pin one authored card into a legal harness deck and sweep it ROUND-ROBIN across the
   opponent panel × the map roster (spec §10.4 — measured on its own side naturally,
   not against one fixed control). Writes a real per-skirmish row per game to woa.db.
   Returns { legal, problems, swept, columns, flags } — Tolerance FLAGS, never a reject;
   an illegal card comes back legal:false with problems and is never handed to the engine
   (spec: "Only legal cards reach the balance sweep"). */
function pinSweep(card, opts) {
  opts = opts || {};
  const panel = opts.panel || ['easy', 'normal', 'hard'];
  const maps = opts.maps || E.mapPool();
  const n = opts.n || 6;
  const seated = harness.seatCard(card, { catalog: opts.catalog });
  if (!seated.deck || seated.problems.length) {
    return { legal: false, problems: seated.problems, swept: 0, columns: null, flags: [], harness: null };
  }
  const rows = panel.map(function (name) {
    let agg = {}, unfinished = 0;
    maps.forEach(function (map, mi) {
      const seedBase = ((mi + 1) * 7919 + (opts.seedSalt || 0)) >>> 0;
      const r = E.balanceMap(map, n, {
        diffRed: name, diffBlue: name, seedBase: seedBase,
        decks: { red: seated.deck, blue: seated.deck },
        onGame: opts.onSkirmish && function (g1, nn, st) { opts.onSkirmish(g1, seedBase, st); }
      });
      R.addAgg(agg, r); unfinished += (r.unfinished || 0);
    });
    return { name: name, agg: agg, done: n * maps.length - unfinished };
  });
  // The card's OWN columns — Simple% / 1stSight% / win%, the create-card recipe's read.
  const total = {}; rows.forEach(function (r) { R.addAgg(total, r.agg); });
  const cr = R.cardRows(total.cards || {}, [card], E.cardPoints)[0];
  const columns = cr ? {
    plays: cr.plays, win: cr.win, simple: cr.simple, sight: cr.sight,
    seen: cr.seenNum, points: cr.points, resid: cr.resid, mispriced: cr.mispriced
  } : null;
  // Tolerance flag: worst-case per metric across the panel; balance (Red%/1st%) always a
  // loud flag, never a reject. overfit rides along as the exploratory-band spread signal.
  const fold = R.foldPanel(rows, resolveTolerance(opts.tolerance));
  const flags = fold.flag.members.map(flagLabel)
    .concat(fold.overfit.map(function (o) { return 'overfit ' + o.label + ' ' + o.val + '% on ' + o.name; }));
  const swept = rows.reduce(function (s, r) { return s + r.done; }, 0);
  return { legal: true, problems: [], swept: swept, columns: columns, flags: flags, inBand: fold.flag.inBand };
}

/* ---------- the committed per-iteration BALANCE markdown ---------- */
function balanceMarkdown(meta, cards) {
  const lines = [];
  lines.push('# Balance pin — content run ' + meta.runId + ', iteration ' + meta.iter);
  lines.push('');
  lines.push('_rules ' + E.VERSION + ' · nudge: ' + (meta.nudge || '—') + ' · temperature: ' + (meta.temperature || '—') +
    ' · tolerance: ' + (meta.toleranceName || '—') + ' · panel ' + (meta.panel || []).join('/') + ' · ' + meta.swept + ' skirmishes_');
  lines.push('');
  lines.push('Each card is PINNED into a legal harness deck and swept round-robin across the panel. ' +
    'Tolerance flags out-of-band drift — it never rejects (curation is Bill + git).');
  lines.push('');
  lines.push('| card | pts | plays | win% | Simple% | 1stSight% | flags |');
  lines.push('|---|---|---|---|---|---|---|');
  cards.forEach(function (c) {
    const b = c.balance || {};
    // Illegal (author-time) OR a card whose harness pin came back with problems: a loud
    // ⛔ row with the fault, never a swept number (it was never fed to the engine).
    if (c.legal === false || (b && b.legal === false)) {
      const probs = (c.legal === false ? c.problems : (b.problems || [])) || [];
      lines.push('| `' + c.id + '` | ' + (c.points == null ? '?' : c.points) + ' | — | — | — | — | ⛔ illegal: ' + probs.join('; ') + ' |'); return;
    }
    const col = b.columns || {};
    lines.push('| `' + c.id + '` | ' + (col.points == null ? '?' : col.points) + ' | ' + (col.plays || 0) + ' | ' +
      (col.win == null ? '—' : col.win) + ' | ' + (col.simple == null ? '—' : col.simple) + ' | ' +
      (col.sight == null ? '—' : col.sight) + ' | ' + ((b.flags && b.flags.length) ? b.flags.join('; ') : '·') + ' |');
  });
  lines.push('');
  return lines.join('\n') + '\n';
}

/* ---------- the committed per-iteration RUBRIC-FINDINGS markdown ---------- */
// The fresh grader's findings as a committed morning artifact (spec #162 §1) — position +
// velocity per axis, an AIM not a gate, alongside the balance + feels reports. The run record
// (gitignored) is the machine surface; this markdown is the human-readable committed one.
function rubricMarkdown(meta, cards) {
  const lines = [];
  lines.push('# Rubric findings — content run ' + meta.runId + ', iteration ' + meta.iter);
  lines.push('');
  lines.push('_rules ' + E.VERSION + ' · nudge: ' + (meta.nudge || '—') + ' · temperature: ' + (meta.temperature || '—') +
    ' · fresh grader, an aim not a gate (no pass/fail, the card proceeds regardless)_');
  lines.push('');
  (cards || []).forEach(function (c) {
    lines.push('## `' + c.id + '` — ' + (c.name || c.id) + ' _(' + (c.action || 'add') + ')_');
    if (c.legal === false) { lines.push(''); lines.push('⛔ **illegal — never graded/swept:** ' + (c.problems || []).join('; ')); lines.push(''); return; }
    const g = c.findings;
    if (!g || !g.axes || !g.axes.length) { lines.push(''); lines.push('_(no findings recorded)_'); lines.push(''); return; }
    g.axes.forEach(function (a) {
      lines.push('');
      lines.push('- **' + (a.title || a.axis) + '**' + (a.setFit ? ' _(set-fit)_' : ''));
      lines.push('  - Position: ' + a.position);
      lines.push('  - Velocity: ' + a.velocity);
    });
    if (g.fixPass) { lines.push(''); lines.push('- Author\'s one fix pass: ' + (g.fixPass.note || (g.fixPass.applied ? 'applied' : 'none')) + ' _(card proceeds regardless)_'); }
    lines.push('');
  });
  return lines.join('\n') + '\n';
}

/* ---------- the loop ---------- */

/* runContentLoop(opts) — drive the content loop until the stop-datetime wall.
   Injectable brains (real in the CLI, fakes in tests):
     author(ctx)            -> [ { action:'add'|'edit'|'remove', card?, id?, note? } ]  a BATCH
     grade(cardIds, ctx)    -> { <cardId>: findingsObject }                             the fresh grader
     fixPass(id, f, ctx)    -> { card?, id?, note? } | null   (optional)                the Author's ONE fix pass
     feels(ctx)             -> { redPicks:[id], bluePicks:[id], reportPath }            claude-plays first-to-3
     commit(iter, msg, ctx) -> sha | null                                              git commit hook
   Deterministic machinery (real): pinSweep, Tolerance flag, legality guard, non-selection,
   run-record, stop wall, retry-once-then-record. */
async function runContentLoop(opts) {
  opts = opts || {};
  const runId = opts.runId || ('content-run-' + Date.now());
  const config = opts.config || {};
  const clock = opts.clock || function () { return Date.now(); };
  const stopAtMs = toMs(opts.stopAt != null ? opts.stopAt : config.stopAt);
  const maxIters = opts.maxIters || 0;               // safety cap; the real wall is stopAt
  const tolerance = opts.tolerance != null ? opts.tolerance : (config.tolerance != null ? config.tolerance : 'card');
  const toleranceProfile = resolveTolerance(tolerance);
  const panel = opts.panel || ['easy', 'normal', 'hard'];
  const maps = opts.maps || E.mapPool();
  const n = opts.n || 6;
  const authorOpts = opts.authorOpts || {};          // { cardsDir, feedFile, regen } threaded to the hands
  const feedFile = authorOpts.feedFile;              // author-card default when undefined
  const onStage = opts.onStage || function (s) { process.stdout.write('CONTENT_STAGE ' + JSON.stringify(s) + '\n'); };
  const onIteration = opts.onIteration || function () {};   // fired with the completed itRec after each iteration (watchable recap)

  // Injected brains + hooks (all optional so the orchestration is testable in isolation).
  const author = opts.author || (async function () { return []; });
  const grade = opts.grade || (async function () { return {}; });
  const fixPass = opts.fixPass || null;
  const feels = opts.feels || null;
  const commit = opts.commit || (async function () { return null; });
  const doPinSweep = opts.pinSweep || pinSweep;

  // The catalog resolver — the real loop re-reads content/cards each iteration (to pick up
  // just-authored files); a test injects a fixed catalog so no disk write is needed.
  const catalogOf = opts.catalog
    ? (function () { const c = opts.catalog; return function () { return typeof c === 'function' ? c() : c; }; })()
    : function () { return deckbuild.buildPool(); };

  const dbh = opts.dbh || db.open();
  const ownsDb = !opts.dbh;
  let dbRunId = null;
  try {
    dbRunId = db.insertRun(dbh, { version: E.VERSION, kind: 'balance', redAi: panel.join('+'), blueAi: panel.join('+'),
      n: n, tool: 'content-loop', deck: 'harness', mapset: (E.activeMapset() && E.activeMapset().id) || 'all',
      seedBase: 7919, notes: 'content loop ' + runId });
  } catch (e) { /* the sweep still runs; DB rows are best-effort */ }

  // Reset the Author feed once at run start so the morning review shows only this run's
  // shaping (the create-card skill's `reset` step, done here in the driver).
  A.writeFeed({ authoredAt: new Date().toISOString(), nudge: config.nudge || '', temperature: config.temperature || '', cards: [] }, feedFile);

  const rec = RR.open({ runId: runId, kind: opts.kind || 'card', dir: opts.recDir, config: {
    nudge: config.nudge, temperature: config.temperature, tolerance: toleranceProfile.name || tolerance,
    stopAt: stopAtMs ? new Date(stopAtMs).toISOString() : '', questionnaire: config.questionnaire || 'default'
  } });

  const reportsDir = opts.reportsDir || path.join(__dirname, '..', 'logs', 'reports');
  let lastBalanceReport = null, lastFeelsReport = null, iter = 0;

  while (true) {
    if (stopAtMs && clock() >= stopAtMs) break;      // the ONLY hard wall — no NEW iteration past it
    if (maxIters && iter >= maxIters) break;
    iter += 1;

    // one iteration, with retry-once-then-record self-recovery (driver discipline, no watchdog)
    let attempt = 0, done = false;
    while (!done) {
      attempt += 1;
      const track = { stage: null };
      try {
        await runIteration(iter, track);
        done = true;
      } catch (e) {
        if (attempt < 2) { onStage({ runId: runId, iter: iter, retry: true, stage: track.stage, error: String(e.message || e) }); continue; }
        // A genuine unrecoverable break: record the failed-iteration finding and ADVANCE
        // (so persistence can't retry one card till dawn).
        RR.recordFailure(rec, iter, { stage: track.stage || 'unknown', message: String(e.message || e) });
        RR.finishIteration(rec, iter, { commit: null });
        onStage({ runId: runId, iter: iter, failed: true, stage: track.stage, error: String(e.message || e) });
        done = true;
      }
    }
    // the completed iteration's watchable recap (balance columns, grade aims, feels, commit)
    try { onIteration(rec.rec.iterations.filter(function (x) { return x.iter === iter; })[0]); } catch (e) { /* a recap must never break the loop */ }
  }

  RR.finish(rec, 'done');
  if (ownsDb) { try { db.close(dbh); } catch (e) {} }
  return { runId: runId, record: rec.rec, recordFile: rec.file, iterations: iter };

  /* ---- one iteration ---- */
  async function runIteration(iter, track) {
    RR.startIteration(rec, iter);
    const catalogNow = catalogOf();
    const ctx = {
      iter: iter, config: config, catalog: catalogNow.map(function (c) { return c.id; }),
      lastBalanceReport: lastBalanceReport, lastFeelsReport: lastFeelsReport, feedFile: feedFile,
      tolerance: toleranceProfile
    };

    // ---- AUTHOR: shape the catalog (a batch), via the Author's hands ----
    track.stage = 'author'; RR.setStage(rec, { iter: iter, name: 'author' }); onStage({ runId: runId, iter: iter, stage: 'author' });
    const batch = (await author(ctx)) || [];
    const authored = [];   // { action, id, name, points, note, legal, problems }
    batch.forEach(function (move) {
      const meta = { note: move.note || '', nudge: config.nudge, temperature: config.temperature };
      try {
        if (move.action === 'remove') {
          const id = move.id || (move.card && move.card.id);
          A.removeCard(id, meta, authorOpts);
          authored.push({ action: 'remove', id: id, name: (move.card && move.card.name) || id, points: null, note: meta.note, legal: true, problems: [], card: { id: id, name: (move.card && move.card.name) || id, text: '', steps: [] } });
        } else {
          const action = move.action === 'edit' ? 'edit' : 'add';
          const id = (action === 'edit' ? A.editCard : A.addCard)(move.card, meta, authorOpts);
          const pts = (function () { try { return E.cardPoints(move.card); } catch (e) { return null; } })();
          // carry the full card object so the Workbench renders the real card FACE (not JSON)
          authored.push({ action: action, id: id, name: move.card.name || id, points: pts, note: meta.note, legal: true, problems: [], card: Object.assign({ points: pts }, move.card) });
        }
      } catch (e) {
        // The Author's hands REFUSED an illegal/over-budget card — caught and recorded as a
        // finding, never fed to the engine as a broken deck. The run does not bounce.
        const id = (move.card && move.card.id) || move.id || 'unknown';
        authored.push({ action: move.action || 'add', id: id, name: (move.card && move.card.name) || id, points: null, note: move.note || '', legal: false, problems: [String(e.message || e)], card: move.card || { id: id, name: id, text: '', steps: [] } });
      }
    });
    RR.recordAuthored(rec, iter, authored);
    RR.markStage(rec, iter, 'author');

    // Only LEGAL, non-remove cards reach grade + the balance sweep. An illegal card
    // already carries legal:false + its problems on the authored row (recordAuthored) —
    // it is a finding, and it never reaches grade or the engine.
    const authoredIds = authored.filter(function (c) { return c.legal && c.action !== 'remove'; }).map(function (c) { return c.id; });

    // ---- RUBRIC: fresh grader -> findings + the Author's ONE fix pass (proceed regardless) ----
    track.stage = 'grade'; RR.setStage(rec, { iter: iter, name: 'grade' }); onStage({ runId: runId, iter: iter, stage: 'grade' });
    if (authoredIds.length) {
      const findingsById = (await grade(authoredIds, ctx)) || {};
      for (const id of authoredIds) {
        const f = findingsById[id];
        if (!f) continue;
        let recorded;
        try { recorded = G.recordFindings(id, f, Object.assign({}, authorOpts)); }   // re-validates: refuses anything verdict-like
        catch (e) { RR.recordGrade(rec, iter, id, { error: String(e.message || e) }); continue; }
        RR.recordGrade(rec, iter, id, recorded.findings);
        // the Author's single fix pass toward the aim (optional); the card proceeds either way.
        if (fixPass) {
          try {
            const fp = await fixPass(id, recorded.findings, ctx);
            if (fp && fp.card) A.editCard(fp.card, { note: 'fix pass toward the aim' + (fp.note ? ': ' + fp.note : ''), nudge: config.nudge, temperature: config.temperature }, authorOpts);
            // Stamp the fix-pass outcome onto the RUN-RECORD's grade only — NOT a second feed
            // recordFindings, which (after the edit above appended a new feed record) would leave
            // the SAME card graded on two feed records in one run. The card proceeds regardless.
            if (fp) RR.recordGrade(rec, iter, id, Object.assign({}, recorded.findings, { fixPass: { applied: !!(fp && fp.card), note: (fp && fp.note) || (fp && fp.card ? 'revised toward the aim' : 'reviewed the aim; no change') } }));
          } catch (e) { /* the fix pass is best-effort; the card proceeds regardless */ }
        }
      }
    }
    RR.markStage(rec, iter, 'grade');

    // ---- BALANCE: pin each legal authored card + sweep round-robin (real woa.db rows) ----
    track.stage = 'balance'; RR.setStage(rec, { iter: iter, name: 'balance' }); onStage({ runId: runId, iter: iter, stage: 'balance' });
    const catalogForSweep = catalogOf();
    const byId = {}; catalogForSweep.forEach(function (c) { byId[c.id] = c; });
    let swept = 0;
    authoredIds.forEach(function (id, i) {
      const card = byId[id];
      if (!card) { RR.recordBalance(rec, iter, id, { legal: false, problems: ['card "' + id + '" not found in the catalog at sweep time'], swept: 0, columns: null, flags: [] }); return; }
      const res = doPinSweep(card, {
        catalog: catalogForSweep, panel: panel, maps: maps, n: n, tolerance: toleranceProfile, seedSalt: iter * 100003 + i * 37,
        onSkirmish: dbRunId != null && function (g1, seedBase, st) {
          try { db.insertSkirmish(dbh, dbRunId, st, E.balanceFP(g1 - 1), { seed: E.balanceSeed(seedBase, g1 - 1), version: E.VERSION }); } catch (e) {}
        }
      });
      RR.recordBalance(rec, iter, id, res);
      swept += res.swept || 0;
    });
    RR.markStage(rec, iter, 'balance');

    // committed BALANCE + RUBRIC markdown (the morning artifacts, alongside the feels transcript)
    const itRec = rec.rec.iterations.filter(function (x) { return x.iter === iter; })[0];
    let balPath = null;
    try {
      const md = balanceMarkdown({ runId: runId, iter: iter, nudge: config.nudge, temperature: config.temperature,
        toleranceName: toleranceProfile.name, panel: panel, swept: swept }, (itRec && itRec.authored) || []);
      balPath = writeReport(reportsDir, ['balance', String(E.VERSION)], runId + '-iter' + iter + '-balance.md', md);
      lastBalanceReport = balPath;
    } catch (e) { /* a report write must never break the loop */ }
    let rubPath = null;
    try {
      const rmd = rubricMarkdown({ runId: runId, iter: iter, nudge: config.nudge, temperature: config.temperature }, (itRec && itRec.authored) || []);
      rubPath = writeReport(reportsDir, ['rubric', String(E.VERSION)], runId + '-iter' + iter + '-rubric.md', rmd);
    } catch (e) { /* a report write must never break the loop */ }

    // ---- FEELS: one full first-to-3, two FREE drafts; non-selection is a finding ----
    track.stage = 'feels'; RR.setStage(rec, { iter: iter, name: 'feels' }); onStage({ runId: runId, iter: iter, stage: 'feels' });
    if (feels) {
      const fr = (await feels(ctx)) || {};
      const catalogIds = catalogOf().map(function (c) { return c.id; });
      const nothing = nonSelection(catalogIds, fr.redPicks, fr.bluePicks);
      const findings = nothing.map(function (id) { return 'nothing wanted "' + id + '" — neither free draft picked it (non-selection = signal, kept not dropped)'; });
      RR.recordFeels(rec, iter, { reportPath: fr.reportPath || null, redPicks: fr.redPicks || [], bluePicks: fr.bluePicks || [], nothingWanted: nothing, findings: findings });
      lastFeelsReport = fr.reportPath || lastFeelsReport;
    }
    RR.markStage(rec, iter, 'feels');

    // ---- COMMIT: the batch is the commit (one commit per iteration) ----
    track.stage = 'commit'; RR.setStage(rec, { iter: iter, name: 'commit' }); onStage({ runId: runId, iter: iter, stage: 'commit' });
    let sha = null;
    try { sha = await commit(iter, 'content-run ' + runId + ' iter ' + iter + ' — ' + authoredIds.length + ' card(s)', ctx); } catch (e) { /* commit best-effort; a failure is a finding, not a crash */ }
    RR.markStage(rec, iter, 'commit');
    RR.finishIteration(rec, iter, { commit: sha, balanceReportPath: balPath, rubricReportPath: rubPath, feelsReportPath: lastFeelsReport });
  }
}

function toMs(v) {
  if (v == null || v === '') return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const t = Date.parse(v);
  return isNaN(t) ? 0 : t;
}

function writeReport(reportsDir, parts, name, md) {
  const dir = path.join.apply(path, [reportsDir].concat(parts));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, md);
  // return a repo-relative-ish path for the record (logs/reports/...) when possible
  const rel = path.relative(path.join(__dirname, '..'), file);
  return rel.indexOf('..') === 0 ? file : rel;
}

/* ---------- pure parse helpers for the CLI's real transports (unit-tested) ---------- */

/* Parse claude-plays' machine lines (FEELS_DRAFT / FEELS_REPORT) out of its stdout, so the
   FEELS non-selection is derived from the ACTUAL match the loop ran (not a re-draft). */
function parseFeelsOutput(stdout) {
  const out = { redPicks: [], bluePicks: [], reportPath: null };
  String(stdout || '').split('\n').forEach(function (line) {
    let m = line.match(/^FEELS_DRAFT\s+(.*)$/);
    if (m) { try { const d = JSON.parse(m[1]); out.redPicks = d.red || []; out.bluePicks = d.blue || []; } catch (e) {} return; }
    m = line.match(/^FEELS_REPORT\s+(.*)$/);
    if (m) { out.reportPath = m[1].trim() || null; }
  });
  return out;
}

/* Parse the Author LLM's reply into a batch of shaping moves. Accepts a bare JSON array of
   moves, or { moves:[...] } / { batch:[...] }. Scans for the first balanced array/object that
   parses (a stray prose brace must not swallow the real batch), and normalizes each move to
   { action:'add'|'edit'|'remove', card?, id?, note? }. Returns [] on anything unparseable. */
function parseAuthorBatch(text) {
  const raw = extractJson(text);
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : (raw.moves || raw.batch || raw.cards || []);
  if (!Array.isArray(list)) return [];
  return list.map(function (m) {
    if (!m || typeof m !== 'object') return null;
    const action = m.action === 'edit' ? 'edit' : m.action === 'remove' ? 'remove' : 'add';
    if (action === 'remove') return { action: 'remove', id: m.id || (m.card && m.card.id), note: m.note || '' };
    const card = m.card || (m.id && m.steps ? m : null);
    if (!card || !card.id) return null;
    return { action: action, card: card, note: m.note || '' };
  }).filter(Boolean);
}

// Scan text for the first balanced {...} or [...] that JSON-parses (tolerates prose around it).
function extractJson(text) {
  if (!text) return null;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const open = s[i];
    if (open !== '{' && open !== '[') continue;
    const close = open === '{' ? '}' : ']';
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < s.length; j++) {
      const ch = s[j];
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close && --depth === 0) { try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { break; } }
    }
  }
  return null;
}

/* Parse a stop-datetime: a relative "+15m" / "+2h" / "+90s", an ISO string, or a Date.
   Returns epoch ms (0 = unset). now is injectable for tests. */
function parseStopAt(v, now) {
  now = now || Date.now();
  if (v == null || v === '') return 0;
  if (v instanceof Date) return v.getTime();
  const rel = String(v).match(/^\+(\d+)\s*([smh])$/i);
  if (rel) { const k = { s: 1e3, m: 6e4, h: 36e5 }[rel[2].toLowerCase()]; return now + (+rel[1]) * k; }
  const t = Date.parse(v);
  return isNaN(t) ? 0 : t;
}

module.exports = { runContentLoop, pinSweep, nonSelection, resolveTolerance, balanceMarkdown, rubricMarkdown, STAGES,
  parseFeelsOutput, parseAuthorBatch, parseStopAt, extractJson };

/* ============================ CLI ============================
   One launch drives the whole headless cycle. The real transports wire the LLM brains
   over the Claude Code subscription CLI (`claude -p`, via dev/llm-client.js) — the same
   login the terminal already carries, so there is NO API key to set: run it from a
   logged-in terminal and the author/grade/feels brains just work. The real transports are
   create-card as the Author's brain, a FRESH grade-card call, and claude-plays --draft for
   feels; --mock swaps them for deterministic offline brains so the DETERMINISTIC machinery
   (pin sweep, run record, Tolerance flag, legality guard, non-selection, stop wall,
   per-iteration commit — identical on both paths) can run with no CLI and no network at all
   (CI). A "few minutes out" short-cutoff proof run (#167 AC1) needs the slow FEELS match
   bounded, or one first-to-3 at the 60-turn cap outlasts the whole window: --feels-turns
   caps each game's turns and --feels-match lowers the first-to-N. Both default to the full
   real feel (60-turn cap, first-to-3) so Bill's overnight runs are untouched.

     node dev/content-loop.js --nudge "build out toward 30 cards" --temperature standard \
       --tolerance card --stop +45m [--panel easy,normal,hard] [--n 6] [--maps 2] \
       [--mapset core7] [--feels-model haiku] [--feels-turns 60] [--feels-match 3] \
       [--branch content-run-<ts>] [--mock]
*/
if (require.main === module) {
  const cp = require('child_process');
  const argv = process.argv.slice(2);
  const flag = function (name, def) { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
  const has = function (name) { return argv.indexOf('--' + name) >= 0; };

  const runId = flag('run-id', 'content-run-' + Date.now());
  const mock = has('mock');
  const noCommit = has('no-commit');
  const branch = flag('branch', null);
  const config = {
    nudge: flag('nudge', 'build out toward 30 cards'),
    temperature: flag('temperature', 'standard'),
    tolerance: flag('tolerance', 'card'),
    questionnaire: flag('questionnaire', 'default'),
    stopAt: null
  };
  const stopAtMs = parseStopAt(flag('stop', '+30m'));
  config.stopAt = stopAtMs ? new Date(stopAtMs).toISOString() : '';
  const panel = flag('panel', 'easy,normal,hard').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const n = Math.max(2, +flag('n', 6) | 0);
  let maps = E.mapPool();
  const mapset = flag('mapset', null);
  if (mapset && mapset !== 'all') { const s = E.MAPSETS.filter(function (x) { return x.id === mapset; })[0]; if (s) maps = E.MAPS.filter(function (m) { return s.maps.indexOf(m.id) >= 0 || s.maps.indexOf(m.name) >= 0; }); }
  else if (mapset === 'all') maps = E.MAPS;
  const capMaps = +flag('maps', 0) | 0; if (capMaps > 0) maps = maps.slice(0, capMaps);
  const maxIters = +flag('iters', 0) | 0;

  const ROOT = path.join(__dirname, '..');
  const cardsDir = flag('cards-dir', null);           // temp override for a safe dry run
  const feedFile = flag('feed-file', null);
  const recDir = flag('rec-dir', null);
  const reportsDir = flag('reports-dir', null);
  const authorOpts = {}; if (cardsDir) authorOpts.cardsDir = cardsDir; if (feedFile) authorOpts.feedFile = feedFile;

  const feelsModel = flag('feels-model', 'haiku');
  const feelsTurns = +flag('feels-turns', 0) | 0;   // >0 bounds the real feels match (proof runs); 0 = claude-plays' own default cap
  const feelsMatch = Math.max(1, +flag('feels-match', 3) | 0);   // first-to-N; default 3 (Bill's real runs). Lower it only to bound a short-cutoff proof run
  const authorModel = flag('author-model', 'sonnet');
  const gradeModel = flag('grade-model', 'sonnet');
  const effort = flag('effort', '');

  // ---- git commit hook (the batch is the commit; runs in THIS worktree) ----
  function git(args) { return cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
  if (branch && !noCommit) { try { git(['switch', '-c', branch]); console.log('content-loop: on branch ' + branch); } catch (e) { console.error('content-loop: could not create branch ' + branch + ' — ' + e.message); } }
  const commit = noCommit ? (async function () { return null; }) : (async function (iter, msg) {
    try {
      git(['add', '-A']);
      // nothing staged (no content change this iter) -> no commit, no crash
      const staged = cp.execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: ROOT, encoding: 'utf8' }).trim();
      if (!staged) return null;
      git(['commit', '-q', '-m', msg + '\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>']);
      return git(['rev-parse', 'HEAD']);
    } catch (e) { return null; }
  });

  // ---- FEELS transport: spawn claude-plays --draft (real) / --mock (offline) ----
  // STREAM claude-plays' turn-by-turn output straight to our stdout as it plays (so a
  // terminal watcher sees the battle unfold — §1 "watch it happen") while ALSO capturing
  // it to parse the FEELS_DRAFT / FEELS_REPORT machine lines. execFileSync would swallow
  // the whole match into a buffer and show nothing until it ended.
  const feels = function () {
    const args = ['dev/claude-plays.js', '--match', String(feelsMatch), '--red', feelsModel, '--blue', feelsModel,
      '--draft', '--seed', '1001'];
    if (feelsTurns > 0) args.push('--max-turns', String(feelsTurns));
    if (effort) args.push('--effort', effort);
    if (mapset) args.push('--mapset', mapset);
    if (mock) args.push('--mock', '--map', maps[0].name);
    return new Promise(function (resolve, reject) {
      let out = '';
      const child = cp.spawn(process.execPath, args, { cwd: ROOT });
      child.stdout.on('data', function (d) { out += d.toString(); process.stdout.write(d); });
      child.stderr.on('data', function (d) { process.stderr.write(d); });
      child.on('error', function (e) { reject(new Error('feels: claude-plays failed — ' + (e.message || e))); });
      child.on('close', function () {
        if (!out) return reject(new Error('feels: claude-plays produced no output'));
        resolve(parseFeelsOutput(out));
      });
    });
  };

  // ---- AUTHOR / GRADE / one-FIX-PASS: real LLM brains, or deterministic mock brains ----
  let author, grade, fixPass;
  if (mock) {
    let seqn = 0;
    author = async function (ctx) {
      const id = 'loop_probe_' + ctx.iter + '_' + (++seqn);
      // a deterministic, legal single-step card so the whole machine runs offline
      return [{ action: 'add', note: 'mock brain probe (iter ' + ctx.iter + ')',
        card: { id: id, name: 'Probe ' + ctx.iter + '.' + seqn, text: 'A mock probe card.', steps: [{ type: 'trench' }] } }];
    };
    grade = async function (ids) {
      const o = {};
      ids.forEach(function (id) { o[id] = { grader: 'mock-fresh', axes: [
        { axis: 'set-fit', position: 'a mock probe; sits apart from the catalog on purpose', velocity: 'a real Author would sharpen it toward a genuine gap' },
        { axis: 'board-had-to-be-there', position: 'trivially playable, no real board decision yet', velocity: 'add a trigger that ties it to the board' } ] }; });
      return o;
    };
    // the one fix pass: the mock Author reviews the aim and (deterministically) keeps the card
    fixPass = async function () { return { note: 'mock: reviewed the aim; no change this pass' }; };
  } else {
    const llm = require(path.join(__dirname, 'llm-client.js'));
    const skillText = readMaybe(path.join(ROOT, '.claude', 'skills', 'create-card', 'SKILL.md'));
    const cheatsheet = readMaybe(path.join(ROOT, 'docs', 'card-cheatsheet.md'));
    // Live echo: print the model's tokens to our stdout as they arrive, so a terminal
    // watcher SEES the author write the card / the grader write its findings (not a silent
    // wait then a dump). Returns the onDelta the streaming transport calls per chunk.
    const echo = function (label) {
      process.stdout.write('  ' + label + '\n  ┃ ');
      return function (chunk) { process.stdout.write(String(chunk).replace(/\n/g, '\n  ┃ ')); };
    };
    author = async function (ctx) {
      const um = authorUserMessage(ctx, cheatsheet);
      const res = await llm.sendStreamed({ systemPrompt: skillText + '\n\nReturn ONLY a JSON array of moves; no prose.', userMessage: um, model: authorModel, effort: effort, timeoutMs: 600000 }, echo('✍️  ' + authorModel + ' is authoring…'));
      process.stdout.write('\n');
      const batch = parseAuthorBatch(res.text);
      console.log('  → ' + batch.length + ' move(s): ' + (batch.map(function (m) { return (m.action || 'add') + ' `' + ((m.card && m.card.id) || m.id) + '`'; }).join(', ') || '(none parsed)'));
      return batch;
    };
    grade = async function (ids, ctx) {
      const out = {};
      for (const id of ids) {
        const brief = G.briefFor('game/content/cards/' + id + '.js', require(path.join(ROOT, 'game', 'card-rubric-axes.js')).CARD_RUBRIC_AXES.map(function (a) { return a.id; }))
          + '\n\nIMPORTANT: do NOT run any command. Return ONLY the findings JSON object.';
        const res = await llm.sendStreamed({ systemPrompt: 'You are a FRESH card grader (never the author). Findings are an aim, not a gate — no score/band/pass-fail.', userMessage: brief, model: gradeModel, effort: effort, timeoutMs: 600000 }, echo('🔍 ' + gradeModel + ' grading `' + id + '`…'));
        process.stdout.write('\n');
        // Build a CLEAN findings object from the LLM reply — keep only axis/position/velocity per
        // axis — so a benign extra key an LLM tends to add (a `summary`, a `gradedAt`) can't trip
        // grade-card's strict verdict-guard whitelist and lose the whole grade.
        const raw = extractJson(res.text);
        const axesIn = raw && (raw.axes || raw.findings);
        if (Array.isArray(axesIn) && axesIn.length) {
          out[id] = { grader: 'fresh-subagent', axes: axesIn.filter(function (a) { return a && a.axis; })
            .map(function (a) { return { axis: a.axis, position: a.position, velocity: a.velocity }; }) };
        }
      }
      return out;
    };
    // the one fix pass: the Author (create-card brain) revises the card ONCE toward the aim, or
    // keeps it. Returns { card } to revise, or { note } for a no-change pass — either way the
    // card proceeds. A revision goes through the same legality-guarded editCard as any authoring.
    fixPass = async function (id, findings, ctx) {
      const aim = (findings.axes || []).map(function (a) { return '- ' + (a.title || a.axis) + ': ' + a.velocity; }).join('\n');
      const um = 'The fresh grader read your card `' + id + '` and named these aims (velocity = the fix toward good):\n' + aim +
        '\n\nTake ONE fix pass toward the aim. If a revision helps, return ONLY the full revised card JSON ' +
        '{"id":"' + id + '","name":"...","text":"...","steps":[...]} (keep the id). If the card is fine as is, return exactly {"noChange":true}.';
      const res = await llm.sendStreamed({ systemPrompt: skillText, userMessage: um, model: authorModel, effort: effort, timeoutMs: 600000 }, echo('🛠️  ' + authorModel + ' one fix pass on `' + id + '`…'));
      process.stdout.write('\n');
      const j = extractJson(res.text);
      if (j && j.id === id && Array.isArray(j.steps)) return { card: j, note: 'revised toward the aim' };
      return { note: 'reviewed the aim; no change this pass' };
    };
  }

  console.log('content-loop: ' + (mock ? 'MOCK brains' : 'real LLM brains') + ' · nudge "' + config.nudge + '" · temperature ' + config.temperature +
    ' · tolerance ' + config.tolerance + ' · stop ' + (config.stopAt || 'none') + ' · panel [' + panel.join(',') + '] · ' + maps.length + ' maps' + (noCommit ? ' · NO-COMMIT' : ''));

  // Readable, watchable stdout: a labelled banner as each stage BEGINS (the machine
  // surface is the run-record + dashboard, not this stream — so the terminal can be plain
  // English for the human alt-tabbing in). STAGE_ICON keeps the five stages recognizable.
  const STAGE_ICON = { author: '✍️  AUTHOR', grade: '🔍 GRADE (fresh grader)',
    balance: '⚖️  BALANCE (pin + round-robin sweep)', feels: '🎮 FEELS (claude-plays, live)', commit: '💾 COMMIT' };
  runContentLoop({
    runId: runId, config: config, stopAt: stopAtMs, maxIters: maxIters,
    panel: panel, maps: maps, n: n, tolerance: config.tolerance,
    authorOpts: authorOpts, recDir: recDir, reportsDir: reportsDir,
    author: author, grade: grade, fixPass: fixPass, feels: feels, commit: commit,
    onStage: function (s) {
      if (s.failed) return void process.stdout.write('\n  ⚠️  iter ' + s.iter + ' FAILED at ' + s.stage + ' — ' + s.error + ' · recorded, advancing\n');
      if (s.retry) return void process.stdout.write('\n  ↻ iter ' + s.iter + ' stumbled at ' + s.stage + ' (' + s.error + ') — retrying once\n');
      if (s.stage === 'author') process.stdout.write('\n\n════════════ ITERATION ' + s.iter + ' ════════════\n');
      if (s.stage) process.stdout.write('\n── iter ' + s.iter + ' · ' + (STAGE_ICON[s.stage] || s.stage) + ' ──\n');
    },
    onIteration: printIterationSummary
  }).then(function (res) {
    console.log('\n════════════ DONE ════════════');
    console.log(res.iterations + ' iteration(s) committed. Run record: ' + res.recordFile);
    console.log('CONTENT_RESULT ' + JSON.stringify({ runId: res.runId, iterations: res.iterations, record: res.recordFile }));
  }).catch(function (e) { console.error(e); process.exit(1); });
}

// A plain-English recap the terminal watcher reads after each iteration commits — the batch's
// authored cards with their balance columns + Tolerance flags, the fresh-grade aims, the feels
// non-selection findings, and the commit sha. (The dashboard renders the same from the record.)
function printIterationSummary(it) {
  if (!it) return;
  const L = [];
  (it.authored || []).forEach(function (c) {
    if (c.legal === false) { L.push('   ⛔ `' + c.id + '` illegal — never swept: ' + (c.problems || []).join('; ')); return; }
    const b = c.balance || {}, col = b.columns || {};
    L.push('   • `' + c.id + '` ' + (c.name ? '"' + c.name + '" ' : '') + (c.points != null ? '(' + c.points + ' pts) ' : '') +
      (col.plays != null ? '— ' + col.plays + ' plays · win ' + (col.win == null ? '—' : col.win + '%') + ' · Simple ' + (col.simple == null ? '—' : col.simple + '%') + ' · 1stSight ' + (col.sight == null ? '—' : col.sight + '%') : '— (not swept)'));
    if (b.flags && b.flags.length) L.push('       ⚑ ' + b.flags.join(' · ') + '  (a flag, never a reject)');
    const axes = (c.findings && c.findings.axes) || [];
    axes.forEach(function (a) { L.push('       ◇ ' + (a.title || a.axis) + ': ' + a.velocity); });
  });
  if (it.feels && it.feels.nothingWanted && it.feels.nothingWanted.length) L.push('   🃏 feels — nothing wanted: ' + it.feels.nothingWanted.join(', ') + ' (kept as a finding)');
  if (it.failure) L.push('   ⚠️  failed at ' + it.failure.stage + ': ' + it.failure.message);
  L.push('   💾 ' + (it.commit ? it.commit.slice(0, 9) + ' committed' : 'nothing to commit this iteration'));
  process.stdout.write('\n  ── iter ' + it.iter + ' recap ──\n' + L.join('\n') + '\n');
}

function readMaybe(f) { try { return require('fs').readFileSync(f, 'utf8'); } catch (e) { return ''; } }

// The Author's live context: nudge + Temperature + the current catalog + last reports (INTAKE).
function authorUserMessage(ctx, cheatsheet) {
  const lines = [];
  lines.push('OPENING NUDGE: ' + (ctx.config.nudge || '(none)'));
  lines.push('TEMPERATURE: ' + (ctx.config.temperature || 'standard') + ' (honor the band — a safe run and a wild run must differ)');
  lines.push('ITERATION: ' + ctx.iter);
  lines.push('');
  lines.push('CURRENT CATALOG (' + ctx.catalog.length + ' cards): ' + ctx.catalog.join(', '));
  lines.push('');
  if (ctx.lastBalanceReport) lines.push('INTAKE — last balance report: ' + tail(readMaybe(path.join(__dirname, '..', ctx.lastBalanceReport)), 2000));
  if (ctx.lastFeelsReport) lines.push('INTAKE — last feels report: ' + tail(readMaybe(path.join(__dirname, '..', ctx.lastFeelsReport)), 2000));
  lines.push('');
  if (cheatsheet) lines.push('STEP VOCABULARY (card-cheatsheet):\n' + cheatsheet);
  lines.push('');
  lines.push('Shape the catalog toward the nudge at this Temperature — a BATCH sized by your judgment ' +
    '(~4 when growing to 30; shift to edit/remove near target). Spread the decisions; do not write four attack buffs.');
  lines.push('Return ONLY a JSON array of moves, each: ' +
    '{"action":"add"|"edit"|"remove","card":{"id":"snake_case","name":"...","text":"...","steps":[...]},"note":"why"} ' +
    '(for remove, use {"action":"remove","id":"...","note":"why"}). Card JSON is the catalog shape (no count/starting).');
  return lines.join('\n');
}
function tail(s, k) { s = String(s || ''); return s.length > k ? s.slice(s.length - k) : s; }
