/* The LAN room, browser half: hosting, joining, and keeping two devices on one
   skirmish. The wire half — the room store and its four routes — is
   game/server/room/room.js; the room code and the whole-state push/poll are the
   contract between them.

   Multiplayer is whole-state JSON: anything added to a skirmish must stay
   JSON-serializable and self-contained (battle.maps carries full map defs, so
   the joiner needs nothing local). */
'use strict';

function hostRoom(){
  var pool = getActiveMaps();
  if (!pool || !pool.length){ toast('No maps are in play! Enable some in Maps &amp; Map Editor.', 3500); return; }
  var st = E.newSkirmish(E.newBattle({ maps: pool }));
  api('create', { state: st }).then(function(d){
    seatNet('red', st, d.room, d.seq);
    toast('Room code: <b style="font-size:22px;letter-spacing:4px;">'+d.room+'</b><br><span class="small">The other device joins with this code. You are Red.</span>', 6500);
  }).catch(function(e){ toast('Could not create room — is the server running? ('+e.message+')', 4000); });
}

function joinRoom(code){
  code = String(code || '').trim().toUpperCase();
  if (code.length !== 4){ toast('Enter the 4-letter room code.', 2500); return; }
  api('join', { room: code }).then(function(d){
    seatNet('blue', d.state, code, d.seq);
    toast('Joined! You are Blue.', 3000);
    if (E.view(APP.st).phase === 'skirmish-over') showSkirmishOver();
  }).catch(function(e){ toast('Could not join: '+e.message, 3500); });
}

// Take the net seat on a state the wire handed us: same entry for both ends.
function seatNet(side, st, room, seq){
  APP.mode = 'net'; APP.mySide = side; APP.st = st;
  APP.net.room = room; APP.net.seq = seq;
  APP.ui = { sel:null, stage:null, busy:false };
  syncCommandersFromState();
  show('game'); renderAll(); startPolling();
}

function pushState(){
  if (!seatWire()) return;
  APP.net.seq++;
  var seq = APP.net.seq;
  api('push', { room: APP.net.room, seq: seq, state: APP.st }).then(function(d){
    if (d.conflict){ APP.net.seq = d.seq; adoptPeerState(d.state); }
  }).catch(function(){ APP.net.seq = seq-1; toast('Connection hiccup — retrying on next move.', 2500); });
}

function startPolling(){
  if (APP.net.poller) clearInterval(APP.net.poller);
  APP.net.poller = setInterval(function(){
    if (!seatWire()) return;
    fetch('/api/poll?room='+APP.net.room+'&seq='+APP.net.seq)
      .then(function(r){ return r.status===200 ? r.json() : null; })
      .then(function(d){
        if (!d) return;
        APP.net.seq = d.seq;
        APP.ui = { sel:null, stage:null, busy:false };
        adoptPeerState(d.state);
      }).catch(function(){});
  }, 1000);
}
function stopPolling(){
  if (APP.net.poller) clearInterval(APP.net.poller);
  APP.net.poller = null;
}

// The peer's state is the truth; redraw onto it and show the win card if the
// move that arrived ended the skirmish.
function adoptPeerState(st){
  APP.st = st;
  renderAll();
  if (E.view(APP.st).phase === 'skirmish-over') showSkirmishOver();
}
