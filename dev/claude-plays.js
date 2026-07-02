#!/usr/bin/env node
/* dev/claude-plays.js — an LLM plays War of Attrition (specs/claude-plays.md).
   Runs one battle, printing every decision live; appends a JSON-lines record.

   Usage: node dev/claude-plays.js [options]
     --map <filter>     map name filter, case-insensitive (default: first built-in map)
     --red <spec>       easy|normal|hard = heuristic AI; anything else (haiku|sonnet|opus|
     --blue <spec>      full model id) = LLM via the claude -p transport.
                        Defaults: --red haiku --blue normal
     --seed <n>         match seed (default 1234)
     --max-turns <n>    safety cap on turns (default 60)
     --mock             replace the transport with a deterministic fake (always picks
                        option 0, canned rationale/notes) — full offline loop test
     --out <file>       JSONL log (default dev/claude-plays-log.jsonl)

   The LLM never invents moves: each decision is a pick from a numbered legal-move list
   built by the engine (playCard modes / enumerateChoices). It sees only what a player
   sees — own hand, board, reserves, spent piles, hand COUNTS — never the enemy hand or
   deck order. Any errored/garbage/out-of-range reply falls back to the engine's choice
   (logged fallback:true); a run never crashes on a bad response.
   After the battle each LLM player is asked for short "how it felt" notes. */
'use strict';

const fs = require('fs');
const path = require('path');
const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
const llm = require(path.join(__dirname, 'llm-client.js'));

/* ---------- CLI args ---------- */
function parseArgs(argv) {
  const a = { map: '', red: 'haiku', blue: 'normal', seed: 1234, maxTurns: 60, mock: false,
    out: path.join(__dirname, 'claude-plays-log.jsonl') };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--map') a.map = argv[++i] || '';
    else if (k === '--red') a.red = argv[++i];
    else if (k === '--blue') a.blue = argv[++i];
    else if (k === '--seed') a.seed = Number(argv[++i]) | 0;
    else if (k === '--max-turns') a.maxTurns = Number(argv[++i]) || 60;
    else if (k === '--mock') a.mock = true;
    else if (k === '--out') a.out = path.resolve(argv[++i]);
    else { console.error('unknown option: ' + k); process.exit(1); }
  }
  return a;
}

