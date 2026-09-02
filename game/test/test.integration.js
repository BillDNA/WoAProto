/* Real-path integration gate. Green must stop meaning "80% wired".
   This drives a genuine skirmish through the PUBLIC engine entry points to an
   actual HQ capture — nothing mocked, no __sim clone — and proves the persistence
   SUBSCRIPTION seam is wired end to end: finishSkirmish -> onSkirmishEnd fires with
   a persistable finished state, an __sim AI-search look-ahead clone deliberately
   does NOT fire it, and that same delivered state lands a row through the real
   dev/db.js (the leg the server's /api/recordskirmish proxy calls).

   UNWIRE PROOF (what reds this): delete the `if (!st.__sim) HOOKS.onSkirmishEnd...`
   dispatch in engine/04-skirmish.js and the "fires once" assertion reds; break the
   __sim gating and the "clone does not fire" assertion reds; deliver an unfinished
   state to the hook and the db leg reds. Each red localises to the wiring, not to
   game content.

   Frozen-API entry game/test.js delegates here; run alone with
   `node game/test.integration.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, testSkirmish } = require('./test.helpers.js');

test('integration: a real finished skirmish reaches the persistence seam', (t) => {
  const seen = [];
  const hook = function (st) { seen.push(st); };
  E.hooks.onSkirmishEnd.push(hook);
  try {
    // A genuine skirmish on the bare test board (a REAL, non-sim state), driven
    // through the public API to an actual HQ capture: red cavalry adjacent to the
    // blue HQ plays its first card as a basic attack and takes the headquarters.
    const st = testSkirmish(70);
    st.pieces.units['-2,2'] = { type: 'cavalry', owner: 'red' }; // adjacent to blue HQ at -3,2
    E.playCard(st, st.cards.hands.red[0], 'attack');
    E.applyStep(st, { from: '-2,2', to: '-3,2' });
    assert.ok(st.flow.phase === 'skirmish-over' && st.result.winType === 'hq' && st.result.skirmishWinner === 'red',
      'the real skirmish finished by HQ capture through the public entry points');

    assert.ok(seen.length === 1, 'onSkirmishEnd fired exactly once for a real finished skirmish (subscription wired)');
    const fired = seen[0];
    assert.ok(fired === st && fired.flow.phase === 'skirmish-over' && fired.result.skirmishWinner === 'red',
      'the hook received the finished, persistable state (not a stub or a clone)');

    // An AI look-ahead clone carries __sim (engine/05-ai.js) and must NOT reach
    // persistence — otherwise every play-out inside the search would flood the db.
    // Finish an identical skirmish flagged __sim and prove the gate holds it back.
    const before = seen.length;
    const clone = testSkirmish(70);
    clone.__sim = true;
    clone.pieces.units['-2,2'] = { type: 'cavalry', owner: 'red' };
    E.playCard(clone, clone.cards.hands.red[0], 'attack');
    E.applyStep(clone, { from: '-2,2', to: '-3,2' });
    assert.ok(clone.flow.phase === 'skirmish-over', 'the __sim clone itself finished (same real path)');
    assert.ok(seen.length === before, 'a finished __sim clone does NOT fire the persistence seam (the gate holds)');

    // The delivered state persists through the REAL dev/db.js into a temp db,
    // exactly as the server proxy does (insertRun -> insertSkirmish). Guarded so a
    // zipped game/ without dev/ (or Node < 22 lacking node:sqlite) skips this leg
    // instead of failing — the same fail-open the server route uses.
    let db, fs, os, path;
    try {
      fs = require('fs'); os = require('os'); path = require('path');
      db = require('../../dev/db.js');
    } catch (e) { db = null; }
    if (db) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woa-int-'));
      const h = db.open(path.join(dir, 'int.db'));
      try {
        const runId = db.insertRun(h, {
          version: E.VERSION, kind: 'balance', redAi: 'human', blueAi: 'human',
          n: 1, tool: 'test.integration.js', notes: 'real-path integration gate'
        });
        const sid = db.insertSkirmish(h, runId, fired, 'red', { seed: fired.seed });
        const row = h.db.prepare('SELECT winner, win_type, map FROM skirmishes WHERE id = ?').get(sid);
        assert.ok(row && row.winner === 'red' && row.win_type === 'hq',
          'the real finished state lands a skirmishes row via the real db.js (winner/win_type wired through)');
      } finally {
        db.close(h);
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
      }
    } else {
      // Make the skip LOUD, never a silent green: this is the one spot where the
      // gate's "green stops meaning 80% wired" promise steps down (a zipped game/
      // without dev/, or Node < 22.5 lacking node:sqlite). The hook-wiring
      // assertions above still ran; only the db leg did not.
      t.diagnostic('db persistence leg SKIPPED — dev/db.js unavailable; hook->db assertion did not run');
    }
  } finally {
    const i = E.hooks.onSkirmishEnd.indexOf(hook);
    if (i >= 0) E.hooks.onSkirmishEnd.splice(i, 1);
  }
});
