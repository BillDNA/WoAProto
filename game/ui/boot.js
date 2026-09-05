/* War of Attrition — ui part: BOOT — loaded LAST. Every top-level statement
   that EXECUTES at page load lives here: dropdown population, deep links,
   all button/overlay wiring, the initial checkResume(). Function
   declarations do not hoist across files, so immediate statements must run
   after every ui part above has been parsed — keep this file last in
   index.html's tag chain (game/test/test.js asserts it). Extracted verbatim
   from index.html's inline app script. */
'use strict';

// Every modal's markup, written from the registry (ui/modals/modal.js) before any
// wiring below reaches into a modal body.
uiModalsBuild();

// config identity: a small, read-only screen-corner overlay stamping the
// config identity — rules version + both config-home digests — so any screenshot
// carries a retrievable record of which dials were in force. Plain HTML (no SVG),
// rendered once at load (a reload re-stamps it — the supported way to change a dial
// is to edit its value in the config home and reload).
(function(){
  var el = document.createElement('div');
  el.id = 'configBug';
  el.textContent = 'WoA v' + E.VERSION + ' · cfg ' + E.CONFIG.digest + ' · ui ' + UI_CONFIG.digest;
  el.title = 'Live config identity (rules version + engine/UI config digests)';
  document.body.appendChild(el);
})();

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

/* =================== front door + navigation =================== */
// Dev mode is a stored flag; reflect it into body.dev before anything renders,
// and let ?dev=1 arm it (dropped in a player build). ` / ~ toggles it live.
if (/[?&]dev=1/.test(location.search)) setDevMode(true);
applyDevMode();
document.addEventListener('keydown', devHotkey);

// side + enemy general live in Settings now; the ids are unchanged so this
// wiring is the same, it just fires from the Settings screen.
document.querySelectorAll('#sideRow .choice').forEach(function(el){
  el.onclick = function(){ document.querySelectorAll('#sideRow .choice').forEach(function(x){x.classList.remove('sel');}); el.classList.add('sel'); APP.mySide = el.dataset.side; };
});
$('diffSel').onchange = function(){ APP.diff = this.value; };
$('setDevToggle').onchange = function(){ setDevMode(this.checked); };

// Play (New Campaign) opens the run-flow entry (campaign stub), not a battle
// straight off — so the run screens, when built, already have the front door
// pointing at them. Next Battle is what actually drops into a fight for now.
$('btnPlay').onclick = function(){ SCREENS.campaign.entry(); };
$('btnNextBattle').onclick = function(){ startLocal('ai'); };
$('btnSettings').onclick = function(){ SCREENS.settings.entry(); };
$('btnSettingsBack').onclick = function(){ SCREENS.frontdoor.entry(); };
$('btnCampaignBack').onclick = function(){ SCREENS.frontdoor.entry(); };
// Muster: the player battalion builder, on the run flow between campaign and battle
$('btnMuster').onclick = function(){ SCREENS.pickcommander.entry(); };
$('cmdContinue').onclick = function(){ SCREENS.buildbattalion.entry(); };
$('cmdBack').onclick = function(){ SCREENS.campaign.entry(); };
$('pbMarch').onclick = function(){ pbMarchOut(); };
$('pbBack').onclick = function(){ SCREENS.pickcommander.entry(); };
$('btnPeekRewards').onclick = function(){ SCREENS.rewards.entry(); };
$('btnPeekSummary').onclick = function(){ SCREENS.runsummary.entry(); };
$('btnRewardsBack').onclick = function(){ SCREENS.campaign.entry(); };
$('btnRunSummaryBack').onclick = function(){ SCREENS.campaign.entry(); };
$('btnDevHub').onclick = function(){ SCREENS.devhub.entry(); };
$('btnDevHubBack').onclick = function(){ SCREENS.frontdoor.entry(); };

