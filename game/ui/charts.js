/* War of Attrition — ui part: the Balance Dashboard's CHARTS view (V1
   graphs-spec views #1 map-fairness scatter, #3 card quadrant, #4
   battle-length histogram). Every chart answers the QUESTION in its title —
   no charts for charts' sake (Bill, graphs-spec Q6).

   Inline SVG by string concat like the rest of the ui — zero dependencies,
   file:// safe. Draws ONLY the current run's in-memory data (DASH); all
   derivations reuse WOA_REPORT (one implementation per fact). Per-battle
   turns/winTypes come from DASH.detail, collected by the dashRun loop in
   ui/boot.js.

   Palette: validated with the dataviz skill's validate_palette.js against
   the parchment surface #e8dcc0 (see each constant). Series identity never
   rides on text — labels stay in ink; marks carry the colour. */
'use strict';

var CHART = {
  surface: '#e8dcc0',                    // --parch: each chart's own solid ground
  ink: '#3a2f1d',                        // 9.62:1 on surface
  inkSoft: '#5a4c33',                    // 6.13:1 — axis/tick text
  muted: '#75643f',                      // 4.23:1 — quiet annotations (tooltip+table carry the data)
  grid: '#d8caa2',                       // hairline gridlines, one step off surface
  axis: '#b9a878',                       // baselines + the 50% crosslines
  // sequential brass→ink ramp (magnitude: Balance score, light = good/low).
  // --ordinal validation: monotone L, ΔL≥0.06, light end 2.13:1, hue spread 6°.
  seq: ['#b6925a', '#97753f', '#77582e', '#59421f', '#3a2f1d'],
  seqStops: [12, 20, 32, 45],            // score < stop -> that step; else darkest
  // diverging Win%-around-50 scale: the game's own side colours as poles with a
  // neutral warm-gray midpoint. Arms are monotone-L (validated); the blue pole
  // is #28527a snapped to clear the chroma floor. Poles pass all-pairs CVD 57.6.
  divMid: '#9a9180',
  divRed: ['#9b7467', '#9c5449', '#9e2b25'],   // above 50% — the hot pole
  divBlue: ['#788187', '#54708e', '#2b5d97'],  // below 50%
  divStops: [3, 8, 15],                  // |win-50| < stop -> that arm step
  hq: '#a0522a',                         // winType: HQ capture (copper, chroma-snapped)
  attr: '#3e7dba',                       // winType: attrition   (river, chroma-snapped)
  // WOA-035 (design 1c/1f/1e — Overview screen): nested T-band shading
  // (T2 widest/lightest .. T0 narrowest/darkest), breach/regress/improve
  // marks. Named per the design tokens (README "Design Tokens") rather than
  // reused from seq/divRed above, even where the hex happens to match, so a
  // future repalette of one doesn't silently drag the other along.
  bandT2: '#ded0ab', bandT1: '#d3c294', bandT0: '#bfa96e',
  breach: '#9e2b25', regress: '#9c5449', improve: '#97753f',
  runADot: '#e8dcc0',                    // run-A hollow-dot fill (parchment)
  improveDot: '#77582e'                  // run-B dot fill when a map/metric improved (design 1f)
};
// WOA-040 (design 3a tempo lanes + README "Design Tokens" — deploy/attack/
// swap/march): the four lane colours are the SAME hexes already named above
// (seq[0]/divRed[1]/divBlue[1]/divMid), just given their tempo-lane reading —
// no new colour is introduced, so a future repalette of one still drags both.
CHART.lane = { deploy: CHART.seq[0], attack: CHART.divRed[1], swap: CHART.divBlue[1], march: CHART.divMid };

function chEsc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function chSeqFill(score){
  for (var i = 0; i < CHART.seqStops.length; i++) if (score < CHART.seqStops[i]) return CHART.seq[i];
  return CHART.seq[CHART.seq.length - 1];
}
function chDivFill(dev){ // dev = win% - 50
  var arm = dev >= 0 ? CHART.divRed : CHART.divBlue, a = Math.abs(dev);
  if (a < CHART.divStops[0]) return CHART.divMid;
  if (a < CHART.divStops[1]) return arm[0];
  if (a < CHART.divStops[2]) return arm[1];
  return arm[2];
}

/* ---- tiny svg builders (keep the concat readable) ---- */
function chLine(x1, y1, x2, y2, stroke, w, dash){
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+stroke+'" stroke-width="'+(w||1)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
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
   settle-curve idiom, design 1e): 11 points at t=0,10,...,100, y = share of
   the array <= t. Shared by the Overview fleet-wide mini (ovPacingMinis) and
   the WOA-040 per-map settle curve — ONE implementation, two callers. */
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
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="display:block;width:100%;height:auto;">' +
    chLine(0, h, w, h, CHART.axis, 1) +
    '<polyline points="' + chCdf(settleA, w, h) + '" fill="none" stroke="' + CHART.inkSoft + '" stroke-width="1.5" stroke-dasharray="4 2"/>' +
    '<polyline points="' + chCdf(settleB, w, h) + '" fill="none" stroke="#77582e" stroke-width="2"/></svg>';
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

/* =================== chart 1: map fairness scatter ===================
   THE QUESTION: which maps are broken, and how? Fair maps cluster on the
   50/50 cross; drift up/down = side bias, left/right = turn-order bias.
   Dot AREA = HQ% (rushable vs grind), fill = Balance score (light = good). */
function chartScatter(rows, meta){
  var W = 860, H = 470, L = 48, R = 18, T = 30, B = 46;
  var pw = W - L - R, ph = H - T - B;
  function sx(v){ return L + v / 100 * pw; }
  function sy(v){ return T + (100 - v) / 100 * ph; }
  var s = '<svg id="chScatter" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map fairness scatter">';
  s += '<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="'+CHART.surface+'" rx="6"/>';
  [0, 25, 75, 100].forEach(function(v){
    s += chLine(sx(v), T, sx(v), T + ph, CHART.grid, 1);
    s += chLine(L, sy(v), L + pw, sy(v), CHART.grid, 1);
  });
  // the 50% crosslines — the "fair" cross, one step darker than the grid
  s += chLine(sx(50), T, sx(50), T + ph, CHART.axis, 1.4);
  s += chLine(L, sy(50), L + pw, sy(50), CHART.axis, 1.4);
  // axis text + annotations render AFTER the marks so a dot never covers them
  var chrome = '';
  [0, 25, 50, 75, 100].forEach(function(v){
    chrome += chText(sx(v), T + ph + 14, String(v), { fs: 10.5, anchor: 'middle' });
    chrome += chText(L - 6, sy(v) + 3.5, String(v), { fs: 10.5, anchor: 'end' });
  });
  chrome += chText(L + pw / 2, H - 6, 'first-mover win %', { fs: 12, anchor: 'middle' });
  chrome += chText(14, T + ph / 2, 'red win %', { fs: 12, anchor: 'middle', rotate: true });
  // how to read the drift — quiet pole notes
  chrome += chText(L + pw - 4, T + ph - 8, '1st player favoured →', { fs: 10.5, fill: CHART.muted, italic: true, anchor: 'end' });
  chrome += chText(L + 6, T + ph - 8, '← 2nd player favoured', { fs: 10.5, fill: CHART.muted, italic: true });
  chrome += chText(L + pw - 4, T + 14, 'red favoured ↑', { fs: 10.5, fill: CHART.muted, italic: true, anchor: 'end' });
  chrome += chText(L + pw - 4, T + ph - 22, '↓ blue favoured', { fs: 10.5, fill: CHART.muted, italic: true, anchor: 'end' });

  var placer = chMakePlacer(W, H);
  var dots = rows.map(function(r){
    var rad = Math.max(4, 16 * Math.sqrt(r.hq / 100));
    return { r: r, rad: rad, x: sx(r.first), y: sy(r.red) };
  }).sort(function(a, b){ return b.rad - a.rad; }); // big dots underneath
  dots.forEach(function(d){ placer.block(d.x - d.rad, d.y - d.rad, d.rad * 2, d.rad * 2); });

  var marks = '', labels = '', hits = '';
  dots.forEach(function(d, i){
    var r = d.r, id = 'chSc' + i;
    marks += '<circle id="'+id+'" class="ch-dot" cx="'+d.x.toFixed(1)+'" cy="'+d.y.toFixed(1)+'" r="'+d.rad.toFixed(1)+
      '" fill="'+chSeqFill(r.score)+'" stroke="'+CHART.surface+'" stroke-width="2" data-ring="'+CHART.surface+'"/>';
    var outlier = r.red <= 38 || r.red >= 62 || r.first <= 38 || r.first >= 62;
    if (outlier){
      var p = placer.place(d.x, d.y, d.rad, r.name, 11);
      if (p) labels += chText(p.x, p.y, r.name, { fs: 11, fill: CHART.ink });
    }
    hits += '<circle class="ch-hit" cx="'+d.x.toFixed(1)+'" cy="'+d.y.toFixed(1)+'" r="'+Math.max(d.rad + 6, 14)+
      '" fill="transparent"'+chTipAttrs(r.name, [
        ['red win %', r.red + '%'], ['first-mover win %', r.first + '%'],
        ['HQ-capture endings', r.hq + '%'], ['balance score (lower = better)', WOA_REPORT.f1(r.score)],
        ['battles', r.done]
      ], id)+'/>';
  });
  s += marks + chrome + labels + hits + '</svg>';
  return s;
}

/* =================== chart 2: card quadrant ===================
   THE QUESTION: which cards are on the overpowered watchlist? Top-LEFT
   (played the moment it appears + played on first sight) is the corner.
   Bubble AREA = plays, fill = Win% deviation from 50 (red = above). */
function chartQuadrant(crows, meta){
  // T leaves room for the watchlist caption PLUS a full-radius bubble at 100%
  var W = 860, H = 500, L = 48, R = 18, T = 44, B = 48;
  var pw = W - L - R, ph = H - T - B;
  var maxSeen = 1, maxPlays = 1;
  crows.forEach(function(c){ if (c.seenNum > maxSeen) maxSeen = c.seenNum; if (c.plays > maxPlays) maxPlays = c.plays; });
  var x0 = 0.75, x1 = Math.max(2.5, Math.ceil(maxSeen * 1.15 * 2) / 2);
  function qx(v){ return L + (v - x0) / (x1 - x0) * pw; }
  function qy(v){ return T + (100 - v) / 100 * ph; }
  var s = '<svg id="chQuad" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Card quadrant">';
  s += '<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="'+CHART.surface+'" rx="6"/>';
  for (var g = 1; g <= Math.floor(x1); g++) s += chLine(qx(g), T, qx(g), T + ph, CHART.grid, 1);
  [0, 25, 50, 75, 100].forEach(function(v){ s += chLine(L, qy(v), L + pw, qy(v), CHART.grid, 1); });
  s += chLine(L, T + ph, L + pw, T + ph, CHART.axis, 1.2); // baseline
  // axis text + annotations render AFTER the marks so a bubble never covers them
  var chrome = '';
  for (var t = 1; t <= Math.floor(x1); t++) chrome += chText(qx(t), T + ph + 16, String(t), { fs: 10.5, anchor: 'middle' });
  [0, 25, 50, 75, 100].forEach(function(v){ chrome += chText(L - 6, qy(v) + 3.5, String(v), { fs: 10.5, anchor: 'end' }); });
  chrome += chText(L + pw / 2, H - 6, 'average times seen in hand before it was played', { fs: 12, anchor: 'middle' });
  chrome += chText(14, T + ph / 2, 'played on first sight %', { fs: 12, anchor: 'middle', rotate: true });
  chrome += chText(L + 6, T + ph - 8, '← played on sight', { fs: 10.5, fill: CHART.muted, italic: true });
  chrome += chText(L + pw - 4, T + ph - 8, 'hoarded →', { fs: 10.5, fill: CHART.muted, italic: true, anchor: 'end' });
  // the watchlist corner — a quiet caption in the top margin, pointing at the corner
  chrome += chText(L, 18, '↓ overpowered watchlist — always good the moment it appears', { fs: 11, fill: CHART.muted, italic: true });

  var placer = chMakePlacer(W, H);
  var bubs = crows.map(function(c){
    return { c: c, rad: Math.max(6, 20 * Math.sqrt(c.plays / maxPlays)), x: qx(c.seenNum), y: qy(c.sight) };
  }).sort(function(a, b){ return b.rad - a.rad; });
  bubs.forEach(function(b){ placer.block(b.x - b.rad, b.y - b.rad, b.rad * 2, b.rad * 2); });

  var marks = '', labels = '', hits = '';
  bubs.forEach(function(b, i){
    var c = b.c, id = 'chQd' + i;
    marks += '<circle id="'+id+'" class="ch-bub" cx="'+b.x.toFixed(1)+'" cy="'+b.y.toFixed(1)+'" r="'+b.rad.toFixed(1)+
      '" fill="'+chDivFill(c.win - 50)+'" stroke="'+CHART.surface+'" stroke-width="2" data-ring="'+CHART.surface+'"/>';
    var p = placer.place(b.x, b.y, b.rad, c.name, 10.5) || { x: b.x + b.rad + 4, y: b.y + 3.5 };
    labels += chText(p.x, p.y, c.name, { fs: 10.5, fill: CHART.ink });
    hits += '<circle class="ch-hit" cx="'+b.x.toFixed(1)+'" cy="'+b.y.toFixed(1)+'" r="'+Math.max(b.rad + 6, 14)+
      '" fill="transparent"'+chTipAttrs(c.name, [
        ['win % when played', c.win + '%'], ['played on first sight', c.sight + '%'],
        ['avg times seen before played', c.seen], ['plays', c.plays]
      ], id)+'/>';
  });
  s += marks + chrome + labels + hits + '</svg>';
  return s;
}

