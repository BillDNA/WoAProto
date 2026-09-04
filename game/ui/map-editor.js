/* War of Attrition — ui part: the map editor (Cartographer's Table) — ED
   state, outline carving, terrain painting, physical-piece grouping, save.
   Classic script, no wrapper — top-level names attach to window (see
   ui/app.js header). Extracted verbatim from index.html's inline app
   script; the editor's tool/button wiring lives in ui/boot.js. */
'use strict';

/* =================== map editor =================== */
// ED.hexes: null = a named template shape; {'q,r':true,...} = a custom outline
// (saved as def.shapeDef, registered by the engine under '@<map id>')
var ED = { id:null, name:'', shape:'classic', hexes:null, red:null, blue:null, edges:{}, tool:'terrain', isNew:true };

function openEditor(def, isNewCopy){
  if (def){
    ED.id = def.id || ('c' + Date.now());
    ED.isNew = !!isNewCopy || !def.id;
    ED.name = def.name || '';
    if (def.shapeDef && def.shapeDef.hexes){
      ED.shape = '@custom';
      ED.hexes = {};
      def.shapeDef.hexes.forEach(function(h){ ED.hexes[E.key(h[0], h[1])] = true; });
    } else {
      ED.shape = E.SHAPES[def.shape] ? def.shape : E.DEFAULT_SHAPE;
      ED.hexes = null;
    }
    ED.red = def.redHQ ? def.redHQ.slice() : null;
    ED.blue = def.blueHQ ? def.blueHQ.slice() : null;
    ED.edges = {};
    (def.pieces||[]).forEach(function(pc){
      pc.edges.forEach(function(e){
        ED.edges[E.key(e[0], e[1]) + '>' + e[2]] = pc.t;
      });
    });
  } else {
    ED.id = 'c' + Date.now();
    ED.isNew = true;
    ED.name = '';
    ED.shape = 'classic';
    ED.hexes = null;
    ED.red = null; ED.blue = null; ED.edges = {};
  }
  ED.tool = 'terrain';
  $('edName').value = ED.name;
  $('edShape').value = ED.shape;
  $('edWarn').textContent = '';
  document.querySelectorAll('.edtools .tool').forEach(function(b){ b.classList.toggle('sel', b.dataset.tool==='terrain'); });
  show('editorScr');
  renderEditor();
}

function edGoCustom(){
  // seed the editable outline from the current template — keeps terrain + HQs
  ED.hexes = {};
  E.boardHexes(ED.shape).forEach(function(k){ ED.hexes[k] = true; });
  ED.shape = '@custom';
  $('edShape').value = '@custom';
}

function edHexSet(){
  if (ED.hexes) return ED.hexes;
  var set = {};
  E.boardHexes(ED.shape).forEach(function(k){ set[k]=true; });
  return set;
}
function edHexPairs(){
  return Object.keys(edHexSet()).map(E.parseKey).sort(function(a,b){ return a[1]-b[1] || a[0]-b[0]; });
}
// register the outline being edited so hexLabel / rot180 speak its grid
function edLiveShape(){
  if (!ED.hexes) return ED.shape;
  return E.ensureMapShape({ id: 'edit', shapeDef: { hexes: edHexPairs() } }); // '@edit'
}
function edRemoveHex(k){
  var set = ED.hexes;
  if (Object.keys(set).length <= 2){ toast('A board needs more hexes than that.', 2200); return; }
  delete set[k];
  // a removed hex takes its terrain with it — including neighbours' sides that faced it
  for (var d = 0; d < 6; d++){
    delete ED.edges[k + '>' + d];
    var qr = E.parseKey(k);
    var n = E.key(qr[0] + E.DIRS[d][0], qr[1] + E.DIRS[d][1]);
    delete ED.edges[n + '>' + ((d + 3) % 6)];
  }
  if (ED.red && E.key(ED.red[0], ED.red[1]) === k) ED.red = null;
  if (ED.blue && E.key(ED.blue[0], ED.blue[1]) === k) ED.blue = null;
}
function edInternalSides(){
  // every side of every on-board hex is paintable — including sides facing the
  // board edge or an interior hole (e.g. The Void)
  var set = edHexSet(), out = [];
  Object.keys(set).forEach(function(k){
    for (var d=0; d<6; d++) out.push([k, d]);
  });
  return out;
}