const HEURISTIC = { easy: true, normal: true, hard: true };
const DIRN = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];
// Mirrors the engine's private CARD_KEEP table: which card to burn on a basic-mode play.
const CARD_KEEP = {
  mass_assault: 9, attack_plus1: 8, conscription: 7, deploy_cavalry: 7,
  deploy_inf_trench: 6, ordered_withdraw: 5, careful_maneuvers: 5,
  reckless_maneuvers: 5, deploy_artillery: 5, airdrop: 4, naval_barrage: 4,
  forced_march: 3, deploy_inf_start: 2
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- rules blurb (distilled from game/README.md) ---------- */
const RULES = [
  'WAR OF ATTRITION — RULES IN BRIEF',
  'Two sides (Red, Blue) fight on a small hex board (grid refs A1, B3, ...). Each side has one',
  'HQ hex and identical forces: 7 Infantry (attack 1, defense 1, support 1, worth 1 VP),',
  '2 Cavalry (attack 3, defense 0, support 0, 2 VP), 1 Artillery (attack 0, defense 0,',
  'support 2, 3 VP), and 3 trenches. One unit per hex; units never stand on HQ hexes.',
  '',
  'TURNS: each turn you draw a hand of order cards, play exactly ONE (its steps resolve in',
  'order), and discard the rest (discards reshuffle back into your deck later; the PLAYED card',
  'is removed from the game forever). Every turn burns one card, so the battle is a countdown.',
  'House rule: any card may instead resolve as one basic Attack or one basic Reposition.',
  'Any card step may be skipped if you cannot or do not want to complete it.',
  '',
  'ACTIONS:',
  '- Deploy: place a reserve unit on an empty hex adjacent to a hex you control (your units or',
  '  your living HQ). Airdrop may place on ANY empty hex.',
  '- Reposition: march one of your units to an adjacent empty hex, OR swap two adjacent',
  '  friendly units.',
  '- Attack: one of your units strikes an adjacent enemy unit or HQ.',
  '  Attacker power = its attack + the support values of your OTHER units adjacent to the',
  '  target + 1 if your HQ is adjacent to the target + 1 for a forest side attacked out across',
  '  + any card modifier. Defender power = its defense + support of defender units adjacent to',
  '  the target + 1 if the defending HQ is adjacent + 1 for a mountain side + 1 if a trench',
  '  covers the attacked edge. Higher power wins and the loser is destroyed (winner advances',
  '  into the hex); a TIE destroys BOTH units. The HQ itself has defense 0 (support still',
  '  counts); winning OR tying an attack on the HQ captures it and wins the battle instantly.',
  '- Units adjacent to any HQ may move, swap, or attack THROUGH it to hexes on its far side.',
  '- Barrage: removes any one trench or forest piece anywhere on the board.',
  '',
  'TERRAIN is directional and belongs to a hex: a forest in hex X gives +1 attack when X\'s',
  'occupant attacks out across a marked side; a mountain in hex X gives +1 defense when X is',
  'attacked across a marked side. Trenches cover 2 edges of a hex and give any defender there',
  '+1 across those edges (never help an attacker).',
  '',
  'VICTORY: capture the enemy HQ, or — when a player cannot draw a hand (deck spent) — the',
  'side with more VP of SURVIVING UNITS ON THE BOARD wins (infantry 1 / cavalry 2 /',
  'artillery 3). Reserves never deployed count for nothing; kills only matter because they',
  'remove enemy units from the field. An attrition TIE goes to whoever moved SECOND.'
].join('\n');

function sysPrompt(side) {
  return 'You are a competitive player of the board game War of Attrition, playing the ' +
    side.toUpperCase() + ' side. Decide quickly and decisively; always answer in exactly the requested format.\n\n' + RULES;
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
function stateView(st, p, withHand) {
  const en = E.other(p);
  const L = [];
  L.push('=== BATTLE STATE (turn ' + st.turnNumber + ') ===');
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
  L.push('Trenches: ' + (tr.join('; ') || 'none') + '.');
  const te = st.terrainPieces.filter(function (pc) { return !pc.removed; }).map(function (pc) {
    const hex = pc.edgeKeys[0].split('>')[0];
    const dirs = pc.edgeKeys.map(function (ek) { return DIRN[+ek.split('>')[1]]; }).join(',');
    return (pc.t === 'F' ? 'Forest' : 'Mountain') + ' in ' + E.hexLabel(hex) + ' (sides ' + dirs + ')';
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
  const burn = hand.slice().sort(function (a, b) { return (CARD_KEEP[a] || 5) - (CARD_KEEP[b] || 5); })[0];
  const bn = E.CARD_BY_ID[burn].name;
  opts.push({ cardId: burn, mode: 'attack',
    desc: 'Basic Attack — burn "' + bn + '" to order one ordinary attack instead of its printed action.' });
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

/* ---------- transports ---------- */
function mockSend(request) {
  return Promise.resolve({
    text: request.outputSchema
      ? JSON.stringify({ choice: 0, why: 'mock: always the first option' })
      : 'Mock felt-notes: skipping every step felt weak; the countdown felt strong; nothing was luck-driven because I never rolled the dice. Suggested change: use a real model.',
    inputTokens: 0, outputTokens: 0, finishReason: 'stop'
  });
}

function looseJson(text) {
  if (!text) return null;
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch (e) { return null; }
}

/* ---------- the run ---------- */
async function main() {
  const args = parseArgs(process.argv);
  const transport = args.mock ? mockSend : llm.send;

  const map = args.map
    ? E.MAPS.find(function (m) { return m.name.toLowerCase().includes(args.map.toLowerCase()); })
    : E.MAPS[0];
  if (!map) { console.error('no map matches "' + args.map + '"'); process.exit(1); }

  console.log('claude-plays: "' + map.name + '" seed ' + args.seed +
    ' — red=' + args.red + ' vs blue=' + args.blue +
    (args.mock ? '  [MOCK transport: canned responses, no claude spawns]' : ''));

  const match = E.newMatch({ maps: [map], seed: args.seed, firstPlayer: 'red' });
  const st = E.newBattle(match);

  const decisions = [];
  const usage = { inputTokens: 0, outputTokens: 0 };
  let fallbacks = 0;
  let logIdx = 0;
  function flushLog() {
    while (logIdx < st.log.length) console.log('  | ' + st.log[logIdx++].msg);
  }
  flushLog();

  function record(turn, kind, side, desc, why, fallback) {
    decisions.push({ turn: turn, side: side, kind: kind, choice: desc, why: why, fallback: !!fallback });
    if (fallback) fallbacks++;
  }

  // one LLM call: numbered options in, {choice, why} out; ok:false on any garbage
  async function ask(model, side, userMessage, nOptions) {
    const res = await transport({
      systemPrompt: sysPrompt(side), userMessage: userMessage,
      model: model, outputSchema: CHOICE_SCHEMA
    });
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
    console.log('T' + turn + ' ' + side + ' [' + diff + ']: plays ' + desc);
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
    const um = stateView(st, side, true) +
      '\n\nChoose ONE order to play this turn.\nOptions:\n' +
      numbered(opts.map(function (o) { return o.desc; })) +
      '\n\nPick the option number.';
    const r = await ask(model, side, um, opts.length);
    let pick, why, fb = false;
    if (r.ok) { pick = opts[r.choice]; why = r.why; }
    else {
      const plan = E.aiPlanTurn(st, 'normal'); // engine's choice as the fallback
      pick = { cardId: plan.cardId, mode: plan.mode || 'normal' };
      why = '(fallback: engine plan)'; fb = true;
    }
    E.playCard(st, pick.cardId, pick.mode);
    const desc = '"' + E.CARD_BY_ID[pick.cardId].name + '"' + (pick.mode !== 'normal' ? ' as basic ' + pick.mode : '');
    console.log('T' + turn + ' ' + side + ' [' + model + ']: plays ' + desc +
      (why ? ' — "' + why + '"' : '') + (fb ? '  (fallback)' : ''));
    record(turn, 'card', side, desc, why, fb);
    flushLog();
    // 2. step loop
    let g = 0;
    while (st.phase === 'step' && g++ < 12) {
      const so = E.stepOptions(st);
      const choices = E.enumerateChoices(st);
      const descs = choices.map(function (c) { return describeChoice(st, so, c); });
      const um2 = stateView(st, side, false) + '\n\n' + stepHeader(so) +
        '\nChoose one:\n' + numbered(descs) + '\n\nPick the option number.';
      const r2 = await ask(model, side, um2, choices.length);
      let idx, why2, fb2 = false;
      if (r2.ok) { idx = r2.choice; why2 = r2.why; }
      else { idx = choices.length > 1 ? 1 : 0; why2 = '(fallback: first legal action)'; fb2 = true; } // 0 is always {skip}
      try { E.applyStep(st, choices[idx]); }
      catch (e) {
        fb2 = true; why2 = '(fallback: choice failed, skipped)'; idx = 0;
        try { E.applyStep(st, { skip: true }); } catch (e2) { break; }
      }
      console.log('T' + turn + ' ' + side + ' [' + model + ']: ' + so.type + ' — ' + descs[idx] +
        (why2 ? ' — "' + why2 + '"' : '') + (fb2 ? '  (fallback)' : ''));
      record(turn, 'step-' + so.type, side, descs[idx], why2, fb2);
      flushLog();
      if (st.phase === 'battle-over') break;
    }
  }

  // game loop
  while (st.phase !== 'battle-over' && st.turnNumber <= args.maxTurns) {
    const side = st.current;
    const spec = side === 'red' ? args.red : args.blue;
    if (HEURISTIC[spec]) { if (!heuristicTurn(side, spec)) break; }
    else await llmTurn(side, spec);
  }
  flushLog();

  const finished = st.phase === 'battle-over';
  console.log('');
  console.log(finished
    ? '== ' + cap(st.battleWinner) + ' wins by ' + st.winType + ' after ' + st.turnNumber + ' turns =='
    : '== battle unfinished at the --max-turns cap (' + args.maxTurns + ') ==');

  // felt-notes: one free-text call per LLM player, journal included
  const notes = {};
  for (const side of ['red', 'blue']) {
    const spec = side === 'red' ? args.red : args.blue;
    if (HEURISTIC[spec]) continue;
    const journal = st.log.map(function (e) { return 'T' + e.turn + ' ' + e.msg; }).join('\n');
    const res = await transport({
      systemPrompt: sysPrompt(side),
      userMessage: 'You just played a full battle of War of Attrition as ' + side.toUpperCase() +
        '. The final campaign journal:\n\n' + journal +
        '\n\nGive short notes (under 150 words) on how the game FELT to play: what felt strong, ' +
        'what felt weak, what felt luck-driven, and ONE suggested change to the game.',
      model: spec
    });
    usage.inputTokens += res.inputTokens; usage.outputTokens += res.outputTokens;
    if (res.finishReason !== 'error' && res.text.trim()) {
      notes[side] = res.text.trim();
      console.log('\n-- ' + side + ' (' + spec + ') felt-notes --\n' + notes[side]);
    } else {
      console.log('\n-- ' + side + ' (' + spec + ') felt-notes: errored/empty --');
    }
  }

  const rec = {
    ts: new Date().toISOString(),
    map: map.name, seed: args.seed,
    red: args.red, blue: args.blue,
    winner: finished ? st.battleWinner : null,
    winType: finished ? st.winType : 'unfinished',
    turns: st.turnNumber,
    fallbacks: fallbacks,
    decisions: decisions,
    notes: notes,
    usage: usage
  };
  fs.appendFileSync(args.out, JSON.stringify(rec) + '\n');
  console.log('\nrecord appended to ' + args.out +
    '  (decisions: ' + decisions.length + ', fallbacks: ' + fallbacks +
    ', tokens in/out: ' + usage.inputTokens + '/' + usage.outputTokens + ')');
}

main().catch(function (e) { console.error(e); process.exit(1); });
