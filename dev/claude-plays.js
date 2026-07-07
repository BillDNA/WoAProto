#!/usr/bin/env node
/* dev/claude-plays.js — an LLM plays War of Attrition (V1 rewrite).
   Plays a single battle or a first-to-N MATCH, printing every decision live
   with timestamps + a scoreboard; appends JSON-lines records as battles
   finish (crash-safe); writes one readable .md transcript per run.

   Usage: node dev/claude-plays.js [options]
     --map <filter>     map name filter, case-insensitive (default: first map in
                        the content roster)
     --red <spec>       easy|normal|hard (or any maps.js "ai" row) = heuristic AI;
     --blue <spec>      anything else (haiku|sonnet|opus|model id) = LLM.
                        Defaults: --red haiku --blue normal
     --match [w]        MATCH mode: first to w battle wins (default 3 when the
                        flag is present; omit the flag for a single battle)
     --effort <level>   low|medium|high|xhigh|max for the LLM calls (shared;
     --red-effort/--blue-effort override per side)
     --seed <n>         match seed (default 1234)
     --deck <id>        play with content/decks/<id>.js instead of the active deck
     --mapset <id>      restrict the roster to a content/mapsets/<id>.js set
     --k <n>            step options shown to the LLM: the n most promising of
                        the full legal list, engine-ranked (default 15; attack
                        steps are never truncated). --full-options disables it.
     --cold             one claude -p process per decision (the V0 transport)
                        instead of one persistent session per side per match
     --max-turns <n>    per-battle turn cap (default 60)
     --mock             deterministic fake transport (offline loop test)
     --out <file>       JSONL master log (default logs/reports/battle/claude-plays-log.jsonl)
     --typical-n <n>    baseline battles for the typicality footer (default 40;
                        0 skips; results cached per map+version+n)

   TRANSPORT (V1): each LLM side gets ONE persistent claude session for the
   whole match (dev/llm-session.js) — the rules ride the system prompt once and
   later turns hit the prompt cache; the model remembers its own match. Any
   session failure falls back to the cold per-call transport (dev/llm-client.js)
   and the run never crashes (fail-open all the way down).

   HONESTY INVARIANT: the model only ever sees what a player sees — own hand,
   board, reserves, spent piles, and the COUNT of the enemy's hidden cards.
   stateView() is the single serialization point; dev/claude-plays.test.js
   plants a sentinel card in the enemy hand and asserts it never leaks into any
   prompt surface. The ranked option list prunes DOMINATED moves, never
   strategic ones (attack steps are never truncated; skip is always listed),
   and says how many legal moves it was cut from. */
'use strict';

const fs = require('fs');
const path = require('path');

/* ---------- CLI args (parsed before the engine loads: --deck needs it) ---------- */
function parseArgs(argv) {
  const a = { map: '', red: 'haiku', blue: 'normal', seed: 1234, maxTurns: 60, mock: false, typicalN: 40,
    effort: '', redEffort: '', blueEffort: '', deck: '', mapset: '', k: 15, fullOptions: false,
    cold: false, matchWins: 0, out: '' };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--map') a.map = argv[++i] || '';
    else if (k === '--red') a.red = argv[++i];
    else if (k === '--blue') a.blue = argv[++i];
    else if (k === '--seed') a.seed = Number(argv[++i]) | 0;
    else if (k === '--max-turns') a.maxTurns = Number(argv[++i]) || 60;
    else if (k === '--typical-n') a.typicalN = Math.max(0, Number(argv[++i]) | 0);
    else if (k === '--effort') a.effort = String(argv[++i] || '').toLowerCase();
    else if (k === '--red-effort') a.redEffort = String(argv[++i] || '').toLowerCase();
    else if (k === '--blue-effort') a.blueEffort = String(argv[++i] || '').toLowerCase();
    else if (k === '--deck') a.deck = argv[++i] || '';
    else if (k === '--mapset') a.mapset = argv[++i] || '';
    else if (k === '--k') a.k = Math.max(3, Number(argv[++i]) | 0);
    else if (k === '--full-options') a.fullOptions = true;
    else if (k === '--cold') a.cold = true;
    else if (k === '--match') a.matchWins = /^\d+$/.test(argv[i + 1] || '') ? +argv[++i] : 3;
    else if (k === '--mock') a.mock = true;
    else if (k === '--out') a.out = path.resolve(argv[++i]);
    else { console.error('unknown option: ' + k); process.exit(1); }
  }
  ['effort', 'redEffort', 'blueEffort'].forEach(function (f) {
    if (a[f] && !['low', 'medium', 'high', 'xhigh', 'max'].includes(a[f])) {
      console.error('--' + f.replace('E', '-e') + ' must be low|medium|high|xhigh|max'); process.exit(1);
    }
  });
  a.redEffort = a.redEffort || a.effort;
  a.blueEffort = a.blueEffort || a.effort;
  return a;
}

// --deck: the engine snapshots the ACTIVE deck at require time, so to play a
// different deck we pre-populate WOA_CONTENT ourselves (same files, same sort
// order the engine's own node loader uses) and flip the active flag first.
function preloadContent(deckId) {
  global.WOA_CONTENT = { maps: [], cards: [], decks: [], mapsets: [] };
  ['decks', 'maps', 'mapsets'].forEach(function (kind) {
    const dir = path.join(__dirname, '..', 'game', 'content', kind);
    let files = [];
    try { files = fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f); }).sort(); } catch (e) { return; }
    files.forEach(function (f) { require(path.join(dir, f)); });
  });
  if (deckId) {
    const decks = global.WOA_CONTENT.decks;
    const want = decks.filter(function (d) { return d.id === deckId; })[0];
    if (!want) {
      console.error('--deck "' + deckId + '" not found. Available: ' + decks.map(function (d) { return d.id; }).join(', '));
      process.exit(1);
    }
    decks.forEach(function (d) { d.active = (d === want); });
  }
}