function renderEditor(){
  var svg = $('edBoard');
  svg.innerHTML = '';
  var live = edLiveShape();
  E.setBoard(live); // so hexLabel speaks this board's grid
  var hexList = ED.hexes ? Object.keys(ED.hexes) : E.boardHexes(ED.shape);
  // in hex-carving mode, every empty neighbour is a ghost hex you can add
  var ghosts = [];
  if (ED.tool === 'hexes'){
    var set = edHexSet(), seen = {};
    hexList.forEach(function(k){
      var qr = E.parseKey(k);
      for (var d = 0; d < 6; d++){
        var n = E.key(qr[0] + E.DIRS[d][0], qr[1] + E.DIRS[d][1]);
        if (!set[n] && !seen[n]){ seen[n] = true; ghosts.push(n); }
      }
    });
  }
  svg.setAttribute('viewBox', viewBoxFor(hexList.concat(ghosts)));
  var gHex = svgEl('g',{}), gTer = svgEl('g',{}), gHit = svgEl('g',{});
  svg.appendChild(gHex); svg.appendChild(gTer); svg.appendChild(gHit);
  hexList.forEach(function(k){
    var xy = hexXY(k);
    var p = bpHexPoly(xy[0], xy[1], S-1, false); // editor tiles are uniform, no dark parity
    if (ED.tool==='redhq' || ED.tool==='bluehq'){
      p.style.cursor = 'pointer';
      p.addEventListener('click', function(){
        var qr = E.parseKey(k);
        if (ED.tool==='redhq'){ ED.red = qr; if (ED.blue && E.key(ED.blue[0],ED.blue[1])===k) ED.blue=null; }
        else { ED.blue = qr; if (ED.red && E.key(ED.red[0],ED.red[1])===k) ED.red=null; }
        renderEditor();
      });
    } else if (ED.tool==='hexes'){
      p.style.cursor = 'pointer';
      p.addEventListener('click', function(){ edRemoveHex(k); renderEditor(); });
    }
    gHex.appendChild(p);
    bpCoordLabel(gHex, xy[0], xy[1], E.hexLabel(k), S, 'none');
  });
  ghosts.forEach(function(k){
    var xy = hexXY(k);
    var p = bpGhostHex(gHex, xy[0], xy[1], S-4);
    p.style.cursor = 'pointer';
    p.addEventListener('click', function(){
      if (hexList.length >= E.CONFIG.mapHexCeiling){ toast(E.CONFIG.mapHexCeiling + ' hexes is the ceiling (laser-cutter max — and big empty maps are not fun).', 3600); return; }
      ED.hexes[k] = true;
      renderEditor();
    });
    p.addEventListener('mouseenter', function(){ p.setAttribute('fill','rgba(212,175,55,.28)'); });
    p.addEventListener('mouseleave', function(){ p.setAttribute('fill','rgba(255,255,255,.10)'); });
  });
  ['red','blue'].forEach(function(side){
    var hq = ED[side];
    if (!hq) return;
    var xy = hexXY(E.key(hq[0],hq[1]));
    // the live board's HQ marker sans brass ring (the editor's plain flag)
    bpHQMarker(gHex, xy[0], xy[1], side, { rInner:false, pe:'none' });
  });
  edInternalSides().forEach(function(e){
    var ek = e[0] + '>' + e[1];
    var t = ED.edges[ek];
    // the editor draws the bare terrain STROKE (no glyph) at inset S*0.8; the
    // shared mark owns colour/width/linecap. Empty sides get only the hit line.
    if (t) bpTerrainStroke(gTer, e[0], e[1], t, { rad: S*0.8, pe: 'none', edgeData: false });
    if (ED.tool==='terrain'){
      var hit = bpEdgeHitLine(gHit, e[0], e[1], S*0.8);
      hit.addEventListener('click', function(){
        var cur = ED.edges[ek];
        if (!cur) ED.edges[ek] = 'F';
        else if (cur==='F') ED.edges[ek] = 'M';
        else if (cur==='M') ED.edges[ek] = 'R';
        else delete ED.edges[ek];
        renderEditor();
      });
    }
  });
  renderEdStock();
}