// deep link straight into a game: index.html?autostart=ai (handy for screenshots & sharing)
if (/autostart=ai/.test(location.search)) setTimeout(function(){ startLocal('ai'); }, 60);
// deep link to load the sample Commander onto both sides of a live battle
// (screenshots & the panel smoke): index.html?autostart=ai&commanders=demo
if (/[?&]commanders=demo/.test(location.search)) setTimeout(commanderDemoLoad, 120);
// deep link to a screen: index.html?screen=battalion|dash|maps|manual|settings|campaign
// (screenshots & quick testing). Dev screens arm dev mode first so the deep link
// works even from a fresh (dev-off) browser.
if (/screen=/.test(location.search)) setTimeout(function(){
  var s = (location.search.match(/screen=(\w+)/)||[])[1];
  if (SCREENS[s] && SCREENS[s].kind === 'dev') setDevMode(true);
  if (s==='settings') SCREENS.settings.entry();
  else if (s==='campaign') SCREENS.campaign.entry();
  else if (s==='buildbattalion' || s==='muster') SCREENS.buildbattalion.entry();
  else if (s==='rewards') SCREENS.rewards.entry();
  else if (s==='runsummary') SCREENS.runsummary.entry();
  else if (s==='devhub') SCREENS.devhub.entry();
  else if (s==='battalion') openBattalion();
  else if (s==='dash'){
    openDash();
    // &charts auto-opens the view-only Overview pane (screenshots & quick testing)
    var wantCharts = /[?&]charts/.test(location.search);
    if (wantCharts){ DASH.view = 'overview'; renderDash(); }
    if (/[?&]run/.test(location.search)){
      $('dashN').value='20';
      // the view-only panes read across maps, so &charts keeps "All in play"; otherwise one map for speed
      if (!wantCharts && $('dashMap').options[1]) $('dashMap').value = $('dashMap').options[1].value;
      setTimeout(function(){ $('dashRun').click(); }, 40);
    }
  }
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
// Watch / Maps / Battalion / Dashboard are Dev Hub tools now — their buttons are
// generated by renderDevHub (ui/screens.js) with the registry entry as handler,
// so they are NOT wired here.
$('btnHotseat').onclick = function(){ startLocal('hotseat'); };
// the Field Manual opens through ui/manual.js (its diagram player renders
// the current example/beat before the overlay shows)
$('btnManual').onclick = function(){ openManual(); };
$('btnManual2').onclick = function(){ openManual(); };
$('mpPrev').onclick = function(){ manualStep(-1); };
$('mpNext').onclick = function(){ manualStep(1); };
$('mpTabs').onclick = manualTabClick;            // tab clicks delegated to ui/manual.js
document.addEventListener('keydown', manualKey); // ← / → step beats while the manual is open
$('btnConcede').onclick = function(){
  var st = APP.st, v = E.view(st);
  if (!st || v.phase === 'skirmish-over' || APP.mode === 'watch') return;
  if (!inputLive() || v.phase !== 'choose-card'){ toast('You can concede at the start of your own turn.'); return; }
  var p = viewSide();
  confirmDialog({
    title: 'Concede the field?', titleClass: p,
    body: '<p>'+capName(E.other(p))+' takes this skirmish. Losing one skirmish does not lose the war — the campaign moves on.</p>',
    yesLabel: 'Concede', noLabel: 'Fight on',
    onYes: function(){
      E.concede(APP.st, p);
      renderAll(); saveLocal();
      if (APP.mode === 'net') pushState();
      clearIfBattleOver(); showSkirmishOver();
    }
  });
};
// Debug snapshot: dump this exact game state to logs/debug/
// so Bill can hand Claude the situation without pasting a screenshot. The state
// carries battle.maps (full board + terrain defs) so the dump is self-contained.
$('btnDebug').onclick = function(){
  var st = APP.st, v = E.view(st);
  if (!st){ toast('No skirmish in progress to snapshot.', 2500); return; }
  var note = prompt('Save a debug snapshot of the current game.\nDescribe what looks wrong (optional):', '');
  if (note === null) return; // cancelled
  var bundle = {
    savedAt: new Date().toISOString(),
    rulesVersion: E.VERSION,
    saveV: SAVE_V,
    mode: APP.mode, mySide: APP.mySide, diff: APP.diff,
    note: note || '',
    turn: v.turnNumber, phase: v.phase, current: v.current,
    customBattalion: !!localStorage.getItem('woa-custom-battalion') || !!window.WOA_CUSTOM_BATTALION,
    state: st
  };
  var json = JSON.stringify(bundle, null, 1);
  var slug = String(v.mapName || 'skirmish').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  var d = new Date(), p2 = function(x){ return (x<10?'0':'')+x; };
  var stamp = d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+'-'+p2(d.getHours())+p2(d.getMinutes())+p2(d.getSeconds());
  var fname = stamp+'-'+slug+'-T'+v.turnNumber+'-'+v.phase+'.json';
  api('savedebug', { filename: fname, content: json })
    .then(function(r){ toast('Debug snapshot saved &rarr; '+(r.path || 'logs/debug/'+fname), 4200); })
    .catch(function(){ downloadDebug(fname, json); });
};

$('fabJournal').onclick = function(){ modalOpen('journal'); };
// innerHTML mirroring drops click handlers — delegate turn expand/collapse in the overlay
$('journalOvrBody').onclick = function(ev){
  var t = ev.target;
  while (t && t !== this && !(t.classList && t.classList.contains('jturn'))) t = t.parentNode;
  if (t && t.classList && t.classList.contains('jturn') && t.classList.contains('toggler')) t.classList.toggle('open');
};

$('fabRosters').onclick = function(){ modalOpen('mats'); };
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
    syncCommandersFromState(); // a resumed battle re-seeds the Commander panel from its saved state
    show('game'); renderAll();
    if (E.view(APP.st).phase === 'skirmish-over') showSkirmishOver();
    else if (d.mode==='hotseat') showHandoff();
    else maybeAI();
  }catch(e){ clearSave(); checkResume(); }
};
checkResume();

