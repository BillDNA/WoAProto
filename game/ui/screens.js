/* War of Attrition — ui part: SCREEN REGISTRY + dev-mode seam. Classic script,
   no wrapper — top-level names attach to window (see ui/app.js header). Every
   screen is registered here as data; the front door, the Dev Hub, and the one
   gating predicate all read this table, so hiding a screen is a `kind` flip, not
   a markup move. Draws no SVG (buttons only) — the ui/test contract stays green.
   Load order: after the screen ui parts, before ui/boot.js (the wiring). */
'use strict';

/* =================== screen registry ===================
   id -> { kind, dom, label, entry, hub }
   - kind:  'player' (always reachable) | 'dev' (dev mode only)
   - dom:   the screen div id, or null for an action that opens no screen
   - label: menu / Dev Hub button text
   - entry: opens the screen (or runs the action)
   - hub:   dev tool that gets a Dev Hub button */
var SCREENS = {
  frontdoor:  { kind: 'player', dom: 'menu',          label: 'Menu',              entry: function(){ show('menu'); checkResume(); } },
  settings:   { kind: 'player', dom: 'settingsScr',   label: 'Settings',          entry: function(){ renderSettings(); show('settingsScr'); } },
  campaign:   { kind: 'player', dom: 'campaignScr',   label: 'Campaign',          entry: function(){ show('campaignScr'); } },
  pickcommander: { kind: 'player', dom: 'pickCommanderScr', label: 'Choose Commander', entry: function(){ openPickCommander(); } },
  buildbattalion: { kind: 'player', dom: 'buildBattalionScr', label: 'Muster Battalion', entry: function(){ openBuildBattalion(); } },
  rewards:    { kind: 'player', dom: 'rewardsScr',    label: 'Rewards / card draft', entry: function(){ show('rewardsScr'); } },
  runsummary: { kind: 'player', dom: 'runSummaryScr', label: 'Run summary',       entry: function(){ show('runSummaryScr'); } },
  battle:     { kind: 'player', dom: 'game',          label: 'Battle' },

  devhub:     { kind: 'dev',    dom: 'devHubScr',     label: 'Dev Hub',           entry: function(){ renderDevHub(); show('devHubScr'); } },
  battalion:       { kind: 'dev',    dom: 'battalionScr',       label: 'Battalion Editor',       entry: function(){ openBattalion(); },                    hub: true },
  maps:       { kind: 'dev',    dom: 'mapsScr',       label: 'Maps & Map Editor', entry: function(){ renderMapsScr(); show('mapsScr'); }, hub: true },
  dash:       { kind: 'dev',    dom: 'dashScr',       label: 'Balance Dashboard', entry: function(){ openDash(); },                    hub: true },
  watch:      { kind: 'dev',    dom: null,            label: 'Watch: AI vs AI',   entry: function(){ startLocal('watch'); },           hub: true }
};

// The one gating predicate: player screens always pass; dev screens need dev mode.
function screenAllowed(id){ var s = SCREENS[id]; return !!s && (s.kind === 'player' || devMode()); }
// Open a screen by id, gated. Unknown / disallowed ids are a no-op.
function goScreen(id){ var s = SCREENS[id]; if (s && s.entry && screenAllowed(id)) s.entry(); }

/* =================== dev mode ===================
   A localStorage flag, off by default — the single hardening seam: a future
   player build defaults it off and drops the hotkey, and dev surfaces vanish.
   Toggled by the `/~ hotkey or the Settings row; ?dev=1 sets it on load. */
function devMode(){ try { return localStorage.getItem('woa-dev') === '1'; } catch(e){ return false; } }
function setDevMode(on){
  try { if (on) localStorage.setItem('woa-dev', '1'); else localStorage.removeItem('woa-dev'); } catch(e){}
  applyDevMode();
}
// Reflect the flag into the DOM: body.dev drives every `.dev-only` reveal (CSS),
// and the Settings toggle mirrors the state.
function applyDevMode(){
  var on = devMode();
  if (document.body) document.body.classList.toggle('dev', on);
  var t = $('setDevToggle'); if (t) t.checked = on;
}
// `/~ toggles dev mode from anywhere except while typing in a field.
function devHotkey(ev){
  if (ev.key !== '`' && ev.key !== '~') return;
  var t = ev.target, tag = t && t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
  setDevMode(!devMode());
  toast(devMode() ? 'Dev mode ON — Dev Hub is on the menu (press ` to hide).' : 'Dev mode OFF.', 2600);
}

/* =================== Dev Hub ===================
   Buttons are generated from the registry (kind:dev, hub:true) so a new dev tool
   is one registry row. Ids on the buttons match the existing boot.js wiring
   (btnBattalion / btnMaps / btnDash / btnWatch), which stays the source of truth for
   what each tool does. */
var HUB_BTN_ID = { battalion: 'btnBattalion', maps: 'btnMaps', dash: 'btnDash', watch: 'btnWatch' };
function renderDevHub(){
  var wrap = $('devHubBtns'); if (!wrap) return;
  wrap.innerHTML = '';
  Object.keys(SCREENS).forEach(function(id){
    var s = SCREENS[id]; if (!s.hub) return;
    var b = document.createElement('button');
    b.className = 'ghost btn-ghost-dark';
    b.id = HUB_BTN_ID[id] || ('btnHub-' + id);
    b.textContent = s.label;
    b.onclick = s.entry;
    wrap.appendChild(b);
  });
}

// Settings: reflect the persisted side + enemy general + dev flag into the
// controls (moved off the front door). The controls' own change handlers
// (ui/boot.js) write APP.mySide / APP.diff, so this only mirrors current state.
function renderSettings(){
  document.querySelectorAll('#sideRow .choice').forEach(function(x){ x.classList.toggle('sel', x.dataset.side === APP.mySide); });
  var d = $('diffSel'); if (d) d.value = APP.diff || 'normal';
  var t = $('setDevToggle'); if (t) t.checked = devMode();
}
