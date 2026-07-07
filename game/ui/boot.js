/* War of Attrition — ui part: BOOT — loaded LAST. Every top-level statement
   that EXECUTES at page load lives here: dropdown population, deep links,
   all button/overlay wiring, the initial checkResume(). Function
   declarations do not hoist across files, so immediate statements must run
   after every ui part above has been parsed — keep this file last in
   index.html's tag chain (game/test.js asserts it). Extracted verbatim
   from index.html's inline app script. */
'use strict';

// AI personalities beyond easy/normal/hard come from maps.js as data — offer
// them wherever an AI is picked (enemy general + dashboard sides)
(function(){
  Object.keys(E.AI_PRESETS).forEach(function(n){
    if (n === 'easy' || n === 'normal' || n === 'hard') return;
    ['diffSel', 'dashRed', 'dashBlue'].forEach(function(id){
      var o = document.createElement('option');
      o.value = n; o.textContent = n.charAt(0).toUpperCase() + n.slice(1) + ' (custom AI)';
      $(id).appendChild(o);
    });
  });
})();

// board shapes come from maps.js — keep the editor's dropdown in sync
(function(){
  var sel = $('edShape');
  Object.keys(E.SHAPES).forEach(function(n){
    if (n.charAt(0) === '@') return; // per-map registered shapes aren't templates
    var o = document.createElement('option');
    o.value = n; o.textContent = E.SHAPES[n].label;
    sel.appendChild(o);
  });
  var oc = document.createElement('option');
  oc.value = '@custom'; oc.textContent = 'Custom — edit hexes';
  sel.appendChild(oc);
})();

