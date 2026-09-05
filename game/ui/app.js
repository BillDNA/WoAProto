/* War of Attrition — ui part: app state hub & shared helpers (APP, $, show,
   toast, api, art lookup, clipboard). Classic script, NO wrapper —
   top-level declarations attach to window on purpose: the ui files
   cross-reference each other by bare name, and dev/smoke.js plus inline
   onload=/onerror= attributes in generated markup reach them via window.
   Load order is the hand-ordered <script> tags in index.html (asserted by
   game/test/test.js). ui/boot.js, loaded last, holds every statement that RUNS
   at load — everything here only declares. */
'use strict';

var E = window.Engine;

/* =================== app state =================== */
// The one mutable app-state object, because the save is a slice of it and the
// ui files reach it by bare name. It is EMPTY here on purpose: each house
// declares the fields it answers for, beside the code that answers — the
// session's seat and its saved state in ui/session/session.js, the turn in
// progress in ui/turn/turn.js.
var APP = {};

function $(id){ return document.getElementById(id); }
function show(scr){ document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');}); $(scr).classList.add('active'); }
function capName(p){ return p.charAt(0).toUpperCase()+p.slice(1); }
// AI general's display label (reads the enemy-general dropdown so custom AIs work too)
function aiDisplayName(diff){
  var opt = $('diffSel').querySelector('option[value="'+diff+'"]');
  return opt ? opt.textContent : capName(diff||'ai');
}

// A card def for ANY in-play card id. E.CARD_BY_ID indexes only the default
// battalion; a mustered or asymmetric battalion draws from the wider pool, so
// fall back to it — and never return undefined, so a card the UI doesn't know
// degrades to a readable placeholder instead of crashing a mid-turn render.
var UI_CARD_POOL_BY_ID = null;
function cardDef(cid){
  var c = E.CARD_BY_ID[cid];
  if (c) return c;
  if (!UI_CARD_POOL_BY_ID){ UI_CARD_POOL_BY_ID = {}; (E.CARD_POOL || []).forEach(function(x){ UI_CARD_POOL_BY_ID[x.id] = x; }); }
  return UI_CARD_POOL_BY_ID[cid] || { id: cid, name: cid, text: '' };
}

function api(path, body){
  return fetch('/api/'+path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) })
    .then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.json(); });
}

/* card art is looked up BY CARD ID: art/<id>.jpg, falling back to art/<id>.png,
   falling back to no art at all — so new cards in the battalion just need a matching
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
// ONE place to open/close a modal overlay — every overlay is
// `<div class="overlay" id="…Ovr">` toggled by the `active` class (index.html
// + .overlay CSS). Change how overlays behave (a fade, an Esc handler) here.
function openOverlay(id){ $(id).classList.add('active'); }
function closeOverlay(id){ $(id).classList.remove('active'); }

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