const ARGS = parseArgs(process.argv);
if (ARGS.deck || ARGS.mapset) preloadContent(ARGS.deck);
const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
const llm = require(path.join(__dirname, 'llm-client.js'));
const { LlmSession } = require(path.join(__dirname, 'llm-session.js'));

const LOG_DIR = path.join(__dirname, '..', 'logs', 'reports', 'battle');
const TRANSCRIPT_DIR = path.join(LOG_DIR, E.VERSION);
const TYP_CACHE = path.join(LOG_DIR, '.typicality-cache.json');
if (!ARGS.out) ARGS.out = path.join(LOG_DIR, 'claude-plays-log.jsonl');

const HEURISTIC = {};
Object.keys(E.AI_PRESETS).forEach(function (k) { HEURISTIC[k] = true; });
const DIRN = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function stamp() { return new Date().toTimeString().slice(0, 8); }
function say(msg) { console.log('[' + stamp() + '] ' + msg); }

/* ---------- rules blurb (1.0 — keep in lockstep with game/README.md) ---------- */
const RULES = [
  'WAR OF ATTRITION — RULES IN BRIEF (v' + E.VERSION + ')',
  'Two sides (Red, Blue) fight on a small hex board (grid refs A1, B3, ...). Each side has one',
  'HQ hex and identical forces: 7 Infantry (attack 1, defense 1, support 1, worth 1 VP),',
  '2 Cavalry (attack 3, defense 0, support 0, 2 VP), 1 Artillery (attack 0, defense 0,',
  'support 2, 3 VP), and 3 trenches. One unit per hex; units never stand on HQ hexes.',
  '',
  'TURNS: each turn you draw a hand of order cards, play exactly ONE (its steps resolve in',
  'order), and discard the rest (discards reshuffle back into your deck later; the PLAYED card',
  'is removed from the game forever). Every turn burns one card, so the battle is a countdown.',
  'House rule: any card may instead resolve as one basic Attack, or — ONLY when you have no',
  'legal attack anywhere — one basic Reposition. Individual card steps may be skipped unless',
  'that would waste the whole card while an action is possible.',
  '',
  'ACTIONS:',
  '- Deploy: place a reserve unit on an empty hex adjacent to a hex you control (your units or',
  '  your living HQ). Control does NOT extend across a river. Airdrop may place on ANY empty hex.',
  '- Reposition: march one of your units to an adjacent empty hex, OR swap two adjacent',
  '  friendly units of DIFFERENT types (same-type swaps change nothing and are illegal).',
  '- Attack: one of your units strikes an adjacent enemy unit or HQ.',
  '  Attacker power = its attack + support values of your OTHER units adjacent to the target',
  '  + 1 if your HQ is adjacent to the target + 1 if attacking out across a forest side',
  '  + any card modifier. BUT attacker support cannot cross a TRENCHED border to reach the',
  '  fight (that is all a trench does — it denies attacker support on its two covered edges;',
  '  it adds NO defense and never blocks the attack itself; whoever holds it is irrelevant).',
  '  Defender power = its defense + support of defender units adjacent to the target + 1 if',
  '  the defending HQ is adjacent + 1 if defending across a mountain side.',
  '  Higher power wins and the loser is destroyed (winner advances into the hex);',
  '  a TIE destroys BOTH units. The HQ itself has defense 0 (support still counts); winning',
  '  OR tying an attack on the HQ captures it and wins the battle instantly.',
  '- Units adjacent to any HQ may move, swap, or attack THROUGH it to hexes on its far side.',
  '- Barrage: removes any one trench or forest piece anywhere on the board (never a river).',
  '',
  'TERRAIN is directional and belongs to a hex: forest in hex X = +1 attack when X\'s occupant',
  'attacks out across a marked side; mountain in X = +1 defense when X is attacked across a',
  'marked side. RIVERS block nothing in combat — support, attacks and moves cross freely —',
  'their only effect is that you cannot DEPLOY to a hex reachable only across the water.',
  '',
  'VICTORY: capture the enemy HQ, or — when a player cannot draw a hand (deck spent) — the',
  'side with more VP of SURVIVING UNITS ON THE BOARD wins (infantry 1 / cavalry 2 /',
  'artillery 3). Reserves never deployed count for nothing. An attrition TIE goes to whoever',
  'moved SECOND in that battle.'
].join('\n');

function sysPrompt(side, matchWins) {
  return 'You are a competitive player of the board game War of Attrition, playing the ' +
    side.toUpperCase() + ' side' +
    (matchWins ? ' in a first-to-' + matchWins + '-wins match (you will play several battles against the same opponent; learn from earlier games)' : '') +
    '. Decide quickly and decisively; always answer in exactly the requested format.\n\n' + RULES;
}

const CHOICE_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    choice: { type: 'integer', description: 'the number of the option you pick' },
    why: { type: 'string', description: 'one short sentence of reasoning' }
  },
  required: ['choice', 'why']
});

