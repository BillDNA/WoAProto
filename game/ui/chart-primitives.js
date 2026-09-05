/* War of Attrition — ui part: the shared CHART primitives toolkit. The ch*
   SVG builders + palette (CHART), the greedy label placer (chMakePlacer), the
   settle-curve CDF (chCdf/chSettleSvg), the hover layer (chBindHits), and the
   band-board row renderer (ovBandRect/ovDot/ovBandRowHtml) shared by the
   Overview and Maps panes. Every dashboard pane module (screens/dashboard/panes/overview /
   maps / cards / units) draws over this toolkit — one
   implementation of each primitive, many callers.

   Inline SVG / plain divs by string concat like the rest of the ui — zero
   dependencies. Palette validated with the dataviz skill's validate_palette.js
   against the parchment surface #e8dcc0 (see each constant). Series identity
   never rides on text — labels stay in ink; marks carry the colour. */
'use strict';
var CHART = {
  // paper + ink + hairline are the shared base — read from :root (they resolve
  // in the SVG/inline-style DOM) so a repalette of the parchment/ink carries
  // the charts too. The ramps + marks below stay CHART's own, validated here and
  // deliberately independent of the faction/side colours (retuning one must
  // never silently drag the other), even where a hex happens to coincide.
  surface: 'var(--parch)',               // #e8dcc0 — each chart's own solid ground
  ink: 'var(--ink)',                     // #3a2f1d — 9.62:1 on surface
  inkSoft: 'var(--ink-soft)',            // #5a4c33 — 6.13:1 — axis/tick text
  muted: '#75643f',                      // 4.23:1 — quiet annotations (tooltip+table carry the data)
  grid: 'var(--hairline)',               // #d8caa2 — hairline gridlines, one step off surface
  axis: '#b9a878',                       // baselines + the 50% crosslines
  // sequential brass→ink ramp (magnitude: Balance score, light = good/low).
  // --ordinal validation: monotone L, ΔL≥0.06, light end 2.13:1, hue spread 6°.
  seq: ['#b6925a', '#97753f', '#77582e', '#59421f', '#3a2f1d'],
  // diverging Win%-around-50 scale: the game's own side colours as poles with a
  // neutral warm-gray midpoint. Arms are monotone-L (validated); the blue pole
  // is #28527a snapped to clear the chroma floor. Poles pass all-pairs CVD 57.6.
  divMid: '#9a9180',
  divRed: ['#9b7467', '#9c5449', '#9e2b25'],   // above 50% — the hot pole
  divBlue: ['#788187', '#54708e', '#2b5d97'],  // below 50%
  divStops: [3, 8, 15],                  // |win-50| < stop -> that arm step
  hq: '#a0522a',                         // winType: HQ capture (copper, chroma-snapped)
  attr: '#3e7dba',                       // winType: attrition   (river, chroma-snapped)
  // Overview screen: nested T-band shading
  // (T2 widest/lightest .. T0 narrowest/darkest), breach/regress/improve
  // marks. Named separately rather than reused from seq/divRed above, even
  // where the hex happens to match, so a future repalette of one doesn't
  // silently drag the other along.
  bandT2: '#ded0ab', bandT1: '#d3c294', bandT0: '#bfa96e',
  breach: '#9e2b25', regress: '#9c5449', improve: '#97753f',
  runADot: 'var(--parch)',               // #e8dcc0 — run-A hollow-dot fill (parchment)
  improveDot: '#77582e'                  // run-B dot fill when a map/metric improved (design 1f)
};
// tempo lanes (deploy/attack/swap/march): the four lane colours are the SAME
// hexes already named above
// (seq[0]/divRed[1]/divBlue[1]/divMid), just given their tempo-lane reading —
// no new colour is introduced, so a future repalette of one still drags both.
CHART.lane = { deploy: CHART.seq[0], attack: CHART.divRed[1], swap: CHART.divBlue[1], march: CHART.divMid };

function chEsc(s){ return uiEsc(s); } // one html-escape lives in ui-primitives.js
function chDivFill(dev){ // dev = win% - 50
  var arm = dev >= 0 ? CHART.divRed : CHART.divBlue, a = Math.abs(dev);
  if (a < CHART.divStops[0]) return CHART.divMid;
  if (a < CHART.divStops[1]) return arm[0];
  if (a < CHART.divStops[2]) return arm[1];
  return arm[2];
}