$('btnHost').onclick = function(){
  var pool = getActiveMaps();
  if (!pool || !pool.length){ toast('No maps are in play! Enable some in Maps &amp; Map Editor.', 3500); return; }
  var battle = E.newBattle({ maps: pool });
  var st = E.newSkirmish(battle);
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
    syncCommandersFromState(); // the joined state may seat Commanders — seed the panel from it
    show('game'); renderAll(); startPolling();
    toast('Joined! You are Blue.', 3000);
    if (E.view(APP.st).phase==='skirmish-over') showSkirmishOver();
  }).catch(function(e){ toast('Could not join: '+e.message, 3500); });
};

$('btnCards').onclick = showCards;
$('btnCardsMenu').onclick = showCards;

$('btnMapsBack').onclick = function(){ SCREENS.devhub.entry(); };
$('btnNewMap').onclick = function(){ openEditor(null); };
// Export the whole map library as a shareable bundle (maps are files now, so this is
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
        libraryReplace(m);
        saveMapFile(m).catch(function(){ toast('Could not save "'+m.name+'" as a file.', 3500); });
        saved++;
      });
      renderMapsScr();
      toast('Imported ' + saved + ' map(s) &mdash; saved to content/maps/.', 4200);
    } catch(e){ toast('Could not read that file: ' + e.message, 3500); }
    $('importFile').value = '';
  };
  rd.readAsText(f);
};

$('dkBack').onclick = function(){ SCREENS.devhub.entry(); };

$('dkAdd').onclick = function(){
  DK.cards.push({ id:'new_card', name:'New Card', count:1, text:'Order an attack.', steps:[{ type:'attack' }] });
  DK.sel = DK.cards.length - 1;
  renderBattalion();
};
// battalion assembler: pull an existing card from the shared pool (content/cards/)
$('dkAddPool').onchange = function(){ if (this.value) addPoolCard(this.value); this.value = ''; };

