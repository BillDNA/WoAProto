/* War of Attrition — ui part: app state hub & shared helpers (APP, $, show,
   toast, api/canNet, art lookup, clipboard). Classic script, NO wrapper —
   top-level declarations attach to window on purpose: the ui files
   cross-reference each other by bare name, and dev/smoke.js plus inline
   onload=/onerror= attributes in generated markup reach them via window.
   Extracted verbatim from index.html's inline app script (V1 seam-split);
   load order is the hand-ordered <script> tags in index.html (asserted by
   game/test.js). ui/boot.js, loaded last, holds every statement that RUNS
   at load — everything here only declares. */
'use strict';

var E = window.Engine;

/* =================== app state =================== */
var APP = {
  mode: null,            // 'ai' | 'hotseat' | 'net'
  mySide: 'red',         // for ai/net
  diff: 'normal',
  st: null,              // battle state (includes .match)
  net: { room: null, seq: 0, poller: null },
  ui: { sel: null, stage: null, busy: false, handoffPending: false },
  snap: null
};

function $(id){ return document.getElementById(id); }
function show(scr){ document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');}); $(scr).classList.add('active'); }
function capName(p){ return p.charAt(0).toUpperCase()+p.slice(1); }
// AI general's display label (reads the enemy-general dropdown so custom AIs work too)
function aiDisplayName(diff){
  var opt = $('diffSel').querySelector('option[value="'+diff+'"]');
  return opt ? opt.textContent : capName(diff||'ai');
}

var SAVE_V = 3; // bumped when old saves can no longer be loaded (board shapes, trench arrays, ...)

var canNet = location.protocol === 'http:' || location.protocol === 'https:';

function api(path, body){
  return fetch('/api/'+path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) })
    .then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.json(); });
}

/* card art is looked up BY CARD ID: art/<id>.jpg, falling back to art/<id>.png,
   falling back to no art at all — so new cards in the deck just need a matching
   file dropped into game/art (any heavy AI render: run dev/optimize-art.ps1). */
var ART_STATE = {}; // id -> 'jpg' | 'png' | false (known missing)
function artImg(id, cls){
  if (ART_STATE[id] === false) return '';
  var ext = ART_STATE[id] || 'jpg';
  return '<img class="'+cls+'" alt="" src="art/'+id+'.'+ext+'" onload="artOk(this,\''+id+'\')" onerror="artErr(this,\''+id+'\')">';
}
function artOk(img, id){ ART_STATE[id] = img.src.slice(-3); }
function artErr(img, id){
  if (img.src.slice(-4).toLowerCase() === '.jpg' && ART_STATE[id] !== 'png'){
    img.src = 'art/'+id+'.png';
  } else {
    ART_STATE[id] = false;
    var box = img.parentNode;
    if (box && box.className === 'art') box.style.display = 'none';
    else img.style.display = 'none';
  }
}

/* =================== toasts & overlays =================== */
var toastTimer = null;
function toast(html, ms){
  var t = $('toast');
  t.innerHTML = html;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.style.display='none'; }, ms||2600);
}

// Clipboard with a file:// fallback (the async API is often blocked off-origin).
function copyText(text, btn){
  var label = btn && btn.textContent;
  function flash(){ if(!btn) return; btn.textContent='Copied!'; setTimeout(function(){ btn.textContent=label; }, 1400); }
  function fallback(){
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); flash(); } catch(e){}
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(text).then(flash, fallback);
  else fallback();
}
