/* War of Attrition — ui part: map library & pool (roster files, previews,
   import/export). Classic script, no wrapper — top-level names attach to
   window (see ui/app.js header). Extracted verbatim from index.html's inline
   app script; the maps-screen button wiring lives in ui/boot.js. Balance
   checks all route to the Balance Dashboard (ui/dashboard.js) — the old
   in-game balance lab was deleted in restructure step 9 so exactly one
   aggregation pipeline (E.balanceNew/balanceAdd) remains. */
'use strict';

/* =================== map library & pool =================== */
// Maps are per-item files under content/maps/ (Feedback Round 4 Pass 2). The
// engine loads them into E.MAPS at boot; each carries a stable `id` (its
// filename stem) and an optional `custom:true` flag (a user map — the badge, and
// exempt from the shipped-roster guideline tests). Saving or deleting a map
// rewrites/removes its file on the server AND updates E.MAPS in place.
//
// V1: the match pool is the ACTIVE MAP-SET (content/mapsets/*.js — named
// rosters, up to five slots, one active; the deck-slot pattern applied to
// maps). It replaced the per-browser woa-disabled-maps preference, so the
// browser, the LAN peer, and every CLI tool finally agree on one roster.
// Set edits mutate E.MAPSETS in place and are saved to files via
// /api/savemapsets (needs the server; without it, edits last the session).
function slugifyMap(name){ return String(name||'map').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'map'; }
function allMaps(){
  return E.MAPS.map(function(def){ if (!def.id) def.id = slugifyMap(def.name); return { def: def, id: def.id, builtin: !def.custom }; });
}
var MAP_FLOOR = 5;   // library floor: keep enough distinct boards on disk
var MAPSET_SLOTS = 5;
var MS = { slot: 0 }; // which set the maps screen is viewing/editing
function getMapPool(){ return E.mapPool(); }
function msSets(){ return E.MAPSETS; }
function msCurrent(){ return msSets()[MS.slot] || null; }
function msSetActive(idx){
  msSets().forEach(function(st, i){ st.active = (i === idx); });
}
function msToggleMember(set, id, on){
  var i = set.maps.indexOf(id);
  if (on && i < 0) set.maps.push(id);
  if (!on && i >= 0) set.maps.splice(i, 1);
}
function msNewSet(){
  var sets = msSets();
  if (sets.length >= MAPSET_SLOTS) return;
  var n = sets.length + 1;
  sets.push({ id: 'set-' + n, name: 'Set ' + n, active: sets.length === 0,
    maps: allMaps().map(function(m){ return m.id; }) });
  MS.slot = sets.length - 1;
}
function msSave(){
  if (!canNet){ toast('Map-set files need the local server (<code>node game/server.js</code>) — edits hold for this session only.', 5000); return; }
  api('savemapsets', { mapsets: msSets() }).then(function(){
    toast('Map-sets saved to content/mapsets/.', 2500);
  }).catch(function(){ toast('Could not save the map-sets.', 3500); });
}
// E.MAPS is the engine's live roster array — mutate it in place (never reassign).
function rosterReplace(def){
  for (var i=0;i<E.MAPS.length;i++){ if (E.MAPS[i].id === def.id){ E.MAPS[i] = def; return; } }
  E.MAPS.push(def);
}
function rosterRemove(id){
  for (var i=0;i<E.MAPS.length;i++){ if (E.MAPS[i].id === id){ E.MAPS.splice(i,1); return; } }
}
// Persist a map to its content file (server writes content/maps/<id>.js and
// regenerates the loader). The caller updates E.MAPS first so it is usable at
// once; the file makes it survive a reload.
function saveMapFile(def){
  if (!canNet){ updateMapsHint(); return Promise.resolve({ offline: true }); }
  return api('savemap', { map: def }).then(function(r){ updateMapsHint(); return r; })
    .catch(function(e){ updateMapsHint(); throw e; });
}
function deleteMapById(id){
  if (!canNet){
    toast('Deleting a map removes its file, which needs the local server (<code>node game/server.js</code>). Or just untick &ldquo;in play&rdquo; to drop it from matches.', 6500);
    return;
  }
  api('deletemap', { id: id }).then(function(){
    rosterRemove(id); renderMapsScr();
  }).catch(function(){ toast('Could not delete the map file.', 3500); });
}
function updateMapsHint(){
  var el = $('mapsHint');
  if (!el) return;
  el.innerHTML = canNet
    ? 'Maps are files in <b>game/content/maps/</b> — deleting one here deletes its file. Zip the folder and friends get your roster.'
    : 'Maps are files in <b>game/content/maps/</b>. Adding, editing or deleting a map writes/removes a file, which needs the local server (<code>node game/server.js</code>); double-clicked, you can still play and toggle maps in/out of the pool.';
}