// browser-only battalion-override badge — visible in normal play chrome
// (fixed, not buried in the editor), shown only when WOA_APPLIED_BATTALION is
// actually live (index.html's override wiring, evaluated before this file
// runs). No override = no badge. Reset reuses the same clear+reload path as
// the editor's "Restore built-in" button below.
function resetCustomBattalion(){
  try { localStorage.removeItem('woa-custom-battalion'); } catch(e){}
  clearSave();
  syncBattalionFile(null, function(){ location.reload(); });
}
if (typeof WOA_BATTALION_SRC !== 'undefined' && WOA_BATTALION_SRC !== 'builtin'){
  var battalionBadgeName = 'custom-battalion.js';
  if (WOA_BATTALION_SRC === 'local'){
    battalionBadgeName = 'a custom battalion saved in this browser';
    try {
      var wd = JSON.parse(localStorage.getItem('woa-battalions'));
      var slot = wd && wd.slots && wd.slots[wd.active];
      if (slot && slot.name) battalionBadgeName = slot.name;
    } catch(e){}
  }
  $('battalionBadgeText').textContent = 'custom battalion applied: ' + battalionBadgeName;
  $('battalionBadge').style.display = 'flex';
  $('battalionBadgeReset').onclick = resetCustomBattalion;
}

$('dkSave').onclick = function(){
  var probs = battalionProblems(DK.cards);
  if (probs.length){ toast('Fix first: ' + probs[0], 4200); return; }
  flushSlot();
  persistBattalions(); // all five slots are kept in the browser, valid or not
  // The ACTIVE slot is what the game runs — validate it (it may be a different slot).
  var act = DK.slots[DK.active];
  var actProbs = act ? battalionProblems(act.cards) : ['the active battalion slot is empty'];
  if (actProbs.length){ toast('Slots saved, but the ACTIVE battalion ("'+(act?act.name:'—')+'") is invalid: '+actProbs[0]+' — Set active on a valid battalion.', 5600); return; }
  var ship = shipCards(act.cards);
  try { localStorage.setItem('woa-custom-battalion', JSON.stringify(ship)); }
  catch(e){ toast('The browser refused to store the battalion (private mode?). Use Export instead.', 5000); return; }
  clearSave(); // an in-flight skirmish from another battalion would confuse the resume path
  toast('Battalion "'+act.name+'" is now active — reloading with its cards…', 1800);
  syncBattalionFile(ship, function(){ setTimeout(function(){ location.reload(); }, 600); });
};
$('dkReset').onclick = function(){
  if (!confirm('Clear this browser\'s battalion override and play the active battalion in content/battalions/?')) return;
  resetCustomBattalion();
};
$('dkExport').onclick = function(){
  var probs = battalionProblems(DK.cards);
  if (probs.length){ toast('Fix first: ' + probs[0], 4200); return; }
  var blob = new Blob(['window.WOA_CUSTOM_BATTALION = ' + JSON.stringify(battalionToShip(), null, 1) + ';\n'], { type:'text/javascript' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'custom-battalion.js';
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
  toast('Downloaded custom-battalion.js — put it next to index.html.', 4500);
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
      renderBattalion();
      toast('Imported ' + arr.length + ' cards — review, then Save &amp; Reload.', 3200);
    } catch(e){ toast('Could not read that file: ' + e.message, 3500); }
    $('dkImportFile').value = '';
  };
  rd.readAsText(f);
};