/* ---------- honest state serialization (what a player can see) ---------- */
function unitList(st, p) {
  const out = [];
  Object.keys(st.units).forEach(function (h) {
    if (st.units[h].owner === p) out.push({ h: h, name: E.UNITS[st.units[h].type].name });
  });
  out.sort(function (a, b) { return E.hexLabel(a.h) < E.hexLabel(b.h) ? -1 : 1; });
  return out.map(function (u) { return u.name + ' at ' + E.hexLabel(u.h); }).join(', ') || 'none';
}
function reservesStr(st, p) {
  const r = st.reserves[p];
  return Object.keys(E.UNITS).map(function (t) { return r[t] + ' ' + E.UNITS[t].name; }).join(', ') +
    ', ' + r.trench + ' trenches';
}
function spentStr(st, p) {
  return st.removed[p].map(function (id) { return E.CARD_BY_ID[id].name; }).join(', ') || 'none yet';
}
function rowsStr(st) {
  const s = E.SHAPES[st.boardShape];
  const counts = {};
  s.list.forEach(function (k) { const r = E.parseKey(k)[1]; counts[r] = (counts[r] || 0) + 1; });
  return s.rowRs.map(function (r, i) {
    const L = String.fromCharCode(65 + i);
    return L + '1-' + L + counts[r];
  }).join(', ');
}
function stateView(st, p, withHand, match) {
  const en = E.other(p);
  const L = [];
  L.push('=== BATTLE STATE (turn ' + st.turnNumber + ') ===');
  if (match && match.targetWins) {
    L.push('Match score (first to ' + match.targetWins + '): Red ' + match.wins.red + ' — Blue ' + match.wins.blue +
      '. This is battle ' + (match.battlesPlayed + 1) + '.');
  }
  L.push('Map "' + st.mapName + '". Board rows top-to-bottom: ' + rowsStr(st) + '.');
  L.push('You are ' + p.toUpperCase() + ' and it is your turn. ' + cap(st.second) +
    ' moved second this battle and wins attrition ties.');
  L.push('Field score (VP of surviving units on board): Red ' + E.fieldScore(st, 'red') +
    ', Blue ' + E.fieldScore(st, 'blue') + '.');
  L.push('Cards left (deck+discard+hand; one burns per turn): Red ' + E.cardsRemaining(st, 'red') +
    ', Blue ' + E.cardsRemaining(st, 'blue') + '.');
  ['red', 'blue'].forEach(function (s) {
    L.push(cap(s) + ' HQ at ' + E.hexLabel(st.hq[s]) + (st.hqAlive[s] ? '' : ' (FALLEN)') + '.');
  });
  L.push('Red units: ' + unitList(st, 'red') + '.');
  L.push('Blue units: ' + unitList(st, 'blue') + '.');
  L.push('Red reserves: ' + reservesStr(st, 'red') + '. Blue reserves: ' + reservesStr(st, 'blue') + '.');
  const tr = [];
  Object.keys(st.trenches).forEach(function (h) {
    st.trenches[h].forEach(function (t) {
      tr.push(E.hexLabel(h) + ' (edges ' + t.dirs.map(function (d) { return DIRN[d]; }).join('+') + ')');
    });
  });
  L.push('Trenches (deny attacker support across their edges): ' + (tr.join('; ') || 'none') + '.');
  const te = st.terrainPieces.filter(function (pc) { return !pc.removed; }).map(function (pc) {
    const hex = pc.edgeKeys[0].split('>')[0];
    const dirs = pc.edgeKeys.map(function (ek) { return DIRN[+ek.split('>')[1]]; }).join(',');
    return (pc.t === 'F' ? 'Forest' : pc.t === 'M' ? 'Mountain' : 'River') + ' in ' + E.hexLabel(hex) + ' (sides ' + dirs + ')';
  });
  L.push('Terrain: ' + (te.join('; ') || 'none') + '.');
  L.push('Red spent orders (removed from game): ' + spentStr(st, 'red') + '.');
  L.push('Blue spent orders: ' + spentStr(st, 'blue') + '.');
  L.push(cap(en) + ' holds ' + st.hands[en].length + ' hidden cards.');
  if (withHand) {
    L.push('Your hand:');
    st.hands[p].forEach(function (id) {
      L.push('- ' + E.CARD_BY_ID[id].name + ': ' + E.CARD_BY_ID[id].text);
    });
  }
  return L.join('\n');
}

/* ---------- move descriptions ---------- */
function cardOptions(st, p) {
  const hand = st.hands[p];
  const counts = {};
  hand.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
  const opts = [];
  Object.keys(counts).forEach(function (id) {
    const c = E.CARD_BY_ID[id];
    opts.push({ cardId: id, mode: 'normal',
      desc: 'Play "' + c.name + '"' + (counts[id] > 1 ? ' (' + counts[id] + ' copies in hand)' : '') + ' — ' + c.text });
  });
  const burn = hand.slice().sort(function (a, b) { return (E.CARD_KEEP[a] || 5) - (E.CARD_KEEP[b] || 5); })[0];
  const bn = E.CARD_BY_ID[burn].name;
  opts.push({ cardId: burn, mode: 'attack',
    desc: 'Basic Attack — burn "' + bn + '" to order one ordinary attack instead of its printed action.' });
  // House rule (engine): a basic reposition is only legal when no basic attack exists.
  if (E.listAttacks(st, p).length === 0)
    opts.push({ cardId: burn, mode: 'reposition',
      desc: 'Basic Reposition — burn "' + bn + '" to make one ordinary march or swap instead of its printed action.' });
  return opts;
}

function stepHeader(so) {
  let extra = '';
  if (so.type === 'attack') {
    const bits = [];
    if (so.mod) bits.push('card gives the attacker ' + (so.mod > 0 ? '+' : '') + so.mod);
    if (so.tieSpare) bits.push('your attacker survives a tie');
    if (so.noAdvance) bits.push('your attacker never advances into the hex');
    if (bits.length) extra = ' (' + bits.join('; ') + ')';
  }
  return 'Resolving card "' + so.cardName + '", step ' + (so.stepIndex + 1) + ' of ' + so.stepCount +
    ': ' + so.type + extra + '.';
}