/* mini preview svg (self-contained, no global board state) */
function previewSVG(def){
  var s = 11, sq3 = Math.sqrt(3);
  var hexList = E.boardHexes(E.ensureMapShape(def));
  var hexSet = {};
  hexList.forEach(function(k){ hexSet[k] = true; });
  function xy(q, r){ return [s*sq3*(q + r/2), s*1.5*r]; }
  function pts(cx, cy, rad){
    var o = [];
    for (var i=0;i<6;i++){ var a=(60*i-90)*Math.PI/180; o.push((cx+rad*Math.cos(a)).toFixed(1)+','+(cy+rad*Math.sin(a)).toFixed(1)); }
    return o.join(' ');
  }
  var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  var body = '';
  hexList.forEach(function(k){
    var qr = E.parseKey(k), p = xy(qr[0], qr[1]);
    minX=Math.min(minX,p[0]); maxX=Math.max(maxX,p[0]); minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]);
    body += '<polygon points="'+pts(p[0],p[1],s-0.6)+'" fill="#d9cca8" stroke="#4a3d26" stroke-width="0.8"/>';
  });
  (def.pieces||[]).forEach(function(pc){
    pc.edges.forEach(function(e){
      var c = xy(e[0], e[1]);
      var ang = [0,-60,-120,180,120,60][e[2]];
      function cp(a){ a=a*Math.PI/180; return [c[0]+(s-2.4)*Math.cos(a), c[1]+(s-2.4)*Math.sin(a)]; }
      var p1 = cp(ang-30), p2 = cp(ang+30);
      body += '<line x1="'+p1[0].toFixed(1)+'" y1="'+p1[1].toFixed(1)+'" x2="'+p2[0].toFixed(1)+'" y2="'+p2[1].toFixed(1)+
        '" stroke="'+(pc.t==='F'?'#4a7c3a':pc.t==='R'?'#4a7ea8':'#75726a')+'" stroke-width="2.6" stroke-linecap="round"/>';
    });
  });
  [['redHQ','#9e2b25'],['blueHQ','#28527a']].forEach(function(h){
    var hq = def[h[0]];
    if (!hq) return;
    var p = xy(hq[0], hq[1]);
    body += '<polygon points="'+pts(p[0],p[1],s*0.62)+'" fill="'+h[1]+'" stroke="#2b2113" stroke-width="0.8"/>';
  });
  var m = s*1.4;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(minX-m).toFixed(0)+' '+(minY-m).toFixed(0)+' '+(maxX-minX+2*m).toFixed(0)+' '+(maxY-minY+2*m).toFixed(0)+'">'+body+'</svg>';
}