/* =================== menu =================== */
document.querySelectorAll('#sideRow .choice').forEach(function(el){
  el.onclick = function(){ document.querySelectorAll('#sideRow .choice').forEach(function(x){x.classList.remove('sel');}); el.classList.add('sel'); APP.mySide = el.dataset.side; };
});
$('diffSel').onchange = function(){ APP.diff = this.value; };
$('btnAI').onclick = function(){ startLocal('ai'); };
// deep link straight into a game: index.html?autostart=ai (handy for screenshots & sharing)
if (/autostart=ai/.test(location.search)) setTimeout(function(){ startLocal('ai'); }, 60);
// deep link to a menu screen: index.html?screen=deck|dash|maps|manual (screenshots & quick testing)
if (/screen=/.test(location.search)) setTimeout(function(){
  var s = (location.search.match(/screen=(\w+)/)||[])[1];
  if (s==='deck') openDeck();
  else if (s==='dash'){ openDash(); if (/[?&]run/.test(location.search)){ $('dashN').value='20'; if ($('dashMap').options[1]) $('dashMap').value = $('dashMap').options[1].value; setTimeout(function(){ $('dashRun').click(); }, 40); } }
  else if (s==='maps'){ renderMapsScr(); show('mapsScr'); }
  else if (s==='manual'){ // optional &ex=2&beat=3 target one frame (1-based beat)
    openManual();
    var mx = (location.search.match(/[?&]ex=(\d+)/)||[])[1];
    var mb = (location.search.match(/[?&]beat=(\d+)/)||[])[1];
    if (mx !== undefined || mb !== undefined){
      if (mx !== undefined) MANUAL.ex = +mx - 1;
      if (mb !== undefined) MANUAL.beat = +mb - 1;
      renderManual();
    }
  }
}, 60);
$('btnWatch').onclick = function(){ startLocal('watch'); };
$('btnHotseat').onclick = function(){ startLocal('hotseat'); };
// the Field Manual now opens through ui/manual.js (V1 diagram player renders
// its current example/beat before the overlay shows)
$('btnManual').onclick = function(){ openManual(); };
$('btnManual2').onclick = function(){ openManual(); };
$('mpPrev').onclick = function(){ manualStep(-1); };
$('mpNext').onclick = function(){ manualStep(1); };
$('mpTabs').onclick = manualTabClick;            // tab clicks delegated to ui/manual.js
document.addEventListener('keydown', manualKey); // ← / → step beats while the manual is open
$('btnConcede').onclick = function(){
  var st = APP.st;
  if (!st || st.phase === 'battle-over' || APP.mode === 'watch') return;
  if (!inputLive() || st.phase !== 'choose-card'){ toast('You can concede at the start of your own turn.'); return; }
  var p = viewSide();
  $('confirmPanel').innerHTML =
    '<h2 class="'+p+'">Concede the field?</h2>' +
    '<p>'+capName(E.other(p))+' takes this battle. Losing one battle does not lose the war — the campaign moves on.</p>' +
    '<div class="ovr-btns"><button id="cdYes">Concede</button><button id="cdNo" class="ghost btn-ghost-dark">Fight on</button></div>';
  $('confirmOvr').classList.add('active');
  $('cdYes').onclick = function(){
    $('confirmOvr').classList.remove('active');
    E.concede(APP.st, p);
    renderAll(); saveLocal();
    if (APP.mode === 'net') pushState();
    clearIfMatchOver(); showBattleOver();
  };
  $('cdNo').onclick = function(){ $('confirmOvr').classList.remove('active'); };
};
// Debug snapshot (Feedback Round 4): dump this exact game state to logs/debug/
// so Bill can hand Claude the situation without pasting a screenshot. The state
// carries match.maps (full board + terrain defs) so the dump is self-contained.
$('btnDebug').onclick = function(){
  var st = APP.st;
  if (!st){ toast('No battle in progress to snapshot.', 2500); return; }
  var note = prompt('Save a debug snapshot of the current game.\nDescribe what looks wrong (optional):', '');
  if (note === null) return; // cancelled
  var bundle = {
    savedAt: new Date().toISOString(),
    rulesVersion: E.VERSION,
    saveV: SAVE_V,
    mode: APP.mode, mySide: APP.mySide, diff: APP.diff,
    note: note || '',
    turn: st.turnNumber, phase: st.phase, current: st.current,
    customDeck: !!localStorage.getItem('woa-custom-deck') || !!window.WOA_CUSTOM_DECK,
    state: st
  };
  var json = JSON.stringify(bundle, null, 1);
  var slug = String(st.mapName || 'battle').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  var d = new Date(), p2 = function(x){ return (x<10?'0':'')+x; };
  var stamp = d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+'-'+p2(d.getHours())+p2(d.getMinutes())+p2(d.getSeconds());
  var fname = stamp+'-'+slug+'-T'+st.turnNumber+'-'+st.phase+'.json';
  if (canNet){
    api('savedebug', { filename: fname, content: json })
      .then(function(r){ toast('Debug snapshot saved &rarr; '+(r.path || 'logs/debug/'+fname), 4200); })
      .catch(function(){ downloadDebug(fname, json); });
  } else downloadDebug(fname, json);
};

$('fabJournal').onclick = function(){
  syncJournalOverlay();
  $('journalOvr').classList.add('active');
};
// innerHTML mirroring drops click handlers — delegate turn expand/collapse in the overlay
$('journalBody').onclick = function(ev){
  var t = ev.target;
  while (t && t !== this && !(t.classList && t.classList.contains('jturn'))) t = t.parentNode;
  if (t && t.classList && t.classList.contains('jturn') && t.classList.contains('toggler')) t.classList.toggle('open');
};

$('fabRosters').onclick = function(){
  syncRostersOverlay();
  $('rostersOvr').classList.add('active');
};
$('btnQuit').onclick = function(){
  if (APP.net.poller) clearInterval(APP.net.poller);
  APP.net.poller = null; APP.mode = null;
  show('menu'); checkResume();
};