function describeChoice(st, so, c) {
  if (c.skip) return 'Skip this step';
  if (so.type === 'deploy') {
    return 'Deploy ' + E.UNITS[so.unit].name + ' at ' + E.hexLabel(c.hex);
  }
  if (so.type === 'trench') {
    return 'Dig a trench at ' + E.hexLabel(c.hex) + ' covering edges ' +
      DIRN[c.dirs[0]] + '+' + DIRN[c.dirs[1]];
  }
  if (so.type === 'attack') {
    const a = so.attacks.find(function (x) {
      return x.from === c.from && x.to === c.to && (x.via || null) === (c.via || null);
    });
    const pv = a && a.preview;
    const atkName = E.UNITS[st.units[c.from].type].name;
    let s = 'Attack: ' + atkName + ' at ' + E.hexLabel(c.from) + ' strikes ' +
      (pv && pv.defenderIsHQ ? 'the enemy HQ' : 'enemy ' + (pv ? E.UNITS[pv.defenderUnit].name : 'unit')) +
      ' at ' + E.hexLabel(c.to) + (c.via ? ' through the HQ at ' + E.hexLabel(c.via) : '');
    if (pv) {
      s += ' — power ' + pv.attackerPower + ' vs ' + pv.defenderPower + ': ';
      if (pv.outcome === 'attacker') s += pv.defenderIsHQ ? 'you CAPTURE THE HQ AND WIN' : 'defender destroyed';
      else if (pv.outcome === 'defender') s += 'your attacker is DESTROYED';
      else s += pv.defenderIsHQ ? 'tie — you CAPTURE THE HQ AND WIN'
        : (so.tieSpare ? 'tie — defender destroyed, your attacker survives' : 'tie — BOTH destroyed');
    }
    return s;
  }
  if (so.type === 'reposition') {
    if (c.swap) {
      return 'Swap ' + E.UNITS[st.units[c.a].type].name + ' at ' + E.hexLabel(c.a) +
        ' with ' + E.UNITS[st.units[c.b].type].name + ' at ' + E.hexLabel(c.b);
    }
    return 'March ' + E.UNITS[st.units[c.from].type].name + ' from ' + E.hexLabel(c.from) +
      ' to ' + E.hexLabel(c.to);
  }
  if (so.type === 'barrage') {
    if (c.trenchHex) return 'Barrage: destroy the trench at ' + E.hexLabel(c.trenchHex);
    const pc = st.terrainPieces.find(function (x) { return x.id === c.pieceId; });
    return 'Barrage: burn away the forest at ' + E.hexLabel(pc.edgeKeys[0].split('>')[0]);
  }
  return JSON.stringify(c);
}

function numbered(descs) {
  return descs.map(function (d, i) { return i + '. ' + d; }).join('\n');
}

// The V1 option diet: the K most promising choices of the full legal list,
// picked by the engine's own eval (E.rankChoices — attack steps never truncate,
// HQ-relevant moves force-included, skip always listed when legal). Presented
// in stable board order, NOT strength order, so the model still has to think.
function stepChoiceList(st, k, fullOptions) {
  const all = E.enumerateChoices(st);
  if (fullOptions || all.length <= k + 1) return { choices: all, total: all.length, pruned: false };
  const ranked = E.rankChoices(st, { k: k });
  const keep = ranked.shown.map(function (x) { return JSON.stringify(x.choice); });
  const choices = all.filter(function (c) { return keep.indexOf(JSON.stringify(c)) >= 0 || c.skip; });
  return { choices: choices, total: all.length, pruned: choices.length < all.length };
}

/* ---------- transports ---------- */
function mockSend(request) {
  return Promise.resolve({
    text: request.outputSchema
      ? JSON.stringify({ choice: 0, why: 'mock: always the first option' })
      : 'Mock felt-notes: the countdown felt strong; nothing felt luck-driven because the dice are imaginary. Suggested change: use a real model.',
    inputTokens: 0, outputTokens: 0, finishReason: 'stop'
  });
}

function looseJson(text) {
  if (!text) return null;
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { return null; }
}

// One transport per side: a persistent session when possible, cold calls as
// the ever-present fallback. Fail-open at every layer.
function makeSideTransport(args, side, matchWins) {
  const model = side === 'red' ? args.red : args.blue;
  const effort = side === 'red' ? args.redEffort : args.blueEffort;
  const system = sysPrompt(side, matchWins);
  let session = null, sessionDead = args.cold || args.mock;
  let coldCalls = 0, sessionCalls = 0;
  async function send(userMessage, wantSchema) {
    if (args.mock) return mockSend({ outputSchema: wantSchema ? CHOICE_SCHEMA : null });
    if (!sessionDead) {
      if (!session) session = new LlmSession({ model: model, systemPrompt: system, effort: effort || undefined });
      const res = await session.ask(userMessage, wantSchema ? { outputSchema: CHOICE_SCHEMA } : {});
      if (res.finishReason !== 'error') { sessionCalls++; return res; }
      sessionDead = true;
      say(side + ': persistent session died — falling back to cold calls for the rest of the run');
    }
    coldCalls++;
    return llm.send({ systemPrompt: system, userMessage: userMessage, model: model,
      outputSchema: wantSchema ? CHOICE_SCHEMA : undefined, effort: effort || undefined });
  }
  return {
    send: send,
    close: function () { if (session) session.close(); },
    stats: function () { return { sessionCalls: sessionCalls, coldCalls: coldCalls }; }
  };
}

