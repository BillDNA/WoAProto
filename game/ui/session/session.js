/* The SESSION house: what survives an interruption, and who is at the controls.

   The door. Two bases hold the house up — seat.js (which mode is seated, and
   every consequence of that) and store.js (every record this browser keeps) —
   and the rooms are the skirmish save, the turn snapshot, the hot-seat gate and
   the LAN room's browser half. Prose: session.md.

   This file owns the lifecycle: taking a seat, moving to the next skirmish, and
   giving the seat up. */
'use strict';

function startLocal(mode, mapsOverride, battalionsOverride, commandersOverride){
  var pool = mapsOverride || getActiveMaps();
  if (!pool || !pool.length){ toast('No maps are in play! Enable some in Maps &amp; Map Editor.', 3500); return; }
  APP.mode = mode;
  // battalionsOverride/commandersOverride {red,blue} seat the muster picks (asymmetric
  // battalions + per-side Commanders); absent = the symmetric default / no Commander.
  var bopts = { maps: pool };
  if (battalionsOverride) bopts.battalions = battalionsOverride;
  if (commandersOverride) bopts.commanders = commandersOverride;
  var battle = E.newBattle(bopts);
  try { APP.st = E.newSkirmish(battle); }
  catch(e){ APP.mode = null; toast('A map in the pool cannot be played: '+e.message+'<br><span class="small">Untick it in Maps &amp; Map Editor.</span>', 5000); return; }
  seatDown();
}

function startNextSkirmish(m){
  APP.st = E.newSkirmish(m);
  seatDown();
}

function startNewCampaign(){
  clearSave();
  if (!seatWire()){ startLocal(APP.mode); return; }
  APP.st = E.newSkirmish(E.newBattle({ maps: getActiveMaps() || E.MAPS }));
  renderAll(); pushState();
}

// One path onto a fresh skirmish in a local seat: reset the per-skirmish UI
// state, seed the Commander panel from the seated engine state, paint, persist,
// and let the seat open the turn.
function seatDown(){
  APP.ui = { sel:null, stage:null, busy:false, handoffPending: seatGatesHand() };
  syncCommandersFromState();
  APP.snap = null;
  show('game');
  renderAll();
  saveLocal();
  if (seatWire()) pushState();
  seatBeginTurn();
}

function returnToMenu(){
  stopPolling();
  APP.mode = null;
  show('menu'); checkResume();
}

// The session's own controls: resuming a saved skirmish, hosting or joining a
// LAN room, and leaving one.
function initSession(){
  $('btnResume').onclick = resumeSaved;
  $('btnHost').onclick = hostRoom;
  $('btnJoin').onclick = function(){ joinRoom($('joinCode').value); };
  checkResume();
}

// What the rest of the app is allowed to ask about the seat it is in.
function inSkirmish(){ return !!APP.st && !!APP.mode; }
function sessionIdentity(){ return { mode: APP.mode, mySide: APP.mySide, diff: APP.diff }; }
// Fresh skirmish, same map and same seat — for A/B testing a layout.
function rematchMap(map){ startLocal(APP.mode, [map]); }