$('btnResume').onclick = function(){
  try{
    var d = JSON.parse(localStorage.getItem('woa-save'));
    if (!d || d.v !== SAVE_V) throw new Error('save from an older version');
    APP.mode = d.mode; APP.mySide = d.mySide; APP.diff = d.diff; APP.st = d.st;
    $('diffSel').value = d.diff || 'normal';
    APP.ui = { sel:null, stage:null, busy:false, handoffPending: d.mode==='hotseat' };
    show('game'); renderAll();
    if (APP.st.phase === 'battle-over') showBattleOver();
    else if (d.mode==='hotseat') showHandoff();
    else maybeAI();
  }catch(e){ clearSave(); checkResume(); }
};
checkResume();

if (!canNet){
  $('btnHost').disabled = true; $('btnJoin').disabled = true;
  $('netHint').textContent = 'Two-device play needs the server: double-click run-server.bat, then open the address it prints on both devices.';
}

$('btnHost').onclick = function(){
  var pool = getMapPool();
  if (!pool || !pool.length){ toast('No maps are in play! Enable some in Maps &amp; Map Editor.', 3500); return; }
  var match = E.newMatch({ maps: pool });
  var st = E.newBattle(match);
  api('create', { state: st }).then(function(d){
    APP.mode='net'; APP.mySide='red'; APP.st = st;
    APP.net.room = d.room; APP.net.seq = d.seq;
    APP.ui = { sel:null, stage:null, busy:false };
    show('game'); renderAll(); startPolling();
    toast('Room code: <b style="font-size:22px;letter-spacing:4px;">'+d.room+'</b><br><span class="small">The other device joins with this code. You are Red.</span>', 6500);
  }).catch(function(e){ toast('Could not create room — is the server running? ('+e.message+')', 4000); });
};
$('btnJoin').onclick = function(){
  var code = $('joinCode').value.trim().toUpperCase();
  if (code.length !== 4) { toast('Enter the 4-letter room code.', 2500); return; }
  api('join', { room: code }).then(function(d){
    APP.mode='net'; APP.mySide='blue'; APP.st = d.state;
    APP.net.room = code; APP.net.seq = d.seq;
    APP.ui = { sel:null, stage:null, busy:false };
    show('game'); renderAll(); startPolling();
    toast('Joined! You are Blue.', 3000);
    if (APP.st.phase==='battle-over') showBattleOver();
  }).catch(function(e){ toast('Could not join: '+e.message, 3500); });
};

$('btnCards').onclick = showCards;
$('btnCardsMenu').onclick = showCards;

