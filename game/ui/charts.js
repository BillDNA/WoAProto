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
   OV_CACHE — so switching temperature or pill nav doesn't refetch), folds
   them through WOA_REPORT.foldBattles (report-model.js — the ONE DB-rows ->
   agg fold), then draws: a verdict banner, the triage band board (1c), the
   per-map balance-score dumbbells (1f), and two fleet-wide pacing minis
   (1e). Plain divs by string concat, matching the design canvas's OWN
   technique for 1c/1f/4a (not SVG) — inline SVG only where the reference
   (1e's settle curve) itself uses it. Tooltips reuse the .chtip/ch-hit
   idiom (chBindHits) already established by chartScatter etc. above. */

// metrics whose val() returns a 0-100 percentage (drag/swings are raw counts).
// WOA-039: attackShare/swapShare are % of all actions taken.
var OV_PERCENT_KEYS = { red: 1, first: 1, hq: 1, zeroKill: 1, tie: 1, control: 1, firstBlood: 1, attackShare: 1, swapShare: 1 };
var OV_CACHE = { key: null, rowsA: null, rowsB: null };

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
function ovBandRowHtml(row, aggA, aggB, temperature) {
  var valA = row.val(aggA.agg, aggA.done);
  var valB = row.val(aggB.agg, aggB.done);
  var domain = ovTrackDomain(row, valA, valB);
  var n = Math.min(WOA_REPORT.bandN(row, aggA.agg, aggA.done), WOA_REPORT.bandN(row, aggB.agg, aggB.done));
  var small = WOA_REPORT.smallN(n, 'fleet');
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

  // ---- settle curve: CDF of settlePoint, A dashed / B solid ----
  function cdf(sorted, w, h) {
    var pts = [];
    for (var t = 0; t <= 100; t += 10) {
      var c = 0;
      for (var j = 0; j < sorted.length; j++) { if (sorted[j] <= t) c++; }
      pts.push((t / 100 * w).toFixed(1) + ',' + (h - (sorted.length ? c / sorted.length : 0) * h).toFixed(1));
    }
    return pts.join(' ');
  }
  var W = 200, H = 64;
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="display:block;width:100%;height:auto;">' +
    chLine(0, H, W, H, CHART.axis, 1) +
    '<polyline points="' + cdf(settleA, W, H) + '" fill="none" stroke="' + CHART.inkSoft + '" stroke-width="1.5" stroke-dasharray="4 2"/>' +
    '<polyline points="' + cdf(settleB, W, H) + '" fill="none" stroke="#77582e" stroke-width="2"/></svg>';
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

/* Overview entry point (dashboard.js's renderDashPane calls this for the
   'overview' view once the shell's own file:///no-runs/no-A-B guards pass).
   Caches the two runs' battle rows keyed by "runA|runB" so a temperature or
   pill-nav re-render never refetches; a race where DASH.runA/runB changed
   mid-flight is guarded by re-checking the key once the fetch resolves. */
function renderOverview(el) {
  var key = DASH.runA + '|' + DASH.runB;
  if (OV_CACHE.key === key) { ovRenderBody(el, OV_CACHE.rowsA, OV_CACHE.rowsB); return; }
  el.innerHTML = '<p class="small">Loading battle rows for run A &amp; B&hellip;</p>';
  Promise.all([
    fetch('/api/battles?run=' + DASH.runA).then(function (r) { return r.ok ? r.json() : []; }),
    fetch('/api/battles?run=' + DASH.runB).then(function (r) { return r.ok ? r.json() : []; })
  ]).then(function (res) {
    OV_CACHE = { key: key, rowsA: res[0] || [], rowsB: res[1] || [] };
    if (DASH.runA + '|' + DASH.runB === key) ovRenderBody(el, OV_CACHE.rowsA, OV_CACHE.rowsB);
  }).catch(function () {
    el.innerHTML = '<p class="small">Could not load battle rows for the selected runs &mdash; is <code>node game/server.js</code> running?</p>';
  });
}
