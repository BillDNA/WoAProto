/* War of Attrition — ui part: the Commander panel — the per-side Commander
   component set drawn inside renderMat. One coherent set: a compact identity
   header, one chip per trait with source iconography (passive / cooldown /
   charge) and a weakness accent, a full-text tooltip, an on-turn ability button
   with cooldown pips, and a pre-arm toggle with charge pips. Plain HTML only
   (no hand-drawn SVG — the mats' idiom), so the UI raw-SVG backstop stays green.

   The panel renders from a per-side RUNTIME (commanderFor) carrying the live
   trait state (cooldown remaining, charges left, armed). This slice owns that
   runtime in the UI so the components are drivable end to end against a sample
   Commander built to the schema contract (see docs/reference/commander-schema.md);
   a later slice repoints commanderFor at engine-sourced state without touching
   the components. Classic script, no wrapper — top-level names attach to window
   (see ui/app.js header). */
'use strict';

/* ---- schema-contract rendering ---- */
// Icon per trait SOURCE — three shape-distinct glyphs the panel tells apart at a
// glance: a standing diamond (passive), a recharge loop (cooldown), a spendable
// token (charge).
var COMMANDER_ICON = { passive: '❖', cooldown: '↻', charge: '▲' }; // ❖ ↻ ▲
// Human label per source, for the tooltip lead-in when a trait carries no text.
var COMMANDER_SOURCE_LABEL = { passive: 'Passive', cooldown: 'Ability', charge: 'Charge' };

// A trait's short chip label: authored name, else a terse primitive fallback.
function commanderTraitLabel(t){
  if (t.name) return t.name;
  return { combatMod:'Combat', drawMod:'Cards', redraw:'Redraw', tieSteal:'Tie steal' }[t.primitive] || t.primitive;
}
// A trait's full explanation for the tooltip: authored text, else built from the
// primitive + its params so an un-annotated trait still reads.
function commanderTraitText(t){
  var lead = (t.role === 'weakness' ? 'Weakness' : COMMANDER_SOURCE_LABEL[t.source] || 'Trait');
  if (t.text) return commanderTraitLabel(t) + ' — ' + t.text;
  var body;
  if (t.primitive === 'combatMod')
    body = (t.delta >= 0 ? '+' : '') + t.delta + ' ' + (t.when || 'combat') +
           (t.terrain ? ' in ' + String(t.terrain).replace(/\|/g, ' or ') : '') + '.';
  else if (t.primitive === 'drawMod')
    body = 'draw ' + (t.delta >= 0 ? '+' : '') + t.delta + ' card' + (Math.abs(t.delta) === 1 ? '' : 's') +
           ' on the ' + (t.phase || 'normal') + ' draw.';
  else if (t.primitive === 'redraw') body = 'discard your hand and draw a fresh one.';
  else if (t.primitive === 'tieSteal') body = 'a tied attack resolves in your favour.';
  else body = t.primitive + '.';
  var gate = t.gate && (t.gate.turns != null ? ' ' + t.gate.turns + '-turn cooldown.'
    : t.gate.perBattle != null ? ' ' + t.gate.perBattle + '/battle.' : '');
  return commanderTraitLabel(t) + ' — ' + lead + ': ' + body + (gate || '');
}

// The control a trait exposes: an on-turn ability button (active timing), a
// pre-arm toggle (armed timing), or none (a passive). Source-agnostic — keyed on
// timing, so a cooldown or a charge can carry either kind of control.
function commanderTraitControl(t){
  if (t.timing === 'active') return 'button';
  if (t.timing === 'armed') return 'toggle';
  return null;
}

// Pips: filled/empty squares. Cooldown pips fill with the turns still to wait;
// charge pips fill with the charges still in hand.
function commanderPips(filled, total, cls){
  if (!total) return '';
  var s = '<span class="cmd-pips ' + cls + '">';
  for (var i = 0; i < total; i++) s += '<span class="cmd-pip' + (i < filled ? ' on' : '') + '"></span>';
  return s + '</span>';
}