$('btnMaps').onclick = function(){ renderMapsScr(); show('mapsScr'); };
$('btnMapsBack').onclick = function(){ show('menu'); checkResume(); };
$('btnNewMap').onclick = function(){ openEditor(null); };
// Export the whole roster as a shareable bundle (maps are files now, so this is
// just a convenient way to hand someone your set); Import writes each map to its
// own content file via the server.
$('btnExportMaps').onclick = function(){
  var maps = E.MAPS;
  var blob = new Blob([JSON.stringify(maps, null, 1)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'maps-bundle.json';
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
  toast('Downloaded maps-bundle.json ('+maps.length+' maps) &mdash; Import it elsewhere with the Import button.', 4500);
};
$('btnImportMaps').onclick = function(){ $('importFile').click(); };
$('importFile').onchange = function(){
  var f = $('importFile').files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function(){
    try {
      var txt = String(rd.result).trim();
      // accept a bare array, an assignment (WOA_CUSTOM_MAPS = [...]), or one map
      var eq = txt.indexOf('=');
      if (txt.charAt(0) !== '[' && txt.charAt(0) !== '{' && eq >= 0) txt = txt.slice(eq + 1);
      txt = txt.trim().replace(/;\s*$/, '');
      var data = JSON.parse(txt);
      var arr = Array.isArray(data) ? data : [data];
      var saved = 0;
      arr.forEach(function(m){
        if (!m || !m.name) return;
        m.custom = true;
        m.id = m.id || slugifyMap(m.name);
        if (m.shapeDef) m.shape = '@' + m.id;
        rosterReplace(m);
        if (canNet) saveMapFile(m);
        saved++;
      });
      renderMapsScr();
      toast('Imported ' + saved + ' map(s)' + (canNet ? ' &mdash; saved to content/maps/.' : ' for this session; run the server to save them as files.'), 4200);
    } catch(e){ toast('Could not read that file: ' + e.message, 3500); }
    $('importFile').value = '';
  };
  rd.readAsText(f);
};

$('btnDeck').onclick = openDeck;
$('dkBack').onclick = function(){ show('menu'); checkResume(); };

$('dkAdd').onclick = function(){
  DK.cards.push({ id:'new_card', name:'New Card', count:1, text:'Order an attack.', steps:[{ type:'attack' }] });
  DK.sel = DK.cards.length - 1;
  renderDeck();
};

$('dkSave').onclick = function(){
  var probs = deckProblems(DK.cards);
  if (probs.length){ toast('Fix first: ' + probs[0], 4200); return; }
  flushSlot();
  persistDecks(); // all five slots are kept in the browser, valid or not
  // The ACTIVE slot is what the game runs — validate it (it may be a different slot).
  var act = DK.slots[DK.active];
  var actProbs = act ? deckProblems(act.cards) : ['the active deck slot is empty'];
  if (actProbs.length){ toast('Slots saved, but the ACTIVE deck ("'+(act?act.name:'—')+'") is invalid: '+actProbs[0]+' — Set active on a valid deck.', 5600); return; }
  var ship = shipCards(act.cards);
  try { localStorage.setItem('woa-custom-deck', JSON.stringify(ship)); }
  catch(e){ toast('The browser refused to store the deck (private mode?). Use Export instead.', 5000); return; }
  clearSave(); // an in-flight battle from another deck would confuse the resume path
  toast('Deck "'+act.name+'" is now active — reloading with its cards…', 1800);
  syncDeckFile(ship, function(){ setTimeout(function(){ location.reload(); }, 600); });
};
$('dkReset').onclick = function(){
  if (!confirm('Restore the default deck (content/decks/default.js)?')) return;
  try { localStorage.removeItem('woa-custom-deck'); } catch(e){}
  clearSave();
  syncDeckFile(null, function(){ location.reload(); });
};
$('dkExport').onclick = function(){
  var probs = deckProblems(DK.cards);
  if (probs.length){ toast('Fix first: ' + probs[0], 4200); return; }
  var blob = new Blob(['window.WOA_CUSTOM_DECK = ' + JSON.stringify(deckToShip(), null, 1) + ';\n'], { type:'text/javascript' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'custom-deck.js';
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
  toast('Downloaded custom-deck.js — put it next to index.html.', 4500);
};
$('dkImport').onclick = function(){ $('dkImportFile').click(); };
$('dkImportFile').onchange = function(){
  var f = $('dkImportFile').files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function(){
    try {
      var txt = String(rd.result);
      var eq = txt.indexOf('=');
      if (txt.trim().charAt(0) !== '[' && eq >= 0) txt = txt.slice(eq + 1);
      var arr = JSON.parse(txt.trim().replace(/;\s*$/, ''));
      if (!Array.isArray(arr) || !arr.length) throw new Error('not a card list');
      DK.cards = arr;
      DK.sel = 0;
      renderDeck();
      toast('Imported ' + arr.length + ' cards — review, then Save &amp; Reload.', 3200);
    } catch(e){ toast('Could not read that file: ' + e.message, 3500); }
    $('dkImportFile').value = '';
  };
  rd.readAsText(f);
};

// V1 persistence: every REAL finished battle in this browser becomes a row in
// logs/woa.db via POST /api/recordbattle (fail-open: file:// or a server
// without dev/ simply skips it). One subscription covers every source —
// finishBattle fires the hook for human play, hotseat, watch, the LAN peer
// that dealt the final blow (exactly one of the two), and each dashboard
// simulation battle. Search clones never fire it (__sim).
E.hooks.onBattleEnd.push(function (st) {
  if (!canNet) return;
  var dash = (typeof DASH !== 'undefined') && DASH.running;
  var kind = dash ? 'balance' : APP.mode === 'watch' ? 'watch' : 'human';
  function aiOf(side){
    if (dash) return side === 'red' ? DASH.meta.dr : DASH.meta.db;
    if (APP.mode === 'watch') return APP.diff || 'normal';
    if (APP.mode === 'ai') return side === APP.mySide ? 'human' : (APP.diff || 'normal');
    return 'human'; // hotseat + LAN
  }
  var m = st.match; st.match = null; // the cycle never crosses the wire
  try {
    api('recordbattle', {
      runKey: dash ? DASH.runKey : undefined,
      run: { version: E.VERSION, kind: kind, redAi: aiOf('red'), blueAi: aiOf('blue'),
        n: dash ? DASH.meta.n : 1, tool: dash ? 'dashboard' : 'browser' },
      state: st, firstPlayer: E.other(st.second), seed: st.seed
    }).catch(function(){ /* persistence is best-effort */ });
  } finally { st.match = m; }
});

$('btnDash').onclick = openDash;
$('dashBack').onclick = function(){ DASH.cancel = true; show('menu'); checkResume(); };
$('dashStop').onclick = function(){ DASH.cancel = true; };

$('dashRun').onclick = function(){
  if (DASH.running) return;
  var n = +$('dashN').value;
  var dr = $('dashRed').value, db = $('dashBlue').value;
  var pick = $('dashMap').value;
  // '@adhoc' = the map editor's as-drawn (possibly unsaved) def, via openDashDef
  var maps = pick === '@adhoc' ? (DASH.adhoc ? [DASH.adhoc] : []) : getMapPool();
  if (pick !== 'all' && pick !== '@adhoc') maps = maps.filter(function(m){ return m.name === pick; });
  if (!maps.length){ toast('No maps in play — enable some in Maps &amp; Map Editor.', 3500); return; }
  var probs = E.validateMaps(maps);
  if (probs.length){ toast('Fix these maps first: '+probs.join('; '), 4500); return; }
  DASH.running = true; DASH.cancel = false;
  DASH.results = []; DASH.meta = { n:n, dr:dr, db:db };
  DASH.runKey = 'dash-' + Date.now(); // groups this run's battles into one DB run row
  $('dashStop').style.display = ''; $('dashRun').disabled = true;
  var mi = 0, g = 0, out = E.balanceNew(n);
  var t0 = Date.now();
  function finish(){
    DASH.running = false;
    $('dashStop').style.display = 'none'; $('dashRun').disabled = false;
    $('dashStatus').textContent = DASH.cancel
      ? 'Stopped — showing the maps that finished.'
      : 'Done: '+DASH.results.length+' map(s) × '+n+' battles in '+((Date.now()-t0)/1000).toFixed(0)+'s.';
    renderDash();
  }
  function step(){
    if (DASH.cancel){ finish(); return; }
    if (g >= n){
      DASH.results.push({ map: maps[mi], out: out });
      renderDash();
      mi++; g = 0; out = E.balanceNew(n);
      if (mi >= maps.length){ finish(); return; }
    }
    $('dashStatus').textContent = 'Map '+(mi+1)+'/'+maps.length+' — "'+maps[mi].name+'", battle '+(g+1)+'/'+n+'…'+
      (dr==='hard'||db==='hard' ? ' (Field Marshal thinks ~1s per battle)' : '');
    setTimeout(function(){
      if (DASH.cancel){ finish(); return; }
      var fp = E.balanceFP(g);
      var st = E.simBattle(maps[mi], E.balanceSeed((mi+1)*7919, g), fp, dr, db);
      E.balanceAdd(out, st, fp);
      g++;
      step();
    }, 8);
  }
  step();
};

// Save the displayed run to logs/reports/balance/<version>/ (Feedback Round 4) so
// Bill, Claude and the report skills discuss the same numbers. Markdown mirrors
// the on-screen folds; the server files it under the current rules version.
$('dashSave').onclick = function(){
  if (DASH.running){ toast('Let the run finish first.', 2500); return; }
  if (!DASH.results.length){ toast('Run a report first, then save it.', 3000); return; }
  var md = dashReportMarkdown();
  var d = new Date(), p2 = function(x){ return (x<10?'0':'')+x; };
  var stamp = d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+'-'+p2(d.getHours())+p2(d.getMinutes());
  var fname = stamp+'-'+DASH.meta.dr+'-vs-'+DASH.meta.db+'-n'+DASH.meta.n+'.md';
  if (canNet){
    api('savereport', { filename: fname, content: md, version: E.VERSION })
      .then(function(r){ toast('Saved &rarr; '+(r.path || 'logs/reports/balance/'+E.VERSION+'/'+fname), 4200); })
      .catch(function(){ dashDownloadReport(fname, md); });
  } else dashDownloadReport(fname, md);
};

document.querySelectorAll('.edtools .tool').forEach(function(b){
  b.onclick = function(){
    ED.tool = b.dataset.tool;
    if (ED.tool === 'hexes' && !ED.hexes) edGoCustom(); // carving implies a custom outline
    document.querySelectorAll('.edtools .tool').forEach(function(x){ x.classList.toggle('sel', x===b); });
    renderEditor();
  };
});

$('edShape').onchange = function(){
  var v = $('edShape').value;
  if (v === '@custom'){
    if (!ED.hexes) edGoCustom();
    renderEditor();
    return;
  }
  if (Object.keys(ED.edges).length || ED.red || ED.blue || ED.hexes){
    if (!confirm('Changing the board clears the map. Continue?')){ $('edShape').value = ED.shape; return; }
  }
  ED.shape = v; ED.hexes = null; ED.red = null; ED.blue = null; ED.edges = {};
  renderEditor();
};
$('edClear').onclick = function(){
  if (confirm('Clear all terrain and HQs?')){ ED.red=null; ED.blue=null; ED.edges={}; renderEditor(); }
};
$('edMirror').onclick = function(){
  // point-symmetry: every edge and HQ gets its rotated twin
  var live = edLiveShape();
  if (!E.SHAPES[live] || !E.SHAPES[live].centre){
    toast('This outline is not point-symmetric, so Mirror has no centre to turn around. Carve the hexes symmetric first.', 4200);
    return;
  }
  var add = {};
  for (var ek in ED.edges){
    var parts = ek.split('>');
    var a = E.parseKey(parts[0]);
    var ra = E.rot180(live, a[0], a[1]);
    add[E.key(ra[0], ra[1]) + '>' + ((+parts[1] + 3) % 6)] = ED.edges[ek];
  }
  for (var k2 in add) ED.edges[k2] = add[k2];
  if (ED.red && !ED.blue) ED.blue = E.rot180(live, ED.red[0], ED.red[1]);
  else if (ED.blue && !ED.red) ED.red = E.rot180(live, ED.blue[0], ED.blue[1]);
  else if (ED.red) ED.blue = E.rot180(live, ED.red[0], ED.red[1]);
  renderEditor();
};
$('edBack').onclick = function(){ renderMapsScr(); show('mapsScr'); };

$('edSave').onclick = function(){
  var def = edBuildDef();
  if (!def) return;
  edSaveDef(def).then(function(r){
    toast(r && r.offline
      ? 'Map "'+def.name+'" is loaded for this session. Run <code>node game/server.js</code> to save it as a file.'
      : 'Map "'+def.name+'" saved to content/maps/.', 3200);
  }).catch(function(){ toast('Could not save the map file.', 3500); });
  renderMapsScr(); show('mapsScr');
};
$('edTest').onclick = function(){
  var def = edBuildDef();
  if (!def) return;
  edSaveDef(def);
  startLocal('ai', [def]);
};
$('edBalance').onclick = function(){
  // balance the map AS DRAWN through the one dashboard pipeline (invalid maps
  // toast inside edBuildDef/openDashDef and we stay in the editor)
  openDashDef(edBuildDef());
};
