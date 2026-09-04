/* War of Attrition — ui part: the PLAYER battalion builder (Muster) — a
   player-facing surface for assembling a battalion from the shared card pool
   under the army-points cap, then marching out against a seated opponent.
   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). Button wiring lives in ui/boot.js.

   Assembly, not authoring: the player picks finished pool cards and sets counts;
   authoring a card's steps stays in the dev Battalion Editor. Same data, one
   model — the built battalion round-trips through the shared 'woa-battalions'
   active slot, and legality / points reuse the exported engine surface
   (battalionProblems, battalionPoints, cardPoints, CONFIG.pointsCap). */
'use strict';

var PB = { cards: null, opponent: null };

// The player's battalion lives in the shared 'woa-battalions' active slot (the
// same store the dev editor writes), so the two are views over one model.
function pbLoad(){
  var d = loadBattalions();
  var slot = d.slots[d.active | 0];
  var cards = (slot && slot.cards && slot.cards.length) ? slot.cards : E.CARDS;
  PB.cards = JSON.parse(JSON.stringify(E.hydrateBattalionCards(cards)));
}
function pbStore(){
  var d = loadBattalions();
  var i = d.active | 0;
  d.slots[i] = d.slots[i] || { name: 'Battalion ' + (i + 1) };
  d.slots[i].cards = shipCards(PB.cards); // benched cards / transient flags stripped
  try { localStorage.setItem('woa-battalions', JSON.stringify(d)); } catch(e){}
}

function pbPool(){ return (typeof WOA_CONTENT !== 'undefined' && WOA_CONTENT.cards) || (E.CARD_POOL || []); }

// Prioritized dice: pick an opponent battalion from the shipped pool, weighted
// toward a close army-points match (two battalions at a like cost are "matched").
// A placeholder until a smart opponent-set AI lands.
function pbPickOpponent(playerPts){
  var pool = ((typeof WOA_CONTENT !== 'undefined' && WOA_CONTENT.battalions) || [])
    .filter(function(b){ return b && b.cards && b.cards.length; });
  if (!pool.length) return null;
  var weighted = pool.map(function(b){
    var pts = E.battalionPoints(b);
    return { b: b, pts: pts, w: 1 / (1 + Math.abs(pts - playerPts)) };
  });
  var tot = weighted.reduce(function(s, x){ return s + x.w; }, 0);
  var r = Math.random() * tot;
  for (var i = 0; i < weighted.length; i++){ r -= weighted[i].w; if (r <= 0) return weighted[i]; }
  return weighted[weighted.length - 1];
}

function openBuildBattalion(){
  // Normally the picker (before this screen) seats the enemy Commander; if the
  // builder is reached directly (a screen= deep link), seed it here so the enemy
  // still fields one rather than silently defaulting to None.
  if (typeof PICK !== 'undefined' && !PICK.opponent && typeof pickOpponentCommander === 'function') PICK.opponent = pickOpponentCommander();
  pbLoad();
  var inCards = PB.cards.filter(function(c){ return !c.out; });
  PB.opponent = pbPickOpponent(E.battalionPoints({ cards: inCards }));
  renderBuildBattalion();
  show('buildBattalionScr');
}

function pbCount(){ return PB.cards.filter(function(c){ return !c.out; })
  .reduce(function(a, c){ return a + (+c.count >= 1 ? Math.floor(+c.count) : 0); }, 0); }

// pool → battalion
function pbAdd(id){
  var def = pbPool().filter(function(c){ return c.id === id; })[0];
  if (!def) return;
  var existing = PB.cards.filter(function(c){ return c.id === id; })[0];
  if (existing){ existing.out = false; existing.count = (+existing.count || 0) + 1; }
  else { var card = {}; for (var k in def) card[k] = def[k]; card.count = 1; PB.cards.push(card); }
  renderBuildBattalion();
}
function pbBump(id, d){
  var c = PB.cards.filter(function(x){ return x.id === id; })[0];
  if (!c) return;
  c.count = Math.max(0, (+c.count || 0) + d);
  if (c.count === 0){ PB.cards = PB.cards.filter(function(x){ return x !== c; }); }
  renderBuildBattalion();
}
function pbSetStarter(id){
  PB.cards.forEach(function(c){ delete c.starting; });
  var c = PB.cards.filter(function(x){ return x.id === id; })[0];
  if (c){ c.out = false; c.count = 1; c.starting = true; } // the opener is one guaranteed copy
  renderBuildBattalion();
}
function pbReroll(){
  var inCards = PB.cards.filter(function(c){ return !c.out; });
  PB.opponent = pbPickOpponent(E.battalionPoints({ cards: inCards }));
  renderBuildBattalion();
}

