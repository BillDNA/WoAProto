/* War of Attrition — engine part 04: battle/skirmish lifecycle + card-step turn flow + hooks.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  /* ---------- state ---------- */

  function newBattle(opts) {
    opts = opts || {};
    var s = { seed: (opts.seed !== undefined ? opts.seed : (Date.now() & 0x7fffffff)) | 0 };
    var maps = (opts.maps && opts.maps.length) ? opts.maps : I.MAPS;
    var order = [];
    for (var i = 0; i < maps.length; i++) order.push(i);
    I.shuffle(s, order);
    var battle = {
      seed: s.seed,
      maps: maps,           // full map definitions travel with the battle (LAN-safe)
      mapOrder: order,
      skirmishIndex: 0,
      wins: { red: 0, blue: 0 },
      firstPlayer: opts.firstPlayer || (I.rnd(s) < 0.5 ? 'red' : 'blue'),
      // Per-side battalion selection {red, blue} (each null|battalion|id|name);
      // null = both sides share the active battalion (which instantiates the deck).
      battalions: opts.battalions || null,
      winner: null
    };
    battle.seed = s.seed;
    return battle;
  }

  // The card registry for one side — the skirmish's per-side deck if it seats
  // them, else the active-deck default. Self-heals saves/sims that have no
  // st.cards.sideDecks. Every per-side card lookup (buildDeck, drawHand,
  // playCard, stepOptions) routes through here so a side always reads ITS deck.
  function sideReg(st, p) {
    return (st.cards.sideDecks && st.cards.sideDecks[p]) || I.DEFAULT_REG;
  }

  function buildDeck(s, player) {
    var deck = [];
    sideReg(s, player).cards.forEach(function (c) {
      for (var i = 0; i < c.count; i++) if (!c.starting) deck.push(c.id);
    });
    I.shuffle(s, deck);
    return deck;
  }

  function newSkirmish(battle) {
    var maps = battle.maps || I.MAPS;
    var mapIdx = battle.mapOrder[battle.skirmishIndex % battle.mapOrder.length];
    var map = maps[mapIdx];
    var shapeName = I.ensureMapShape(map);
    I.setBoard(shapeName);
    var terrain = I.buildTerrain(map);
    // De-flattened skirmish state: the ~30 top-level keys are
    // grouped into composable blocks so a change to one seam does not ripple
    // across unrelated ones. Blocks mirror the CONTEXT.md sections —
    // board / pieces / cards / flow (turn) / result / journal. Identity keys
    // (seed, battle, mapIndex, mapName) stay top-level. Piece storage is
    // reached only through the I.Pieces accessors, never poked directly, so its
    // shape is a one-place seam.
    var st = {
      seed: battle.seed,
      battle: battle,
      mapIndex: mapIdx,
      mapName: map.name,
      // the map + terrain layer the skirmish is fought on
      board: {
        boardShape: shapeName,
        terrainEdges: terrain.edges,
        terrainPieces: terrain.pieces,
        hq: { red: I.key(map.redHQ[0], map.redHQ[1]), blue: I.key(map.blueHQ[0], map.blueHQ[1]) },
        hqAlive: { red: true, blue: true }
      },
      // every physical piece a side has placed or can place
      pieces: {
        units: {},      // hexKey -> {type, owner}
        trenches: {},   // hexKey -> [{dirs:[d1,d2], owner}]
        reserves: { red: copyReserves(), blue: copyReserves() }
      },
      // the per-side card machinery (deck / hand / discard / spent)
      cards: {
        decks: {}, discards: { red: [], blue: [] }, removed: { red: [], blue: [] }, hands: { red: [], blue: [] },
        seen: { red: {}, blue: {} }  // cardId -> times it has appeared in p's hand
      },
      // whose turn it is and the card currently resolving
      flow: {
        current: battle.skirmishIndex === 0 ? battle.firstPlayer : battle.lastLoser,
        second: null,
        phase: 'choose-card', // choose-card | step | skirmish-over
        pending: null,
        turnNumber: 1,
        firstTurnDone: { red: false, blue: false }
      },
      // how the skirmish ended
      result: {
        kills: { red: 0, blue: 0 },
        skirmishWinner: null,
        winType: null
      },
      // the balance-lab / report fold + human journal (capture only)
      journal: {
        log: [],
        playLog: [],                  // {p, id, mode, turn, seen-at-play} per card played
        decisionLog: [],              // {turn, side, mode, card, outcome:'played'|'declined'} — one per card held at each decision (capture only; feeds the card_events fact table)
        unitMetrics: initUnitMetrics(), // per-unit-type {dep,atk,abs,kill,die} fold
        lastSwap: { red: null, blue: null }, // p's most recent swap pair (AI anti-shuffle)
        stats: { attacks: 0, swaps: 0, marches: 0, deploys: 0, firstBlood: null }, // behaviour counters for the balance lab
        lastKillTurn: 0,   // turn of the most recent kill/HQ fall — kill-less-tail metric
        leadChanges: 0,    // times the field-score leader flipped to the OTHER side
        lastLeader: null,  // last definite (non-tie) field-score leader
        fsTimeline: []     // [fsRed, fsBlue] per completed turn (DB timeline; absent on sims + old saves)
      }
    };
    st.flow.second = I.other(st.flow.current);
    // Only seat per-side registries when a non-default battalion is chosen.
    // The default (symmetric) path leaves st.cards.sideDecks absent — sideReg
    // falls back to DEFAULT_REG — so live/synced/persisted state never carries a
    // redundant card catalog on the hot path.
    var dsel = battle.battalions;
    if (dsel && (dsel.red || dsel.blue))
      st.cards.sideDecks = { red: I.resolveBattalion(dsel.red), blue: I.resolveBattalion(dsel.blue) };
    st.cards.decks.red = buildDeck(st, 'red');
    st.cards.decks.blue = buildDeck(st, 'blue');
    log(st, 'Skirmish ' + (battle.skirmishIndex + 1) + ' — "' + map.name + '". ' + I.cap(st.flow.current) + ' moves first.');
    drawHand(st, st.flow.current);
    return st;
  }
  function copyReserves() {
    var r = { trench: I.CONFIG.trenchCount };
    Object.keys(I.UNITS).forEach(function (t) { r[t] = I.UNITS[t].count || 0; });
    return r;
  }
  // Per-skirmish, per-unit-type fold — keyed by I.UNITS' own type keys
  // (infantry/cavalry/artillery). Named unitMetrics (not "units") because
  // st.pieces.units already means the hexKey->{type,owner} board map.
  // dieT is a death-TURN list, symmetric to dep[] — pushed wherever die++ is
  // tallied (engine/03-rules.js killDefender/killAttacker). Capture only: no
  // existing field is renamed or removed, so byte-identical balance aggregates
  // stay untouched. report-model.js's unitsAggFromEnvelopes pairs dep[]/dieT[] per
  // skirmish to derive lifespan.
  function initUnitMetrics() {
    var u = {};
    Object.keys(I.UNITS).forEach(function (t) { u[t] = { dep: [], atk: 0, abs: 0, kill: 0, die: 0, dieT: [] }; });
    return u;
  }
  function ensureUnitMetrics(st) { // self-heal pre-metrics saves/sims
    if (!st.journal.unitMetrics) { st.journal.unitMetrics = initUnitMetrics(); return st.journal.unitMetrics; }
    // A save resumed from just before dieT existed has per-type
    // {dep,atk,abs,kill,die} but no dieT array — heal it in place so
    // killDefender/killAttacker's dieT.push never hits undefined.
    Object.keys(I.UNITS).forEach(function (t) {
      var u = st.journal.unitMetrics[t];
      if (u && !Array.isArray(u.dieT)) u.dieT = [];
    });
    return st.journal.unitMetrics;
  }
  function log(st, msg) { st.journal.log.push({ turn: st.flow.turnNumber, player: st.flow.current, msg: msg }); }

  function cardsRemaining(st, p) {
    return st.cards.decks[p].length + st.cards.discards[p].length + st.cards.hands[p].length;
  }

  function drawHand(st, p) {
    var hand = st.cards.hands[p];
    var first = !st.flow.firstTurnDone[p];
    if (first) {
      st.flow.firstTurnDone[p] = true;
      hand.push(sideReg(st, p).starting);
    }
    var want = first ? I.CONFIG.skirmish.handDraw.opener : I.CONFIG.skirmish.handDraw.normal;
    var total = st.cards.decks[p].length + st.cards.discards[p].length;
    if (total <= want + 1) want = total; // one more than a full draw remains: draw the lot, strand none
    var held = [];
    if (first) { // house rule: cards flagged noOpener (e.g. Airdrop) never open
      for (var hi = st.cards.decks[p].length - 1; hi >= 0; hi--) {
        var cid = st.cards.decks[p][hi];
        if (sideReg(st, p).byId[cid] && sideReg(st, p).byId[cid].noOpener) held.push(st.cards.decks[p].splice(hi, 1)[0]);
      }
    }
    for (var i = 0; i < want; i++) {
      if (st.cards.decks[p].length === 0 && st.cards.discards[p].length > 0) {
        st.cards.decks[p] = I.shuffle(st, st.cards.discards[p]);
        st.cards.discards[p] = [];
      }
      if (st.cards.decks[p].length === 0) break;
      hand.push(st.cards.decks[p].pop());
    }
    held.forEach(function (cid) {
      var pos = Math.floor(I.rnd(st) * (st.cards.decks[p].length + 1));
      st.cards.decks[p].splice(pos, 0, cid);
    });
    if (!st.cards.seen) st.cards.seen = { red: {}, blue: {} }; // self-heal pre-metrics saves
    hand.forEach(function (id) { st.cards.seen[p][id] = (st.cards.seen[p][id] || 0) + 1; });
    if (hand.length === 0) endByAttrition(st);
  }

  // Attrition score: field score of a player's SURVIVING units on the
  // board. Reserves never deployed count for nothing; kills only matter
  // because they remove enemy units from the field. (st.result.kills still tracks kills
  // for stats/journal, but victory reads the board.)
  function fieldScore(st, p) {
    var s = 0;
    I.Pieces.eachUnit(st, function (h, u) { if (u.owner === p) s += I.UNITS[u.type].worth; });
    return s;
  }

  function endByAttrition(st) {
    var fr = fieldScore(st, 'red'), fb = fieldScore(st, 'blue');
    var winner;
    if (fr > fb) winner = 'red';
    else if (fb > fr) winner = 'blue';
    else winner = st.flow.second; // tie: player who went 2nd wins
    finishSkirmish(st, winner, 'attrition');
  }

  // Every REAL finished skirmish (never an AI-search clone — those carry
  // __sim) flows through here, so persistence subscribes once and covers every
  // source: human play, watch mode, the lab, LLM skirmishes. Hook errors never
  // break the game.
  var HOOKS = { onSkirmishEnd: [] };
  function finishSkirmish(st, winner, how) {
    st.flow.phase = 'skirmish-over';
    st.result.skirmishWinner = winner;
    st.result.winType = how;
    st.flow.pending = null;
    var m = st.battle;
    m.wins[winner]++;
    m.lastLoser = I.other(winner);
    m.skirmishIndex++;
    m.seed = st.seed;
    if (m.wins[winner] >= I.CONFIG.skirmish.matchTarget) { m.winner = winner; }
    log(st, I.cap(winner) + ' wins the skirmish by ' + (how === 'hq' ? 'capturing the headquarters!' :
      how === 'concession' ? 'concession.' :
      'attrition (field score ' + fieldScore(st, 'red') + ' vs ' + fieldScore(st, 'blue') + ', surviving units).'));
    if (!st.__sim) HOOKS.onSkirmishEnd.forEach(function (fn) {
      try { fn(st); } catch (e) { if (typeof console !== 'undefined') console.error('onSkirmishEnd hook failed: ' + e.message); }
    });
  }

  // A player throws in the towel; the skirmish (not the battle) goes to the enemy.
  function concede(st, p) {
    if (st.flow.phase === 'skirmish-over') throw new Error('skirmish already over');
    log(st, I.cap(p) + ' concedes the field.');
    finishSkirmish(st, I.other(p), 'concession');
    return st;
  }

  // Is the skirmish a foregone conclusion for p? ADVISORY ONLY — never enforced.
  // Truthy ({need, gain, turnsLeft}) when BOTH paths to victory look closed:
  //  - attrition (surviving-units scoring): the field-score gap is bigger than
  //    the most p could plausibly swing it in the turns left. One turn can swing
  //    at most ~3 field-score points p's way (deploy or destroy an artillery) — multi-action
  //    cards can beat that, so this is a heuristic, which is why it only advises.
  //  - HQ capture: no unit (fielded, or deployed then marched) can reach the
  //    enemy HQ within the turns p has left; a live Airdrop keeps hope alive.
  function concedeAdvised(st, p) {
    if (st.flow.phase !== 'choose-card') return null;
    var e = I.other(p);
    var turnsLeft = cardsRemaining(st, p); // each turn removes exactly 1 card from p's pool
    var need = (fieldScore(st, e) - fieldScore(st, p)) + (st.flow.second === p ? 0 : 1); // second player wins ties
    if (need <= 0) return null;            // p still ahead (or tied as second player)
    var gain = 3 * turnsLeft;              // best case: a 3-point swing every remaining turn
    if (gain >= need) return null;         // the gap can still be closed in principle
    if (st.board.hqAlive[e] && turnsLeft > 0) {
      var hasReserve = Object.keys(I.UNITS).some(function (t) { return st.pieces.reserves[p][t] > 0; });
      if (hasReserve && turnsLeft >= 2 && st.cards.removed[p].indexOf('airdrop') < 0) return null; // Airdrop snipe still possible
      var hq = st.board.hq[e], reach = Infinity;
      for (var h2 in st.pieces.units) if (st.pieces.units[h2].owner === p) reach = Math.min(reach, I.dist(h2, hq));
      if (hasReserve) I.deployTargets(st, p, false).forEach(function (d) { reach = Math.min(reach, I.dist(d, hq) + 1); });
      if (reach <= turnsLeft) return null; // a march on the HQ is still conceivable
    }
    return { need: need, gain: gain, turnsLeft: turnsLeft };
  }

  /* ---------- turn flow ---------- */
  // mode: 'normal' (the card's printed actions) | 'attack' | 'reposition'
  // House rule: any card may always be resolved as a simple attack or reposition instead.
  // Decision-grain capture: one event per card the deciding side holds at the
  // moment of choice — the chosen card (outcome 'played', tagged with its play
  // mode) and every other held card (outcome 'declined', mode null). A card
  // passed every turn it's in hand thus leaves declined events and is no longer
  // invisible. Capture only — no play-outcome path reads it, so a throwaway
  // refactor diff stays byte-identical. The card_events fact table consumes this stream.
  function recordDecision(st, p, playedIdx, mode) {
    if (st.__sim) return; // AI-search clones discard decisionLog (cloneForSim) — don't pay the per-play allocation on the hot loop
    if (!st.journal.decisionLog) st.journal.decisionLog = []; // self-heal pre-decision saves
    var turn = st.flow.turnNumber;
    // playedIdx (not the id) picks the chosen copy — a hand may hold two of a card,
    // and exactly one is played.
    st.cards.hands[p].forEach(function (id, i) {
      var chosen = i === playedIdx;
      st.journal.decisionLog.push({ turn: turn, side: p, mode: chosen ? mode : null,
        card: id, outcome: chosen ? 'played' : 'declined' });
    });
  }

  function playCard(st, cardId, mode) {
    if (st.flow.phase !== 'choose-card') throw new Error('not in choose-card phase');
    mode = mode || 'normal';
    var p = st.flow.current;
    var idx = st.cards.hands[p].indexOf(cardId);
    if (idx < 0) throw new Error('card not in hand');
    // House rule: a basic reposition is only allowed when no basic attack is
    // possible — you can't I.shuffle pieces to dodge a fight.
    if (mode === 'reposition' && I.listAttacks(st, p).length > 0)
      throw new Error('cannot reposition while a basic attack is available');
    recordDecision(st, p, idx, mode); // capture the whole hand as a decision BEFORE the played card leaves it
    st.cards.hands[p].splice(idx, 1);
    if (!st.journal.playLog) st.journal.playLog = []; // self-heal pre-metrics saves
    st.journal.playLog.push({ p: p, id: cardId, mode: mode, turn: st.flow.turnNumber,
      seen: (st.cards.seen && st.cards.seen[p] && st.cards.seen[p][cardId]) || 1 });
    var card = sideReg(st, p).byId[cardId];
    var steps;
    if (mode === 'attack') steps = [{ type: 'attack' }];
    else if (mode === 'reposition') steps = [{ type: 'reposition' }];
    else steps = card.steps.map(function (s) { return Object.assign({}, s); });
    st.flow.pending = {
      cardId: cardId,
      mode: mode,
      steps: steps,
      idx: 0,
      acted: 0,                      // actions actually resolved (0 at endTurn = the play did nothing)
      logIdx: st.journal.playLog.length - 1  // back-pointer so endTurn can mark the entry noop
    };
    st.flow.phase = 'step';
    log(st, I.cap(p) + ' plays "' + card.name + '"' +
      (mode === 'attack' ? ' as a direct attack order.' : mode === 'reposition' ? ' as a simple maneuver.' : '.'));
    skipImpossible(st);
    return st;
  }

  function currentStep(st) {
    if (st.flow.phase !== 'step' || !st.flow.pending) return null;
    return st.flow.pending.steps[st.flow.pending.idx] || null;
  }

  // opts.previews === false skips the per-attack I.computeAttack preview — the
  // previews exist for the UI's hover pills; the AI's I.enumerateChoices and the
  // step-possibility checks below never read them (hot path).
  function stepOptions(st, opts) {
    var step = currentStep(st);
    if (!step) return null;
    var p = st.flow.current;
    var card = sideReg(st, p).byId[st.flow.pending.cardId];
    var o = { type: step.type, cardName: card.name, stepIndex: st.flow.pending.idx, stepCount: st.flow.pending.steps.length };
    if (step.type === 'deploy') {
      o.unit = step.unit;
      o.available = st.pieces.reserves[p][step.unit] > 0;
      o.targets = o.available ? I.deployTargets(st, p, step.anywhere) : [];
    } else if (step.type === 'trench') {
      o.available = st.pieces.reserves[p].trench > 0;
      o.targets = o.available ? I.trenchTargets(st, p) : [];
    } else if (step.type === 'attack') {
      o.mod = step.mod || 0;
      o.tieSpare = !!step.tieSpare;
      o.noAdvance = !!step.noAdvance;
      var withPreviews = !(opts && opts.previews === false);
      o.attacks = I.listAttacks(st, p).map(function (a) {
        a = Object.assign({}, a, { mod: step.mod || 0, tieSpare: !!step.tieSpare, noAdvance: !!step.noAdvance });
        if (withPreviews) a.preview = I.computeAttack(st, a);
        return a;
      });
    } else if (step.type === 'reposition') {
      var r = I.listRepositions(st, p);
      o.moves = r.moves; o.swaps = r.swaps;
    } else if (step.type === 'barrage') {
      var b = I.listBarrageTargets(st, p);
      o.trenches = b.trenches; o.forestPieces = b.forestPieces;
    }
    return o;
  }

  function stepHasOptions(st) {
    var o = stepOptions(st, { previews: false });
    if (!o) return false;
    if (o.type === 'deploy' || o.type === 'trench') return o.targets.length > 0;
    if (o.type === 'attack') return o.attacks.length > 0;
    if (o.type === 'reposition') return o.moves.length > 0 || o.swaps.length > 0;
    if (o.type === 'barrage') return o.trenches.length > 0 || o.forestPieces.length > 0;
    return false;
  }

  function skipImpossible(st) {
    while (st.flow.phase === 'step' && currentStep(st) && !stepHasOptions(st)) {
      advanceStep(st);
    }
  }

  function advanceStep(st) {
    if (st.flow.phase !== 'step') return;
    st.flow.pending.idx++;
    if (st.flow.pending.idx >= st.flow.pending.steps.length) endTurn(st);
  }

  // A card must accomplish at least one action if it can — you
  // may skip an individual step, but not skip EVERY step to burn the card for
  // free. A voluntary skip is refused only when nothing has acted yet, this step
  // can act, and no later step can (it's the card's last chance). Steps with no
  // legal option are still auto-skipped by skipImpossible, and a card where no
  // step can act at all still legitimately no-ops.
  function laterStepPlayable(st) {
    var save = st.flow.pending.idx, found = false;
    for (var i = save + 1; i < st.flow.pending.steps.length && !found; i++) {
      st.flow.pending.idx = i;
      if (stepHasOptions(st)) found = true;
    }
    st.flow.pending.idx = save;
    return found;
  }
  function mustPlayStep(st) {
    return st.flow.phase === 'step' && !!st.flow.pending && st.flow.pending.acted === 0 &&
      stepHasOptions(st) && !laterStepPlayable(st);
  }

  function ensureStats(st) { // self-heal saves from before the behaviour counters
    if (!st.journal.stats) st.journal.stats = { attacks: 0, swaps: 0, marches: 0, deploys: 0, firstBlood: null };
    if (!st.journal.lastSwap) st.journal.lastSwap = { red: null, blue: null };
    return st.journal.stats;
  }
  function swapKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

  // Tag the CURRENT play's trace fields as its steps resolve.
  // 'attack' is sticky — once an attack resolves in a play, a later
  // reposition step (e.g. Reckless Maneuvers: attack THEN reposition) must
  // not steal the tag and strand that attack's kill off an 'attack' entry.
  // Terse — omit absent fields rather than writing null (cost ~40B/play).
  function recordPlay(st, action, hex, unit) {
    if (!st.flow.pending) return;
    var entry = st.journal.playLog[st.flow.pending.logIdx];
    if (!entry) return;
    if (action === 'attack' || entry.a !== 'attack') {
      entry.a = action;
      if (hex) entry.h = hex;
    }
    if (unit) entry.u = unit; // deploys always record their unit, even under a later attack tag
  }
  function recordKill(st, n) {
    if (!st.flow.pending || !n) return;
    var entry = st.journal.playLog[st.flow.pending.logIdx];
    if (entry) entry.k = (entry.k || 0) + n;
  }

  function applyStep(st, choice) {
    if (st.flow.phase !== 'step') throw new Error('no step pending');
    var p = st.flow.current;
    ensureStats(st);
    var step = currentStep(st);
    if (choice && choice.skip) {
      if (mustPlayStep(st)) throw new Error('at least one step of a card must be played');
      advanceStep(st);
      if (st.flow.phase === 'step') skipImpossible(st);
      return st;
    }
    if (step.type === 'deploy') {
      var targets = I.deployTargets(st, p, step.anywhere);
      if (I.Pieces.reserve(st, p, step.unit) <= 0 || targets.indexOf(choice.hex) < 0) throw new Error('invalid deploy');
      I.Pieces.spendReserve(st, p, step.unit);
      I.Pieces.place(st, choice.hex, step.unit, p);
      st.journal.stats.deploys++;
      recordPlay(st, 'deploy', choice.hex, step.unit);
      ensureUnitMetrics(st)[step.unit].dep.push(st.flow.turnNumber);
      log(st, I.cap(p) + ' deploys ' + I.UNITS[step.unit].name + ' at ' + I.hexLabel(choice.hex) + '.');
    } else if (step.type === 'trench') {
      if (I.Pieces.reserve(st, p, 'trench') <= 0 || I.trenchTargets(st, p).indexOf(choice.hex) < 0) throw new Error('invalid trench hex');
      var dirs = choice.dirs;
      var pairOk = dirs && dirs.length === 2 && I.trenchOrientations(st, choice.hex).some(function (pr) {
        return (pr[0] === dirs[0] && pr[1] === dirs[1]) || (pr[0] === dirs[1] && pr[1] === dirs[0]);
      });
      if (!pairOk) throw new Error('invalid trench orientation');
      I.Pieces.spendReserve(st, p, 'trench');
      if (!st.pieces.trenches[choice.hex]) st.pieces.trenches[choice.hex] = [];
      st.pieces.trenches[choice.hex].push({ dirs: dirs.slice(), owner: p }); // owner is UI-only info; trenches aid any defender
      log(st, I.cap(p) + ' digs a trench at ' + I.hexLabel(choice.hex) +
        (st.pieces.trenches[choice.hex].length > 1 ? ' — the hex is now double-trenched.' : '.'));
    } else if (step.type === 'attack') {
      var legal = I.listAttacks(st, p).some(function (a) {
        return a.from === choice.from && a.to === choice.to && (a.via || null) === (choice.via || null);
      });
      if (!legal) throw new Error('invalid attack');
      I.resolveAttack(st, { from: choice.from, to: choice.to, via: choice.via || null, mod: step.mod || 0, tieSpare: !!step.tieSpare, noAdvance: !!step.noAdvance });
      if (st.flow.phase === 'skirmish-over') return st;
    } else if (step.type === 'reposition') {
      var r = I.listRepositions(st, p);
      if (choice.swap) {
        var ok = r.swaps.some(function (s) { return (s.a === choice.a && s.b === choice.b) || (s.a === choice.b && s.b === choice.a); });
        if (!ok) throw new Error('invalid swap');
        I.Pieces.swap(st, choice.a, choice.b);
        st.journal.lastSwap[p] = swapKey(choice.a, choice.b);
        st.journal.stats.swaps++;
        recordPlay(st, 'swap', choice.a);
        log(st, I.cap(p) + ' swaps the units at ' + I.hexLabel(choice.a) + ' and ' + I.hexLabel(choice.b) + '.');
      } else {
        var okm = r.moves.some(function (m) { return m.from === choice.from && m.to === choice.to; });
        if (!okm) throw new Error('invalid move');
        I.Pieces.advance(st, choice.from, choice.to);
        st.journal.stats.marches++;
        recordPlay(st, 'march', choice.to);
        log(st, I.cap(p) + ' marches ' + I.UNITS[I.Pieces.unitAt(st, choice.to).type].name + ' from ' + I.hexLabel(choice.from) + ' to ' + I.hexLabel(choice.to) + '.');
      }
    } else if (step.type === 'barrage') {
      var b = I.listBarrageTargets(st, p);
      if (choice.trenchHex) {
        var ti = choice.trenchIdx || 0;
        var okT = b.trenches.some(function (t) { return t.hex === choice.trenchHex && t.idx === ti; });
        if (!okT) throw new Error('invalid barrage');
        st.pieces.trenches[choice.trenchHex].splice(ti, 1);
        if (!st.pieces.trenches[choice.trenchHex].length) delete st.pieces.trenches[choice.trenchHex];
        log(st, I.cap(p) + "'s naval barrage obliterates a trench at " + I.hexLabel(choice.trenchHex) + '.');
      } else if (choice.pieceId) {
        var pc = st.board.terrainPieces.filter(function (x) { return x.id === choice.pieceId && !x.removed; })[0];
        if (!pc || b.forestPieces.indexOf(pc) < 0) throw new Error('invalid barrage');
        pc.removed = true;
        pc.edgeKeys.forEach(function (ek) { delete st.board.terrainEdges[ek]; });
        log(st, I.cap(p) + "'s naval barrage burns away the forest at " + I.hexLabel(pc.edgeKeys[0].split('>')[0]) + '.');
      } else throw new Error('invalid barrage choice');
    }
    if (st.flow.pending) st.flow.pending.acted = (st.flow.pending.acted || 0) + 1;
    advanceStep(st);
    if (st.flow.phase === 'step') skipImpossible(st);
    return st;
  }

  function endTurn(st) {
    var p = st.flow.current;
    // Decisiveness: did this turn flip the field-score lead to the OTHER side?
    // (a swing to a tie doesn't count as a change)
    var fr = fieldScore(st, 'red'), fb = fieldScore(st, 'blue');
    var lead = fr > fb ? 'red' : (fb > fr ? 'blue' : null);
    if (lead) {
      if (st.journal.lastLeader && lead !== st.journal.lastLeader) st.journal.leadChanges = (st.journal.leadChanges || 0) + 1;
      st.journal.lastLeader = lead;
    }
    if (st.journal.fsTimeline) st.journal.fsTimeline.push([fr, fb]); // absent on sims + old saves
    var entry = st.journal.playLog[st.flow.pending.logIdx];
    if (entry && st.journal.lastLeader) entry.ld = st.journal.lastLeader; // leader after this turn (carries through ties)
    if (st.flow.pending.acted === 0) {
      // The play resolved zero actions — an effective skipped turn. Bill wants
      // these visible in the journal AND measurable in the card report.
      log(st, I.cap(p) + ' finds no opening — the card is spent to no effect.');
      if (entry && entry.id === st.flow.pending.cardId) entry.noop = true;
    }
    st.cards.removed[p].push(st.flow.pending.cardId);
    st.flow.pending = null;
    // discard remaining hand
    st.cards.discards[p] = st.cards.discards[p].concat(st.cards.hands[p]);
    st.cards.hands[p] = [];
    st.flow.current = I.other(p);
    st.flow.turnNumber++;
    st.flow.phase = 'choose-card';
    drawHand(st, st.flow.current); // may end skirmish by attrition
  }

  /* ---------- play surface ----------
     The read boundary the UI consumes instead of poking the skirmish state's
     internals. The UI depends on THIS stable surface, not on the block layout
     underneath it — so re-shaping st is a one-place edit here, and grepping the
     UI for state reach-through stays clean. Actions still go through the engine
     API (playCard/applyStep/…) with the raw handle at v.st; serialization reads
     v.st too. Getters return live references, so a view built once per render
     reflects the current state. */
  function view(st) {
    return {
      st: st, // the raw handle — for E.* action calls and (de)serialization only
      get phase() { return st.flow.phase; },
      get current() { return st.flow.current; },
      get second() { return st.flow.second; },
      get turnNumber() { return st.flow.turnNumber; },
      get pending() { return st.flow.pending; },
      get seed() { return st.seed; },
      get mapName() { return st.mapName; },
      get mapIndex() { return st.mapIndex; },
      get boardShape() { return st.board.boardShape; },
      get terrainEdges() { return st.board.terrainEdges; },
      get terrainPieces() { return st.board.terrainPieces; },
      get units() { return st.pieces.units; },
      get trenches() { return st.pieces.trenches; },
      get log() { return st.journal.log; },
      get battle() { return st.battle; },
      get skirmishWinner() { return st.result.skirmishWinner; },
      get winType() { return st.result.winType; },
      hq: function (p) { return st.board.hq[p]; },
      hqAlive: function (p) { return st.board.hqAlive[p]; },
      reserves: function (p) { return st.pieces.reserves[p]; },
      hand: function (p) { return st.cards.hands[p]; },
      removed: function (p) { return st.cards.removed[p]; }
    };
  }

  /* shared-namespace exports */
  I.view = view;
  I.newBattle = newBattle;
  I.buildDeck = buildDeck;
  I.newSkirmish = newSkirmish;
  I.copyReserves = copyReserves;
  I.log = log;
  I.cardsRemaining = cardsRemaining;
  I.drawHand = drawHand;
  I.fieldScore = fieldScore;
  I.endByAttrition = endByAttrition;
  I.finishSkirmish = finishSkirmish;
  I.HOOKS = HOOKS;
  I.concede = concede;
  I.concedeAdvised = concedeAdvised;
  I.playCard = playCard;
  I.currentStep = currentStep;
  I.stepOptions = stepOptions;
  I.stepHasOptions = stepHasOptions;
  I.skipImpossible = skipImpossible;
  I.advanceStep = advanceStep;
  I.laterStepPlayable = laterStepPlayable;
  I.mustPlayStep = mustPlayStep;
  I.ensureStats = ensureStats;
  I.swapKey = swapKey;
  I.initUnitMetrics = initUnitMetrics;
  I.ensureUnitMetrics = ensureUnitMetrics;
  I.recordPlay = recordPlay;
  I.recordKill = recordKill;
  I.applyStep = applyStep;
  I.endTurn = endTurn;
})(typeof window !== 'undefined' ? window : globalThis);