/* ---------- typicality (cached per map+version+n) ---------- */
function typicalityBaseline(map, n) {
  const key = map.name + '|' + E.VERSION + '|' + n;
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(TYP_CACHE, 'utf8')); } catch (e) {}
  if (cache[key]) return cache[key];
  const base = E.balanceMap(map, n, { diffRed: 'hard', diffBlue: 'hard' });
  delete base.cards; // the footer never reads them; keep the cache lean
  cache[key] = base;
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); fs.writeFileSync(TYP_CACHE, JSON.stringify(cache)); } catch (e) {}
  return base;
}
function typicalitySection(map, st, n) {
  if (n <= 0 || st.phase !== 'battle-over') return [];
  const base = typicalityBaseline(map, n);
  const done = Math.max(1, n - base.unfinished);
  const pct = function (x) { return Math.round(100 * x / done); };
  const per = function (x) { return x / done; };
  const avgTurns = per(base.turns), hqPct = pct(base.hqWins), redPct = pct(base.redWins), zeroPct = pct(base.zeroKill);
  const avgAtk = per(base.attacks), avgVP = per(base.vpDiff);
  const kills = st.vp.red + st.vp.blue;
  const gAtk = (st.stats && st.stats.attacks) || 0;
  const gVP = Math.abs(E.fieldScore(st, 'red') - E.fieldScore(st, 'blue'));
  const dT = avgTurns ? Math.round(100 * (st.turnNumber - avgTurns) / avgTurns) : 0;
  const lenRead = Math.abs(dT) <= 15 ? 'typical length'
    : dT < 0 ? Math.abs(dT) + '% shorter — quicker than usual' : dT + '% longer — grindier than usual';
  let endRead;
  if (st.winType === 'hq') endRead = hqPct < 25 ? 'HQ capture is uncommon here (' + hqPct + '%) — decisive' : 'HQ capture, in line with the map';
  else if (st.winType === 'attrition') endRead = hqPct >= 50 ? 'attrition, though this map often ends by HQ (' + hqPct + '%)' : 'attrition — typical for this map';
  else endRead = st.winType;
  const killRead = kills === 0 ? 'a zero-kill game (' + zeroPct + '% of baseline games are)' : 'had combat (' + zeroPct + '% of baseline games have none)';
  const cmp = function (g, avg) { return avg === 0 ? '—' : (g >= avg * 1.25 ? 'above baseline' : g <= avg * 0.75 ? 'below baseline' : 'about average'); };
  const flags = [];
  if (Math.abs(dT) > 25) flags.push(dT < 0 ? 'much shorter than average' : 'much longer than average');
  if (st.winType === 'hq' && hqPct < 25) flags.push('ended by a rare HQ capture');
  if (st.winType === 'attrition' && hqPct >= 60) flags.push('went to attrition on an HQ-happy map');
  if (kills === 0 && zeroPct < 15) flags.push('a zero-kill game where the map usually sees combat');
  if (kills > 0 && zeroPct >= 60) flags.push('a fighting game on a map that usually stalemates');
  const verdict = flags.length === 0
    ? 'A fairly **typical** game for this map.'
    : 'An **atypical** game — ' + flags.join('; ') + '.';
  return ['', '## Typicality vs the map baseline', '',
    '_Baseline: ' + n + ' hard-AI self-play battles on "' + map.name + '" (rules ' + E.VERSION +
    '), folded through the same aggregation as the Balance Dashboard (cached)._', '',
    '| Metric | This game | Baseline | Read |', '|---|--:|--:|---|',
    '| Ending | ' + cap(st.battleWinner) + ' by ' + st.winType + ' | ' + hqPct + '% HQ / ' + (100 - hqPct) + '% attrition | ' + endRead + ' |',
    '| Length | T' + st.turnNumber + ' | ~' + avgTurns.toFixed(0) + ' avg | ' + lenRead + ' |',
    '| Winner side | ' + cap(st.battleWinner) + ' | red ' + redPct + '% | map leans ' + (redPct >= 50 ? 'red' : 'blue') + ' ' + Math.max(redPct, 100 - redPct) + '% |',
    '| Kills (units lost) | ' + kills + ' | ' + zeroPct + '% zero-kill | ' + killRead + ' |',
    '| Attacks resolved | ' + gAtk + ' | ~' + avgAtk.toFixed(1) + ' avg | ' + cmp(gAtk, avgAtk) + ' |',
    '| Final VP gap | ' + gVP + ' | ~' + avgVP.toFixed(1) + ' avg | ' + cmp(gVP, avgVP) + ' |',
    '', verdict];
}