// persistence: every REAL finished skirmish in this browser becomes a row in
// logs/woa.db via POST /api/recordskirmish (fail-open: a server without dev/
// simply skips it). One subscription covers every source —
// finishSkirmish fires the hook for human play, hotseat, watch, the LAN peer
// that dealt the final blow (exactly one of the two), and each dashboard
// simulation skirmish. Search clones never fire it (__sim).
// One implementation of "turn a finished skirmish into a DB row": the live hook
// (human/hotseat/watch/LAN + the serial dashboard loop) AND the parallel sweep's
// main-thread result handler both call this. The parallel workers run the engine
// with no onSkirmishEnd subscriber, so persistence happens exactly once — here.
function recordSkirmish(st) {
  var v = E.view(st);
  var dash = (typeof DASH !== 'undefined') && DASH.running;
  var kind = dash ? 'balance' : APP.mode === 'watch' ? 'watch' : 'human';
  function aiOf(side){
    if (dash) return side === 'red' ? DASH.meta.dr : DASH.meta.db;
    if (APP.mode === 'watch') return APP.diff || 'normal';
    if (APP.mode === 'ai') return side === APP.mySide ? 'human' : (APP.diff || 'normal');
    return 'human'; // hotseat + LAN
  }
  var m = st.battle; st.battle = null; // the cycle never crosses the wire (battle is the identity handle)
  try {
    api('recordskirmish', {
      runKey: dash ? DASH.runKey : undefined,
      run: { version: E.VERSION, kind: kind, redAi: aiOf('red'), blueAi: aiOf('blue'),
        n: dash ? DASH.meta.n : 1, tool: dash ? 'dashboard' : 'browser',
        // run identity for the A/B picker: both battalions fielded, read from the
        // battalion the ENGINE actually resolved THIS load — never
        // content/battalions/'s active flag directly (the Battalion Editor's
        // applied override sandbox overrides it, see index.html's
        // WOA_APPLIED_BATTALION wiring). Symmetric today: both sides field it.
        battalionRed: E.ACTIVE_BATTALION && E.ACTIVE_BATTALION.id,
        battalionBlue: E.ACTIVE_BATTALION && E.ACTIVE_BATTALION.id,
        mapset: dash ? DASH.meta.mapset : undefined,
        seedBase: dash ? DASH.meta.seedBase : undefined },
      state: st, firstPlayer: E.other(v.second), seed: v.seed
    }).catch(function(){ /* persistence is best-effort */ });
  } finally { st.battle = m; }
}
E.hooks.onSkirmishEnd.push(recordSkirmish);

$('dashBack').onclick = function(){ DASH.cancel = true; SCREENS.devhub.entry(); };
$('dashStop').onclick = function(){ DASH.cancel = true; };
// pill nav (Overview|Maps|Cards|Units|Tables) — per-view state stays on DASH,
// panes re-render from memory/the fetched runs list. Header run-A/B pickers +
// temperature selector.
// delegated — the pills are built from the pane registry, not written in index.html
$('dashPills').addEventListener('click', function(e){
  var b = e.target.closest('.dpill');
  if (!b) return;
  DASH.view = b.dataset.view; renderDash();
});
$('dashTemp').onchange = function(){ DASH.temperature = this.value; renderDash(); };
$('dashRunA').onchange = function(){ DASH.runA = this.value ? +this.value : null; renderDash(); };
$('dashRunB').onchange = function(){ DASH.runB = this.value ? +this.value : null; renderDash(); };