function renderMapsetBar(){
  var bar = $('mapsetBar');
  if (!bar) return;
  bar.innerHTML = '';
  var sets = msSets();
  if (MS.slot >= sets.length) MS.slot = Math.max(0, sets.length - 1);
  sets.forEach(function(st, i){
    var chip = document.createElement('button');
    chip.className = 'mschip' + (i === MS.slot ? ' open' : '') + (st.active ? ' active' : '');
    chip.innerHTML = (st.active ? '&#9733; ' : '') + st.name + ' <span class="msn">(' + st.maps.length + ')</span>';
    chip.title = st.active ? 'The active set — this roster is the match pool everywhere (game, LAN, CLI tools)' : 'View/edit this set';
    chip.onclick = function(){ MS.slot = i; renderMapsScr(); };
    bar.appendChild(chip);
  });
  if (sets.length < MAPSET_SLOTS){
    var add = document.createElement('button');
    add.className = 'mschip'; add.textContent = '+ new set';
    add.onclick = function(){ msNewSet(); renderMapsScr(); };
    bar.appendChild(add);
  }
  var cur = msCurrent();
  if (cur){
    var name = document.createElement('input');
    name.className = 'msname'; name.value = cur.name; name.title = 'Rename this set';
    name.onchange = function(){ cur.name = name.value || cur.name; renderMapsetBar(); };
    bar.appendChild(name);
    if (!cur.active){
      var act = document.createElement('button');
      act.className = 'mschip'; act.textContent = 'Make active';
      act.title = 'The active set becomes the match pool for every play mode and the balance tools';
      act.onclick = function(){ msSetActive(MS.slot); renderMapsScr(); };
      bar.appendChild(act);
    }
    var save = document.createElement('button');
    save.className = 'mschip'; save.textContent = 'Save sets';
    save.title = 'Write content/mapsets/*.js (needs the local server)';
    save.onclick = msSave;
    bar.appendChild(save);
  }
}

function renderMapsScr(){
  renderMapsetBar();
  var grid = $('mapGrid');
  grid.innerHTML = '';
  var cur = msCurrent();
  allMaps().forEach(function(m){
    var inSet = !cur || cur.maps.indexOf(m.id) >= 0 || cur.maps.indexOf(m.def.name) >= 0;
    var off = !inSet;
    var d = document.createElement('div');
    d.className = 'mapitem' + (off ? ' off' : '');
    var shp = E.SHAPES[E.ensureMapShape(m.def)];
    d.innerHTML = previewSVG(m.def) +
      '<div class="nm">'+m.def.name+'</div>' +
      '<div class="shp">'+(shp ? shp.label : '&#9888; board "'+m.def.shape+'" no longer exists')+(m.builtin?'':' &middot; custom')+'</div>' +
      (cur ? '<label><input type="checkbox" '+(off?'':'checked')+'> in &ldquo;'+cur.name+'&rdquo;</label>' : '') +
      '<div class="btns"></div>';
    var cb = d.querySelector('input[type=checkbox]');
    if (cb) cb.onchange = function(){
      msToggleMember(cur, m.id, cb.checked);
      d.classList.toggle('off', !cb.checked);
      renderMapsetBar(); // membership count on the chip
    };
    var btns = d.querySelector('.btns');
    var bp = document.createElement('button'); bp.textContent='Play';
    bp.title = 'A quick campaign vs the AI on just this map';
    bp.onclick = function(){ startLocal('ai', [m.def]); };
    btns.appendChild(bp);
    var bb = document.createElement('button'); bb.textContent='Balance';
    bb.title = 'Open the Balance Dashboard and run this map';
    bb.onclick = function(){ openDash(); $('dashMap').value = m.def.name; $('dashRun').click(); };
    btns.appendChild(bb);
    if (!m.builtin){
      var be = document.createElement('button'); be.textContent='Edit';
      be.onclick = function(){ openEditor(m.def); };
      btns.appendChild(be);
    }
    var bc = document.createElement('button'); bc.textContent='Copy';
    bc.onclick = function(){
      var copy = JSON.parse(JSON.stringify(m.def));
      copy.name = m.def.name + ' (copy)';
      copy.custom = true; copy.id = slugifyMap(copy.name);
      openEditor(copy, true);
    };
    btns.appendChild(bc);
    var bd = document.createElement('button'); bd.textContent='Delete';
    bd.onclick = function(){
      if (allMaps().length <= MAP_FLOOR){
        toast('The roster keeps a floor of '+MAP_FLOOR+' maps so a first-to-3 campaign always has fresh boards. Add a map first.', 4500);
        return;
      }
      if (!confirm('Delete map "'+m.def.name+'"? This removes its file in content/maps/.')) return;
      deleteMapById(m.id); // updates the roster + re-renders on success
    };
    btns.appendChild(bd);
    grid.appendChild(d);
  });
  var rb = $('btnRestoreMaps'); if (rb) rb.style.display = 'none'; // tombstones are gone — every map is a file
  updateMapsHint();
}