function groupEdgesToPieces(edges){
  // group same-type sides of the SAME hex that share a corner
  // (physical terrain pieces sit inside one hex, wrapping its corners)
  function vkey(h, p){ return h + '@' + Math.round(p[0])+':'+Math.round(p[1]); }
  var items = Object.keys(edges).map(function(ek){
    var parts = ek.split('>');
    var d = +parts[1];
    var c = hexXY(parts[0]);
    var aa = cornerAngles(d);
    return { ek: ek, t: edges[ek], a: parts[0], d: d,
      v1: vkey(parts[0], cornerPt(c[0],c[1],aa[0],S)), v2: vkey(parts[0], cornerPt(c[0],c[1],aa[1],S)) };
  });
  var used = {}, pieces = [];
  items.forEach(function(it, i){
    if (used[i]) return;
    var comp = [it]; used[i] = true;
    var verts = {}; verts[it.v1]=1; verts[it.v2]=1;
    var grew = true;
    while (grew){
      grew = false;
      items.forEach(function(o, j){
        if (used[j] || o.t !== it.t) return;
        if (verts[o.v1] || verts[o.v2]){
          used[j]=true; comp.push(o); verts[o.v1]=1; verts[o.v2]=1; grew=true;
        }
      });
    }
    var qr = E.parseKey(it.a);
    // physical pieces come in lengths 2-3, but several can share one hex —
    // split longer runs into 3s and 2s (TwoSetsOfThree: a full forest ring = 3+3).
    // Rivers come in the same physical lengths as forest/mountain.
    var chunks = splitRun(comp.map(function(x){ return x.d; }));
    chunks.forEach(function(chunk){
      pieces.push({ t: it.t, edges: chunk.map(function(d){ return [qr[0], qr[1], d]; }) });
    });
  });
  return pieces;
}
function splitRun(dirs){
  if (dirs.length <= 3) return [dirs];
  var inSet = {};
  dirs.forEach(function(d){ inSet[d] = true; });
  // order the contiguous arc: start where the previous direction is absent (full ring: anywhere)
  var start = dirs[0];
  for (var d = 0; d < 6; d++) if (inSet[d] && !inSet[(d + 5) % 6]) { start = d; break; }
  var seq = [];
  for (var i = 0, cur = start; i < dirs.length; i++, cur = (cur + 1) % 6){
    if (!inSet[cur]) return [dirs]; // not one arc (shouldn't happen) — leave untouched
    seq.push(cur);
  }
  var out = [];
  while (seq.length > 3){
    var take = seq.length === 4 ? 2 : 3; // 4 -> 2+2, 5 -> 3+2, 6 -> 3+3
    out.push(seq.slice(0, take));
    seq = seq.slice(take);
  }
  out.push(seq);
  return out;
}

function renderEdStock(){
  var pieces = groupEdgesToPieces(ED.edges);
  function summary(t){
    var lens = pieces.filter(function(p){ return p.t===t; }).map(function(p){ return p.edges.length; });
    if (!lens.length) return 'none';
    var cnt = {};
    lens.forEach(function(l){ cnt[l] = (cnt[l]||0)+1; });
    return Object.keys(cnt).sort().map(function(l){ return cnt[l]+'&times;len'+l; }).join(', ');
  }
  var stockNote = Object.keys(E.CONFIG.terrainStock).map(function(k){ return E.CONFIG.terrainStock[k]+'&times;len'+k.slice(1)+' '+(k[0]==='F'?'forest':k[0]==='R'?'river':'mountain'); }).join(', ');
  $('edStock').innerHTML = (ED.hexes ? '<b>'+Object.keys(ED.hexes).length+'/'+E.CONFIG.mapHexCeiling+' hexes</b> &nbsp;|&nbsp; ' : '') +
    'Forest pieces: '+summary('F')+' &nbsp;|&nbsp; Mountain pieces: '+summary('M')+' &nbsp;|&nbsp; River pieces: '+summary('R')+
    ' <span class="small">(physical stock: '+stockNote+')</span>';
  var over = pieces.some(function(p){
    var cap = E.CONFIG.terrainStock[p.t + p.edges.length];
    if (cap === undefined) return true; // no physical piece of this size
    return pieces.filter(function(o){ return o.t===p.t && o.edges.length===p.edges.length; }).length > cap;
  });
  $('edWarn').textContent = over ? 'Note: this layout exceeds the physical terrain stock (still fully playable digitally).' : '';
}

function edBuildDef(){
  var name = $('edName').value.trim() || 'Untitled Map';
  if (!ED.red || !ED.blue){ toast('Place both headquarters first (Red HQ and Blue HQ tools).', 3200); return null; }
  var def = {
    name: name, shape: ED.shape,
    redHQ: ED.red.slice(), blueHQ: ED.blue.slice(),
    pieces: groupEdgesToPieces(ED.edges),
    custom: true, id: slugifyMap(name)   // filename = name-slug (a rename saves a new file)
  };
  if (ED.hexes){
    var pairs = edHexPairs();
    if (pairs.length > E.CONFIG.mapHexCeiling){ toast(E.CONFIG.mapHexCeiling + ' hexes is the ceiling (laser-cutter max) — remove '+(pairs.length-E.CONFIG.mapHexCeiling)+'.', 3800); return null; }
    def.shapeDef = { label: 'Custom board ('+pairs.length+' hexes)', hexes: pairs };
    delete def.shape; // the engine registers it as '@<id>' from shapeDef
  }
  try {
    var prev = E.currentShape();
    E.setBoard(E.ensureMapShape(def));
    E.buildTerrain(def);
    E.setBoard(prev);
  } catch(e){ toast('Map problem: '+e.message, 3500); return null; }
  return def;
}
function edSaveDef(def){
  def.custom = true;
  if (!def.id) def.id = slugifyMap(def.name);
  if (def.shapeDef) def.shape = '@' + def.id;    // ensureMapShape keys off id
  libraryReplace(def);                            // usable in E.MAPS immediately
  return saveMapFile(def);                       // persist to content/maps/<id>.js when the server is up
}
