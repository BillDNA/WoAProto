/* The LAN ROOM, wire half: a four-letter code, the state behind it, and what
   the two devices sharing it are allowed to do to it.

   The browser half is game/ui/session/net.js; whole-state JSON travels both
   ways. A room holds one state and a sequence number: a push must be exactly
   the next number or it loses and is answered with the truth, and a poll
   returns as soon as the sequence has moved past what the caller has.

   Rooms live in memory and expire after six idle hours; a server restart drops
   them, which is what a game between two people in one room expects. */
'use strict';

var IDLE_MS = 6 * 3600 * 1000;
var rooms = {};   // code -> { state, seq, updated }

function stamp(){ return new Date().toTimeString().slice(0, 8); }
function log(msg){
  var open = Object.keys(rooms).sort().join(' ') || 'none';
  console.log('  [' + stamp() + '] ' + msg + '   (open rooms: ' + open + ')');
}

function code4(){
  var letters = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I/L/O
  var c = '';
  for (var i = 0; i < 4; i++) c += letters[Math.floor(Math.random() * letters.length)];
  return rooms[c] ? code4() : c;
}

// Any reach for a room is a sign of life on it.
function get(code){
  var r = rooms[String(code || '').toUpperCase()];
  if (!r) return null;
  r.updated = Date.now();
  return r;
}

function create(state){
  var code = code4();
  rooms[code] = { state: state, seq: 1, updated: Date.now() };
  return code;
}

function push(r, seq, state){
  if (seq !== r.seq + 1) return { conflict: true, state: r.state, seq: r.seq };
  r.seq = seq; r.state = state;
  return { ok: true, seq: r.seq };
}

function sweep(){
  var now = Date.now();
  for (var c in rooms){
    if (now - rooms[c].updated > IDLE_MS){
      delete rooms[c];
      log('room ' + c + ' expired after 6h idle');
    }
  }
}

module.exports = { get: get, create: create, push: push, sweep: sweep, log: log };