/* ---- tiny svg builders (keep the concat readable) ---- */
// the ONE <svg> root open. o: {id, vb, w, h, role, aria (escaped here), hidden, style}.
function chSvgOpen(o){
  o = o || {};
  return '<svg xmlns="http://www.w3.org/2000/svg"'+
    (o.id ? ' id="'+o.id+'"' : '')+
    (o.vb != null ? ' viewBox="'+o.vb+'"' : '')+
    (o.w != null ? ' width="'+o.w+'"' : '')+
    (o.h != null ? ' height="'+o.h+'"' : '')+
    (o.role ? ' role="'+o.role+'"' : '')+
    (o.aria != null ? ' aria-label="'+chEsc(o.aria)+'"' : '')+
    (o.hidden ? ' aria-hidden="true"' : '')+
    (o.style ? ' style="'+o.style+'"' : '')+'>';
}
function chLine(x1, y1, x2, y2, stroke, w, dash, op){
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+stroke+'" stroke-width="'+(w||1)+'"'+
    (dash ? ' stroke-dasharray="'+dash+'"' : '')+(op != null ? ' opacity="'+op+'"' : '')+'/>';
}
// a hidden <defs> carrying ONE diagonal-hatch <pattern>, referenced by url(#id)
// elsewhere in the document (the map-drilldown dead-hex fill). Defined once per
// pane. o: { size, stroke, sw, angle } default to the dead-hatch look.
function chHatchDefs(id, o){
  o = o || {};
  var size = o.size != null ? o.size : 6, angle = o.angle != null ? o.angle : 45;
  return chSvgOpen({ w: 0, h: 0, hidden: true, style: 'position:absolute;' }) + '<defs>' +
    '<pattern id="'+id+'" width="'+size+'" height="'+size+'" patternUnits="userSpaceOnUse" patternTransform="rotate('+angle+')">' +
    chLine(0, 0, 0, size, o.stroke || CHART.muted, o.sw != null ? o.sw : 1.5) + '</pattern></defs></svg>';
}
function chPolyline(points, o){
  o = o || {};
  return '<polyline points="'+points+'" fill="'+(o.fill != null ? o.fill : 'none')+'"'+
    (o.stroke ? ' stroke="'+o.stroke+'"' : '')+(o.sw != null ? ' stroke-width="'+o.sw+'"' : '')+
    (o.dash ? ' stroke-dasharray="'+o.dash+'"' : '')+'/>';
}
// o: {fill, rx, stroke, sw, opacity, cls, style, extra}. cls/style/extra carry a
// class, inline style, and a pre-built attr string (e.g. chTipAttrs) so a
// transparent .ch-hit target is a rect through the primitive, not hand-drawn SVG.
function chRect(x, y, w, h, o){
  o = o || {};
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+(o.fill != null ? o.fill : 'none')+'"'+
    (o.cls ? ' class="'+o.cls+'"' : '')+
    (o.rx != null ? ' rx="'+o.rx+'"' : '')+(o.stroke ? ' stroke="'+o.stroke+'"' : '')+
    (o.sw != null ? ' stroke-width="'+o.sw+'"' : '')+(o.opacity != null ? ' opacity="'+o.opacity+'"' : '')+
    (o.style ? ' style="'+o.style+'"' : '')+(o.extra || '')+'/>';
}
// a circle mark. o: {id, cls, cx, cy, r, fill, stroke, sw, dash, opacity, ring
// (=data-ring for chBindHits), extra (a pre-built attr string e.g. chTipAttrs)}.
function chCircle(o){
  return '<circle'+(o.id ? ' id="'+o.id+'"' : '')+(o.cls ? ' class="'+o.cls+'"' : '')+
    ' cx="'+o.cx+'" cy="'+o.cy+'" r="'+o.r+'" fill="'+(o.fill != null ? o.fill : 'none')+'"'+
    (o.stroke ? ' stroke="'+o.stroke+'"' : '')+(o.sw != null ? ' stroke-width="'+o.sw+'"' : '')+
    (o.dash ? ' stroke-dasharray="'+o.dash+'"' : '')+(o.opacity != null ? ' opacity="'+o.opacity+'"' : '')+
    (o.ring != null ? ' data-ring="'+o.ring+'"' : '')+(o.extra || '')+'/>';
}
// a polygon mark. o: {cls, fill, stroke ('none' to force it), sw, dash, extra}.
function chPolygon(points, o){
  o = o || {};
  return '<polygon'+(o.cls ? ' class="'+o.cls+'"' : '')+' points="'+points+'" fill="'+(o.fill != null ? o.fill : 'none')+'"'+
    (o.stroke != null ? ' stroke="'+o.stroke+'"' : '')+(o.sw != null ? ' stroke-width="'+o.sw+'"' : '')+
    (o.dash ? ' stroke-dasharray="'+o.dash+'"' : '')+(o.extra || '')+'/>';
}
function chText(x, y, s, o){
  o = o || {};
  return '<text x="'+x+'" y="'+y+'" font-size="'+(o.fs||11)+'" fill="'+(o.fill||CHART.inkSoft)+'"'+
    (o.anchor ? ' text-anchor="'+o.anchor+'"' : '')+(o.italic ? ' font-style="italic"' : '')+
    (o.bold ? ' font-weight="bold"' : '')+
    (o.rotate ? ' transform="rotate(-90 '+x+' '+y+')"' : '')+'>'+chEsc(s)+'</text>';
}
function chSwatch(color){ return '<span class="sw" style="background:'+color+';"></span>'; }
function chTipAttrs(name, rows, markIds){
  return ' data-name="'+chEsc(name)+'" data-tip="'+chEsc(JSON.stringify(rows))+'"'+
    (markIds ? ' data-mark="'+markIds+'"' : '');
}