$('dashRun').onclick = function(){
  if (DASH.running) return;
  var n = +$('dashN').value;
  var dr = $('dashRed').value, db = $('dashBlue').value;
  var pick = $('dashMap').value;
  // '@adhoc' = the map editor's as-drawn (possibly unsaved) def, via openDashDef
  var maps = pick === '@adhoc' ? (DASH.adhoc ? [DASH.adhoc] : []) : getActiveMaps();
  if (pick !== 'all' && pick !== '@adhoc') maps = maps.filter(function(m){ return m.name === pick; });
  if (!maps.length){ toast('No maps in play — enable some in Maps &amp; Map Editor.', 3500); return; }
  var probs = E.validateMaps(maps);
  if (probs.length){ toast('Fix these maps first: '+probs.join('; '), 4500); return; }
  DASH.running = true; DASH.cancel = false;
  // mapset/seedBase (run identity): `pick` IS this run's map
  // selection ('all' = the active mapset's pool, a map name, or '@adhoc');
  // 7919 is the SAME seed-schedule base the per-map WOA_SIM.balanceSeed((mi+1)*7919, g)
  // call below already uses — one fact, not a second number invented here.
  DASH.results = []; DASH.meta = { n:n, dr:dr, db:db, mapset:pick, seedBase:7919 };
  DASH.detail = {}; DASH.chartMap = null; // per-skirmish rows for the Charts view (histogram)
  DASH.runKey = 'dash-' + Date.now(); // groups this run's skirmishes into one DB run row
  $('dashStop').style.display = ''; $('dashRun').disabled = true;
  var mi = 0, g = 0, out = WOA_SIM.balanceNew(n);
  var t0 = Date.now();
  function finish(){
    DASH.running = false;
    $('dashStop').style.display = 'none'; $('dashRun').disabled = false;
    $('dashStatus').textContent = DASH.cancel
      ? 'Stopped — showing the maps that finished.'
      : 'Done: '+DASH.results.length+' map(s) × '+n+' skirmishes in '+((Date.now()-t0)/1000).toFixed(0)+'s.';
    renderDash();
  }
  function step(){
    if (DASH.cancel){ finish(); return; }
    if (g >= n){
      DASH.results.push({ map: maps[mi], out: out });
      renderDash();
      mi++; g = 0; out = WOA_SIM.balanceNew(n);
      if (mi >= maps.length){ finish(); return; }
    }
    $('dashStatus').textContent = 'Map '+(mi+1)+'/'+maps.length+' — "'+maps[mi].name+'", skirmish '+(g+1)+'/'+n+'…'+
      (dr==='hard'||db==='hard' ? ' (Field Marshal thinks ~1s per skirmish)' : '');
    setTimeout(function(){
      if (DASH.cancel){ finish(); return; }
      var fp = WOA_SIM.balanceFP(g);
      var st = WOA_SIM.simSkirmish(maps[mi], WOA_SIM.balanceSeed((mi+1)*7919, g), fp, dr, db);
      var v = E.view(st);
      WOA_SIM.balanceAdd(out, st, fp);
      // keep each skirmish's length + ending for the Charts view's histogram —
      // the aggregate throws these away (graphs-spec Q4); tiny per-run memory
      if (v.phase === 'skirmish-over'){
        var det = DASH.detail[maps[mi].name] || (DASH.detail[maps[mi].name] = { turns: [], winTypes: [] });
        det.turns.push(v.turnNumber);
        det.winTypes.push(v.winType);
      }
      g++;
      step();
    }, 8);
  }

  // ---- parallel path: fan the maps across Web Workers ----
  // Each worker runs one whole map's n skirmishes in seed order and streams the
  // finished states back; the fold + persistence + detail all stay here, on the
  // main thread, through the SAME WOA_SIM code the serial loop uses — so the
  // aggregates (and the saved report, which iterates DASH.results) are
  // byte-identical. One worker per map keeps each map's fold in seed order; the
  // UI thread only folds, so it stays responsive. Falls back to step() where
  // Web Workers are unavailable (jsdom smoke, ancient browsers).
  function runParallel(){
    var applied = (typeof WOA_APPLIED_BATTALION !== 'undefined') ? WOA_APPLIED_BATTALION : null;
    var NW = Math.max(1, Math.min((navigator.hardwareConcurrency || 4), maps.length));
    var workers = [], byIndex = new Array(maps.length);
    var nextTask = 0, mapsDone = 0, doneCount = 0, total = maps.length * n, guard = false, cancelPoll = null;

    function killAll(){ workers.forEach(function(w){ try{ w.terminate(); }catch(e){} }); }
    function results(){
      // DASH.results = COMPLETED maps only, in strict map-index order. A map's
      // slot exists from the moment it is dispatched (partial `out`), so filter
      // on `complete` — never publish an in-flight or half-folded map. The
      // serial loop likewise pushes a map only once its full n skirmishes fold.
      DASH.results = byIndex.filter(function(x){ return x && x.complete; }).map(function(x){ return { map: x.map, out: x.out }; });
    }
    function done(){
      if (guard) return; guard = true;
      if (cancelPoll) clearInterval(cancelPoll);
      killAll(); results(); finish();
    }
    // A worker that dies without having folded a single skirmish means Web
    // Workers aren't usable here (script 404 / CSP block / init throw) — restart
    // the WHOLE sweep on the serial loop (covers a runtime load failure, not just
    // a constructor throw). Once any skirmish has persisted a clean restart would
    // double-record, so keep the finished maps and stop instead.
    function workerFailed(why){
      if (guard) return;
      if (doneCount === 0){
        guard = true;
        if (cancelPoll) clearInterval(cancelPoll);
        killAll();
        DASH.results = []; DASH.detail = {};      // discard the aborted attempt, run clean
        step();
        return;
      }
      toast('Sweep worker '+why+' — showing the maps that finished.', 5000);
      done();
    }
    function status(){
      $('dashStatus').textContent = 'Running '+total+' skirmishes on '+workers.length+' worker(s) — '+doneCount+'/'+total+' done…'+
        (dr==='hard'||db==='hard' ? ' (Field Marshal thinks ~1s per skirmish)' : '');
    }
    function assign(w){
      if (guard || DASH.cancel || nextTask >= maps.length) return;
      var mi = nextTask++;
      byIndex[mi] = { map: maps[mi], out: WOA_SIM.balanceNew(n), complete: false };
      w.postMessage({ type:'run', task:{ mapIndex: mi, map: maps[mi], n: n, seedBase: (mi+1)*7919, dr: dr, db: db } });
    }
    function onSkirmish(m){
      var slot = byIndex[m.mapIndex]; if (!slot) return;
      recordSkirmish(m.st);                       // persistence, same path as serial (best-effort)
      WOA_SIM.balanceAdd(slot.out, m.st, m.fp);    // fold in seed order (one worker per map)
      var v = E.view(m.st);
      if (v.phase === 'skirmish-over'){
        var det = DASH.detail[slot.map.name] || (DASH.detail[slot.map.name] = { turns: [], winTypes: [] });
        det.turns.push(v.turnNumber); det.winTypes.push(v.winType);
      }
      doneCount++; status();
    }
    function onMapDone(w, mi){
      if (byIndex[mi]) byIndex[mi].complete = true;
      results(); renderDash();                    // show finished maps as they complete, in map order
      if (++mapsDone >= maps.length){ done(); return; }
      assign(w);
    }

    var initFailed = false;
    for (var i=0;i<NW;i++){
      var w;
      try { w = new Worker('sweep-worker.js'); } catch(e){ initFailed = true; break; }
      (function(w){
        w.onmessage = function(ev){
          var m = ev.data||{};
          if (m.type==='ready') return assign(w);
          if (m.type==='skirmish') return onSkirmish(m);
          if (m.type==='done') return onMapDone(w, m.mapIndex);
          if (m.type==='error') return workerFailed('error: '+m.error);
        };
        w.onerror = function(ev){ if (ev && ev.preventDefault) ev.preventDefault(); workerFailed('crashed'); };
        w.postMessage({ type:'init', appliedBattalion: applied });
      })(w);
      workers.push(w);
    }
    if (initFailed || !workers.length){ killAll(); step(); return; }
    // Stop / Back set DASH.cancel; poll it to tear the pool down.
    cancelPoll = setInterval(function(){ if (DASH.cancel) done(); }, 120);
  }

  if (typeof Worker !== 'undefined' && maps.length) runParallel();
  else step();
};

// Save the displayed run to logs/reports/balance/<version>/ so
// Bill, Claude and the report skills discuss the same numbers. Markdown mirrors
// the on-screen folds; the server files it under the current rules version.
$('dashSave').onclick = function(){
  if (DASH.running){ toast('Let the run finish first.', 2500); return; }
  if (!DASH.results.length){ toast('Run a report first, then save it.', 3000); return; }
  var md = dashReportMarkdown();
  var d = new Date(), p2 = function(x){ return (x<10?'0':'')+x; };
  var stamp = d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+'-'+p2(d.getHours())+p2(d.getMinutes());
  var fname = stamp+'-'+DASH.meta.dr+'-vs-'+DASH.meta.db+'-n'+DASH.meta.n+'.md';
  api('savereport', { filename: fname, content: md, version: E.VERSION })
    .then(function(r){ toast('Saved &rarr; '+(r.path || 'logs/reports/balance/'+E.VERSION+'/'+fname), 4200); })
    .catch(function(){ dashDownloadReport(fname, md); });
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
  edSaveDef(def).then(function(){
    toast('Map "'+def.name+'" saved to content/maps/.', 3200);
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