/* =================== chart 3: battle-length histogram ===================
   THE QUESTION: does this map end games decisively or grind to deck-out?
   Turns-to-finish binned by 2, stacked by winType; the deck-out line marks
   where "nobody ever died" lives. One map at a time — the <select> is the knob. */
function chartHistogram(det, mapName){
  var W = 860, H = 310, L = 48, R = 18, T = 36, B = 44;
  var pw = W - L - R, ph = H - T - B;
  var maxTurn = 2 * E.CARDS.reduce(function(sum, c){ return sum + (c.count || 0); }, 0); // 16 plays/side -> 32
  var nBins = Math.ceil(maxTurn / 2);
  var xMax = maxTurn + 2;                      // air to the right so the deck-out line reads
  var slot = pw / (xMax / 2);
  var bins = [];
  for (var i = 0; i < nBins; i++) bins.push({ hq: 0, attr: 0 });
  det.turns.forEach(function(t, i){
    var bi = Math.min(nBins - 1, Math.max(0, Math.ceil(t / 2) - 1));
    if (det.winTypes[i] === 'hq') bins[bi].hq++; else bins[bi].attr++;
  });
  var maxCount = 1;
  bins.forEach(function(b){ if (b.hq + b.attr > maxCount) maxCount = b.hq + b.attr; });
  var yStep = Math.max(1, Math.ceil(maxCount / 4));
  var yTop = Math.ceil(maxCount / yStep) * yStep;
  if (yTop === maxCount) yTop += yStep; // headroom: the tallest bar never touches the deck-out label
  function hy(count){ return T + ph - count / yTop * ph; }
  function hx(turn){ return L + turn / xMax * pw; }

  var s = '<svg id="chHist" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Battle length histogram">';
  s += '<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="'+CHART.surface+'" rx="6"/>';
  for (var yv = yStep; yv <= yTop; yv += yStep){
    s += chLine(L, hy(yv), L + pw, hy(yv), CHART.grid, 1);
    s += chText(L - 6, hy(yv) + 3.5, String(yv), { fs: 10.5, anchor: 'end' });
  }
  s += chLine(L, T + ph, L + pw, T + ph, CHART.axis, 1.2); // baseline
  for (var xt = 0; xt <= maxTurn; xt += 4) s += chText(hx(xt), T + ph + 14, String(xt), { fs: 10.5, anchor: 'middle' });
  s += chText(L + pw / 2, H - 6, 'battle length (turns)', { fs: 12, anchor: 'middle' });
  // deck-out threshold — dashed IS the threshold idiom (never used on the grid)
  s += chLine(hx(maxTurn), T + 8, hx(maxTurn), T + ph, CHART.inkSoft, 1, '4 3');
  s += chText(hx(maxTurn), T + 2 + 4, 'deck-out ('+maxTurn+')', { fs: 10.5, fill: CHART.muted, italic: true, anchor: 'middle' });

  var barW = Math.min(24, slot - 8);
  var marks = '', hits = '';
  bins.forEach(function(b, i){
    var total = b.hq + b.attr;
    if (!total) return;
    var cx = L + (i + 0.5) * slot, x = cx - barW / 2;
    var ids = [];
    var hqH = b.hq / yTop * ph, atH = b.attr / yTop * ph;
    var yBase = T + ph;
    // stack: HQ (copper) grows from the baseline, attrition (river) above a 2px surface gap
    function seg(id, y, h, color, rounded){
      var r = rounded ? Math.min(4, h / 2, barW / 2) : 0;
      if (h <= 0.5) return '';
      ids.push(id);
      if (!r) return '<rect id="'+id+'" class="ch-bar" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+color+'" data-ring="none"/>';
      return '<path id="'+id+'" class="ch-bar" d="M'+x.toFixed(1)+' '+(y + h).toFixed(1)+
        ' V'+(y + r).toFixed(1)+' Q'+x.toFixed(1)+' '+y.toFixed(1)+' '+(x + r).toFixed(1)+' '+y.toFixed(1)+
        ' H'+(x + barW - r).toFixed(1)+' Q'+(x + barW).toFixed(1)+' '+y.toFixed(1)+' '+(x + barW).toFixed(1)+' '+(y + r).toFixed(1)+
        ' V'+(y + h).toFixed(1)+' Z" fill="'+color+'" data-ring="none"/>';
    }
    if (b.hq) marks += seg('chHb'+i+'q', yBase - hqH, hqH, CHART.hq, !b.attr);
    if (b.attr){
      var gap = b.hq ? 2 : 0;
      marks += seg('chHb'+i+'a', yBase - hqH - gap - atH, atH, CHART.attr, true);
    }
    var lo = i * 2 + 1, hi = (i + 1) * 2;
    hits += '<rect class="ch-hit" x="'+(cx - slot / 2).toFixed(1)+'" y="'+T+'" width="'+slot.toFixed(1)+'" height="'+ph+
      '" fill="transparent"'+chTipAttrs('turns '+lo+'–'+hi, [
        ['battles', total], ['won by HQ capture', b.hq], ['won by attrition', b.attr]
      ], ids.join(','))+'/>';
  });
  s += marks + hits + '</svg>';
  return s;
}