/* ---- per-side runtime (the seam a later slice repoints at the engine) ---- */
// Build the live runtime for a Commander: one state cell per trait, seeded full
// (no cooldown, all charges, not armed). turnSeen drives the cooldown countdown.
function commanderInit(commander){
  if (!commander) return null;
  return {
    commander: commander,
    turnSeen: null,
    traits: commander.traits.map(function(t){
      return { def: t, cd: 0, charges: (t.gate && t.gate.perBattle) || 0, armed: false };
    })
  };
}
// The panel's data source. Reads APP.ui.commander[side]; null = no panel.
function commanderFor(side){
  return (APP.ui && APP.ui.commander && APP.ui.commander[side]) || null;
}
// Load a Commander onto a side for this session.
function commanderSet(side, commander){
  if (!APP.ui.commander) APP.ui.commander = {};
  APP.ui.commander[side] = commanderInit(commander);
}
// Keep the panel runtime in step with the seated Commanders (st.commanders) as
// part of the render, so NO caller (start, resume, join, next skirmish) has to
// remember a separate sync — one render path, one source of truth. A side is
// (re)seeded only when the live seat differs from what the panel holds, so trait
// runtime (cooldowns/charges) survives an ordinary render; a battle/skirmish
// boundary resets APP.ui (dropping the cache), which reseeds fresh here.
function ensureCommanderRuntime(){
  var st = APP.st;
  if (!st || !st.commanders){ if (APP.ui) APP.ui.commander = null; return; }
  if (!APP.ui.commander) APP.ui.commander = {};
  ['red', 'blue'].forEach(function(side){
    var want = st.commanders[side] || null;
    var have = APP.ui.commander[side];
    if (!want){ if (have) APP.ui.commander[side] = null; return; }
    if (!have || have.commander !== want) commanderSet(side, want); // (re)seed on change only
  });
}
// A hard reset of the panel runtime, then reseed from state — used at a battle
// start (fresh cooldowns/charges). renderAll's ensureCommanderRuntime keeps it live
// after; this is only the explicit "wipe trait runtime" entry point.
function syncCommandersFromState(){
  APP.ui.commander = null;
  ensureCommanderRuntime();
}
// True when the local human drives this side and may work its controls.
function commanderInteractive(side){ return seatDrives(side); }
// Advance each side's cooldowns once per that side's own turn. Called from
// renderAll on the post-change pass (not from a render function), keyed on
// turnNumber so it fires at most once per turn. A later slice sources cooldown
// from the engine and drops this UI countdown.
function commanderTurnSync(){
  if (!APP.st || !APP.ui.commander) return;
  var v = E.view(APP.st);
  ['red', 'blue'].forEach(function(side){
    var rt = APP.ui.commander[side];
    if (!rt || v.current !== side || v.turnNumber === rt.turnSeen) return;
    rt.turnSeen = v.turnNumber;
    rt.traits.forEach(function(ts){ if (ts.cd > 0) ts.cd--; });
  });
}

/* ---- render ---- */
// The panel HTML for one side, or '' when the side carries no Commander.
function renderCommanderPanel(side){
  var rt = commanderFor(side);
  if (!rt) return '';
  var live = commanderInteractive(side);
  var yourTurn = live && E.view(APP.st).current === side;
  // Compact persistent read: one icon-and-pips badge per trait, wrapping within
  // the fixed column. The name and the full explanation live in the tooltip, not
  // on-screen prose. Interactive traits carry their control inline on the badge.
  var chips = rt.traits.map(function(ts, idx){
    var t = ts.def;
    var control = commanderTraitControl(t);
    var weak = t.role === 'weakness';
    var pips = '';
    if (t.source === 'cooldown' && t.gate && t.gate.turns) pips = commanderPips(ts.cd, t.gate.turns, 'cd');
    else if (t.source === 'charge' && t.gate && t.gate.perBattle) pips = commanderPips(ts.charges, t.gate.perBattle, 'charge');
    var ctlHtml = '';
    if (control === 'button'){
      ctlHtml = '<button class="cmd-btn" id="cmdbtn-' + side + '-' + idx + '"' +
        (live && yourTurn && ts.cd === 0 ? '' : ' disabled') +
        ' title="' + (ts.cd ? 'On cooldown — ' + ts.cd + ' turn(s) left' : 'Use this turn') + '">Use</button>';
    } else if (control === 'toggle'){
      var canAct = live && yourTurn && (ts.armed || ts.charges > 0);
      ctlHtml = '<button class="cmd-toggle' + (ts.armed ? ' armed' : '') + '" id="cmdtog-' + side + '-' + idx + '"' +
        (canAct ? '' : ' disabled') + '>' +
        (ts.armed ? 'Armed' : ts.charges === 0 ? '—' : 'Arm') + '</button>';
    }
    return '<span class="cmd-trait' + (weak ? ' weak' : '') + '" id="cmdchip-' + side + '-' + idx + '" ' +
        'title="' + uiEsc(commanderTraitText(t)) + '">' +
        '<span class="cmd-ico" aria-hidden="true">' + (COMMANDER_ICON[t.source] || '•') + '</span>' +
        pips + ctlHtml +
      '</span>';
  }).join('');
  return '<div class="cmd-panel">' +
    '<div class="cmd-head" title="Commander — traits bend this side’s rules; hover a trait for the full text">' +
      '⚑ ' + uiEsc(rt.commander.name) +
    '</div><div class="cmd-traits">' + chips + '</div></div>';
}

