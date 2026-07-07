/* War of Attrition — ui part: the battle screen — mats / topbar / hand /
   journal renderers, battle overlays (confirm, battle-over, handoff),
   actions (playCardUI/act/afterChange), save/resume, turn snapshot/reset,
   card glossary, and the AI driver. Classic script, no wrapper — top-level
   names attach to window (see ui/app.js header). Extracted verbatim from
   index.html's inline app script; the matching button/overlay WIRING
   (onclick etc.) lives in ui/boot.js. */
'use strict';

function downloadDebug(fname, json){
  var blob = new Blob([json], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fname; a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
  toast('Downloaded '+fname+' &mdash; run <code>node game/server.js</code> to save straight into logs/debug/.', 5600);
}
function syncJournalOverlay(){
  // mirror the (possibly hidden) inline journal into the overlay, dropping its
  // sticky header plate since the panel already shows one; newest entry in view
  var body = $('journalBody');
  body.innerHTML = $('log').innerHTML;
  var h = body.querySelector('.jhead'); if (h) h.remove();
  body.scrollTop = body.scrollHeight;
}

function syncRostersOverlay(){
  $('rostersBody').innerHTML = $('leftcol').innerHTML;
  // the mirrored spent-track is CSS-hidden on small screens; that's fine — the
  // Cards glossary carries the full read
  var sp = $('rostersBody').querySelector('.spent'); if (sp) sp.onclick = showCards;
}

function startLocal(mode, mapsOverride){
  var pool = mapsOverride || getMapPool();
  if (!pool || !pool.length){ toast('No maps are in play! Enable some in Maps &amp; Map Editor.', 3500); return; }
  APP.mode = mode;
  var match = E.newMatch({ maps: pool });
  try { APP.st = E.newBattle(match); }
  catch(e){ APP.mode = null; toast('A map in the pool cannot be played: '+e.message+'<br><span class="small">Untick it in Maps &amp; Map Editor.</span>', 5000); return; }
  APP.ui = { sel:null, stage:null, busy:false, handoffPending: mode==='hotseat' };
  APP.snap = null;
  show('game');
  renderAll();
  saveLocal();
  if (mode==='hotseat') showHandoff();
  else maybeAI();
}

/* ---- turn snapshot / reset (house rule: reset to start of your turn mid-card) ---- */
function ensureSnapshot(){
  var st = APP.st;
  if (!st || st.phase !== 'choose-card') return;
  if (APP.snap && APP.snap.turn === st.turnNumber) return;
  APP.snap = { turn: st.turnNumber, data: JSON.stringify(st) };
}
function canReset(){
  var st = APP.st;
  return st && st.phase === 'step' && APP.snap && APP.snap.turn === st.turnNumber && inputLive();
}
function resetTurn(){
  if (!canReset()) return;
  APP.st = JSON.parse(APP.snap.data);
  APP.ui.sel = null; APP.ui.stage = null;
  renderAll(); saveLocal();
  if (APP.mode === 'net') pushState();
  toast('Turn reset — choose a card.', 1800);
}

/* resume saved local game */
function checkResume(){
  var ok = false;
  try { ok = !!localStorage.getItem('woa-save'); } catch(e){}
  $('btnResume').style.display = ok ? '' : 'none';
}

function saveLocal(){
  if (APP.mode === 'net' || !APP.st) return;
  try { localStorage.setItem('woa-save', JSON.stringify({v:SAVE_V, mode:APP.mode, mySide:APP.mySide, diff:APP.diff, st:APP.st})); } catch(e){}
}
function clearSave(){ try{ localStorage.removeItem('woa-save'); }catch(e){} }

/* =================== side mats / topbar / hand =================== */
// mini piece glyphs, echoing the board markings (infantry X, cavalry slash, artillery shot)
function glyphSVG(type, col, colD){
  var pre = '<svg viewBox="0 0 20 20">';
  if (type==='trench')
    return pre+'<path d="M3 13 Q10 5 17 13" stroke="#5a4326" stroke-width="2.6" stroke-dasharray="3.4 2.4" fill="none" stroke-linecap="round"/></svg>';
  var s = pre+'<circle cx="10" cy="10" r="8.4" fill="'+col+'" stroke="'+colD+'" stroke-width="1.6"/>';
  if (type==='infantry') s += '<path d="M5.5 13.5 L14.5 6.5 M5.5 6.5 L14.5 13.5" stroke="#ece1c4" stroke-width="2" stroke-linecap="round"/>';
  else if (type==='cavalry') s += '<path d="M5.5 14 L14.5 6" stroke="#ece1c4" stroke-width="2.3" stroke-linecap="round"/>';
  else s += '<circle cx="10" cy="10" r="3.4" fill="#ece1c4"/>';
  return s+'</svg>';
}
function statTip(type){
  if (type==='trench') return 'Trench — enemy attacks across its two covered edges get no support';
  var u = E.UNITS[type];
  return u.name+' — attack '+u.atk+', defense '+u.def+', support '+u.sup+', worth '+u.vp+' VP to the enemy';
}
var CARD_ABBR = {
  deploy_inf_start:'In', deploy_artillery:'Ar', deploy_inf_trench:'En', airdrop:'Ad',
  conscription:'Co', deploy_cavalry:'Cv', attack_plus1:'+1', mass_assault:'MA',
  careful_maneuvers:'CM', reckless_maneuvers:'RM', ordered_withdraw:'OW',
  naval_barrage:'NB', forced_march:'FM'
};
function cardAbbr(c){
  if (CARD_ABBR[c.id]) return CARD_ABBR[c.id];
  var w = String(c.name || c.id || '?').trim().split(/\s+/);
  return (w.length > 1 ? w[0].charAt(0) + w[1].charAt(0) : w[0].slice(0, 2)); // custom cards: initials
}
function renderMat(p){
  var st = APP.st;
  var el = p==='red' ? $('matRed') : $('matBlue');
  var r = st.reserves[p];
  var col = p==='red' ? 'var(--red)' : 'var(--blue)';
  var colD = p==='red' ? 'var(--red-dark)' : 'var(--blue-dark)';
  var totals = E.PIECE_TOTALS;
  var onField = { trench:0 };
  Object.keys(totals).forEach(function(t){ onField[t] = onField[t] || 0; });
  for (var h in st.units) if (st.units[h].owner===p) onField[st.units[h].type]++;
  for (var th in st.trenches) st.trenches[th].forEach(function(t){ if (t.owner===p) onField.trench++; });

  // one slot per physical piece: solid = still on the mat, dashed = on the
  // field, X = destroyed — same at-a-glance read as the wooden player mat
  function row(label, type){
    var total = totals[type];
    var res = r[type==='trench'?'trench':type];
    var field = Math.min(onField[type], total - res);
    var boxes = '';
    for (var i=0;i<total;i++){
      if (i < res) boxes += '<span class="slot" title="'+label+' in reserve">'+glyphSVG(type,col,colD)+'</span>';
      else if (i < res+field) boxes += '<span class="slot field" title="'+label+' on the field"></span>';
      else boxes += '<span class="slot lost" title="'+label+' destroyed">&#10006;</span>';
    }
    return '<div class="srow"><span class="slbl" title="'+statTip(type)+'">'+label+'</span><span class="sboxes">'+boxes+'</span></div>';
  }
  var rowsHtml = '';
  Object.keys(E.UNITS).forEach(function(t){ rowsHtml += row(E.UNITS[t].name, t); });
  rowsHtml += row('Trenches','trench');

  var spent = '';
  E.CARDS.forEach(function(c){
    var n = st.removed[p].filter(function(id){ return id===c.id; }).length;
    for (var i=0;i<c.count;i++){
      var gone = i < n;
      spent += '<span class="scard'+(gone?' gone':'')+'" title="'+c.name+(gone?' — spent, gone from the game':'')+'">'+cardAbbr(c)+'</span>';
    }
  });

  var you = APP.mode!=='hotseat' && p===APP.mySide ? ' — you' : '';
  var aiHere = APP.mode==='watch' || (APP.mode==='ai' && p!==APP.mySide);
  var gen = aiHere ? '<span style="font-weight:normal;font-size:.72em;opacity:.72;"> &middot; '+aiDisplayName(APP.diff)+'</span>' : '';
  el.innerHTML =
    '<h3>'+capName(p)+you+gen+'</h3>' +
    rowsHtml +
    '<div class="row" style="margin-top:2px;"><span>Orders left</span><b>'+E.cardsRemaining(st,p)+'</b></div>' +
    '<div class="spentlbl">orders spent &mdash; gone from the game</div>' +
    '<div class="spent" title="Click for the full card glossary">'+spent+'</div>' +
    '<div class="vp">'+E.fieldScore(st,p)+' VP</div>' +
    '<div class="small" style="text-align:center;">surviving units on the field</div>';
  el.querySelector('.spent').onclick = showCards;
}
function renderTop(){
  var st = APP.st, m = st.match;
  var youSide = (APP.mode==='ai' || APP.mode==='net') ? APP.mySide : null;
  var bn = 'Battle ' + (st.phase==='battle-over' ? m.battleIndex : m.battleIndex+1);
  $('battleTitle').innerHTML = bn + ' &middot; <i>&ldquo;'+st.mapName+'&rdquo;</i>' +
    (youSide ? '<span class="youchip '+youSide+'">YOU &middot; '+youSide.toUpperCase()+'</span>' : '');
  function pips(el, n){
    el.innerHTML='';
    for (var i=0;i<3;i++){
      var d = document.createElement('div');
      d.className = 'pip' + (i<n ? ' '+(el.id==='pipsRed'?'red':'blue') : '');
      el.appendChild(d);
    }
  }
  pips($('pipsRed'), m.wins.red);
  pips($('pipsBlue'), m.wins.blue);
  // VP tug-bar: solid = fieldScore now; hatched = ceiling if every reserve
  // deploys (fieldScore + reserves x vp); the seam marks the projected front
  function ceiling(side){
    var cur = E.fieldScore(st, side), extra = 0, res = st.reserves[side];
    Object.keys(E.UNITS).forEach(function(t){ extra += (res[t]||0) * E.UNITS[t].vp; });
    return { cur: cur, max: cur + extra };
  }
  var R = ceiling('red'), B = ceiling('blue');
  var total = (R.max + B.max) || 1;
  function pct(v){ return (100 * v / total).toFixed(2) + '%'; }
  $('tug').innerHTML =
    '<div class="solid red" style="width:'+pct(R.cur)+'"></div>' +
    '<div class="hatch red" style="width:'+pct(R.max - R.cur)+'"></div>' +
    '<div class="seam"></div>' +
    '<div class="hatch blue" style="width:'+pct(B.max - B.cur)+'"></div>' +
    '<div class="solid blue" style="flex:1"></div>' +
    '<span class="vp" style="left:5px;">'+R.cur+'</span><span class="vp" style="right:5px;">'+B.cur+'</span>';
  // opponent mat on top, yours at the bottom next to the hand (hotseat/watch: red top, blue bottom)
  var bottom = youSide || 'blue';
  $('matRed').style.order  = bottom === 'red'  ? 3 : 1;
  $('matBlue').style.order = bottom === 'blue' ? 3 : 1;
  $('matDivider').style.order = 2;
  $('matDivider').querySelector('span').innerHTML = youSide ? '&#9670; your command &#9670;' : '&#9670;';
  var rc = $('roomchip');
  if (APP.mode === 'net' && APP.net.room){
    rc.style.display = '';
    rc.innerHTML = 'Room <b>' + APP.net.room + '</b>';
    rc.title = 'The other player joins with this code';
  } else rc.style.display = 'none';
  var b = $('turnbadge');
  b.textContent = capName(st.current) + (APP.mode!=='hotseat' && st.current===APP.mySide ? ' — you' : '');
  b.className = st.current;
  // conceding is a human act; the AI decides it for itself (and watch mode has no human side)
  $('btnConcede').style.display = (st.phase !== 'battle-over' && APP.mode !== 'watch') ? '' : 'none';
}

function renderHand(){
  var st = APP.st, el = $('hand');
  el.innerHTML = '';
  var side = viewSide();
  var hideCards = APP.mode==='hotseat' && APP.ui.handoffPending;
  var hand = st.hands[side];
  var live = inputLive() && st.phase==='choose-card';
  // deal-in flourish only the first time this turn's hand is shown
  var dealKey = st.turnNumber + '|' + side + '|' + st.match.battleIndex;
  var deal = APP.ui.dealtKey !== dealKey && st.phase==='choose-card';
  if (deal) APP.ui.dealtKey = dealKey;
  hand.forEach(function(cid, i){
    var c = E.CARD_BY_ID[cid];
    var d = document.createElement('div');
    d.className = 'card' + (live ? '' : ' disabled') + (deal ? ' deal' : '');
    if (deal) d.style.animationDelay = (i*60)+'ms';
    var art = hideCards ? '' : artImg(cid, '');
    d.innerHTML = '<div class="corner c1"></div><div class="corner c2"></div><div class="corner c3"></div><div class="corner c4"></div>' +
      (hideCards
        ? '<div class="body" style="display:flex;align-items:center;justify-content:center;font-size:34px;color:var(--brass-dark);">&#9881;</div>'
        : (art ? '<div class="art">'+art+'</div>' : '') +
          '<div class="banner">'+c.name+'</div><div class="body">'+c.text+'</div>');
    if (live) d.onclick = function(){ playCardUI(cid); };
    el.appendChild(d);
  });
  if (hand.length===0 && st.phase!=='battle-over'){
    el.innerHTML = '<div class="small" style="color:var(--parch);">'+(st.current===side ? '' : 'Waiting for '+capName(st.current)+'…')+'</div>';
  }
}
function renderPrompt(){
  var st = APP.st, el = $('promptbar');
  el.innerHTML = '';
  if (st.phase === 'battle-over') return;
  var who = capName(st.current);
  if (!inputLive()){
    el.innerHTML = (APP.mode==='ai' && st.current!==APP.mySide)
      ? '<b>'+who+'</b> (the enemy general) is thinking…'
      : APP.mode==='watch'
        ? 'General <b>'+who+'</b> surveys the field… <span class="small" style="color:#bbb;">(you are spectating)</span>'
        : 'Waiting for <b>'+who+'</b>…';
    return;
  }
  if (st.phase === 'choose-card'){
    var adv = E.concedeAdvised(st, st.current);
    el.innerHTML = '<b>'+who+'</b>: choose a card to play. <span class="small" style="color:#bbb;">(played cards are gone for good)</span>' +
      (adv ? ' <span class="small" style="color:#e3c06a;">The cause looks lost — <b>Concede</b> (top right) keeps the campaign moving.</span>' : '');
    return;
  }
  var o = E.stepOptions(st);
  if (!o) return;
  var canSkip = !E.mustPlayStep(st); // Feedback Round 2: an order must resolve at least one action if it can
  var stepTag = o.stepCount>1 ? ' <span class="small" style="color:#bbb;">(step '+(o.stepIndex+1)+'/'+o.stepCount+')</span>' : '';
  var msg = '';
  if (o.type==='deploy') msg = 'Place your <b>'+E.UNITS[o.unit].name+'</b>' + (APP.ui.sel?'':'');
  else if (o.type==='trench') msg = APP.ui.sel ? 'Click a <b>brass knob</b> to dig the trench across its two edges' : 'Choose a hex to <b>entrench</b>';
  else if (o.type==='attack') msg = APP.ui.sel ? 'Choose a target' : 'Choose an attacker' + (o.mod ? ' <b>('+(o.mod>0?'+':'')+o.mod+' support)</b>':'') + (o.tieSpare?' <b>(tie spares your unit)</b>':'');
  else if (o.type==='reposition') msg = APP.ui.sel ? 'Move to a gold hex, or swap with a violet unit' : 'Choose a unit to <b>reposition</b>';
  else if (o.type==='barrage') msg = 'Barrage: click <b>any trench</b> or <b>forest</b> on the board to destroy' + (canSkip ? ' — or skip straight to the attack' : '');
  el.innerHTML = '<b>'+E.CARD_BY_ID[st.pending.cardId].name+'</b>: '+msg+stepTag +
    (canSkip ? '' : ' <span class="small" style="color:#e3c06a;">(this order must accomplish at least one action)</span>');
  if (canSkip){
    var sk = document.createElement('button');
    sk.textContent = 'Skip step';
    sk.style.cssText = 'padding:3px 12px;font-size:13px;';
    sk.onclick = function(){ APP.ui.sel=null; act({skip:true}); };
    el.appendChild(sk);
  }
  if (canReset()){
    var rs = document.createElement('button');
    rs.textContent = 'Reset turn';
    rs.className = 'ghost';
    rs.style.cssText = 'padding:3px 12px;font-size:13px;';
    rs.onclick = resetTurn;
    el.appendChild(rs);
  }
  if (APP.ui.sel){
    var back = document.createElement('button');
    back.textContent = 'Back';
    back.className='ghost'; back.style.cssText='padding:3px 12px;font-size:13px;';
    back.onclick = function(){ APP.ui.sel=null; renderAll(); };
    el.appendChild(back);
  }
}
function renderAll(){
  if (APP.st){
    // a resumed/joined battle on an edited outline must re-register its shape
    var mm = APP.st.match && APP.st.match.maps && APP.st.match.maps[APP.st.mapIndex];
    if (mm && mm.shapeDef) E.ensureMapShape(mm);
    E.setBoard(APP.st.boardShape);
  }
  ensureSnapshot();
  renderTop(); renderMat('red'); renderMat('blue'); renderBoard(); renderHand(); renderPrompt(); renderLog();
}
function renderLog(){
  var el = $('log'); var st = APP.st;
  // group entries into turns: a card play opens a turn, its resolution steps are
  // children. The last two turns render in full; older turns collapse to the
  // play line with a "+N ›" click-to-expand (UI-only, not saved).
  var groups = [];
  st.log.slice(-160).forEach(function(e){
    var hdr = e.msg.indexOf('Battle ') === 0;
    var play = e.msg.indexOf(' plays "') > 0;
    if (play) groups.push({ e: e, steps: [], id: 't' + e.turn + e.player });
    else if (hdr || !groups.length || groups[groups.length-1].single) groups.push({ e: e, single: true });
    else groups[groups.length-1].steps.push(e);
  });
  function entryDiv(e){
    var d = document.createElement('div');
    var hdr = e.msg.indexOf('Battle ') === 0;
    var finale = e.msg.indexOf('wins the battle') >= 0 || e.msg.indexOf('concedes the field') >= 0;
    var play = e.msg.indexOf(' plays "') > 0;
    var noop = e.msg.indexOf('no opening') > 0;
    d.className = 'entry ' + (hdr ? 'hdr' : e.player) + (finale ? ' finale' : '') +
      (play ? ' play' : '') + (noop ? ' noop' : '');
    if (!hdr){
      var tn = document.createElement('span');
      tn.className = 'tn';
      tn.textContent = 'T' + e.turn;
      tn.title = 'turn ' + e.turn;
      d.appendChild(tn);
    }
    d.appendChild(document.createTextNode(e.msg));
    return d;
  }
  el.innerHTML = '<div class="jhead">Campaign Journal</div>';
  var body = document.createElement('div');
  body.className = 'jbody';
  el.appendChild(body);
  var expanded = APP.ui.expanded || (APP.ui.expanded = {});
  var plays = groups.filter(function(g){ return !g.single; });
  var openFrom = plays.length - 2; // the last two turns always render in full
  groups.forEach(function(g){
    if (g.single){ body.appendChild(entryDiv(g.e)); return; }
    var recent = plays.indexOf(g) >= openFrom;
    var open = recent || expanded[g.id];
    var wrap = document.createElement('div');
    wrap.className = 'jturn' + (open ? ' open' : '') + (recent ? '' : ' toggler');
    var head = entryDiv(g.e);
    if (g.steps.length){
      var more = document.createElement('span');
      more.className = 'more';
      more.textContent = '+' + g.steps.length + ' ›';
      more.title = 'show this turn’s moves';
      head.appendChild(more);
    }
    if (!recent) head.onclick = function(){ expanded[g.id] = !expanded[g.id]; renderLog(); };
    wrap.appendChild(head);
    var stepsEl = document.createElement('div');
    stepsEl.className = 'steps';
    g.steps.forEach(function(e){ stepsEl.appendChild(entryDiv(e)); });
    wrap.appendChild(stepsEl);
    body.appendChild(wrap);
  });
  el.scrollTop = el.scrollHeight;
  // keep the small-screen journal overlay in sync while it's open
  if ($('journalOvr').classList.contains('active')) syncJournalOverlay();
  if ($('rostersOvr').classList.contains('active')) syncRostersOverlay();
}

function confirmAttack(a){
  var st = APP.st;
  var pv = a.preview;
  var au = st.units[a.from];
  var tgt = pv.defenderIsHQ ? capName(E.other(st.current))+' Headquarters' : capName(E.other(st.current))+' '+E.UNITS[pv.defenderUnit].name;
  var outcomeTxt = { attacker: 'Attack succeeds — defender destroyed' + (pv.defenderIsHQ ? '. <b>HEADQUARTERS FALLS!</b>' : (a.noAdvance ? ', your unit holds its ground.' : ', your unit advances.')),
                     defender: '<b>Attack fails — your unit is destroyed.</b>',
                     tie: a.tieSpare ? 'Tie — defender destroyed, your unit withdraws safely.' + (pv.defenderIsHQ?' <b>HEADQUARTERS FALLS!</b>':'') : 'Tie — <b>both units destroyed.</b>' + (pv.defenderIsHQ?' <b>HEADQUARTERS FALLS!</b>':'') }[pv.outcome];
  $('confirmPanel').innerHTML =
    '<h2>Order of Battle</h2>' +
    '<p>'+capName(st.current)+' '+E.UNITS[au.type].name+' attacks '+tgt+(a.via?' <i>(through the HQ)</i>':'')+'</p>' +
    '<div class="battle-calc">' +
      '<div class="side"><h4 style="color:var(--'+st.current+'-dark)">Attacker</h4>'+pv.attackerParts.join('<br>')+'<div class="total">'+pv.attackerPower+'</div></div>' +
      '<div class="side"><h4 style="color:var(--'+E.other(st.current)+'-dark)">Defender</h4>'+pv.defenderParts.join('<br>')+'<div class="total">'+pv.defenderPower+'</div></div>' +
    '</div>' +
    '<p style="font-size:14.5px;">'+outcomeTxt+'</p>' +
    '<div class="ovr-btns"><button id="cfYes">Attack!</button><button id="cfNo" class="ghost btn-ghost-dark">Stand Down</button></div>';
  $('confirmOvr').classList.add('active');
  $('cfYes').onclick = function(){
    $('confirmOvr').classList.remove('active');
    APP.ui.sel = null;
    act({from:a.from, to:a.to, via:a.via});
  };
  $('cfNo').onclick = function(){ $('confirmOvr').classList.remove('active'); };
}

function showBattleOver(){
  var st = APP.st, m = st.match;
  var w = st.battleWinner;
  var html = '<h2 class="'+w+'">'+capName(w)+' takes the field!</h2>' +
    '<p style="font-style:italic;">"'+st.mapName+'" — ' + (st.winType==='hq' ? 'the enemy headquarters was captured.' :
      st.winType==='concession' ? 'the enemy conceded the field.' :
      'won by attrition, '+E.fieldScore(st,'red')+' VP to '+E.fieldScore(st,'blue')+' VP of surviving units.') + '</p>' +
    '<p style="margin-top:10px;font-size:18px;">Campaign: <b style="color:var(--red-dark)">Red '+m.wins.red+'</b> — <b style="color:var(--blue-dark)">Blue '+m.wins.blue+'</b></p>';
  var rematch = APP.mode !== 'net'
    ? '<button id="boRematch" class="ghost btn-ghost-dark" title="Fresh battle, same map — for A/B testing a layout">Rematch this map</button>'
    : '';
  var copyBtn = '<button id="boCopy" class="ghost btn-ghost-dark" title="Copy the full campaign journal to the clipboard">Copy journal</button>';
  if (m.winner){
    html += '<h2 class="'+m.winner+'" style="margin-top:14px;">'+capName(m.winner)+' wins the war!</h2>' +
      '<div class="ovr-btns"><button id="boNew">New Campaign</button>'+rematch+copyBtn+'<button id="boMenu" class="ghost btn-ghost-dark">Main Menu</button></div>';
  } else {
    html += '<p class="small">'+capName(m.lastLoser)+' moves first in the next battle.</p>' +
      '<div class="ovr-btns"><button id="boNext">Next Battle</button>'+rematch+copyBtn+'<button id="boMenu" class="ghost btn-ghost-dark">Main Menu</button></div>';
  }
  $('battlePanel').innerHTML = html;
  $('battleOvr').classList.add('active');
  if ($('boRematch')) $('boRematch').onclick = function(){
    $('battleOvr').classList.remove('active');
    startLocal(APP.mode, [m.maps[st.mapIndex]]);
  };
  if ($('boNext')) $('boNext').onclick = function(){
    $('battleOvr').classList.remove('active');
    APP.st = E.newBattle(m);
    APP.ui = { sel:null, stage:null, busy:false, handoffPending: APP.mode==='hotseat' };
    renderAll(); saveLocal();
    if (APP.mode==='net') pushState();
    if (APP.mode==='hotseat') showHandoff(); else maybeAI();
  };
  if ($('boNew')) $('boNew').onclick = function(){
    $('battleOvr').classList.remove('active');
    clearSave();
    if (APP.mode==='net'){
      var pool = getMapPool() || E.MAPS;
      var match = E.newMatch({ maps: pool });
      APP.st = E.newBattle(match);
      renderAll(); pushState();
    } else startLocal(APP.mode);
  };
  if ($('boCopy')) $('boCopy').onclick = function(){ copyText(journalText(st), $('boCopy')); };
  $('boMenu').onclick = function(){
    $('battleOvr').classList.remove('active');
    if (APP.net.poller) clearInterval(APP.net.poller);
    APP.net.poller=null; APP.mode=null;
    show('menu'); checkResume();
  };
}

// Plain-text campaign journal for the clipboard (Feedback Round 2).
function journalText(st){
  var m = st.match;
  var res = st.winType==='hq' ? capName(st.battleWinner)+' captured the enemy HQ'
    : st.winType==='concession' ? capName(st.battleWinner)+' won — enemy conceded'
    : capName(st.battleWinner)+' won by attrition ('+E.fieldScore(st,'red')+'–'+E.fieldScore(st,'blue')+' VP surviving)';
  var lines = [
    'War of Attrition — Battle '+(m.battleIndex+1)+' — "'+st.mapName+'"',
    'Result: '+res,
    'Campaign: Red '+m.wins.red+' — Blue '+m.wins.blue,
    ''
  ];
  (st.log||[]).forEach(function(e){ lines.push('T'+e.turn+' · '+e.msg); });
  return lines.join('\n');
}

function showHandoff(){
  if (APP.st.phase==='battle-over') return;
  APP.ui.handoffPending = true;
  var p = APP.st.current;
  $('handoffPanel').innerHTML =
    '<h2 class="'+p+'">'+capName(p)+'&rsquo;s turn</h2>' +
    '<p>Pass the device to the '+capName(p)+' commander.</p>' +
    '<div class="ovr-btns"><button id="hoGo">Take Command</button></div>';
  $('handoffOvr').classList.add('active');
  renderHand();
  $('hoGo').onclick = function(){
    $('handoffOvr').classList.remove('active');
    APP.ui.handoffPending = false;
    renderHand(); renderPrompt();
  };
}

/* =================== actions =================== */
// House rule: any card can instead be resolved as a basic attack or a basic reposition.
function playCardUI(cid){
  var st = APP.st;
  var c = E.CARD_BY_ID[cid];
  var side = st.current;
  var canAtk = E.listAttacks(st, side).length > 0;
  var rp = E.listRepositions(st, side);
  var canRp = rp.moves.length > 0 || rp.swaps.length > 0;
  $('playPanel').innerHTML =
    artImg(cid, 'bigart') +
    '<h2>'+c.name+'</h2>' +
    '<p class="small" style="margin-bottom:10px;">'+c.text+'</p>' +
    '<div class="menu-btns">' +
      '<button id="pcNormal">Play the card action</button>' +
      '<button id="pcAttack" '+(canAtk?'':'disabled')+'>Resolve as a basic Attack'+(canAtk?'':' (no targets)')+'</button>' +
      '<button id="pcRepos" '+(canRp && !canAtk?'':'disabled')+'>Resolve as a basic Reposition'+(!canRp?' (no moves)':canAtk?' (attack available)':'')+'</button>' +
      '<button id="pcCancel" class="ghost btn-ghost-dark">Keep it in hand</button>' +
    '</div>' +
    '<p class="small" style="margin-top:10px;">However it is resolved, the card is removed from the game.</p>';
  $('playOvr').classList.add('active');
  function go(mode){
    $('playOvr').classList.remove('active');
    try { E.playCard(st, cid, mode); } catch(e){ return; }
    APP.ui.sel = null;
    afterChange();
  }
  $('pcNormal').onclick = function(){ go('normal'); };
  if (canAtk) $('pcAttack').onclick = function(){ go('attack'); };
  if (canRp && !canAtk) $('pcRepos').onclick = function(){ go('reposition'); };
  $('pcCancel').onclick = function(){ $('playOvr').classList.remove('active'); };
}
function act(choice){
  var st = APP.st;
  var pre = capturePre(st, choice);
  try { E.applyStep(st, choice); } catch(e){ toast('Invalid move.', 1800); renderAll(); return; }
  APP.ui.sel = null;
  afterChange();
  playFX(pre);
}
function afterChange(){
  var st = APP.st;
  renderAll(); saveLocal();
  if (APP.mode==='net') pushState();
  // let the final strike arrow / death animation (~.85s) finish before the win card
  if (st.phase === 'battle-over'){ clearIfMatchOver(); setTimeout(showBattleOver, 900); return; }
  if (st.phase === 'choose-card'){
    // turn changed
    if (APP.mode==='hotseat') showHandoff();
    else maybeAI();
  }
}
function clearIfMatchOver(){ if (APP.st.match.winner) clearSave(); }

/* =================== card glossary =================== */
function showCards(){
  var inGame = !!APP.st && !!APP.mode;
  var youSide = inGame && APP.mode !== 'hotseat' ? APP.mySide : null;
  var rows = '<table><tr><th style="text-align:left;">Card</th><th>#</th><th style="text-align:left;">Action</th>' +
    (inGame ? '<th style="color:var(--red-dark);">Red'+(youSide==='red'?' (you)':'')+'</th>' +
              '<th style="color:var(--blue-dark);">Blue'+(youSide==='blue'?' (you)':'')+'</th>' : '') + '</tr>';
  function spentCell(n, total, color){
    var marks = '';
    for (var i = 0; i < total; i++) marks += (i < n ? '&#10006;' : '&#9675;') + (i < total-1 ? ' ' : '');
    return '<td style="white-space:nowrap; font-size:14px;'+(n===total ? 'background:'+color+';' : '')+'">'+marks+'</td>';
  }
  E.CARDS.forEach(function(c){
    var cells = '<td style="text-align:left;"><b>'+c.name+'</b>'+(c.starting?' <span class="small">(starting card)</span>':'')+'</td>' +
      '<td>'+c.count+'</td><td style="text-align:left;">'+c.text+'</td>';
    if (inGame){
      var rN = APP.st.removed.red.filter(function(id){ return id===c.id; }).length;
      var bN = APP.st.removed.blue.filter(function(id){ return id===c.id; }).length;
      cells += spentCell(rN, c.count, 'rgba(158,43,37,.18)') + spentCell(bN, c.count, 'rgba(40,82,122,.18)');
    }
    rows += '<tr>'+cells+'</tr>';
  });
  rows += '</table>';
  if (inGame) rows += '<p class="small" style="margin-top:8px;">&#10006; = that copy has been resolved this battle and is gone from the game; &#9675; = still in deck, hand, or discard. Shaded cell = every copy spent.</p>';
  $('cardsBody').innerHTML = rows;
  $('cardsOvr').classList.add('active');
}

/* =================== AI driver =================== */
function maybeAI(){
  var st = APP.st;
  var aiTurn = (APP.mode === 'ai' && st.current !== APP.mySide) || APP.mode === 'watch';
  if (!aiTurn || st.phase !== 'choose-card') return;
  APP.ui.busy = true;
  renderPrompt();
  setTimeout(function(){
    // a beaten general yields rather than playing out a foregone conclusion
    if (E.concedeAdvised(st, st.current)){
      var loser = st.current;
      E.concede(st, loser);
      toast(capName(loser)+' <b>concedes the field</b> — the outcome was beyond doubt.', 3200);
      APP.ui.busy = false;
      renderAll(); saveLocal();
      clearIfMatchOver(); showBattleOver();
      return;
    }
    var plan = E.aiPlanTurn(st, APP.diff);
    if (!plan){ APP.ui.busy=false; return; }
    E.playCard(st, plan.cardId, plan.mode || 'normal');
    var modeTxt = plan.mode==='attack' ? ' as a direct attack' : plan.mode==='reposition' ? ' as a simple maneuver' : '';
    toast(capName(st.current)+' plays <b>'+E.CARD_BY_ID[plan.cardId].name+'</b>'+modeTxt, 2200);
    renderAll();
    var i = 0;
    function nextStep(){
      if (st.phase !== 'step'){
        APP.ui.busy = false;
        renderAll(); saveLocal();
        if (st.phase==='battle-over'){ clearIfMatchOver(); showBattleOver(); }
        else { renderPrompt(); maybeAI(); } // watch mode: the other general takes over
        return;
      }
      var c = plan.choices[i++] || {skip:true};
      var pre = capturePre(st, c);
      try { E.applyStep(st, c); } catch(e){ pre = null; try { E.applyStep(st, {skip:true}); } catch(e2){} }
      renderAll();
      playFX(pre);
      setTimeout(nextStep, 650);
    }
    setTimeout(nextStep, 650);
  }, 500);
}