/* CDF polyline points for a pre-SORTED array over a fixed [0,100] domain (the
   settle-curve idiom): 11 points at t=0,10,...,100, y = share of
   the array <= t. Shared by the Overview fleet-wide mini (ovPacingMinis) and
   the per-map settle curve — ONE implementation, two callers. */
function chCdf(sorted, w, h){
  var pts = [];
  for (var t = 0; t <= 100; t += 10){
    var c = 0;
    for (var j = 0; j < sorted.length; j++){ if (sorted[j] <= t) c++; }
    pts.push((t / 100 * w).toFixed(1) + ',' + (h - (sorted.length ? c / sorted.length : 0) * h).toFixed(1));
  }
  return pts.join(' ');
}
function chSettleSvg(settleA, settleB, w, h){
  w = w || 200; h = h || 64;
  return chSvgOpen({ vb: '0 0 ' + w + ' ' + h, style: 'display:block;width:100%;height:auto;' }) +
    chLine(0, h, w, h, CHART.axis, 1) +
    chPolyline(chCdf(settleA, w, h), { stroke: CHART.inkSoft, sw: 1.5, dash: '4 2' }) +
    chPolyline(chCdf(settleB, w, h), { stroke: CHART.improveDot, sw: 2 }) + '</svg>';
}

/* Greedy direct-label placement: candidates around the mark, first that fits
   inside the viewBox and hits nothing already placed wins. Marks are blocked
   first so labels dodge other dots too. Width is estimated (no layout engine
   at string-concat time); the screenshot gate is the real collision check. */
function chMakePlacer(vbW, vbH){
  var boxes = [];
  function collides(b){
    for (var i = 0; i < boxes.length; i++){
      var o = boxes[i];
      if (b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h) return true;
    }
    return false;
  }
  return {
    block: function(x, y, w, h){ boxes.push({ x:x, y:y, w:w, h:h }); },
    place: function(cx, cy, r, text, fs){
      var w = text.length * fs * 0.62, h = fs + 2;
      var cands = [];
      [0, 7].forEach(function(pad){ // near ring, then a step further out
        cands.push(
          { x: cx + r + 4 + pad,     y: cy + fs * 0.36 },       // right
          { x: cx - r - 4 - pad - w, y: cy + fs * 0.36 },       // left
          { x: cx - w / 2,           y: cy - r - 5 - pad },     // above
          { x: cx - w / 2,           y: cy + r + fs + pad },    // below
          { x: cx + r + 3 + pad,     y: cy - r - 2 - pad },     // right-up
          { x: cx + r + 3 + pad,     y: cy + r + fs - 2 + pad },// right-down
          { x: cx - r - 3 - pad - w, y: cy - r - 2 - pad },     // left-up
          { x: cx - r - 3 - pad - w, y: cy + r + fs - 2 + pad } // left-down
        );
      });
      for (var i = 0; i < cands.length; i++){
        var c = cands[i], b = { x: c.x, y: c.y - fs, w: w, h: h };
        if (b.x < 2 || b.x + b.w > vbW - 2 || b.y < 12 || b.y + b.h > vbH - 2) continue;
        if (collides(b)) continue;
        boxes.push(b);
        return c;
      }
      return null;
    }
  };
}