function renderBuildBattalion(){
  var inCards = PB.cards.filter(function(c){ return !c.out; });
  var byId = {}; inCards.forEach(function(c){ byId[c.id] = c; });

  // LEFT: the card pool (the catalog to draft from)
  var pool = pbPool().slice().sort(function(a, b){ return String(a.name || a.id).localeCompare(String(b.name || b.id)); });
  $('pbPool').innerHTML = pool.map(function(def){
    var have = byId[def.id];
    var n = have ? Math.floor(+have.count || 0) : 0;
    return '<div class="pbpool-row">' +
      '<span class="pbpool-name">' + uiEsc(def.name || def.id) + '</span>' +
      '<span class="pbpool-pts" title="army-points cost of one copy">' + dkPts(E.cardPoints(def)) + ' pts</span>' +
      (n ? '<span class="pbpool-have" title="copies in your battalion">&times;' + n + '</span>' : '') +
      '<button class="pbpool-add" data-id="' + uiEsc(def.id) + '" title="add a copy">+</button>' +
      '</div>';
  }).join('');
  $('pbPool').querySelectorAll('.pbpool-add').forEach(function(b){ b.onclick = function(){ pbAdd(b.dataset.id); }; });

  // RIGHT: the battalion being mustered
  var listCards = PB.cards.filter(function(c){ return !c.out; });
  $('pbList').innerHTML = listCards.length ? listCards.map(function(c){
    var n = Math.floor(+c.count || 0);
    return '<div class="pbli' + (c.starting ? ' starter' : '') + '">' +
      '<label class="pbli-start" title="the starting card — guaranteed in your opening hand (exactly one, count 1)">' +
        '<input type="radio" name="pbStart" ' + (c.starting ? 'checked' : '') + ' data-id="' + uiEsc(c.id) + '">&#9733;</label>' +
      '<span class="pbli-name">' + uiEsc(c.name || c.id) + '</span>' +
      '<span class="pbli-pts">' + dkPts(E.cardPoints(c) * n) + ' pts</span>' +
      '<span class="pbli-ct">' +
        '<button class="pbli-minus" data-id="' + uiEsc(c.id) + '" title="one fewer">&minus;</button>' +
        '<b>&times;' + n + '</b>' +
        '<button class="pbli-plus" data-id="' + uiEsc(c.id) + '" title="one more"' + (c.starting ? ' disabled' : '') + '>+</button>' +
      '</span></div>';
  }).join('') : '<p class="small" style="text-align:center;color:var(--ink-soft);padding:24px 0;">Add cards from the pool to muster a battalion.</p>';
  $('pbList').querySelectorAll('.pbli-minus').forEach(function(b){ b.onclick = function(){ pbBump(b.dataset.id, -1); }; });
  $('pbList').querySelectorAll('.pbli-plus').forEach(function(b){ b.onclick = function(){ pbBump(b.dataset.id, +1); }; });
  $('pbList').querySelectorAll('.pbli-start input').forEach(function(r){ r.onchange = function(){ pbSetStarter(r.dataset.id); }; });

  // muster readout — reuse the shared cost surface + validity (one model)
  var pts = E.battalionPoints({ cards: inCards });
  var cap = E.CONFIG.pointsCap;
  var over = pts > cap;
  var total = pbCount();
  $('pbFoot').innerHTML = '<b>' + total + '</b> cards (target ' + UI_CONFIG.battalionBand.min + '&ndash;' + UI_CONFIG.battalionBand.max + ') &middot; ' +
    '<span class="pbpts' + (over ? ' over' : '') + '"><b>' + dkPts(pts) + '</b>&thinsp;/&thinsp;' + cap + ' pts</span>';

  var probs = battalionProblems(PB.cards);
  $('pbWarn').innerHTML = probs.length ? '&#9888; ' + probs.join('<br>&#9888; ') : '';

  // Commander readout: the pre-muster pick (yours + the enemy's auto-seat), so
  // the muster screen shows which rules are bent before March Out.
  var myCmdSel = (typeof PICK !== 'undefined') ? PICK.commander : null;
  var oppCmdSel = (typeof PICK !== 'undefined') ? PICK.opponent : null;
  function cmdName(sel){ var c = sel && E.resolveCommander(sel); return (c && c.name) || 'None'; }
  $('pbCommanders').innerHTML = 'Your Commander: <b>' + uiEsc(cmdName(myCmdSel)) + '</b> ' +
    '<button id="pbCmdChange" class="linklike" title="go back and choose a different Commander">change</button>' +
    ' &middot; Enemy Commander: <b>' + uiEsc(cmdName(oppCmdSel)) + '</b>';
  if ($('pbCmdChange')) $('pbCmdChange').onclick = function(){ SCREENS.pickcommander.entry(); };

  // opponent (prioritized-random seat)
  var opp = PB.opponent;
  $('pbOpponent').innerHTML = opp
    ? 'Enemy battalion: <b>' + uiEsc(opp.b.name || opp.b.id) + '</b> &middot; ' + dkPts(opp.pts) + ' pts ' +
      '<button id="pbReroll" class="linklike" title="draw a different opponent">re-roll</button>'
    : '<span class="small">No opponent battalions are shipped — the enemy uses the default battalion.</span>';
  if ($('pbReroll')) $('pbReroll').onclick = pbReroll;

  $('pbMarch').disabled = probs.length > 0;
}

function pbMarchOut(){
  var probs = battalionProblems(PB.cards);
  if (probs.length){ toast('Fix first: ' + probs[0], 4200); return; }
  pbStore(); // round-trip into the shared battalion store
  var mySide = APP.mySide || 'red';
  var battalions = {};
  battalions[mySide] = { name: 'Your Battalion', cards: shipCards(PB.cards) };
  battalions[E.other(mySide)] = (PB.opponent && PB.opponent.b) ? PB.opponent.b.id : null;
  // The Commander pick made on the pre-muster screen rides out on the same seat.
  var commanders = (typeof pickedCommanders === 'function') ? pickedCommanders(mySide) : null;
  startLocal('ai', undefined, battalions, commanders);
}