/* =================== the charts view =================== */
function renderCharts(el){
  if (!DASH.results.length){
    el.innerHTML = '<p class="small" style="text-align:center; padding:34px 0;">Run a report first &mdash; the charts draw the current run&rsquo;s in-memory data.</p>';
    return;
  }
  var n = DASH.meta.n;
  var aiLabel = DASH.meta.dr === DASH.meta.db ? DASH.meta.dr + ' AI both sides' : 'red ' + DASH.meta.dr + ' vs blue ' + DASH.meta.db;
  var rows = DASH.results.map(function(r){
    var o = r.out, done = Math.max(1, n - o.unfinished);
    return {
      name: r.map.name, done: done,
      red: WOA_REPORT.pct(o.redWins, done), first: WOA_REPORT.pct(o.firstWins, done),
      hq: WOA_REPORT.pct(o.hqWins, done), score: WOA_REPORT.balanceScore(o, done)
    };
  });
  var G = WOA_REPORT.foldGlobal(DASH.results.map(function(r){ return { agg: r.out, done: n - r.out.unfinished }; }));
  var crows = WOA_REPORT.cardRows(G.cards, E.CARDS).filter(function(c){ return c.plays > 0; });
  var omitted = E.CARDS.length - crows.length;

  var best = rows[0];
  rows.forEach(function(r){ if (r.score < best.score) best = r; });
  var histMap = DASH.chartMap;
  if (!histMap || !rows.some(function(r){ return r.name === histMap; })) histMap = best.name;

  var h = '';

  // --- 1. map fairness scatter ---
  h += '<div class="chcard"><h3>Which maps are broken, and how?</h3>' +
    '<p class="small">n = '+n+' battles/map · '+rows.length+' map(s) · '+chEsc(aiLabel)+' · rules v'+E.VERSION+'. Fair maps sit on the cross; drift up/down = side bias, left/right = turn-order bias. Maps outside the 38–62 band are named.</p>' +
    '<div class="chkey"><span>fill = balance score:</span><span>'+
      CHART.seq.map(function(c){ return chSwatch(c); }).join('')+' good → poor</span>' +
    '<span>'+chSwatch('transparent')+'dot area = share of battles ending in HQ capture (big = rushable)</span></div>' +
    chartScatter(rows, DASH.meta) + '</div>';

  // --- 2. card quadrant ---
  h += '<div class="chcard"><h3>Which cards are on the overpowered watchlist?</h3>' +
    '<p class="small">n = '+G.games+' battles of AI play · '+crows.length+' cards'+(omitted ? ' ('+omitted+' never played, omitted)' : '')+'. Up-left = grabbed and played immediately; bubble area = times played.</p>' +
    '<div class="chkey"><span>fill = win % when played:</span>' +
    '<span>'+chSwatch(CHART.divBlue[2])+'under 50%</span>' +
    '<span>'+chSwatch(CHART.divMid)+'≈ 50%</span>' +
    '<span>'+chSwatch(CHART.divRed[2])+'over 50%</span></div>' +
    chartQuadrant(crows, DASH.meta) + '</div>';

  // --- 3. battle-length histogram (per map — the knob) ---
  var det = (DASH.detail || {})[histMap];
  h += '<div class="chcard"><div class="chhead"><h3>Does this map end games decisively or grind to deck-out?</h3>' +
    '<label class="small">Map <select id="chHistMap">' +
    rows.map(function(r){
      return '<option value="'+chEsc(r.name)+'"'+(r.name === histMap ? ' selected' : '')+'>'+chEsc(r.name)+(r.name === best.name ? ' (best balance)' : '')+'</option>';
    }).join('') + '</select></label></div>';
  if (det && det.turns.length){
    h += '<p class="small">n = '+det.turns.length+' battles on '+chEsc(histMap)+'. Bars near the deck-out line are games where nobody could land a kill.</p>' +
      '<div class="chkey"><span>'+chSwatch(CHART.hq)+'won by HQ capture</span><span>'+chSwatch(CHART.attr)+'won by attrition</span></div>' +
      chartHistogram(det, histMap);
  } else {
    h += '<p class="small" style="padding:22px 0; text-align:center;">Run a new report to collect per-battle detail &mdash; this run predates it.</p>';
  }
  h += '</div>';

  el.innerHTML = h;
  var sel = el.querySelector('#chHistMap');
  if (sel) sel.onchange = function(){ DASH.chartMap = sel.value; renderCharts(el); };
  chBindHits(el);
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

/* =================== the Overview screen (WOA-035, design 4a/1c/1f/1e) ===
   THE QUESTION: what regressed, run A -> run B? Reads BOTH runs' battle rows
   from GET /api/battles?run=<id> (fetched once per A/B pair and cached —
   BATTLE_CACHE, shared with the WOA-040 Maps drill-down below so switching
   pills never refetches), folds them through WOA_REPORT.foldBattles
   (report-model.js — the ONE DB-rows -> agg fold), then draws: a verdict
   banner, the triage band board (1c), the per-map balance-score dumbbells
   (1f), and two fleet-wide pacing minis (1e). Plain divs by string concat,
   matching the design canvas's OWN technique for 1c/1f/4a (not SVG) — inline
   SVG only where the reference (1e's settle curve) itself uses it. Tooltips
   reuse the .chtip/ch-hit idiom (chBindHits) already established by
   chartScatter etc. above. */

// metrics whose val() returns a 0-100 percentage (drag/swings are raw counts).
// WOA-039: attackShare/swapShare are % of all actions taken.
var OV_PERCENT_KEYS = { red: 1, first: 1, hq: 1, zeroKill: 1, tie: 1, control: 1, firstBlood: 1, attackShare: 1, swapShare: 1 };
// WOA-035/WOA-040: every A/B-comparing pane reads the SAME two runs' battle
// rows (every map, unfiltered — GET /api/battles?run=<id> has no map param),
// so ONE cache/fetch serves the Overview AND the Maps drill-down; keyed
// "runA|runB", see dashLoadBattleRows below.
var BATTLE_CACHE = { key: null, rowsA: null, rowsB: null };

function ovFmt(key, v) {
  if (v == null) return 'n/a';
  return OV_PERCENT_KEYS[key] ? Math.round(v) + '%' : WOA_REPORT.f1(v);
}

/* Fixed display domain for a band row's track — sized off the WIDEST (T2)
   band plus 25% padding, extended further if a real A/B value falls outside
   it, so the dots are never clipped. Domain stays the SAME across a
   temperature-selector re-render (only which tiers get DRAWN changes, see
   ovBandRowHtml) so a dot's x position never jumps when you retemper. */
function ovTrackDomain(row, valA, valB) {
  var b2 = WOA_REPORT.bands(row.key, 'T2');
  var vals = [];
  if (valA != null) vals.push(valA);
  if (valB != null) vals.push(valB);
  var lo = b2.lo, hi = b2.hi;
  if (lo == null) lo = vals.length ? Math.min.apply(null, vals) : (hi != null ? hi - 1 : 0);
  if (hi == null) hi = vals.length ? Math.max.apply(null, vals) : lo + 1;
  vals.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
  if (hi <= lo) hi = lo + 1;
  var pad = (hi - lo) * 0.25;
  var dLo = lo - pad, dHi = hi + pad;
  if (OV_PERCENT_KEYS[row.key]) { dLo = Math.max(0, dLo); dHi = Math.min(100, dHi); if (dHi <= dLo) dHi = dLo + 1; }
  else dLo = Math.max(0, dLo);
  return { lo: dLo, hi: dHi };
}
function ovPos(domain, v) {
  if (v == null) return null;
  return Math.max(0, Math.min(100, (v - domain.lo) / (domain.hi - domain.lo) * 100));
}
function ovBandRect(domain, band, color) {
  if (!band) return '';
  var left = band.lo == null ? 0 : ovPos(domain, band.lo);
  var right = band.hi == null ? 100 : ovPos(domain, band.hi);
  if (right < left) { var t = left; left = right; right = t; }
  return '<div style="position:absolute;top:5px;bottom:5px;left:' + left.toFixed(1) + '%;width:' +
    (right - left).toFixed(1) + '%;background:' + color + ';border-radius:2px;"></div>';
}
function ovDot(domain, v, isA, breached) {
  if (v == null) return '';
  var pos = ovPos(domain, v);
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
   band, small-n excepted (SPEC §8, fleet-wide n<240 -> greyed, "(n=N)"). */
// scope ('fleet' default | 'map', WOA-040): which SMALL_N threshold n is
// compared against — the Overview's fleet-wide board never passes it (240),
// the per-map board (WOA-040) passes 'map' (40, SPEC §8).
function ovBandRowHtml(row, aggA, aggB, temperature, scope) {
  var valA = row.val(aggA.agg, aggA.done);
  var valB = row.val(aggB.agg, aggB.done);
  var domain = ovTrackDomain(row, valA, valB);
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
  var tip = [['run A', ovFmt(row.key, valA)], ['run B', ovFmt(row.key, valB)],
    ['band at ' + temperature, (selBand.lo == null ? 'open' : selBand.lo) + '–' + (selBand.hi == null ? 'open' : selBand.hi)],
    ['n (min of A/B)', n]];
  var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:help;"' + chTipAttrs(row.label, tip) + '></div>';
  var trackStyle = 'position:relative;height:22px;' + (small ? 'opacity:.5;' : '') +
    (breached ? 'outline:1.5px solid ' + CHART.breach + ';outline-offset:2px;border-radius:3px;' : '');
  var valText = ovFmt(row.key, valA) + ' → ' + ovFmt(row.key, valB) + (small ? ' (n=' + n + ')' : '') + (breached ? ' ✗' : '');
  var op = small ? 'opacity:.5;' : '';
  var rk = ' data-rowkey="' + row.key + '"';
  var label = chEsc(row.label);
  return '<div' + rk + ' class="ov-lbl" style="' + op + '">' + (breached ? '<b>' + label + ' ↗</b>' : label) + '</div>' +
    '<div' + rk + ' style="' + trackStyle + '">' + inner + hit + '</div>' +
    '<div' + rk + ' class="ov-val' + (breached ? ' breach' : '') + '" style="' + op + '">' + valText + '</div>';
}

/* Verdict banner: named links for every SCORED band row breached at the
   selected temperature (small-n rows excluded, SPEC §8). Cheapest honest
   click target (P1; P2.2's map drill-down will give this a real home):
   scroll the matching band-board row into view and flash it. */
function ovVerdictBanner(scoredRows, aggA, aggB, temperature) {
  var breaches = [];
  scoredRows.forEach(function (row) {
    var valB = row.val(aggB.agg, aggB.done);
    if (valB == null) return;
    var n = Math.min(WOA_REPORT.bandN(row, aggA.agg, aggA.done), WOA_REPORT.bandN(row, aggB.agg, aggB.done));
    if (WOA_REPORT.smallN(n, 'fleet')) return;
    var sel = WOA_REPORT.bands(row.key, temperature);
    if ((sel.lo != null && valB < sel.lo) || (sel.hi != null && valB > sel.hi))
      breaches.push({ key: row.key, label: row.label, val: ovFmt(row.key, valB) });
  });
  var h = '<div class="ov-verdict">';
  if (!breaches.length) {
    h += '<b>Verdict: no breaches at ' + temperature + '.</b> Run B holds every scored band at this temperature.';
  } else {
    h += '<b>Verdict: ' + breaches.length + ' breach' + (breaches.length === 1 ? '' : 'es') + ' at ' + temperature + '.</b> ' +
      breaches.map(function (b) { return '<a class="ov-breach-link" data-key="' + b.key + '">' + chEsc(b.label) + ' ' + b.val + ' ↗</a>'; }).join(' &middot; ') +
      ' <span class="small" style="font-style:italic;">breaches link to the band-board row below</span>';
  }
  return h + '</div>';
}

/* Balance-score-by-map dumbbells (design 1f): one row per map seen in
   EITHER run's battle rows, balanceScore(agg,done) folded per map via the
   SAME WOA_REPORT.foldBattles/balanceScore this file's Overview totals use.
   0-20 display scale (clamped; the real score always prints regardless).
   Sorted worst-first on B (the eye lands on the regression). Row click sets
   DASH.mapFocus + switches to the Maps pill (its P2.2 stub echoes it). */
function ovMapDumbbells(rowsA, rowsB) {
  var byMapA = {}, byMapB = {};
  rowsA.forEach(function (r) { (byMapA[r.map] || (byMapA[r.map] = [])).push(r); });
  rowsB.forEach(function (r) { (byMapB[r.map] || (byMapB[r.map] = [])).push(r); });
  var names = {};
  Object.keys(byMapA).forEach(function (m) { names[m] = 1; });
  Object.keys(byMapB).forEach(function (m) { names[m] = 1; });
  var rows = Object.keys(names).map(function (m) {
    var gA = byMapA[m] ? WOA_REPORT.foldBattles(byMapA[m]) : null;
    var gB = byMapB[m] ? WOA_REPORT.foldBattles(byMapB[m]) : null;
    return {
      map: m, doneA: gA ? gA.done : 0, doneB: gB ? gB.done : 0,
      scoreA: gA ? WOA_REPORT.balanceScore(gA.agg, gA.done) : null,
      scoreB: gB ? WOA_REPORT.balanceScore(gB.agg, gB.done) : null
    };
  });
  rows.sort(function (a, b) {
    var av = a.scoreB != null ? a.scoreB : (a.scoreA != null ? a.scoreA : -1);
    var bv = b.scoreB != null ? b.scoreB : (b.scoreA != null ? b.scoreA : -1);
    return bv - av;
  });

  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:8px;">Balance score by map, A&rarr;B ' +
    '<span class="small" style="font-style:italic;">(0&ndash;20 scale, sorted worst-first on B)</span></div>';
  if (!rows.length) return h + '<p class="small">No per-map battle rows for either run yet.</p>';
  h += '<div class="ov-grid" style="grid-template-columns:92px 1fr 92px;">';
  rows.forEach(function (r) {
    var posA = r.scoreA == null ? null : Math.max(0, Math.min(100, r.scoreA / 20 * 100));
    var posB = r.scoreB == null ? null : Math.max(0, Math.min(100, r.scoreB / 20 * 100));
    var regressed = posA != null && posB != null && r.scoreB > r.scoreA;
    var improved = posA != null && posB != null && r.scoreB < r.scoreA;
    var connColor = regressed ? CHART.regress : (improved ? CHART.improve : '#d8caa2');
    var bFill = regressed ? CHART.breach : (improved ? CHART.improveDot : CHART.ink);
    var connLeft = 0, connWidth = 0;
    if (posA != null && posB != null) { connLeft = Math.min(posA, posB); connWidth = Math.abs(posB - posA); }
    var inner = '<div style="position:absolute;top:8px;left:0;right:0;height:2px;background:#d8caa2;"></div>' +
      (posA != null && posB != null ? '<div style="position:absolute;top:8px;height:2px;left:' + connLeft.toFixed(1) +
        '%;width:' + connWidth.toFixed(1) + '%;background:' + connColor + ';"></div>' : '') +
      (posA != null ? '<div style="position:absolute;top:3px;width:12px;height:12px;border-radius:50%;border:2px solid ' +
        CHART.inkSoft + ';background:' + CHART.runADot + ';left:calc(' + posA.toFixed(1) + '% - 6px);"></div>' : '') +
      (posB != null ? '<div style="position:absolute;top:4px;width:11px;height:11px;border-radius:50%;background:' +
        bFill + ';left:calc(' + posB.toFixed(1) + '% - 5px);"></div>' : '');
    var valText = (r.scoreA == null ? '—' : WOA_REPORT.f1(r.scoreA)) + ' → ' + (r.scoreB == null ? '—' : WOA_REPORT.f1(r.scoreB));
    var tip = [['run A score', r.scoreA == null ? 'n/a' : WOA_REPORT.f1(r.scoreA) + ' (n=' + r.doneA + ')'],
      ['run B score', r.scoreB == null ? 'n/a' : WOA_REPORT.f1(r.scoreB) + ' (n=' + r.doneB + ')']];
    var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:pointer;"' + chTipAttrs(r.map, tip) + '></div>';
    var dm = ' data-map="' + chEsc(r.map) + '"';
    h += '<div' + dm + ' class="ov-lbl ov-map-row">' + chEsc(r.map) + '</div>' +
      '<div' + dm + ' class="ov-map-row" style="position:relative;height:18px;">' + inner + hit + '</div>' +
      '<div' + dm + ' class="ov-val ov-map-row" style="' + (regressed ? 'color:' + CHART.breach + ';' : '') + '">' + valText + '</div>';
  });
  h += '</div><p class="small" style="margin-top:8px;">Click a row to jump to that map on the Maps pill.</p>';
  return h;
}

/* Pacing minis (design 1e, simplified per the mockup 4a fidelity note):
   deploy interleave and settle point, both WOA_REPORT folds mapped over
   every battle's trace envelope (WOA_REPORT.envelopeFromRow), run A vs B. */
function ovPacingMinis(rowsA, rowsB) {
  var envA = rowsA.map(WOA_REPORT.envelopeFromRow).filter(function (e) { return !!e; });
  var envB = rowsB.map(WOA_REPORT.envelopeFromRow).filter(function (e) { return !!e; });
  var interA = envA.map(WOA_REPORT.deployInterleave), interB = envB.map(WOA_REPORT.deployInterleave);
  var settleA = envA.map(WOA_REPORT.settlePoint).sort(function (a, b) { return a - b; });
  var settleB = envB.map(WOA_REPORT.settlePoint).sort(function (a, b) { return a - b; });
  function avg(arr) { return arr.length ? arr.reduce(function (s, v) { return s + v; }, 0) / arr.length : 0; }

  // ---- deploy interleave: 6-bin histogram over [0,1], A hollow / B solid ----
  var NBINS = 6, hA = [], hB = [];
  for (var i = 0; i < NBINS; i++) { hA.push(0); hB.push(0); }
  interA.forEach(function (v) { hA[Math.min(NBINS - 1, Math.max(0, Math.floor(v * NBINS)))]++; });
  interB.forEach(function (v) { hB[Math.min(NBINS - 1, Math.max(0, Math.floor(v * NBINS)))]++; });
  var maxShare = 0.0001;
  for (i = 0; i < NBINS; i++) {
    var sa = interA.length ? hA[i] / interA.length : 0, sb = interB.length ? hB[i] / interB.length : 0;
    if (sa > maxShare) maxShare = sa; if (sb > maxShare) maxShare = sb;
  }
  var bars = '<div style="display:flex;gap:6px;align-items:flex-end;height:52px;border-bottom:1.5px solid #b9a878;padding:0 2px;">';
  for (i = 0; i < NBINS; i++) {
    var sa2 = interA.length ? hA[i] / interA.length : 0, sb2 = interB.length ? hB[i] / interB.length : 0;
    var haH = Math.max(1, Math.round(sa2 / maxShare * 46)), hbH = Math.max(1, Math.round(sb2 / maxShare * 46));
    bars += '<div style="flex:1;display:flex;gap:2px;align-items:flex-end;height:100%;">' +
      '<div style="flex:1;height:' + (interA.length ? haH : 0) + 'px;border:1.5px solid ' + CHART.inkSoft + ';box-sizing:border-box;"></div>' +
      '<div style="flex:1;height:' + (interB.length ? hbH : 0) + 'px;background:#77582e;"></div></div>';
  }
  bars += '</div><div style="display:flex;justify-content:space-between;font-size:10px;color:#75643f;margin-top:3px;font-style:italic;"><span>all up-front</span><span>all after contact</span></div>';
  var interMini = '<div class="ov-mini"><h4>deploy interleave <b>' + Math.round(avg(interA) * 100) + '%→' + Math.round(avg(interB) * 100) +
    '%</b></h4>' + bars + '<p class="small" style="margin:6px 0 0;">share of each battle&rsquo;s deploys landing before vs after first contact &mdash; A ' +
    interA.length + ' battles (hollow), B ' + interB.length + ' (solid)</p></div>';

  // ---- settle curve: CDF of settlePoint, A dashed / B solid (WOA-040: the
  // svg-building moved to the shared chSettleSvg — same numbers, one impl) ----
  var W = 200, H = 64;
  var svg = chSettleSvg(settleA, settleB, W, H);
  var settleMini = '<div class="ov-mini"><h4>median settle <b>' + Math.round(WOA_REPORT.quantile(settleA, 0.5)) + '%→' +
    Math.round(WOA_REPORT.quantile(settleB, 0.5)) + '%</b></h4>' + svg +
    '<p class="small" style="margin:6px 0 0;">% of battles whose field-score lead has stopped flipping, by % of battle length &mdash; A dashed, B solid</p></div>';

  return '<div style="font-size:13px;font-weight:bold;margin:16px 0 8px;">Pacing, fleet-wide <span class="small" style="font-style:italic;">(1e minis)</span></div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;">' + interMini + settleMini + '</div>';
}

/* Assembles the full Overview pane from two runs' already-fetched battle
   rows (rowsA/rowsB — GET /api/battles?run=<id> arrays) and wires clicks. */
function ovRenderBody(el, rowsA, rowsB) {
  var aggA = WOA_REPORT.foldBattles(rowsA), aggB = WOA_REPORT.foldBattles(rowsB);
  var scoredRows = WOA_REPORT.BANDS.filter(function (b) { return b.feedsScore; });
  var guardRows = WOA_REPORT.BANDS.filter(function (b) { return !b.feedsScore; });
  var temp = DASH.temperature;

  var h = '<div class="ov-wrap">' + ovVerdictBanner(scoredRows, aggA, aggB, temp) + '<div class="ov-cols">';
  h += '<div class="ov-col-l">' +
    '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">Scored metrics vs band ' +
    '<span class="small" style="font-style:italic;">(all maps folded &mdash; A n=' + aggA.done + ', B n=' + aggB.done + ')</span></div>' +
    '<p class="small" style="margin:2px 0 10px;">Shaded band = the active tier (' + temp + '); the temperature selector above widens or narrows it.</p>' +
    '<div class="ov-legend">' +
      '<span><span class="dot" style="width:10px;height:10px;border:2px solid ' + CHART.ink + ';background:' + CHART.runADot + ';box-sizing:border-box;"></span>run A</span>' +
      '<span><span class="dot" style="background:' + CHART.ink + ';"></span>run B in-band</span>' +
      '<span><span class="dot" style="background:' + CHART.breach + ';"></span>run B outside ' + temp + '</span>' +
    '</div>' +
    '<div class="ov-grid">' + scoredRows.map(function (row) { return ovBandRowHtml(row, aggA, aggB, temp); }).join('') + '</div>' +
    '<div style="font-size:11px;font-weight:bold;margin:14px 0 6px;color:#75643f;">Guards <span class="small" style="font-style:italic;">(shaded, not scored)</span></div>' +
    '<div class="ov-grid">' + guardRows.map(function (row) { return ovBandRowHtml(row, aggA, aggB, temp); }).join('') + '</div>' +
  '</div>';
  h += '<div class="ov-col-r">' + ovMapDumbbells(rowsA, rowsB) + ovPacingMinis(rowsA, rowsB) + '</div>';
  h += '</div></div>';
  el.innerHTML = h;

  el.querySelectorAll('.ov-breach-link').forEach(function (a) {
    a.onclick = function () {
      var rows = el.querySelectorAll('[data-rowkey="' + a.getAttribute('data-key') + '"]');
      if (!rows.length) return;
      rows[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      rows.forEach(function (r) { r.classList.add('ov-flash'); });
      setTimeout(function () { rows.forEach(function (r) { r.classList.remove('ov-flash'); }); }, 1200);
    };
  });
  el.querySelectorAll('.ov-map-row').forEach(function (row) {
    row.addEventListener('click', function () {
      DASH.mapFocus = row.getAttribute('data-map');
      DASH.view = 'maps';
      renderDash();
    });
  });
  chBindHits(el);
}

/* Shared A/B battle-row fetch (WOA-035 Overview + WOA-040 Maps drill-down —
   both compare the SAME two runs' full battle sets, so one cache/fetch
   serves either pane; switching pills, retempering, or flipping the A|B|A/B
   toggle never refetches). Cache hit -> onReady(rowsA, rowsB) called
   synchronously and dashLoadBattleRows returns true (caller skips its own
   loading-state paint). Cache miss -> fetches both runs, returns false (the
   caller paints its own "Loading..." — panes want different wording), then
   calls onReady once both resolve; a race where DASH.runA/runB changed
   mid-flight is guarded by re-checking the key. onReady(null, null) on a
   fetch failure — no server, or a network hiccup. */
function dashLoadBattleRows(onReady) {
  var key = DASH.runA + '|' + DASH.runB;
  if (BATTLE_CACHE.key === key) { onReady(BATTLE_CACHE.rowsA, BATTLE_CACHE.rowsB); return true; }
  Promise.all([
    fetch('/api/battles?run=' + DASH.runA).then(function (r) { return r.ok ? r.json() : []; }),
    fetch('/api/battles?run=' + DASH.runB).then(function (r) { return r.ok ? r.json() : []; })
  ]).then(function (res) {
    BATTLE_CACHE = { key: key, rowsA: res[0] || [], rowsB: res[1] || [] };
    if (DASH.runA + '|' + DASH.runB === key) onReady(BATTLE_CACHE.rowsA, BATTLE_CACHE.rowsB);
  }).catch(function () { onReady(null, null); });
  return false;
}

/* Overview entry point (dashboard.js's renderDashPane calls this for the
   'overview' view once the shell's own file:///no-runs/no-A-B guards pass). */
function renderOverview(el) {
  var loaded = dashLoadBattleRows(function (rowsA, rowsB) {
    if (rowsA == null) { el.innerHTML = '<p class="small">Could not load battle rows for the selected runs &mdash; is <code>node game/server.js</code> running?</p>'; return; }
    ovRenderBody(el, rowsA, rowsB);
  });
  if (!loaded) el.innerHTML = '<p class="small">Loading battle rows for run A &amp; B&hellip;</p>';
}

/* =================== the Map drill-down screen (WOA-040, design 4b) ===
   THE QUESTION: on THIS map, what changed run A -> run B, and when in the
   battle did it happen? Breadcrumb map switcher under the Maps pill; an
   A|B|A/B segmented toggle (default B — A/B renders B solid with run A as a
   ghost overlay) drives the tempo lanes (design 3a) and the |VP-diff| track
   above them; the band board (1c, reusing ovBandRowHtml with the 'map'
   small-n scope, SPEC §8) and the settle curve (1e, chSettleSvg) always show
   BOTH runs regardless of the toggle — same as the Overview's board/minis,
   which never toggle either. Reads the SAME battle rows the Overview does
   (dashLoadBattleRows/BATTLE_CACHE above), filtered to one map client-side —
   GET /api/battles has no map param, so filtering here is the one place it
   happens (no new endpoint, no re-derived fold: WOA_REPORT folds per-battle
   envelopes, this file only combines many battles' folds into one chart). */

/* Per-battle envelopes for ONE map's rows of one run — the shared input every
   lane/track/settle-curve computation below folds over. */
function mdEnvelopes(rows, mapName) {
  return rows.filter(function (r) { return r.map === mapName; })
    .map(WOA_REPORT.envelopeFromRow).filter(function (e) { return !!e; });
}

/* Tempo-lane average (design 3a): actionOctileLanes(env) already returns one
   {deploy,attack,swap,march} row per octile in [0,1] for a SINGLE battle
   (report-model.js, WOA-033) — this only averages that per-octile value
   ACROSS battles, per lane. null when there are no envelopes (nothing to
   average) so callers can render "no battles" instead of a flat zero lane. */
var MD_LANES = ['deploy', 'attack', 'swap', 'march'];
function mdLaneAvg(envs) {
  if (!envs.length) return null;
  var sums = {};
  MD_LANES.forEach(function (a) { sums[a] = [0, 0, 0, 0, 0, 0, 0, 0]; });
  envs.forEach(function (env) {
    WOA_REPORT.actionOctileLanes(env).forEach(function (row, oi) {
      MD_LANES.forEach(function (a) { sums[a][oi] += row[a]; });
    });
  });
  var out = {};
  MD_LANES.forEach(function (a) { out[a] = sums[a].map(function (v) { return v / envs.length; }); });
  return out;
}

/* |VP-diff| track (SPEC §1 VPdiff / design 3a): vpDiffTrack(env) is a
   per-TURN array (length = that battle's turn count, so battles of different
   length can't be averaged index-for-index). Resamples each battle's track
   onto STEPS+1 evenly-spaced points over normalized battle time (linear
   interpolation between the two nearest turns, the same "normalize to battle
   length %" idiom settlePoint/deployInterleave already use), then averages
   those points across battles. Envelopes with no fs (vpDiffTrack -> null,
   WOA-037: a run that predates the fs capture) are skipped, not zeroed — n
   vs total tells the caller how many of this map's battles actually carry
   fs so it can grey/note honestly instead of drawing a fabricated flat line.
   null only when NOT ONE envelope has fs (the "predates the fs capture" path
   the ticket calls out); a partial n < total still draws, with a note. */
function mdVpDiffAvg(envs, steps) {
  steps = steps || 8;
  var tracks = envs.map(function (env) { var vd = WOA_REPORT.vpDiffTrack(env); return vd && vd.track; }).filter(function (t) { return !!t && t.length; });
  if (!tracks.length) return null;
  var points = [];
  for (var s = 0; s <= steps; s++) {
    var frac = s / steps, sum = 0;
    tracks.forEach(function (tr) {
      var pos = frac * (tr.length - 1), lo = Math.floor(pos), hi = Math.min(tr.length - 1, lo + 1), f = pos - lo;
      sum += tr[lo] + (tr[hi] - tr[lo]) * f;
    });
    points.push(sum / tracks.length);
  }
  return { points: points, n: tracks.length, total: envs.length };
}

/* One tempo lane row: 8 octile columns, each BAR_H tall max, scaled to
   laneMax — its OWN lane's peak across the octiles being drawn (NEVER a
   share of the octile's action total; that 100%-stacked reading was
   explicitly rejected, design turn 3 vs 2b/1d). ghostVals present (A/B mode)
   draws run A as a hollow dashed-outline bar UNDER run B's solid fill, both
   read off the SAME laneMax so the overlay is a real height comparison. */
function mdLaneBars(vals, ghostVals, laneMax, color, barH) {
  var cols = '';
  for (var i = 0; i < 8; i++) {
    var sh = laneMax > 0 ? Math.max(vals[i] > 0 ? 1 : 0, Math.round(vals[i] / laneMax * barH)) : 0;
    cols += '<div style="flex:1;position:relative;height:' + barH + 'px;">' +
      '<div style="position:absolute;left:0;right:0;bottom:0;height:' + sh + 'px;background:' + color + ';"></div>';
    if (ghostVals) {
      var gh = laneMax > 0 ? Math.round(ghostVals[i] / laneMax * barH) : 0;
      cols += '<div style="position:absolute;left:0;right:0;bottom:0;height:' + gh + 'px;border:1.5px dashed ' + CHART.ink + ';box-sizing:border-box;"></div>';
    }
    cols += '</div>';
  }
  return cols;
}

/* The |VP-diff| sparkline that sits above the lanes (design 3a). Greys
   honestly with a note instead of drawing anything when vd is null (every
   battle for this map/run predates the fs capture, WOA-037) — never a
   fabricated flat line. solidLabel names which run is drawing solid (A or
   B) for the "predates" note. */
function mdVpDiffTrackHtml(vd, ghostVd, solidLabel) {
  var LABEL_W = 56, W = 400, H = 30;
  if (!vd) {
    return '<div style="display:flex;gap:8px;opacity:.55;"><div style="flex:none;width:' + LABEL_W + 'px;"></div>' +
      '<p class="small" style="margin:0;flex:1;">|VP-diff| track unavailable for run ' + solidLabel +
      ' on this map &mdash; this run predates the fs capture (WOA-037).</p></div>';
  }
  var maxV = Math.max.apply(null, vd.points.concat(ghostVd ? ghostVd.points : []).concat([0.0001]));
  function poly(pts) {
    return pts.map(function (v, i) { return (i / (pts.length - 1) * W).toFixed(1) + ',' + (H - Math.max(0, v) / maxV * H).toFixed(1); }).join(' ');
  }
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="display:block;width:100%;height:' + H + 'px;">' + chLine(0, H, W, H, CHART.axis, 1);
  if (ghostVd) svg += '<polyline points="' + poly(ghostVd.points) + '" fill="none" stroke="' + CHART.ink + '" stroke-width="1.5" stroke-dasharray="4 2"/>';
  svg += '<polyline points="' + poly(vd.points) + '" fill="none" stroke="' + CHART.ink + '" stroke-width="2"/></svg>';
  var note = vd.n < vd.total ? ' (n=' + vd.n + '/' + vd.total + ' battles carry fs data)' : '';
  return '<div style="display:flex;gap:8px;align-items:flex-end;">' +
    '<div style="flex:none;width:' + LABEL_W + 'px;text-align:right;font-size:9.5px;font-style:italic;color:' + CHART.muted + ';padding-bottom:2px;">avg<br>|VP diff|' + note + '</div>' +
    '<div style="flex:1;">' + svg + '</div></div>';
}

/* Tempo lanes + |VP-diff| track, together (design 3a — the track sits above
   the lanes it shares an x-axis with). abMode: 'A' shows run A solid; 'B'
   (default) shows run B solid; 'AB' shows run B solid with run A as a ghost
   overlay (both toggle branches read the SAME abMode the ticket specifies —
   there is no separate "which run is primary" state). */
function mdTempoSection(mapName, envA, envB, abMode) {
  var solidEnv = abMode === 'A' ? envA : envB, solidLabel = abMode === 'A' ? 'A' : 'B';
  var ghostEnv = abMode === 'AB' ? envA : null;
  var laneSolid = mdLaneAvg(solidEnv), laneGhost = ghostEnv ? mdLaneAvg(ghostEnv) : null;
  var vdSolid = mdVpDiffAvg(solidEnv), vdGhost = ghostEnv ? mdVpDiffAvg(ghostEnv) : null;

  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">Tempo lanes ' +
    '<span class="small" style="font-style:italic;">(design 3a &mdash; each lane its OWN scale, never a 100%-stacked share)</span></div>';
  if (!laneSolid) {
    return h + '<p class="small">No battles on ' + chEsc(mapName) + ' for run ' + solidLabel + ' yet.</p>';
  }
  var BAR_H = 46, LABEL_W = 56;
  h += mdVpDiffTrackHtml(vdSolid, vdGhost, solidLabel);
  h += '<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">';
  MD_LANES.forEach(function (a) {
    var vals = laneSolid[a], gvals = laneGhost ? laneGhost[a] : null;
    var laneMax = Math.max.apply(null, vals.concat(gvals || []).concat([0.0001]));
    h += '<div style="display:flex;gap:8px;align-items:flex-end;" data-lane="' + a + '" data-lanemax="' + laneMax.toFixed(2) + '">' +
      '<div style="flex:none;width:' + LABEL_W + 'px;text-align:right;font-size:10.5px;color:' + CHART.inkSoft + ';padding-bottom:2px;">' +
      '<b style="color:' + CHART.ink + ';">' + a + '</b><br><span style="font-size:9.5px;font-style:italic;">max ' + laneMax.toFixed(2) + '/turn</span></div>' +
      '<div style="flex:1;display:flex;gap:2px;align-items:flex-end;height:' + BAR_H + 'px;border-bottom:1.5px solid ' + CHART.axis + ';">' +
      mdLaneBars(vals, gvals, laneMax, CHART.lane[a], BAR_H) + '</div></div>';
  });
  h += '</div><div style="display:flex;justify-content:space-between;font-size:10px;color:' + CHART.muted + ';margin-top:3px;font-style:italic;">' +
    '<span style="margin-left:' + LABEL_W + 'px;">turn 1</span><span>battle end</span></div>';
  var ghostNote = ghostEnv ? ' &middot; B solid, A ghost outline' : '';
  h += '<p class="small" style="margin-top:6px;">n = ' + solidEnv.length + ' battle(s) on run ' + solidLabel + ghostNote + '.</p>';
  return h;
}

/* This-map band board (design 1c filtered to one map): the EXACT Overview
   row renderer (ovBandRowHtml), just fed this map's own {agg,done} and the
   'map' small-n scope (SPEC §8: n<40/map greys, not the fleet's n<240) —
   always both runs, no A|B|A/B toggle (matches the Overview board, which
   never toggles either). */
function mdBandBoard(aggA, aggB, temperature) {
  var scoredRows = WOA_REPORT.BANDS.filter(function (b) { return b.feedsScore; });
  var guardRows = WOA_REPORT.BANDS.filter(function (b) { return !b.feedsScore; });
  var h = '<div style="font-size:13px;font-weight:bold;margin:16px 0 2px;">This map vs its bands ' +
    '<span class="small" style="font-style:italic;">(1c filtered &mdash; A n=' + aggA.done + ', B n=' + aggB.done + ')</span></div>';
  h += '<div class="ov-grid">' + scoredRows.map(function (row) { return ovBandRowHtml(row, aggA, aggB, temperature, 'map'); }).join('') + '</div>';
  h += '<div style="font-size:11px;font-weight:bold;margin:14px 0 6px;color:' + CHART.muted + ';">Guards <span class="small" style="font-style:italic;">(shaded, not scored)</span></div>';
  h += '<div class="ov-grid">' + guardRows.map(function (row) { return ovBandRowHtml(row, aggA, aggB, temperature, 'map'); }).join('') + '</div>';
  return h;
}

/* Settle curve, this map (design 1e filtered — chSettleSvg, the SAME svg
   builder the Overview's fleet-wide mini uses). Always both runs, A dashed /
   B solid — no A|B|A/B toggle, same as the Overview mini. */
function mdSettleCurve(envA, envB) {
  var settleA = envA.map(WOA_REPORT.settlePoint).sort(function (a, b) { return a - b; });
  var settleB = envB.map(WOA_REPORT.settlePoint).sort(function (a, b) { return a - b; });
  var med = (settleA.length ? Math.round(WOA_REPORT.quantile(settleA, 0.5)) + '%' : '—') + '&rarr;' +
    (settleB.length ? Math.round(WOA_REPORT.quantile(settleB, 0.5)) + '%' : '—');
  return '<div class="ov-mini" style="max-width:320px;"><h4>settle curve, this map <b>' + med + '</b></h4>' +
    chSettleSvg(settleA, settleB, 240, 72) +
    '<p class="small" style="margin:6px 0 0;">% of battle length after which the lead never flips again &mdash; A dashed n=' +
    envA.length + ', B solid n=' + envB.length + '</p></div>';
}

/* Breadcrumb map switcher (design 4b: "‹ Frontier · The Narrows · The Void
   ›") + the A|B|A/B toggle + this map's balance score A->B. mapList is every
   map seen in EITHER run's rows (union, alpha order — a stable, deterministic
   ordering; the mockup's order is cosmetic, not semantic). The ‹/› arrows
   step to the previous/next map (wrapping) — a second way to reach the same
   DASH.mapFocus assignment the crumbs themselves do. */
function mdHeaderHtml(mapList, idx, scoreA, scoreB, regressed) {
  var crumbs = mapList.map(function (m) {
    return '<span class="mapd-crumb' + (m === mapList[idx] ? ' cur' : '') + '" data-map="' + chEsc(m) + '">' + chEsc(m) + '</span>';
  }).join('<span> &middot; </span>');
  var ab = ['A', 'B', 'AB'].map(function (v) {
    return '<span data-ab="' + v + '"' + (DASH.abMode === v ? ' class="sel"' : '') + '>' + (v === 'AB' ? 'A/B' : v) + '</span>';
  }).join('');
  var scoreTxt = (scoreA == null ? '—' : WOA_REPORT.f1(scoreA)) + ' &rarr; ' + (scoreB == null ? '—' : WOA_REPORT.f1(scoreB)) + (regressed ? ' &#10007;' : '');
  return '<div class="mapd-head">' +
    '<span class="mapd-crumbs" style="flex:1 1 auto;"><span class="mapd-arrow" data-step="-1">&lsaquo;</span> ' +
    crumbs + ' <span class="mapd-arrow" data-step="1">&rsaquo;</span></span>' +
    '<span class="ab-toggle">' + ab + '</span>' +
    '<span class="mapd-score' + (regressed ? ' breach' : '') + '">balance ' + scoreTxt + '</span>' +
  '</div>';
}

/* =================== hex lenses (WOA-042, SPEC §5) ===================
   THREE spatial reads on THIS map's board — occupancy, ownership flips, kills
   — the drill-down's only SPATIAL view (tempo/VP/bands are all temporal or
   aggregate). Rendered as SVG hex boards reusing board.js's GLOBAL
   hexXY/hexPoints/viewBoxFor (the game's OWN board renderer).

   DISCRETIONARY (ticket): SVG polygons, NOT the AC's clip-path divs. Why: the
   avenue-of-attack marker is then a real nested <polygon> stroke and the
   dead-hex hatch an SVG <pattern> — which structurally kills the failure the
   AC warns about (a css `outline` on a clip-path element renders broken), and
   it matches how the live game already draws its board (board.js), so the two
   hex renderers stay one visual language. The fold (report-model.js
   foldHexLenses) is pure over the trace; THIS layer owns the map/board join
   (HQ hexes, outline, labels) the fold deliberately doesn't know. */
var MD_HEX_LENSES = [
  { key: 'occ',   title: 'occupancy',      sub: '% of turns held', fmt: function (v) { return Math.round(v * 100) + '%'; } },
  { key: 'flips', title: 'ownership flips', sub: 'flips / battle',  fmt: function (v) { return WOA_REPORT.f1(v); } },
  { key: 'kills', title: 'kills',           sub: 'kills / battle',  fmt: function (v) { return WOA_REPORT.f1(v); } }
];
var MDHEX_R = 40; // hex draw radius; board.js hexXY spacing is S=44 -> ~4px gutters

/* map NAME (the DB/trace `map` field IS st.mapName = map.name) -> its map def
   on disk, or null if it's been deleted since the run. Searched over the whole
   roster (E.MAPS), not just the active pool — a run may predate a pool edit. */
function mdMapDef(mapName) {
  var maps = E.MAPS || [];
  for (var i = 0; i < maps.length; i++) if (maps[i].name === mapName) return maps[i];
  return null;
}
/* the map's shape object WITHOUT mutating the live engine board: buildShape is
   pure (a shapeDef map builds a throwaway '@id' shape; a built-in reads
   E.SHAPES), so opening the dashboard never switches CURRENT_SHAPE out from
   under a paused live game. null on a malformed outline (caller notes it). */
function mdShapeOf(map) {
  try {
    if (map.shapeDef) return E.buildShape('@' + (map.id || map.name || 'custom'), map.shapeDef);
    return E.SHAPES[map.shape] || E.SHAPES[E.DEFAULT_SHAPE];
  } catch (e) { return null; }
}
/* grid label ('C4') for a hex on an ARBITRARY shape — E.hexLabel only reads
   CURRENT_SHAPE, and we deliberately don't switch it, so replicate its 3-line
   formula against the passed shape object. */
function mdHexLabelFor(shape, k) {
  var p = E.parseKey(k), ri = shape.rowRs.indexOf(p[1]);
  if (ri < 0 || !shape.set[k]) return k;
  return String.fromCharCode(65 + ri) + (p[0] - shape.rowQFrom[p[1]] + 1);
}
/* sequential brass->ink ramp by fraction of a lens's display max (light = low,
   the CHART.seq magnitude ramp reused). Untouched/zero = bare parchment, so
   "touched but quiet" (seq[0]) reads distinct from "never in play". */
function mdLensFill(v, max) {
  if (max <= 0 || v <= 0) return CHART.surface;
  return CHART.seq[Math.min(CHART.seq.length - 1, Math.floor(v / max * CHART.seq.length))];
}

/* The three hex-lens boards for one map, following the A|B|A/B toggle exactly
   as mdTempoSection: 'A' = run A solid, 'B' = run B solid, 'AB' = run B solid
   with run A as a ghost (here a dashed inner hex sized by A's value on the
   SAME shared max — the tempo lanes' ghost-bar idiom, one axis over). The band
   board / settle curve above never toggle; the hex lenses DO (they're the
   toggle's spatial payload). */
function mdHexLensSection(mapName, envA, envB, abMode) {
  var head = '<div style="font-size:13px;font-weight:bold;margin:18px 0 2px;">Hex lenses ' +
    '<span class="small" style="font-style:italic;">(SPEC §5 &mdash; where the battle actually happens on this map)</span></div>';
  var map = mdMapDef(mapName);
  if (!map) return head + '<p class="small">No board outline on disk for &ldquo;' + chEsc(mapName) + '&rdquo; &mdash; it may have been deleted since this run.</p>';
  var shape = mdShapeOf(map);
  if (!shape) return head + '<p class="small">Could not build the board outline for &ldquo;' + chEsc(mapName) + '&rdquo;.</p>';
  var hexList = shape.list;
  var hqRed = E.key(map.redHQ[0], map.redHQ[1]), hqBlue = E.key(map.blueHQ[0], map.blueHQ[1]);

  var foldA = WOA_REPORT.foldHexLenses(envA), foldB = WOA_REPORT.foldHexLenses(envB);
  var solid = abMode === 'A' ? foldA : foldB;
  var ghost = abMode === 'AB' ? foldA : null;
  var solidLabel = abMode === 'A' ? 'A' : 'B';
  if (!solid.n) return head + '<p class="small">No battles on ' + chEsc(mapName) + ' for run ' + solidLabel + ' yet.</p>';

  var vb = viewBoxFor(hexList);
  // dead-hex hatch: one <pattern>, defined once, referenced by url() doc-wide
  var defs = '<svg width="0" height="0" style="position:absolute;" aria-hidden="true"><defs>' +
    '<pattern id="mdHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<line x1="0" y1="0" x2="0" y2="6" stroke="' + CHART.muted + '" stroke-width="1.5"/></pattern></defs></svg>';

  var boards = MD_HEX_LENSES.map(function (lens) {
    // display max over BOTH runs' hexes for this lens, so ghost + solid compare
    // on ONE scale (mirrors the tempo lanes' shared laneMax).
    var max = 0;
    [solid, ghost].forEach(function (f) { if (!f) return; Object.keys(f.hexes).forEach(function (k) { var v = f.hexes[k][lens.key]; if (v > max) max = v; }); });

    var cells = '', overlays = '', hits = '';
    hexList.forEach(function (k) {
      var xy = hexXY(k), pts = hexPoints(xy[0], xy[1], MDHEX_R);
      var d = solid.hexes[k], g = ghost ? ghost.hexes[k] : null, isHQ = (k === hqRed || k === hqBlue);
      // dead = <5% occupancy — a never-touched hex (absent from the fold, occ 0)
      // is the deadest of all, so hatch it too; HQ exempt (always held, but the
      // trace never logs an HQ hex unless it's attacked). Occupancy-based, so a
      // hex reads dead-or-not identically across all three lenses.
      var dead = !isHQ && (d ? d.dead : true);
      cells += '<polygon points="' + pts + '" fill="' + mdLensFill(d ? d[lens.key] : 0, max) + '" stroke="' + CHART.axis + '" stroke-width="1"/>';
      if (dead) overlays += '<polygon points="' + pts + '" fill="url(#mdHatch)" stroke="none"/>';
      // avenue of attack: a NESTED hex red ring (real polygon stroke, never a css outline on a clip — AC2)
      if (d && d.avenue) overlays += '<polygon points="' + hexPoints(xy[0], xy[1], MDHEX_R * 0.62) + '" fill="none" stroke="' + CHART.breach + '" stroke-width="2.5"/>';
      // A/B ghost: dashed inner hex sized by run A's value on the shared max
      if (g && g[lens.key] > 0 && max > 0) {
        var gr = MDHEX_R * (0.16 + 0.74 * Math.min(1, g[lens.key] / max));
        overlays += '<polygon points="' + hexPoints(xy[0], xy[1], gr) + '" fill="none" stroke="' + CHART.ink + '" stroke-width="1.3" stroke-dasharray="3 2"/>';
      }
      // HQ marker: thick side-coloured border + star
      if (isHQ) {
        var hc = (k === hqRed) ? CHART.divRed[2] : CHART.divBlue[2];
        overlays += '<polygon points="' + hexPoints(xy[0], xy[1], MDHEX_R - 2) + '" fill="none" stroke="' + hc + '" stroke-width="3"/>' +
          '<text x="' + xy[0].toFixed(1) + '" y="' + (xy[1] + 5.5).toFixed(1) + '" text-anchor="middle" font-size="16" fill="' + hc + '">★</text>';
      }
      // hover: per-hex values for BOTH runs (A -> B), plus the classification tags
      var lbl = mdHexLabelFor(shape, k) + (isHQ ? (k === hqRed ? ' · red HQ' : ' · blue HQ') : '');
      var rows = MD_HEX_LENSES.map(function (L) {
        var av = foldA.hexes[k] ? foldA.hexes[k][L.key] : 0, bv = foldB.hexes[k] ? foldB.hexes[k][L.key] : 0;
        return [L.sub, L.fmt(av) + ' → ' + L.fmt(bv)];
      });
      if (dead) rows.push(['flag', 'dead hex (<5% held)']);
      if (d && d.avenue) rows.push(['flag', 'avenue of attack']);
      hits += '<polygon class="ch-hit" points="' + pts + '" fill="transparent"' + chTipAttrs(lbl, rows) + '/>';
    });
    var svg = '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + chEsc(lens.title + ' on ' + mapName) +
      '" style="display:block;width:100%;height:auto;background:' + CHART.surface + ';border-radius:6px;">' + cells + overlays + hits + '</svg>';
    return '<div style="flex:1 1 220px;min-width:200px;max-width:330px;">' +
      '<div style="font-size:11.5px;font-weight:bold;color:' + CHART.ink + ';margin-bottom:2px;">' + lens.title +
      ' <span class="small" style="font-weight:normal;font-style:italic;color:' + CHART.muted + ';">(' + lens.sub + ', max ' + lens.fmt(max) + ')</span></div>' + svg + '</div>';
  }).join('');

  // self-styled legend (the .chkey/.sw CSS is scoped under .chcard; the drill-down
  // lives in .mapd-wrap, so inline every swatch here — the drill-down convention)
  var hatchSw = 'repeating-linear-gradient(45deg,transparent,transparent 2px,' + CHART.muted + ' 2px,' + CHART.muted + ' 3px)';
  function mdSw(css) { return '<span style="display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:-2px;margin-right:4px;box-sizing:border-box;' + css + '"></span>'; }
  var key = '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:12px;color:' + CHART.inkSoft + ';margin-top:10px;">' +
    '<span>fill&nbsp;' + CHART.seq.map(function (c) { return mdSw('background:' + c + ';margin-right:0;'); }).join('') + '&nbsp;low&rarr;high</span>' +
    '<span>' + mdSw('background:' + CHART.surface + ';border:1px solid ' + CHART.axis + ';') + '0 (this lens)</span>' +
    '<span>' + mdSw('background:' + hatchSw + ';border:1px solid ' + CHART.muted + ';') + 'dead hex &lt;5% held</span>' +
    '<span>' + mdSw('border:2px solid ' + CHART.breach + ';background:transparent;') + 'avenue of attack</span>' +
    '<span><span style="font-size:15px;color:' + CHART.divRed[2] + ';vertical-align:-1px;">★</span> HQ</span></div>';

  var ghostNote = ghost ? ' &middot; B fill, A dashed-ghost (inner-hex size = A on the shared scale)' : '';
  return head +
    '<p class="small" style="margin:2px 0 8px;">Run ' + solidLabel + ' solid, n = ' + solid.n + ' battle(s) on ' + chEsc(mapName) + ghostNote +
    '. Occupancy = % of turns a hex was held; flips &amp; kills are per-battle rates. Hover a hex for A&rarr;B values.</p>' +
    defs + '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;">' + boards + '</div>' + key;
}

/* Assembles the full Map drill-down pane from two runs' already-fetched
   battle rows (the SAME rowsA/rowsB shape ovRenderBody consumes), filtered
   to DASH.mapFocus. DASH.mapFocus falls back to the first map (alpha) when
   unset or stale (e.g. it named a map only the PRIOR A/B pair had). */
function mdRenderBody(el, rowsA, rowsB) {
  var names = {};
  rowsA.forEach(function (r) { names[r.map] = 1; });
  rowsB.forEach(function (r) { names[r.map] = 1; });
  var mapList = Object.keys(names).sort();
  if (!mapList.length) { el.innerHTML = '<p class="small">No per-map battle rows for either run yet.</p>'; return; }
  if (!DASH.mapFocus || mapList.indexOf(DASH.mapFocus) < 0) DASH.mapFocus = mapList[0];
  var idx = mapList.indexOf(DASH.mapFocus), mapName = DASH.mapFocus;

  var mapRowsA = rowsA.filter(function (r) { return r.map === mapName; });
  var mapRowsB = rowsB.filter(function (r) { return r.map === mapName; });
  var aggA = WOA_REPORT.foldBattles(mapRowsA), aggB = WOA_REPORT.foldBattles(mapRowsB);
  var scoreA = mapRowsA.length ? WOA_REPORT.balanceScore(aggA.agg, aggA.done) : null;
  var scoreB = mapRowsB.length ? WOA_REPORT.balanceScore(aggB.agg, aggB.done) : null;
  var regressed = scoreA != null && scoreB != null && scoreB > scoreA;
  var envA = mdEnvelopes(rowsA, mapName), envB = mdEnvelopes(rowsB, mapName);

  var h = '<div class="mapd-wrap">' + mdHeaderHtml(mapList, idx, scoreA, scoreB, regressed) + '<div class="mapd-grid">';
  h += '<div class="mapd-col-l">' + mdTempoSection(mapName, envA, envB, DASH.abMode) + mdBandBoard(aggA, aggB, DASH.temperature) + '</div>';
  h += '<div class="mapd-col-r">' + mdSettleCurve(envA, envB) + '</div>';
  h += '</div>'; // close mapd-grid
  h += mdHexLensSection(mapName, envA, envB, DASH.abMode); // full-width spatial view, follows the A|B|A/B toggle
  h += '</div>'; // close mapd-wrap
  el.innerHTML = h;

  el.querySelectorAll('.mapd-crumb').forEach(function (c) {
    c.addEventListener('click', function () { DASH.mapFocus = c.getAttribute('data-map'); renderDash(); });
  });
  el.querySelectorAll('.mapd-arrow').forEach(function (a) {
    a.addEventListener('click', function () {
      var step = +a.getAttribute('data-step'), i = (idx + step + mapList.length) % mapList.length;
      DASH.mapFocus = mapList[i]; renderDash();
    });
  });
  el.querySelectorAll('.ab-toggle [data-ab]').forEach(function (b) {
    b.addEventListener('click', function () { DASH.abMode = b.getAttribute('data-ab'); renderDash(); });
  });
  chBindHits(el);
}

/* Map drill-down entry point (dashboard.js's renderDashPane calls this for
   the 'maps' view once the shell's own file:///no-runs/no-A-B guards pass —
   the SAME guard Overview uses). */
function renderMapDrill(el) {
  var loaded = dashLoadBattleRows(function (rowsA, rowsB) {
    if (rowsA == null) { el.innerHTML = '<p class="small">Could not load battle rows for the selected runs &mdash; is <code>node game/server.js</code> running?</p>'; return; }
    mdRenderBody(el, rowsA, rowsB);
  });
  if (!loaded) el.innerHTML = '<p class="small">Loading battle rows for run A &amp; B&hellip;</p>';
}

/* =================== the Cards tab (WOA-043, design 5a) ===================
   THE QUESTION: which cards are dead weight, and when do cards actually fire?
   Three .chcard sections (the SAME one-question-per-card idiom renderCharts
   established up top) fed by the SAME two runs' battle rows as Overview/Maps
   (dashLoadBattleRows/BATTLE_CACHE), folded per-card via the WOA-043
   report-model.js additions (cardAggFromEnvelopes/cardHqWinSlice) so
   WOA_REPORT.cardRows — the ONE card-row derivation — is reused unmodified
   for a run's DB rows exactly as it already is for a live in-memory run
   (dashboard.js renderDashTables). Mirrors renderOverview/mdRenderBody's
   dual-run idiom throughout: A ghost/hollow, B solid/filled. */

// self-styled swatch for panes NOT wrapped in .chcard — the .chkey/.sw CSS is
// scoped under .chcard (GOTCHA, WOA-042 mdHexLensSection); its own mdSw
// helper is function-scoped there, so this is a top-level twin for the
// dumbbell/strip sections below (which sit in plain .ov-grid, not .chcard).
function crdSw(css) {
  return '<span style="display:inline-block;width:11px;height:11px;border-radius:2px;vertical-align:-1px;margin-right:4px;box-sizing:border-box;' + css + '"></span>';
}

/* Per-run per-card view, one fold per run (rowsA/rowsB) feeding all three
   sections below — the SAME "fold once, read many charts" shape
   mdEnvelopes/ovRenderBody already use elsewhere in this file. envs is
   exposed too (the fire-time strips need the raw envelopes, not the folded
   agg). winHq/winHqN are the SPEC §2 doctrine slice (report-model.js
   cardHqWinSlice) — winHq is null when the card was never played in a
   non-simple HQ-ending context THIS run (excluded from the quadrant, not
   drawn as a fabricated 0). */
function crdRunCards(rows) {
  var envs = rows.map(WOA_REPORT.envelopeFromRow).filter(function (e) { return !!e; });
  var agg = WOA_REPORT.cardAggFromEnvelopes(envs);
  var slice = WOA_REPORT.cardHqWinSlice(envs);
  var byId = {};
  WOA_REPORT.cardRows(agg, E.CARDS).forEach(function (r) {
    var s = slice[r.id];
    byId[r.id] = { id: r.id, name: r.name, plays: r.plays, sight: r.sight, simple: r.simple,
      noop: r.noop, seenNum: r.seenNum,
      winHq: (s && s.plays) ? WOA_REPORT.pct(s.wins, s.plays) : null, winHqN: s ? s.plays : 0 };
  });
  return { byId: byId, envs: envs };
}

/* =================== Cards §1: sight quadrant ===================
   x = win % — the SPEC §2 doctrine slice (HQ-capture endings × non-simple
   plays only; report-model.js cardHqWinSlice). Pooled card Win% NEVER appears
   on this axis (WOA-019 / SPEC §2) — this comment IS the "state it's the SPEC
   §2 slice" the ticket asks for. y = played-on-first-sight % (pooled —
   Simple%/Noop%/1stSight%/AvgSeen/Plays are explicitly "unchanged" per SPEC
   §2, so pooled is correct here, unlike Win%).
   A ghost (hollow ink ring) -> B solid (fill = win % deviation from 50, the
   SAME chDivFill scale chartQuadrant above already uses), joined by a plain
   connector — the map dumbbells' A→B idiom (ovMapDumbbells), not a new
   arrowhead-marker convention. Bubble AREA = plays (max of A/B). Greyed marks
   + "(n=N)" in the tooltip = the SPEC §8 small-n rule on the SLICE's own n
   (fleet scope: this chart is fleet-wide, never per-map, so SMALL_N.fleet=240
   — deliberately strict; the slice is thin by construction and greying often
   IS the honest answer, per the ticket's own framing).
   Corner: "OP WATCHLIST" moves to top-RIGHT (wins big in HQ endings AND
   always played on sight) — a deliberate reading of design 5a's corner for
   THIS chart's axes, which differ from the single-run chartQuadrant above
   (that one's x is AvgSeen, so its danger corner is top-LEFT; this one's x is
   win%, so danger is top-RIGHT). Documented here since it's a discretionary
   call, not a spec-pinned coordinate. */
function chartCardSightQuadrant(rows) {
  var W = 860, H = 500, L = 48, R = 18, T = 44, B = 48;
  var pw = W - L - R, ph = H - T - B;
  function sx(v) { return L + v / 100 * pw; }
  function sy(v) { return T + (100 - v) / 100 * ph; }
  var s = '<svg id="chCardQuad" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Card sight quadrant">';
  s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + CHART.surface + '" rx="6"/>';
  [0, 25, 75, 100].forEach(function (v) {
    s += chLine(sx(v), T, sx(v), T + ph, CHART.grid, 1);
    s += chLine(L, sy(v), L + pw, sy(v), CHART.grid, 1);
  });
  s += chLine(sx(50), T, sx(50), T + ph, CHART.axis, 1.4);
  s += chLine(L, sy(50), L + pw, sy(50), CHART.axis, 1.4);
  var chrome = '';
  [0, 25, 50, 75, 100].forEach(function (v) {
    chrome += chText(sx(v), T + ph + 14, String(v), { fs: 10.5, anchor: 'middle' });
    chrome += chText(L - 6, sy(v) + 3.5, String(v), { fs: 10.5, anchor: 'end' });
  });
  chrome += chText(L + pw / 2, H - 6, 'win % — HQ-capture endings, non-simple plays (DB slice)', { fs: 12, anchor: 'middle' });
  chrome += chText(14, T + ph / 2, 'played on first sight %', { fs: 12, anchor: 'middle', rotate: true });
  chrome += chText(L + pw - 4, T + 16, 'OP WATCHLIST →', { fs: 11.5, fill: CHART.breach, bold: true, anchor: 'end' });
  chrome += chText(L + pw - 4, T + ph - 8, 'over-performs →', { fs: 10.5, fill: CHART.muted, italic: true, anchor: 'end' });
  chrome += chText(L + 6, T + ph - 8, '← under-performs', { fs: 10.5, fill: CHART.muted, italic: true });

  var maxPlays = 1;
  rows.forEach(function (r) { var p = Math.max(r.a ? r.a.plays : 0, r.b ? r.b.plays : 0); if (p > maxPlays) maxPlays = p; });
  function rad(p) { return Math.max(5, 20 * Math.sqrt(p / maxPlays)); }

  var pts = rows.map(function (r) {
    var pr = rad(Math.max(r.a ? r.a.plays : 0, r.b ? r.b.plays : 0));
    var a = (r.a && r.a.winHq != null) ? { x: sx(r.a.winHq), y: sy(r.a.sight), small: WOA_REPORT.smallN(r.a.winHqN, 'fleet') } : null;
    var b = (r.b && r.b.winHq != null) ? { x: sx(r.b.winHq), y: sy(r.b.sight), small: WOA_REPORT.smallN(r.b.winHqN, 'fleet') } : null;
    return { r: r, a: a, b: b, rad: pr };
  }).filter(function (p) { return p.a || p.b; })
    .sort(function (x, y) { return y.rad - x.rad; }); // big dots block space first — same convention chartScatter/chartQuadrant use above

  var placer = chMakePlacer(W, H);
  pts.forEach(function (p) {
    if (p.a) placer.block(p.a.x - p.rad, p.a.y - p.rad, p.rad * 2, p.rad * 2);
    if (p.b) placer.block(p.b.x - p.rad, p.b.y - p.rad, p.rad * 2, p.rad * 2);
  });

  var marks = '', labels = '', hits = '';
  pts.forEach(function (p, i) {
    var r = p.r, idA = 'chCq' + i + 'a', idB = 'chCq' + i + 'b', markIds = [];
    if (p.a && p.b) {
      marks += '<line x1="' + p.a.x.toFixed(1) + '" y1="' + p.a.y.toFixed(1) + '" x2="' + p.b.x.toFixed(1) + '" y2="' + p.b.y.toFixed(1) +
        '" stroke="' + CHART.axis + '" stroke-width="1.3"' + ((p.a.small || p.b.small) ? ' opacity="0.5"' : '') + '/>';
    }
    if (p.a) {
      markIds.push(idA);
      marks += '<circle id="' + idA + '" cx="' + p.a.x.toFixed(1) + '" cy="' + p.a.y.toFixed(1) + '" r="' + p.rad.toFixed(1) +
        '" fill="' + CHART.runADot + '" stroke="' + CHART.ink + '" stroke-width="2"' + (p.a.small ? ' opacity="0.5"' : '') + ' data-ring="' + CHART.ink + '"/>';
    }
    if (p.b) {
      markIds.push(idB);
      var bRad = Math.max(4, p.rad - 1.5);
      marks += '<circle id="' + idB + '" cx="' + p.b.x.toFixed(1) + '" cy="' + p.b.y.toFixed(1) + '" r="' + bRad.toFixed(1) +
        '" fill="' + chDivFill(r.b.winHq - 50) + '" stroke="' + CHART.surface + '" stroke-width="2"' + (p.b.small ? ' opacity="0.5"' : '') + ' data-ring="' + CHART.surface + '"/>';
    }
    var anchor = p.b || p.a;
    var pl = placer.place(anchor.x, anchor.y, p.rad, r.name, 10.5) || { x: anchor.x + p.rad + 4, y: anchor.y + 3.5 };
    labels += chText(pl.x, pl.y, r.name, { fs: 10.5, fill: CHART.ink });
    hits += '<circle class="ch-hit" cx="' + anchor.x.toFixed(1) + '" cy="' + anchor.y.toFixed(1) + '" r="' + Math.max(p.rad + 6, 14) +
      '" fill="transparent"' + chTipAttrs(r.name, [
        ['win % A (HQ × non-simple)', r.a && r.a.winHq != null ? r.a.winHq + '% (n=' + r.a.winHqN + ')' : 'n/a'],
        ['win % B (HQ × non-simple)', r.b && r.b.winHq != null ? r.b.winHq + '% (n=' + r.b.winHqN + ')' : 'n/a'],
        ['1st-sight % A → B', (r.a ? r.a.sight : '—') + '% → ' + (r.b ? r.b.sight : '—') + '%'],
        ['plays A → B', (r.a ? r.a.plays : 0) + ' → ' + (r.b ? r.b.plays : 0)]
      ], markIds.join(',')) + '/>';
  });
  s += marks + chrome + labels + hits + '</svg>';
  return s;
}

/* =================== Cards §2: dead-card check ===================
   Simple% A→B dumbbells (design 5a) — the SAME connector-and-two-dots idiom
   ovMapDumbbells uses above, on a 0–100% scale instead of the 0–20 balance
   score. HIGHER Simple% is WORSE (the card's own printed effect rarely beat
   the basic-attack/reposition fallback), so "regressed" = B > A, the SAME
   polarity ovMapDumbbells already uses for balance score. Sorted worst-first
   on B (design 5a: "sorted by B"). A red ⚠ stamps any row where Noop% > 2 on
   whichever run has data (B preferred; A as a fallback when B has none). */
function crdSimpleDumbbells(rows) {
  var live = rows.slice().sort(function (x, y) {
    var xv = x.b ? x.b.simple : (x.a ? x.a.simple : -1), yv = y.b ? y.b.simple : (y.a ? y.a.simple : -1);
    return yv - xv;
  });
  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">Dead-card check: Simple%, A&rarr;B ' +
    '<span class="small" style="font-style:italic;">(sorted worst-first on B — high Simple% = the card’s own effect rarely mattered)</span></div>';
  if (!live.length) return h + '<p class="small">No card plays for either run yet.</p>';
  h += '<div class="ov-legend"><span>run A = hollow ring, run B = filled dot</span>' +
    '<span style="color:' + CHART.breach + ';">⚠ Noop% &gt; 2%</span></div>';
  h += '<div class="ov-grid">';
  live.forEach(function (r) {
    var av = r.a ? r.a.simple : null, bv = r.b ? r.b.simple : null;
    var regressed = av != null && bv != null && bv > av;
    var improved = av != null && bv != null && bv < av;
    var connColor = regressed ? CHART.regress : (improved ? CHART.improve : '#d8caa2');
    var bFill = regressed ? CHART.breach : (improved ? CHART.improveDot : CHART.ink);
    var connLeft = 0, connWidth = 0;
    if (av != null && bv != null) { connLeft = Math.min(av, bv); connWidth = Math.abs(bv - av); }
    var inner = '<div style="position:absolute;top:8px;left:0;right:0;height:2px;background:#d8caa2;"></div>' +
      (av != null && bv != null ? '<div style="position:absolute;top:8px;height:2px;left:' + connLeft.toFixed(1) +
        '%;width:' + connWidth.toFixed(1) + '%;background:' + connColor + ';"></div>' : '') +
      (av != null ? '<div style="position:absolute;top:3px;width:12px;height:12px;border-radius:50%;border:2px solid ' +
        CHART.ink + ';background:' + CHART.runADot + ';left:calc(' + av.toFixed(1) + '% - 6px);"></div>' : '') +
      (bv != null ? '<div style="position:absolute;top:4px;width:11px;height:11px;border-radius:50%;background:' +
        bFill + ';left:calc(' + bv.toFixed(1) + '% - 5px);"></div>' : '');
    var noopV = r.b ? r.b.noop : (r.a ? r.a.noop : 0);
    var warn = noopV > 2;
    var valText = (av == null ? '—' : av + '%') + ' → ' + (bv == null ? '—' : bv + '%') + (warn ? ' ⚠' : '');
    var tip = [['simple % A', av == null ? 'n/a' : av + '% (n=' + (r.a ? r.a.plays : 0) + ')'],
      ['simple % B', bv == null ? 'n/a' : bv + '% (n=' + (r.b ? r.b.plays : 0) + ')'],
      ['noop %', noopV + '%']];
    var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:help;"' + chTipAttrs(r.name, tip) + '></div>';
    h += '<div class="ov-lbl">' + (warn ? '<b>' + chEsc(r.name) + ' ⚠</b>' : chEsc(r.name)) + '</div>' +
      '<div style="position:relative;height:18px;">' + inner + hit + '</div>' +
      '<div class="ov-val' + (regressed ? ' breach' : '') + '">' + valText + '</div>';
  });
  h += '</div>';
  return h;
}

/* Per-card FLEET-wide "when cards fire" quartile — REUSES report-model.js's
   cardPlayTurnQuartiles as-is (per the ticket: "reuse, do not reimplement"):
   that fold already answers "at what normalized time did this card fire, in
   ONE battle" (its own quartile handles a battle where a card has multiple
   copies in the deck, so n>1 within a single battle is real). This pools each
   battle's MEDIAN across the whole run's envelopes and re-quantiles that
   pooled array with the SAME exported WOA_REPORT.quantile() the per-battle
   fold itself calls — no new quantile math is written here, just the one
   that already exists applied a second time, one level up (per-battle ->
   fleet). n (for small-n greying) is each strip's OWN plays count, read from
   crdRunCards at the call site — a battle-count here would undercount a
   multi-copy card. */
function crdFleetFireTimes(envs) {
  var byCard = {};
  envs.forEach(function (env) {
    var q = WOA_REPORT.cardPlayTurnQuartiles(env);
    Object.keys(q).forEach(function (id) { (byCard[id] || (byCard[id] = [])).push(q[id].median); });
  });
  var out = {};
  Object.keys(byCard).forEach(function (id) {
    var arr = byCard[id].sort(function (a, b) { return a - b; });
    out[id] = { q1: WOA_REPORT.quantile(arr, 0.25), median: WOA_REPORT.quantile(arr, 0.5), q3: WOA_REPORT.quantile(arr, 0.75) };
  });
  return out;
}
// sequential brass->ink fill by normalized-time fraction (0=early turn 1,
// 1=battle end) — the SAME CHART.seq ramp mdLensFill uses for magnitude, here
// indexed by a [0,1] fraction instead of a value/max ratio.
function crdFireFill(frac) {
  return CHART.seq[Math.max(0, Math.min(CHART.seq.length - 1, Math.floor(frac * CHART.seq.length)))];
}

/* =================== Cards §3: when cards fire ===================
   One row per card: two stacked mini tracks (A above, B below) over
   normalized battle time [0%,100%] — a bar spans the middle-50% (q1..q3),
   fill by median (brass ramp = early→late), a 2px ink tick marks the median
   exactly, matching design 5a's "quartile bar + 3px ink median tick" idiom.
   Sorted earliest-median-first on B (a natural reading of "sorted by B" for
   a timing chart, mirroring §2's worst-first-on-B convention). */
function crdFireStrips(rows, fireA, fireB) {
  var live = rows.filter(function (r) { return fireA[r.id] || fireB[r.id]; });
  live = live.slice().sort(function (x, y) {
    var xm = fireB[x.id] ? fireB[x.id].median : (fireA[x.id] ? fireA[x.id].median : 1);
    var ym = fireB[y.id] ? fireB[y.id].median : (fireA[y.id] ? fireA[y.id].median : 1);
    return xm - ym;
  });
  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">When cards fire, A vs B ' +
    '<span class="small" style="font-style:italic;">(middle-50% of play turns + median tick, over normalized battle time — report-model.js cardPlayTurnQuartiles)</span></div>';
  if (!live.length) return h + '<p class="small">No card plays for either run yet.</p>';
  h += '<div class="ov-legend">' +
    '<span>' + crdSw('background:' + CHART.seq[1] + ';') + 'middle 50% of play turns (fill = median, brass ramp early→late)</span>' +
    '<span>' + crdSw('background:' + CHART.ink + ';width:2px;border-radius:0;') + 'median tick</span></div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:9.5px;color:' + CHART.muted + ';margin:2px 0 3px;padding-left:150px;font-style:italic;">' +
    '<span>turn 1</span><span>battle end</span></div>';
  h += '<div class="ov-grid" style="grid-template-columns:148px 1fr 76px;row-gap:8px;">';
  live.forEach(function (r) {
    var qa = fireA[r.id] || null, qb = fireB[r.id] || null;
    var nA = r.a ? r.a.plays : 0, nB = r.b ? r.b.plays : 0;
    function barHtml(q, n, label) {
      if (!q) return '<div class="small" style="opacity:.55;padding:1px 0;">no ' + label + ' plays</div>';
      var small = WOA_REPORT.smallN(n, 'fleet');
      var lo = Math.max(0, Math.min(100, q.q1 * 100)), hi = Math.max(0, Math.min(100, q.q3 * 100));
      if (hi < lo) { var t = lo; lo = hi; hi = t; }
      var med = Math.max(0, Math.min(100, q.median * 100));
      return '<div style="position:relative;height:12px;margin-bottom:2px;' + (small ? 'opacity:.5;' : '') + '">' +
        '<div style="position:absolute;top:5px;left:0;right:0;height:2px;background:' + CHART.grid + ';"></div>' +
        '<div style="position:absolute;top:2px;left:' + lo.toFixed(1) + '%;width:' + Math.max(1, hi - lo).toFixed(1) +
          '%;height:8px;background:' + crdFireFill(q.median) + ';border-radius:2px;"></div>' +
        '<div style="position:absolute;top:0;left:calc(' + med.toFixed(1) + '% - 1px);width:2px;height:12px;background:' + CHART.ink + ';"></div></div>';
    }
    var valText = (qa ? Math.round(qa.median * 100) + '%' : '—') + ' → ' + (qb ? Math.round(qb.median * 100) + '%' : '—');
    var tip = [['median turn A', qa ? Math.round(qa.median * 100) + '% (n=' + nA + ')' : 'n/a'],
      ['median turn B', qb ? Math.round(qb.median * 100) + '% (n=' + nB + ')' : 'n/a'],
      ['middle-50% band A', qa ? Math.round(qa.q1 * 100) + '–' + Math.round(qa.q3 * 100) + '%' : 'n/a'],
      ['middle-50% band B', qb ? Math.round(qb.q1 * 100) + '–' + Math.round(qb.q3 * 100) + '%' : 'n/a']];
    var hit = '<div class="ch-hit" style="position:absolute;inset:0;cursor:help;"' + chTipAttrs(r.name, tip) + '></div>';
    h += '<div class="ov-lbl">' + chEsc(r.name) + '</div>' +
      '<div style="position:relative;">' + barHtml(qa, nA, 'A') + barHtml(qb, nB, 'B') + hit + '</div>' +
      '<div class="ov-val">' + valText + '</div>';
  });
  h += '</div>';
  return h;
}

/* Assembles the full Cards pane from two runs' already-fetched battle rows
   (the SAME rowsA/rowsB shape ovRenderBody/mdRenderBody consume). */
function crdRenderBody(el, rowsA, rowsB) {
  var A = crdRunCards(rowsA), B = crdRunCards(rowsB);
  var rows = Object.keys(E.CARDS.reduce(function (m, c) { m[c.id] = 1; return m; }, {})).map(function (id) {
    return { id: id, name: (A.byId[id] || B.byId[id]).name, a: A.byId[id] || null, b: B.byId[id] || null };
  }).filter(function (r) { return (r.a && r.a.plays) || (r.b && r.b.plays); });
  var quadEligible = rows.filter(function (r) { return (r.a && r.a.winHq != null) || (r.b && r.b.winHq != null); }).length;
  var omitted = rows.length - quadEligible;
  var fireA = crdFleetFireTimes(A.envs), fireB = crdFleetFireTimes(B.envs);

  var h = '<div class="crd-wrap">';
  h += '<div class="chcard"><h3>Which cards are on the overpowered watchlist?</h3>' +
    '<p class="small">' + rows.length + ' card(s) with plays in run A and/or B' +
    (omitted ? '; ' + omitted + ' never played in a non-simple HQ-capture ending (omitted here — the SPEC §2 slice)' : '') +
    '. Bubble area = plays; A hollow ghost → B solid.</p>' +
    '<div class="chkey"><span>fill B = win % deviation from 50:</span>' +
    '<span>' + chSwatch(CHART.divBlue[2]) + 'under 50%</span>' +
    '<span>' + chSwatch(CHART.divMid) + '≈ 50%</span>' +
    '<span>' + chSwatch(CHART.divRed[2]) + 'over 50%</span></div>' +
    chartCardSightQuadrant(rows) + '</div>';
  h += '<div class="chcard">' + crdSimpleDumbbells(rows) + '</div>';
  h += '<div class="chcard">' + crdFireStrips(rows, fireA, fireB) + '</div>';
  h += '</div>';
  el.innerHTML = h;
  chBindHits(el);
}

/* Cards entry point (dashboard.js's renderDashPane calls this for the
   'cards' view once the shell's own file:///no-runs/no-A-B guards pass — the
   SAME guard Overview/Maps use). */
function renderCards(el) {
  var loaded = dashLoadBattleRows(function (rowsA, rowsB) {
    if (rowsA == null) { el.innerHTML = '<p class="small">Could not load battle rows for the selected runs &mdash; is <code>node game/server.js</code> running?</p>'; return; }
    crdRenderBody(el, rowsA, rowsB);
  });
  if (!loaded) el.innerHTML = '<p class="small">Loading battle rows for run A &amp; B&hellip;</p>';
}
