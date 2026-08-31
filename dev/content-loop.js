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
          authored.push({ action: 'remove', id: id, name: id, points: null, note: meta.note, legal: true, problems: [] });
        } else {
          const card = A.withPoints ? move.card : move.card;
          const action = move.action === 'edit' ? 'edit' : 'add';
          const id = (action === 'edit' ? A.editCard : A.addCard)(move.card, meta, authorOpts);
          const pts = (function () { try { return E.cardPoints(move.card); } catch (e) { return null; } })();
          authored.push({ action: action, id: id, name: move.card.name || id, points: pts, note: meta.note, legal: true, problems: [] });
        }
      } catch (e) {
        // The Author's hands REFUSED an illegal/over-budget card — caught and recorded as a
        // finding, never fed to the engine as a broken deck. The run does not bounce.
        const id = (move.card && move.card.id) || move.id || 'unknown';
        authored.push({ action: move.action || 'add', id: id, name: (move.card && move.card.name) || id, points: null, note: move.note || '', legal: false, problems: [String(e.message || e)] });
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
        // the Author's single fix pass toward the aim (optional); the card proceeds either way
        if (fixPass) {
          try {
            const fp = await fixPass(id, recorded.findings, ctx);
            if (fp && fp.card) { A.editCard(fp.card, { note: fp.note || 'fix pass', nudge: config.nudge, temperature: config.temperature }, authorOpts); }
            if (fp) G.recordFindings(id, f, Object.assign({ fixPass: (fp.note || 'fix pass applied') }, authorOpts));
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

    // committed BALANCE markdown (the morning artifact)
    const itRec = rec.rec.iterations.filter(function (x) { return x.iter === iter; })[0];
    let balPath = null;
    try {
      const md = balanceMarkdown({ runId: runId, iter: iter, nudge: config.nudge, temperature: config.temperature,
        toleranceName: toleranceProfile.name, panel: panel, swept: swept }, (itRec && itRec.authored) || []);
      balPath = writeReport(reportsDir, ['balance', String(E.VERSION)], runId + '-iter' + iter + '-balance.md', md);
      lastBalanceReport = balPath;
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
    RR.finishIteration(rec, iter, { commit: sha, balanceReportPath: balPath, feelsReportPath: lastFeelsReport });
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

module.exports = { runContentLoop, pinSweep, nonSelection, resolveTolerance, balanceMarkdown, STAGES };
