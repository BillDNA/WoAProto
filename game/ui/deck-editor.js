/* War of Attrition — ui part: the deck editor (Quartermaster's Ledger) —
   DK state, five deck slots, card list/detail/step builder, validation.
   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). Extracted verbatim from index.html's inline app
   script; the dk* button wiring lives in ui/boot.js. */
'use strict';

/* =================== deck editor =================== */
// Five named deck slots (Feedback Round 2), stored in localStorage 'woa-decks'
// as {active, slots:[{name,cards}|null ×5]}. Editing works on a copy of one
// slot's cards (DK.cards) so all the per-card render/edit code is unchanged.
// The APPLY path is deliberately untouched: Save mirrors the ACTIVE slot into
// 'woa-custom-deck' + custom-deck.js and reloads — the engine snapshots the
// card list at load, so a reload IS the apply step (same contract as before).
var DK = { cards: null, sel: 0, stepErr: {}, slots: null, slot: 0, active: 0 };
var DK_SLOTS = 5;
function loadDecks(){
  var d = null;
  try { d = JSON.parse(localStorage.getItem('woa-decks')); } catch(e){}
  if (d && Array.isArray(d.slots) && d.slots.length === DK_SLOTS) return d;
  // First run: seed slot 0 with the currently-applied deck; rest empty.
  var slots = []; for (var i=0;i<DK_SLOTS;i++) slots.push(null);
  slots[0] = { name: 'Deck 1', cards: JSON.parse(JSON.stringify(E.CARDS)) };
  return { active: 0, slots: slots };
}
function persistDecks(){ try { localStorage.setItem('woa-decks', JSON.stringify({ active: DK.active, slots: DK.slots })); } catch(e){} }
// strip benched cards + the transient `out` flag → what actually ships to the game
function shipCards(cards){ return cards.filter(function(c){ return !c.out; }).map(function(c){ var d={}; for (var k in c) if (k!=='out') d[k]=c[k]; return d; }); }
function flushSlot(){ if (DK.slots[DK.slot]) DK.slots[DK.slot].cards = JSON.parse(JSON.stringify(DK.cards)); }
function loadSlotIntoEditor(i){
  if (!DK.slots[i]) DK.slots[i] = { name: 'Deck '+(i+1), cards: JSON.parse(JSON.stringify(DK.cards || E.CARDS)) }; // new slot = clone of the open one
  DK.slot = i;
  DK.cards = JSON.parse(JSON.stringify(DK.slots[i].cards));
  DK.sel = 0;
  renderSlots();
  renderDeck();
}
function renderSlots(){
  var host = $('dkSlots'); if (!host) return;
  var html = DK.slots.map(function(s, i){
    var name = s ? (s.name || 'Deck '+(i+1)) : 'Deck '+(i+1);
    return '<button class="dkslot'+(i===DK.slot?' open':'')+(i===DK.active?' active':'')+'" data-slot="'+i+'">'+(i===DK.active?'&#9733; ':'')+dkEsc(name)+'</button>';
  }).join('');
  html += '<input id="dkName" class="dkslot-name" value="'+dkEsc(DK.slots[DK.slot]?DK.slots[DK.slot].name:'')+'" title="rename this deck" maxlength="20">';
  html += '<button id="dkSetActive" class="dkslot"'+(DK.slot===DK.active?' disabled':'')+' title="make this deck the one the game uses on reload">Set active</button>';
  host.innerHTML = html;
  host.querySelectorAll('.dkslot[data-slot]').forEach(function(b){
    b.onclick = function(){ flushSlot(); loadSlotIntoEditor(+b.dataset.slot); };
  });
  $('dkName').oninput = function(){
    if (DK.slots[DK.slot]) DK.slots[DK.slot].name = this.value;
    var b = host.querySelector('.dkslot[data-slot="'+DK.slot+'"]');
    if (b) b.innerHTML = (DK.slot===DK.active?'&#9733; ':'') + dkEsc(this.value);
  };
  $('dkSetActive').onclick = function(){ DK.active = DK.slot; renderSlots(); dkStatus(); };
}
var DK_STEP_FLAGS = { deploy:{unit:1,anywhere:1}, trench:{}, attack:{mod:1,tieSpare:1,noAdvance:1}, reposition:{}, barrage:{} };