// Re-bind the panel's controls after renderMat writes the mat innerHTML — the
// spent-card handler pattern: handlers are wired fresh on every render.
function bindCommanderPanel(side){
  var rt = commanderFor(side);
  if (!rt) return;
  rt.traits.forEach(function(ts, idx){
    var control = commanderTraitControl(ts.def);
    if (control === 'button'){
      var b = $('cmdbtn-' + side + '-' + idx);
      if (b) b.onclick = function(){ commanderActivate(side, idx); };
    } else if (control === 'toggle'){
      var g = $('cmdtog-' + side + '-' + idx);
      if (g) g.onclick = function(){ commanderToggleArm(side, idx); };
    }
  });
}

/* ---- actions (drive the runtime; a later slice drives the engine) ---- */
function commanderActivate(side, idx){
  var rt = commanderFor(side); if (!rt) return;
  var ts = rt.traits[idx];
  if (!commanderInteractive(side) || E.view(APP.st).current !== side || ts.cd > 0) return;
  if (ts.def.gate && ts.def.gate.turns) ts.cd = ts.def.gate.turns;
  commanderFeedback(side, idx, 'used');
}
// Arm/disarm is a free, reversible turn choice; the charge is spent when the
// armed reactive resolves at its checkpoint (engine — a later slice).
function commanderToggleArm(side, idx){
  var rt = commanderFor(side); if (!rt) return;
  var ts = rt.traits[idx];
  if (!commanderInteractive(side) || E.view(APP.st).current !== side) return;
  if (!ts.armed && ts.charges === 0) return; // nothing left to arm
  ts.armed = !ts.armed;
  commanderFeedback(side, idx, ts.armed ? 'armed' : 'disarmed');
}
// Activation feedback in the turn flow — a toast plus a one-shot chip pulse. No
// modal: the acknowledgement rides the same surface the trait lives on. renderAll
// rebuilds the mat, so the pulse class is applied to the FRESH chip afterwards.
function commanderFeedback(side, idx, verb){
  var rt = commanderFor(side); if (!rt) return;
  toast(capName(side) + ' Commander — <b>' + uiEsc(commanderTraitLabel(rt.traits[idx].def)) + '</b> ' + verb, 1800);
  renderAll();
  var el = $('cmdchip-' + side + '-' + idx);
  if (el){ el.classList.remove('cmd-fire'); void el.offsetWidth; el.classList.add('cmd-fire'); }
}

/* ---- sample fixture: a Commander built to the schema contract ----
   Spans every trait render path (passive strength, passive weakness,
   cooldown+active ability, charge+armed reactive) in one record, so the panel
   can be exercised whole. It is a RENDER fixture, not shippable content — a real
   Commander keeps the max-3-trait budget; this one carries 4 to cover all kinds.
   Loaded onto a live battle by commanderDemoLoad (?commanders=demo). */
var COMMANDER_SAMPLE = {
  id: 'sample_exemplar',
  name: 'The Exemplar',
  story: '',
  weights: {},
  traits: [
    { primitive: 'combatMod', source: 'passive', role: 'strength',
      terrain: 'forest|mountain', when: 'defense', delta: 1,
      name: 'Dug In', text: '+1 defense when defending in forest or mountain.' },
    { primitive: 'drawMod', source: 'passive', role: 'weakness',
      phase: 'normal', delta: -1,
      name: 'Overstretched', text: 'one fewer card on each normal-turn draw.' },
    { primitive: 'redraw', source: 'cooldown', timing: 'active', gate: { turns: 3 },
      name: 'Regroup', text: 'discard your hand and draw a fresh one, then wait three turns.' },
    { primitive: 'tieSteal', source: 'charge', timing: 'armed', gate: { perBattle: 1 },
      name: 'Last Stand', text: 'arm on your turn; the next tied attack resolves in your favour. Once per battle.' }
  ]
};
// Put the sample on both sides of the live battle and repaint. Seats it on
// st.commanders (the authoritative source renderAll derives from), so the fixture
// flows through the one render path like a real pick — not a side cache the next
// render would wipe.
function commanderDemoLoad(){
  if (APP.st) APP.st.commanders = { red: COMMANDER_SAMPLE, blue: COMMANDER_SAMPLE };
  commanderSet('red', COMMANDER_SAMPLE);
  commanderSet('blue', COMMANDER_SAMPLE);
  if (APP.st) renderAll();
}