/* ---------- one battle ---------- */
async function playBattle(st, args, transports, matchInfo, usage) {
  const decisions = [];
  let fallbacks = 0;
  let logIdx = 0;
  function flushLog() {
    while (logIdx < st.log.length) console.log('           | ' + st.log[logIdx++].msg);
  }
  function scoreboard() {
    say('  score R ' + E.fieldScore(st, 'red') + ' - B ' + E.fieldScore(st, 'blue') +
      ' · cards R ' + E.cardsRemaining(st, 'red') + ' / B ' + E.cardsRemaining(st, 'blue') +
      (matchInfo.targetWins ? ' · match R ' + matchInfo.wins.red + ' - B ' + matchInfo.wins.blue : ''));
  }
  flushLog();

  function record(turn, kind, side, desc, why, fallback) {
    decisions.push({ turn: turn, side: side, kind: kind, choice: desc, why: why, fallback: !!fallback });
    if (fallback) fallbacks++;
  }

  async function ask(side, userMessage, nOptions) {
    const res = await transports[side].send(userMessage, true);
    usage.inputTokens += res.inputTokens; usage.outputTokens += res.outputTokens;
    if (res.finishReason === 'error') return { ok: false };
    const o = looseJson(res.text);
    const ch = o && Number(o.choice);
    if (!o || !Number.isInteger(ch) || ch < 0 || ch >= nOptions) return { ok: false };
    return { ok: true, choice: ch, why: String(o.why || '').trim() };
  }

  function heuristicTurn(side, diff) {
    const plan = E.aiPlanTurn(st, diff);
    if (!plan) return false;
    const turn = st.turnNumber;
    const mode = plan.mode || 'normal';
    E.playCard(st, plan.cardId, mode);
    const desc = '"' + E.CARD_BY_ID[plan.cardId].name + '"' + (mode !== 'normal' ? ' as basic ' + mode : '');
    say('T' + turn + ' ' + side + ' [' + diff + ']: plays ' + desc);
    decisions.push({ turn: turn, side: side, kind: 'card', choice: desc, why: '', fallback: false });
    let g = 0;
    while (st.phase === 'step' && g++ < 12) {
      const c = plan.choices.shift() || { skip: true };
      try { E.applyStep(st, c); }
      catch (e) { try { E.applyStep(st, { skip: true }); } catch (e2) { break; } }
    }
    flushLog();
    return true;
  }

  async function llmTurn(side, model) {
    const turn = st.turnNumber;
    // 1. card pick
    const opts = cardOptions(st, side);
    const um = stateView(st, side, true, matchInfo) +
      '\n\nChoose ONE order to play this turn.\nOptions:\n' +
      numbered(opts.map(function (o) { return o.desc; })) +
      '\n\nPick the option number.';
    const r = await ask(side, um, opts.length);
    let pick, why, fb = false;
    if (r.ok) { pick = opts[r.choice]; why = r.why; }
    else {
      const plan = E.aiPlanTurn(st, 'normal');
      pick = { cardId: plan.cardId, mode: plan.mode || 'normal' };
      why = '(fallback: engine plan)'; fb = true;
    }
    try { E.playCard(st, pick.cardId, pick.mode); }
    catch (e) {
      const plan = E.aiPlanTurn(st, 'normal');
      pick = { cardId: plan.cardId, mode: plan.mode || 'normal' };
      why = '(fallback: illegal pick — ' + e.message + ')'; fb = true;
      E.playCard(st, pick.cardId, pick.mode);
    }
    const desc = '"' + E.CARD_BY_ID[pick.cardId].name + '"' + (pick.mode !== 'normal' ? ' as basic ' + pick.mode : '');
    say('T' + turn + ' ' + side + ' [' + model + ']: plays ' + desc +
      (why ? ' — "' + why + '"' : '') + (fb ? '  (fallback)' : ''));
    record(turn, 'card', side, desc, why, fb);
    flushLog();
    // 2. step loop
    let g = 0;
    while (st.phase === 'step' && g++ < 12) {
      const so = E.stepOptions(st);
      const list = stepChoiceList(st, args.k, args.fullOptions);
      const descs = list.choices.map(function (c) { return describeChoice(st, so, c); });
      const note = list.pruned
        ? '\n(Showing the ' + list.choices.length + ' most promising of ' + list.total +
          ' legal options, engine-selected; listed in board order, not strength order.)'
        : '';
      const um2 = stateView(st, side, false, matchInfo) + '\n\n' + stepHeader(so) + note +
        '\nChoose one:\n' + numbered(descs) + '\n\nPick the option number.';
      const r2 = await ask(side, um2, list.choices.length);
      let idx, why2, fb2 = false;
      if (r2.ok) { idx = r2.choice; why2 = r2.why; }
      else { idx = list.choices.length > 1 ? 1 : 0; why2 = '(fallback: first legal action)'; fb2 = true; }
      try { E.applyStep(st, list.choices[idx]); }
      catch (e) {
        fb2 = true; why2 = '(fallback: choice failed)';
        let applied = false;
        for (let j = 0; j < list.choices.length; j++) {
          if (j === idx) continue;
          try { E.applyStep(st, list.choices[j]); idx = j; applied = true; break; } catch (e2) { /* next */ }
        }
        if (!applied) break;
      }
      say('T' + turn + ' ' + side + ' [' + model + ']: ' + so.type + ' — ' + descs[idx] +
        (why2 ? ' — "' + why2 + '"' : '') + (fb2 ? '  (fallback)' : ''));
      record(turn, 'step-' + so.type, side, descs[idx], why2, fb2);
      flushLog();
      if (st.phase === 'battle-over') break;
    }
    scoreboard();
  }

  while (st.phase !== 'battle-over' && st.turnNumber <= args.maxTurns) {
    const side = st.current;
    const spec = side === 'red' ? args.red : args.blue;
    if (HEURISTIC[spec]) { if (!heuristicTurn(side, spec)) break; }
    else await llmTurn(side, spec);
  }
  flushLog();
  return { decisions: decisions, fallbacks: fallbacks };
}

/* ---------- felt-notes ---------- */
async function feltNotes(args, transports, side, prompt, usage) {
  const spec = side === 'red' ? args.red : args.blue;
  if (HEURISTIC[spec]) return null;
  const res = await transports[side].send(prompt, false);
  usage.inputTokens += res.inputTokens; usage.outputTokens += res.outputTokens;
  return (res.finishReason !== 'error' && res.text.trim()) ? res.text.trim() : null;
}