function deckProblems(cards){
  var probs = [], ids = {}, total = 0, starting = 0;
  cards = cards.filter(function(c){ return !c.out; }); // benched cards aren't shipped or validated
  cards.forEach(function(c, i){
    var tag = c.name || c.id || ('card ' + (i+1));
    if (!c.id || !/^[a-z0-9_]+$/i.test(c.id)) probs.push(tag + ': id must be letters/digits/underscores');
    else if (ids[c.id]) probs.push('duplicate id "' + c.id + '"');
    ids[c.id] = 1;
    if (!c.name) probs.push('card ' + (i+1) + ' needs a name');
    var n = +c.count;
    if (!(n >= 1) || n !== Math.floor(n)) probs.push(tag + ': count must be a whole number ≥ 1');
    else total += n;
    if (c.starting && n !== 1) probs.push(tag + ': the starting card must have count 1 (the engine deals exactly one)');
    if (c.starting) starting++;
    if (!Array.isArray(c.steps) || !c.steps.length) probs.push(tag + ': needs at least one step');
    else c.steps.forEach(function(s, si){
      var st = tag + ' step ' + (si+1);
      if (!s || !DK_STEP_FLAGS[s.type]){ probs.push(st + ': unknown type "' + (s && s.type) + '" (deploy / trench / attack / reposition / barrage)'); return; }
      Object.keys(s).forEach(function(k){ if (k !== 'type' && !DK_STEP_FLAGS[s.type][k]) probs.push(st + ': "' + k + '" is not a ' + s.type + ' option'); });
      if (s.type === 'deploy' && !E.UNITS[s.unit]) probs.push(st + ': unknown unit "' + s.unit + '" (' + Object.keys(E.UNITS).join(' / ') + ')');
      if (s.type === 'attack' && s.mod !== undefined && typeof s.mod !== 'number') probs.push(st + ': mod must be a number');
    });
  });
  if (starting !== 1) probs.push('exactly ONE card must be marked starting (got ' + starting + ')');
  if (total !== 16) probs.push('the deck must total 16 cards (got ' + total + ') — hand-edit the deck file if you really want an exotic size');
  return probs;
}

function openDeck(){
  var d = loadDecks();
  DK.slots = d.slots;
  DK.active = Math.min(DK_SLOTS-1, Math.max(0, d.active|0));
  loadSlotIntoEditor(DK.active);
  show('deckScr');
}

function dkEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function deckToShip(){ return shipCards(DK.cards); } // the open deck, benched cards stripped
// LEFT: the selectable card list with in/out (bench) checkboxes
function renderDeck(){
  var list = $('dkList');
  list.innerHTML = '';
  DK.cards.forEach(function(c, i){
    var li = document.createElement('div');
    li.className = 'dkli' + (i===DK.sel?' sel':'') + (c.out?' out':'');
    li.innerHTML =
      '<input type="checkbox" class="dkli-in" '+(c.out?'':'checked')+' title="in the deck (untick to bench)">' +
      '<span class="dkli-star">'+(c.starting?'&#9733;':'')+'</span>' +
      '<span class="dkli-name">'+dkEsc(c.name||'(unnamed)')+'</span>' +
      '<span class="dkli-ct">'+(c.out?'&mdash;':'&times;'+(c.count||1))+'</span>';
    li.querySelector('.dkli-in').onclick = function(e){
      e.stopPropagation();
      c.out = !this.checked;
      if (c.out && c.starting) c.starting = false; // a benched card can't be the starting card
      renderDeck();
    };
    li.onclick = function(){ DK.sel = i; renderDeck(); };
    list.appendChild(li);
  });
  renderDetail();
  dkStatus();
}
// RIGHT: the detail editor for the selected card (art, fields, GUI step builder)
var DK_STEP_TYPES = ['deploy','trench','attack','reposition','barrage'];
function renderDetail(){
  var el = $('dkDetail'), c = DK.cards[DK.sel];
  if (!c){ el.innerHTML = '<p class="small" style="text-align:center;color:var(--ink-soft);padding:34px 0;">Pick a card on the left, or <b>Add Card</b>.</p>'; return; }
  el.innerHTML =
    '<div class="dkd-fields">' +
      '<div class="dkd-row">' +
        '<input type="text" class="dkd-name" placeholder="Card name" value="'+dkEsc(c.name)+'">' +
        '<span class="dkbtns"><button id="dkDup" title="copy this card">Duplicate</button>' +
        '<button id="dkDel" title="remove this card">Delete</button></span>' +
      '</div>' +
      '<div class="dkd-row">' +
        '<label>id <input type="text" class="dkd-id" placeholder="snake_case_id" value="'+dkEsc(c.id)+'"></label>' +
        '<label>copies <input type="number" class="dkd-count" min="1" max="16" value="'+(c.count||1)+'"'+(c.out?' disabled':'')+'></label>' +
      '</div>' +
      '<div class="dkd-row">' +
        '<label title="guaranteed in the opening hand (exactly one card)"><input type="radio" name="dkstart" id="dkStart" '+(c.starting?'checked':'')+(c.out?' disabled':'')+'> starting card</label>' +
        '<label title="never dealt in the opening hand (like Airdrop)"><input type="checkbox" id="dkNoOpener" '+(c.noOpener?'checked':'')+'> keep out of opening hand</label>' +
      '</div>' +
    '</div>' +
    '<div class="dkart-box" id="dkArtBox"></div>' +
    '<textarea class="dkd-text" placeholder="Card text shown to players">'+dkEsc(c.text)+'</textarea>' +
    '<div class="dksteps"><h4>Steps &mdash; resolved in order</h4><div id="dkStepList"></div>' +
      '<button id="dkAddStep" class="ghost btn-ghost-dark" style="font-size:12px;padding:2px 10px;margin-top:5px;">+ Add step</button></div>';
  renderDkArt(c);
  renderSteps(c);
  var q = function(s){ return el.querySelector(s); };
  q('.dkd-name').oninput = function(){ c.name = this.value; touchList(); };
  q('.dkd-id').oninput = function(){ c.id = this.value.trim(); renderDkArt(c); dkStatus(); };
  q('.dkd-count').oninput = function(){ c.count = +this.value; touchList(); };
  q('#dkStart').onchange = function(){ DK.cards.forEach(function(x){ delete x.starting; }); c.starting = true; renderDeck(); };
  q('#dkNoOpener').onchange = function(){ if (this.checked) c.noOpener = true; else delete c.noOpener; };
  q('.dkd-text').oninput = function(){ c.text = this.value; };
  q('#dkDup').onclick = function(){
    var copy = JSON.parse(JSON.stringify(c));
    delete copy.starting; delete copy.out;
    copy.id = (c.id||'card') + '_2';
    copy.name = (c.name||'Card') + ' II';
    DK.cards.splice(DK.sel+1, 0, copy);
    DK.sel += 1;
    renderDeck();
  };
  q('#dkDel').onclick = function(){
    DK.cards.splice(DK.sel, 1);
    if (DK.sel >= DK.cards.length) DK.sel = DK.cards.length - 1;
    renderDeck();
  };
  q('#dkAddStep').onclick = function(){ c.steps = c.steps || []; c.steps.push({ type:'attack' }); renderSteps(c); dkStatus(); };
}
// update only the selected list row (keeps focus while typing name/count)
function touchList(){
  var li = $('dkList').children[DK.sel], c = DK.cards[DK.sel];
  if (li && c){
    li.querySelector('.dkli-name').textContent = c.name || '(unnamed)';
    li.querySelector('.dkli-ct').innerHTML = c.out ? '&mdash;' : '&times;'+(c.count||1);
  }
  dkStatus();
}
function renderDkArt(c){
  var box = $('dkArtBox');
  if (!box) return; // placeholder shows through when the art <img> errors/hides
  box.innerHTML = '<span>no art<br><span style="font-size:9px;">art/'+dkEsc(c.id||'id')+'.jpg</span></span>' + artImg(c.id, 'dkart');
}
function renderSteps(c){
  var host = $('dkStepList');
  if (!host) return;
  c.steps = c.steps || [];
  host.innerHTML = '';
  c.steps.forEach(function(s, si){
    var row = document.createElement('div');
    row.className = 'dkstep';
    var typeSel = '<select class="ds-type">'+DK_STEP_TYPES.map(function(t){ return '<option '+(s.type===t?'selected':'')+'>'+t+'</option>'; }).join('')+'</select>';
    var extra = '';
    if (s.type === 'deploy'){
      extra = '<label>unit <select class="ds-unit">'+Object.keys(E.UNITS).map(function(u){ return '<option value="'+u+'" '+(s.unit===u?'selected':'')+'>'+E.UNITS[u].name+'</option>'; }).join('')+'</select></label>' +
        '<label title="place on ANY empty hex (Airdrop)"><input type="checkbox" class="ds-any" '+(s.anywhere?'checked':'')+'> anywhere</label>';
    } else if (s.type === 'attack'){
      extra = '<label title="&plusmn; attacker power">power <input type="number" class="ds-mod" style="width:48px;" value="'+(s.mod||0)+'"></label>' +
        '<label title="attacker survives ties"><input type="checkbox" class="ds-tie" '+(s.tieSpare?'checked':'')+'> tie-spare</label>' +
        '<label title="attacker never enters the hex, even on a win"><input type="checkbox" class="ds-noadv" '+(s.noAdvance?'checked':'')+'> no-advance</label>';
    }
    row.innerHTML = '<span class="dkstep-n">'+(si+1)+'</span>' + typeSel + extra +
      '<button class="ds-del" title="remove step" style="margin-left:auto;font-size:14px;padding:0 8px;">&times;</button>';
    row.querySelector('.ds-type').onchange = function(){
      var nt = this.value;
      DK.cards[DK.sel].steps[si] = nt==='deploy' ? { type:'deploy', unit: s.unit||'infantry' } : { type:nt }; // fresh step drops stale flags
      renderSteps(DK.cards[DK.sel]); dkStatus();
    };
    if (s.type === 'deploy'){
      row.querySelector('.ds-unit').onchange = function(){ s.unit = this.value; dkStatus(); };
      row.querySelector('.ds-any').onchange = function(){ if (this.checked) s.anywhere = true; else delete s.anywhere; dkStatus(); };
    } else if (s.type === 'attack'){
      row.querySelector('.ds-mod').oninput = function(){ var v = +this.value; if (v) s.mod = v; else delete s.mod; dkStatus(); };
      row.querySelector('.ds-tie').onchange = function(){ if (this.checked) s.tieSpare = true; else delete s.tieSpare; dkStatus(); };
      row.querySelector('.ds-noadv').onchange = function(){ if (this.checked) s.noAdvance = true; else delete s.noAdvance; dkStatus(); };
    }
    row.querySelector('.ds-del').onclick = function(){ c.steps.splice(si, 1); renderSteps(c); dkStatus(); };
    host.appendChild(row);
  });
  if (!c.steps.length) host.innerHTML = '<p class="small" style="color:#8a3324;margin:2px 0;">A card needs at least one step.</p>';
}
function dkStatus(){
  var inCards = DK.cards.filter(function(c){ return !c.out; });
  var total = inCards.reduce(function(a, c){ return a + (+c.count >= 1 ? Math.floor(+c.count) : 0); }, 0);
  var openName = (DK.slots && DK.slots[DK.slot] && DK.slots[DK.slot].name) || ('Deck '+(DK.slot+1));
  var applied = WOA_DECK_SRC === 'builtin' ? 'default deck (content/decks/default.js)' :
            WOA_DECK_SRC === 'local' ? 'a custom deck saved in this browser' : 'custom-deck.js';
  $('deckHdr').innerHTML = 'Editing <b>' + dkEsc(openName) + '</b>' +
    (DK.slot === DK.active ? ' &middot; this is the active deck' : ' &middot; active deck is <b>'+dkEsc((DK.slots[DK.active]&&DK.slots[DK.active].name)||('Deck '+(DK.active+1)))+'</b>') +
    ' &middot; game currently runs ' + applied;
  $('dkListFoot').innerHTML = inCards.length + ' cards &middot; <b>' + total + '/16</b> copies';
  var probs = deckProblems(DK.cards);
  $('dkWarn').innerHTML = probs.length ? '&#9888; ' + probs.join('<br>&#9888; ') : '';
  $('dkSave').disabled = probs.length > 0;
}

function syncDeckFile(deck, done){
  if (!canNet){ done(); return; }
  api('savedeck', { deck: deck }).then(done).catch(done);
}