/* ---- the hover layer: per-mark tooltip + mark lift; focus mirrors hover ---- */
function chBindHits(root){
  var tip = document.getElementById('chTip');
  if (!tip){
    tip = document.createElement('div');
    tip.id = 'chTip'; tip.className = 'chtip';
    document.body.appendChild(tip);
  }
  function markSet(hit, on){
    var ids = hit.getAttribute('data-mark');
    if (!ids) return;
    ids.split(',').forEach(function(id){
      var m = root.querySelector('#' + id);
      if (!m) return;
      if (on){ m.setAttribute('stroke', CHART.ink); m.setAttribute('stroke-width', '2'); }
      else {
        var ring = m.getAttribute('data-ring');
        if (ring === 'none'){ m.removeAttribute('stroke'); m.removeAttribute('stroke-width'); }
        else m.setAttribute('stroke', ring);
      }
    });
  }
  function fill(hit){
    tip.textContent = '';
    var t = document.createElement('div');
    t.className = 'tt'; t.textContent = hit.getAttribute('data-name'); // untrusted names: textContent only
    tip.appendChild(t);
    var rows = [];
    try { rows = JSON.parse(hit.getAttribute('data-tip')) || []; } catch(e){}
    rows.forEach(function(rw){
      var d = document.createElement('div');
      var v = document.createElement('span'); v.className = 'tv'; v.textContent = String(rw[1]);
      var l = document.createElement('span'); l.className = 'tl'; l.textContent = ' ' + rw[0];
      d.appendChild(v); d.appendChild(l); tip.appendChild(d);
    });
  }
  function move(ev){
    var x = ev.clientX + 14, y = ev.clientY + 12;
    if (x + 290 > (window.innerWidth || 1200)) x = ev.clientX - 296;
    if (y + 150 > (window.innerHeight || 800)) y = ev.clientY - 140;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  root.querySelectorAll('.ch-hit').forEach(function(hit){
    hit.setAttribute('tabindex', '0');
    hit.addEventListener('mouseenter', function(ev){ fill(hit); tip.style.display = 'block'; move(ev); markSet(hit, true); });
    hit.addEventListener('mousemove', move);
    hit.addEventListener('mouseleave', function(){ tip.style.display = 'none'; markSet(hit, false); });
    hit.addEventListener('focus', function(){
      fill(hit); tip.style.display = 'block';
      var r = hit.getBoundingClientRect();
      tip.style.left = (r.left + r.width / 2) + 'px'; tip.style.top = (r.bottom + 8) + 'px';
      markSet(hit, true);
    });
    hit.addEventListener('blur', function(){ tip.style.display = 'none'; markSet(hit, false); });
  });
}

function ovBandRect(domain, band, color) {
  if (!band) return '';
  var left = band.lo == null ? 0 : CHART_MODEL.ovPos(domain, band.lo);
  var right = band.hi == null ? 100 : CHART_MODEL.ovPos(domain, band.hi);
  if (right < left) { var t = left; left = right; right = t; }
  return '<div style="position:absolute;top:5px;bottom:5px;left:' + left.toFixed(1) + '%;width:' +
    (right - left).toFixed(1) + '%;background:' + color + ';border-radius:2px;"></div>';
}
/* the A/B dumbbell row shared by the Cards + Overview panes: baseline track,
   the A→B connector, the hollow run-A dot, the filled run-B dot — ONE
   implementation. posA/posB are already-resolved percent positions; aBorder is
   the run-A ring colour (the panes differ only there: ink vs inkSoft). */
function chDumbbell(posA, posB, aBorder, bFill, connColor) {
  var connLeft = 0, connWidth = 0;
  if (posA != null && posB != null) { connLeft = Math.min(posA, posB); connWidth = Math.abs(posB - posA); }
  return '<div style="position:absolute;top:8px;left:0;right:0;height:2px;background:' + CHART.grid + ';"></div>' +
    (posA != null && posB != null ? '<div style="position:absolute;top:8px;height:2px;left:' + connLeft.toFixed(1) +
      '%;width:' + connWidth.toFixed(1) + '%;background:' + connColor + ';"></div>' : '') +
    (posA != null ? '<div style="position:absolute;top:3px;width:12px;height:12px;border-radius:50%;border:2px solid ' +
      aBorder + ';background:' + CHART.runADot + ';left:calc(' + posA.toFixed(1) + '% - 6px);"></div>' : '') +
    (posB != null ? '<div style="position:absolute;top:4px;width:11px;height:11px;border-radius:50%;background:' +
      bFill + ';left:calc(' + posB.toFixed(1) + '% - 5px);"></div>' : '');
}
function ovDot(domain, v, isA, breached) {
  if (v == null) return '';
  var pos = CHART_MODEL.ovPos(domain, v);
  if (isA) return '<div style="position:absolute;top:3px;width:12px;height:12px;border-radius:50%;border:2px solid ' +
    CHART.ink + ';background:' + CHART.runADot + ';left:calc(' + pos.toFixed(1) + '% - 6px);"></div>';
  return '<div style="position:absolute;top:5px;width:12px;height:12px;border-radius:50%;background:' +
    (breached ? CHART.breach : CHART.ink) + ';left:calc(' + pos.toFixed(1) + '% - 6px);"></div>';
}

/* One band-board row = three flat sibling divs (label/track/value) pushed
   straight into the caller's .ov-grid — the SAME flat-children-in-one-grid
   technique the design canvas itself uses for 1c/1f/4a (no per-row wrapper;
   `display:contents` has real opacity/box quirks, this doesn't). Shading:
   only the tiers from T0 up to the SELECTED temperature draw (T0 alone at
   T0; T1 then T0 at T1; all three at T2) — the band literally widens on
   screen as you retemper (AC6), while the dot x-position (ovTrackDomain,
   fixed to T2) never jumps. Breach = run B outside the SELECTED tier's
   band, small-n excepted (fleet-wide n<240 -> greyed, "(n=N)"). */
// scope ('fleet' default | 'map'): which SMALL_N threshold n is
// compared against — the Overview's fleet-wide board never passes it (240),
// the per-map board passes 'map' (40).
function ovBandRowHtml(row, aggA, aggB, temperature, scope) {
  var valA = row.val(aggA.agg, aggA.done);
  var valB = row.val(aggB.agg, aggB.done);
  var domain = CHART_MODEL.ovTrackDomain(row, valA, valB);
  var n = Math.min(WOA_REPORT.bandN(row, aggA.agg, aggA.done), WOA_REPORT.bandN(row, aggB.agg, aggB.done));
  var small = WOA_REPORT.smallN(n, scope || 'fleet');
  var selBand = WOA_REPORT.bands(row.key, temperature);
  var breached = !small && valB != null &&
    ((selBand.lo != null && valB < selBand.lo) || (selBand.hi != null && valB > selBand.hi));

  var tiers = temperature === 'T2' ? ['T2', 'T1', 'T0'] : temperature === 'T1' ? ['T1', 'T0'] : ['T0'];
  var inner = '';
  tiers.forEach(function (t) {
    inner += ovBandRect(domain, WOA_REPORT.bands(row.key, t), t === 'T2' ? CHART.bandT2 : (t === 'T1' ? CHART.bandT1 : CHART.bandT0));
  });
  inner += ovDot(domain, valA, true, false) + ovDot(domain, valB, false, breached);
  var tip = [['run A', CHART_MODEL.ovFmt(row.key, valA)], ['run B', CHART_MODEL.ovFmt(row.key, valB)],
    ['band at ' + temperature, (selBand.lo == null ? 'open' : selBand.lo) + '–' + (selBand.hi == null ? 'open' : selBand.hi)],
    ['n (min of A/B)', n]];
  var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:help;"' + chTipAttrs(row.label, tip) + '></div>';
  var trackStyle = 'position:relative;height:22px;' + (small ? 'opacity:.5;' : '') +
    (breached ? 'outline:1.5px solid ' + CHART.breach + ';outline-offset:2px;border-radius:3px;' : '');
  var valText = CHART_MODEL.ovFmt(row.key, valA) + ' → ' + CHART_MODEL.ovFmt(row.key, valB) + (small ? ' (n=' + n + ')' : '') + (breached ? ' ✗' : '');
  var op = small ? 'opacity:.5;' : '';
  var rk = ' data-rowkey="' + row.key + '"';
  var label = chEsc(row.label);
  return '<div' + rk + ' class="ov-lbl" style="' + op + '">' + (breached ? '<b>' + label + ' ↗</b>' : label) + '</div>' +
    '<div' + rk + ' style="' + trackStyle + '">' + inner + hit + '</div>' +
    '<div' + rk + ' class="ov-val' + (breached ? ' breach' : '') + '" style="' + op + '">' + valText + '</div>';
}