/* ---------- the run ---------- */
async function main() {
  const args = ARGS;
  let maps = E.mapPool(); // the ACTIVE map-set's roster (V1)
  if (args.mapset === 'all') maps = E.MAPS;
  else if (args.mapset) {
    const set = E.MAPSETS.filter(function (s) { return s.id === args.mapset; })[0];
    if (!set) { console.error('--mapset "' + args.mapset + '" not found. Available: ' + (E.MAPSETS.map(function (s) { return s.id; }).join(', ') || 'none installed') + ', all'); process.exit(1); }
    maps = E.MAPS.filter(function (m) { return set.maps.indexOf(m.id) >= 0 || set.maps.indexOf(m.name) >= 0; });
    if (!maps.length) { console.error('map-set "' + args.mapset + '" matches no installed maps'); process.exit(1); }
  }
  const map = args.map
    ? maps.find(function (m) { return m.name.toLowerCase().includes(args.map.toLowerCase()); })
    : maps[0];
  if (!map) { console.error('no map matches "' + args.map + '"'); process.exit(1); }

  const target = args.matchWins; // 0 = single battle
  say('claude-plays: "' + map.name + '" seed ' + args.seed +
    (target ? ' — MATCH, first to ' + target : ' — single battle') +
    ' — red=' + args.red + (args.redEffort ? '(' + args.redEffort + ')' : '') +
    ' vs blue=' + args.blue + (args.blueEffort ? '(' + args.blueEffort + ')' : '') +
    (args.deck ? ' — deck "' + args.deck + '"' : '') +
    (args.mock ? '  [MOCK]' : args.cold ? '  [cold transport]' : '  [persistent sessions]'));

  const match = E.newMatch({ maps: [map], seed: args.seed, firstPlayer: 'red' });
  const matchInfo = { targetWins: target, wins: match.wins, battlesPlayed: 0 };
  const transports = {
    red: makeSideTransport(args, 'red', target),
    blue: makeSideTransport(args, 'blue', target)
  };
  const usage = { inputTokens: 0, outputTokens: 0 };

  // per-battle DB rows (guarded — the transcript never depends on it).
  // Mock runs are loop tests, not data — they stay out of the DB.
  let dbm = null, dbh = null, runId = null;
  if (!args.mock) try {
    dbm = require(path.join(__dirname, 'db.js'));
    dbh = dbm.open();
    runId = dbm.insertRun(dbh, { version: E.VERSION, kind: 'llm', redAi: args.red, blueAi: args.blue,
      n: target ? target * 2 - 1 : 1, tool: 'claude-plays' });
  } catch (e) { dbm = null; }

  const battles = []; // {index, winner, winType, turns, decisions, fallbacks, notes:{red,blue}}
  const ts0 = new Date().toISOString();
  try { fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true }); } catch (e) {}

  while (true) {
    const st = E.newBattle(match);
    const firstPlayer = st.current; // battle 1 = match.firstPlayer; later = last loser
    matchInfo.battlesPlayed = battles.length;
    say('— battle ' + (battles.length + 1) + (target ? ' (match R ' + match.wins.red + '-' + match.wins.blue + ' B)' : '') + ' —');
    const played = await playBattle(st, args, transports, matchInfo, usage);
    const finished = st.phase === 'battle-over';
    say(finished
      ? '== ' + cap(st.battleWinner) + ' wins battle ' + (battles.length + 1) + ' by ' + st.winType + ' after ' + st.turnNumber + ' turns ==' +
        (target ? '  (match R ' + match.wins.red + '-' + match.wins.blue + ' B)' : '')
      : '== battle unfinished at the --max-turns cap (' + args.maxTurns + ') ==');

    // short per-battle notes from each LLM player (Bill: per-battle AND per-match)
    const notes = {};
    for (const side of ['red', 'blue']) {
      const n = await feltNotes(args, transports, side,
        'Battle ' + (battles.length + 1) + ' just ended: ' + (finished ? cap(st.battleWinner) + ' won by ' + st.winType : 'unfinished') +
        ' after ' + st.turnNumber + ' turns. In ONE or TWO sentences: how did that battle feel from your side?', usage);
      if (n) { notes[side] = n; say(side + ' notes: ' + n); }
    }

    const rec = {
      ts: new Date().toISOString(), version: E.VERSION, map: map.name, seed: args.seed,
      transport: args.mock ? 'mock' : args.cold ? 'cold' : 'session',
      matchId: target ? ts0 : null, battleIndex: battles.length + 1,
      red: args.red, blue: args.blue,
      redEffort: args.redEffort || null, blueEffort: args.blueEffort || null,
      winner: finished ? st.battleWinner : null,
      winType: finished ? st.winType : 'unfinished',
      turns: st.turnNumber, fallbacks: played.fallbacks,
      decisions: played.decisions, notes: notes, usage: null // usage reported on the match row
    };
    try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) {}
    fs.appendFileSync(args.out, JSON.stringify(rec) + '\n'); // crash-safe: one row per finished battle
    if (dbm && finished) {
      try { dbm.insertBattle(dbh, runId, st, firstPlayer, { seed: args.seed, version: E.VERSION }); }
      catch (e) { /* never fatal */ }
    }
    battles.push({ index: battles.length + 1, winner: finished ? st.battleWinner : null,
      winType: finished ? st.winType : 'unfinished', turns: st.turnNumber,
      decisions: played.decisions, fallbacks: played.fallbacks, notes: notes, st: st });

    if (!target) break;                              // single battle mode
    if (match.wins.red >= target || match.wins.blue >= target) break;
    if (!finished) { say('battle unfinished — ending the match early'); break; }
    if (battles.length >= target * 2 - 1) break;     // safety: best-of series exhausted
  }

  const matchWinner = !target ? null :
    match.wins.red >= target ? 'red' : match.wins.blue >= target ? 'blue' : null;
  if (target) {
    say('==== MATCH: ' + (matchWinner ? cap(matchWinner) + ' wins ' + match.wins.red + '-' + match.wins.blue : 'no winner (ended early)') + ' ====');
  }

  // match-level felt-notes (the point of first-to-3: how did the SET feel?)
  const matchNotes = {};
  if (target && battles.length > 1) {
    for (const side of ['red', 'blue']) {
      const n = await feltNotes(args, transports, side,
        'The match is over: ' + (matchWinner ? cap(matchWinner) + ' won ' + match.wins.red + '-' + match.wins.blue : 'ended early') +
        ' across ' + battles.length + ' battles. Give short notes (under 150 words) on how the MATCH felt as a set: ' +
        'did early luck decide it or could you adapt between battles, what felt strong or weak across games, ' +
        'and ONE suggested change to the game.', usage);
      if (n) { matchNotes[side] = n; console.log('\n-- ' + side + ' match felt-notes --\n' + n); }
    }
  } else if (!target) {
    for (const side of ['red', 'blue']) {
      const st = battles[0].st;
      const journal = st.log.map(function (e) { return 'T' + e.turn + ' ' + e.msg; }).join('\n');
      const n = await feltNotes(args, transports, side,
        'You just played a full battle of War of Attrition as ' + side.toUpperCase() +
        '. The final campaign journal:\n\n' + journal +
        '\n\nGive short notes (under 150 words) on how the game FELT to play: what felt strong, ' +
        'what felt weak, what felt luck-driven, and ONE suggested change to the game.', usage);
      if (n) { matchNotes[side] = n; console.log('\n-- ' + side + ' felt-notes --\n' + n); }
    }
  }
  transports.red.close(); transports.blue.close();
  if (dbm) try { dbm.close(dbh); } catch (e) {}

  // ---- transcript ----
  const slug = map.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fstamp = ts0.replace(/[:.]/g, '-');
  const tPath = path.join(TRANSCRIPT_DIR, fstamp + '-' + slug + '-' + args.red + '-v-' + args.blue + (target ? '-match' : '') + '.md');
  const md = [];
  md.push('# War of Attrition — ' + (target ? 'first-to-' + target + ' match' : 'battle') + ' on "' + map.name + '" (seed ' + args.seed + ')');
  md.push('');
  md.push('- rules version: **' + E.VERSION + '** · transport: ' + (args.mock ? 'mock' : args.cold ? 'cold per-call' : 'persistent session per side'));
  md.push('- red: **' + args.red + '**' + (args.redEffort ? ' (effort: ' + args.redEffort + ')' : '') +
    ' · blue: **' + args.blue + '**' + (args.blueEffort ? ' (effort: ' + args.blueEffort + ')' : '') +
    (args.deck ? ' · deck: ' + args.deck : ''));
  md.push('- ' + ts0);
  if (target) {
    md.push('- Result: ' + (matchWinner ? '**' + cap(matchWinner) + '** wins the match **' + match.wins.red + '-' + match.wins.blue + '**' : 'no match winner') +
      ' over ' + battles.length + ' battles');
    const g1 = battles[0].winner;
    if (matchWinner && g1) {
      md.push('- Rush-luck check: the game-1 winner (' + g1 + ') ' + (g1 === matchWinner ? 'ALSO won the match — first-to-' + target + ' did not change the outcome this time' : 'did NOT win the match — the series smoothed over the early result') + '.');
    }
  } else {
    const b = battles[0];
    md.push('- Result: ' + (b.winner ? '**' + cap(b.winner) + '** wins by ' + b.winType + ' after ' + b.turns + ' turns' : 'unfinished'));
  }
  const totalDecisions = battles.reduce(function (s, b) { return s + b.decisions.length; }, 0);
  const totalFallbacks = battles.reduce(function (s, b) { return s + b.fallbacks; }, 0);
  md.push('- Fallbacks (LLM reply unusable → engine chose): ' + totalFallbacks + ' of ' + totalDecisions + ' decisions');
  const tstats = { red: transports.red.stats(), blue: transports.blue.stats() };
  md.push('- Transport: red ' + tstats.red.sessionCalls + ' session / ' + tstats.red.coldCalls + ' cold calls · blue ' +
    tstats.blue.sessionCalls + ' session / ' + tstats.blue.coldCalls + ' cold · tokens in/out ' + usage.inputTokens + '/' + usage.outputTokens);
  battles.forEach(function (b) {
    md.push('');
    md.push('## Battle ' + b.index + (target ? '' : '') + ' — ' + (b.winner ? cap(b.winner) + ' by ' + b.winType : 'unfinished') + ' (T' + b.turns + ')');
    md.push('');
    md.push('### Decisions');
    b.decisions.forEach(function (d) {
      md.push('- T' + d.turn + ' ' + d.side + ' — ' + d.kind + ': ' + d.choice +
        (d.why ? ' — _' + d.why + '_' : '') + (d.fallback ? '  `(fallback)`' : ''));
    });
    if (Object.keys(b.notes).length) {
      md.push('');
      md.push('### Battle notes');
      Object.keys(b.notes).forEach(function (side) { md.push('- **' + side + '**: ' + b.notes[side]); });
    }
    md.push('');
    md.push('### Campaign journal');
    b.st.log.forEach(function (e) { md.push('- T' + e.turn + ' ' + e.msg); });
  });
  if (Object.keys(matchNotes).length) {
    md.push('');
    md.push('## ' + (target ? 'Match felt-notes' : 'Felt-notes'));
    Object.keys(matchNotes).forEach(function (side) {
      md.push('');
      md.push('### ' + side + ' (' + (side === 'red' ? args.red : args.blue) + ')');
      md.push('');
      md.push(matchNotes[side]);
    });
  }
  const lastFinished = battles.filter(function (b) { return b.winner; }).slice(-1)[0];
  if (lastFinished && args.typicalN > 0) {
    say('gauging typicality (' + args.typicalN + ' hard-AI baseline battles, cached per map+version)…');
    try { md.push.apply(md, typicalitySection(map, lastFinished.st, args.typicalN)); }
    catch (e) { md.push('', '_(typicality baseline failed: ' + e.message + ')_'); }
  }
  md.push('', '#reports #battle #v' + E.VERSION.replace(/\./g, '-')); // tag footer: kind + rules version
  fs.writeFileSync(tPath, md.join('\n') + '\n');

  // match summary row in the master JSONL
  if (target) {
    fs.appendFileSync(args.out, JSON.stringify({
      ts: new Date().toISOString(), version: E.VERSION, type: 'match',
      transport: args.mock ? 'mock' : args.cold ? 'cold' : 'session',
      matchId: ts0, map: map.name, seed: args.seed, red: args.red, blue: args.blue,
      target: target, wins: { red: match.wins.red, blue: match.wins.blue },
      winner: matchWinner, battles: battles.length,
      game1Winner: battles[0].winner, seriesFlipped: !!(matchWinner && battles[0].winner && matchWinner !== battles[0].winner),
      fallbacks: totalFallbacks, decisions: totalDecisions, usage: usage
    }) + '\n');
  }

  say('record(s) appended to ' + args.out);
  say('transcript written to ' + tPath);
}

/* exported for dev/claude-plays.test.js (honesty sentinel etc.) */
module.exports = { stateView: stateView, cardOptions: cardOptions, describeChoice: describeChoice,
  stepHeader: stepHeader, stepChoiceList: stepChoiceList, RULES: RULES, sysPrompt: sysPrompt };

if (require.main === module) {
  main().catch(function (e) { console.error(e); process.exit(1); });
}
