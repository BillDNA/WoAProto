/* War of Attrition — ui part: the Balance Dashboard's CROSS-CUTS pane.
   THE QUESTION: "shadows of what needs changing" — project the whole store
   along any dimension, not just run A vs run B. Reads the server-side SQL
   aggregate (GET /api/aggregate over the star schema, dev/db.js) directly, so a
   re-slice is a new query, not a new JS fold. The slice pickers come from GET
   /api/dimensions.

   Two re-sliceable cross-cuts, each a bar chart drawn over the shared toolkit
   (ui/chart-primitives.js — chSvgOpen/chRect/chText/chLine + the .ch-hit hover
   layer chBindHits):
     1. Balance metric × dimension (default: first-mover win% × mountain-hex
        count — the ADR-0004 litmus). Reslice x to forest_hexes / river_hexes /
        map / first_player / win_type, and the metric, and the (version, config)
        slice.
     2. Card play-timing × terrain-hex count (the literal ADR litmus over
        card_events). Reslice terrain, an optional single card, and the slice.

   Unlike the other panes this one needs no run A/B — it slices the whole DB.
   Plain string-concat SVG, zero dependencies. */
'use strict';

// Lazy per-session state; extends the DASH global (dashboard.js). `dims` is the
// GET /api/dimensions payload (fetched once); `data`/`cardData` are the last
// aggregate responses. `pending` guards against a fetch storm while re-rendering.
function ccState() {
  if (!DASH.cc) DASH.cc = {
    dims: null, pending: false, err: null, reqSeq: 0,
    cut: 'balance',                       // 'balance' | 'card'
    x: 'mountain_hexes', metric: 'first_win_pct',   // balance cut
    terrain: 'mountain', card: '',                  // card cut
    version: '', config: '',                        // slice ('' = all slices)
    data: null, cardData: null
  };
  return DASH.cc;
}

// Human labels for the whitelisted names db.js hands back.
var CC_METRIC_LABEL = {
  n: 'skirmishes (n)', first_win_pct: 'first-mover win %', red_win_pct: 'red win %',
  hq_pct: 'HQ-capture %', avg_turns: 'avg turns', drag: 'drag (kill-less tail)',
  tie_pct: 'tie→2nd %', swings: 'lead swings', zero_kill_pct: 'zero-kill %'
};
var CC_DIM_LABEL = {
  map: 'map', shape: 'board shape', hex_total: 'board size (hexes)',
  first_player: 'first player', win_type: 'win type', winner: 'winner', battalion_red: 'red battalion'
};
// the per-terrain buckets, off the terrain house — a new type labels itself
E.mapTerrainTypes().forEach(function (t) { CC_DIM_LABEL[t.name + '_hexes'] = t.name + '-hex count'; });
// The balance cut asks for the selected metric PLUS this informative set, so a
// bar's hover shows the whole per-bucket breakdown (not just the bar's metric).
var CC_TIP_METRICS = ['n', 'first_win_pct', 'hq_pct', 'avg_turns', 'tie_pct', 'drag', 'swings'];
function ccBalanceMetrics(cc) {
  var set = [cc.metric];
  CC_TIP_METRICS.forEach(function (m) { if (set.indexOf(m) < 0) set.push(m); });
  return set;
}
function ccMetricLabel(k) { return CC_METRIC_LABEL[k] || k; }
function ccDimLabel(k) { return CC_DIM_LABEL[k] || k; }
function ccIsPct(k) { return /_pct$/.test(k); }

// Format one metric value (null-safe): fractions as %, counts to one decimal.
function ccFmt(metric, v) {
  if (v == null) return '—';
  if (ccIsPct(metric)) return (v * 100).toFixed(1) + '%';
  if (metric === 'n') return String(Math.round(v));
  return (Math.round(v * 10) / 10).toFixed(1);
}

/* One horizontal bar chart. bars = [{label, value, valueText, tip:[[k,v]...]}].
   domainMax fixes the value axis; ref (optional) draws a dashed reference line
   at that value (the 50% crossline for win %). fill(value)->colour. */
function ccBarChart(bars, opts) {
  opts = opts || {};
  if (!bars.length) return '<p class="small">No rows for this slice yet.</p>';
  var rowH = 26, gap = 6, padT = 10, padB = 24, gutter = opts.gutter || 148, barW = 420, padR = 60;
  var w = gutter + barW + padR, h = padT + bars.length * (rowH + gap) + padB;
  var max = opts.domainMax || Math.max.apply(null, bars.map(function (b) { return b.value == null ? 0 : b.value; })) || 1;
  function bx(v) { return gutter + (max <= 0 ? 0 : Math.max(0, Math.min(1, v / max)) * barW); }
  var svg = chSvgOpen({ vb: '0 0 ' + w + ' ' + h, w: w, h: h, role: 'img', aria: opts.aria || 'cross-cut bar chart', style: 'display:block;max-width:100%;height:auto;' });
  // baseline + optional reference line
  svg += chLine(gutter, padT, gutter, h - padB, CHART.axis, 1);
  if (opts.ref != null) {
    var rx = bx(opts.ref);
    svg += chLine(rx, padT, rx, h - padB, CHART.axis, 1, '4 3');
    svg += chText(rx, h - padB + 12, opts.refLabel || '', { fs: 10, fill: CHART.muted, anchor: 'middle' });
  }
  bars.forEach(function (b, i) {
    var y = padT + i * (rowH + gap);
    var val = b.value == null ? 0 : b.value;
    var fill = opts.fill ? opts.fill(val) : CHART.seq[2];
    svg += chText(gutter - 6, y + rowH * 0.66, b.label, { fs: 11, fill: CHART.ink, anchor: 'end' });
    svg += chRect(gutter, y, Math.max(0.5, bx(val) - gutter), rowH, { fill: fill, rx: 2 });
    svg += chText(bx(val) + 5, y + rowH * 0.66, b.valueText, { fs: 11, fill: CHART.inkSoft });
    // full-row transparent hit target for the tooltip (through the primitive)
    svg += chRect(0, y, w, rowH, { fill: 'transparent', cls: 'ch-hit', style: 'cursor:help;', extra: chTipAttrs(b.name || b.label, b.tip || []) });
  });
  return svg + '</svg>';
}

// The balance cross-cut: the selected metric bucketed by the selected dimension.
function ccBalanceChart(el) {
  var cc = ccState(), r = cc.data;
  if (!r) return '<p class="small">Loading…</p>';
  var metric = r.metric || cc.metric;
  var rows = r.rows.slice();
  // numeric buckets read best low→high; categorical, biggest metric first.
  if (!r.numeric) rows.sort(function (a, b) { return (b[metric] || 0) - (a[metric] || 0); });
  var bars = rows.map(function (row) {
    var label = row.bucket == null ? '(none)' : String(row.bucket);
    var tip = r.metrics.map(function (m) { return [ccMetricLabel(m), ccFmt(m, row[m])]; });
    return { label: label, name: ccDimLabel(r.x) + ' ' + label, value: row[metric], valueText: ccFmt(metric, row[metric]), tip: tip };
  });
  var pct = ccIsPct(metric);
  var opts = {
    aria: ccMetricLabel(metric) + ' by ' + ccDimLabel(r.x),
    domainMax: pct ? 1 : (Math.max.apply(null, bars.map(function (b) { return b.value == null ? 0 : b.value; })) * 1.15 || 1),
    fill: pct
      ? function (v) { return chDivFill(v * 100 - 50); }   // win% diverging around 50
      : function () { return CHART.seq[2]; }
  };
  if (metric === 'first_win_pct' || metric === 'red_win_pct') { opts.ref = 0.5; opts.refLabel = '50%'; }
  var sub = ccMetricLabel(metric) + ' by ' + ccDimLabel(r.x) + (cc.version ? ' · ' + cc.version : ' · all slices');
  return '<div class="cc-sub">' + uiEsc(sub) + '</div>' + ccBarChart(bars, opts);
}

// The card-timing cross-cut: avg play turn by terrain-hex count. Server rows are
// per (bucket, card); collapse to one series (plays-weighted) unless a single
// card is picked.
function ccCardChart(el) {
  var cc = ccState(), r = cc.cardData;
  if (!r) return '<p class="small">Loading…</p>';
  var byBucket = {};
  r.rows.forEach(function (row) {
    var k = row.bucket == null ? 'null' : String(row.bucket);
    var b = byBucket[k] || (byBucket[k] = { bucket: row.bucket, turnPlays: 0, plays: 0, winPlays: 0 });
    b.turnPlays += (row.avg_play_turn || 0) * row.plays;
    b.winPlays += (row.win_pct == null ? 0 : row.win_pct) * row.plays;
    b.plays += row.plays;
  });
  var buckets = Object.keys(byBucket).map(function (k) { return byBucket[k]; })
    .sort(function (a, b) { return (a.bucket == null ? -1 : a.bucket) - (b.bucket == null ? -1 : b.bucket); });
  var bars = buckets.map(function (b) {
    var avg = b.plays ? b.turnPlays / b.plays : null;
    var win = b.plays ? b.winPlays / b.plays : null;
    var label = (b.bucket == null ? '(none)' : String(b.bucket)) + ' ' + cc.terrain;
    return {
      label: label, name: label + ' hexes',
      value: avg, valueText: avg == null ? '—' : (Math.round(avg * 10) / 10).toFixed(1) + ' turn',
      tip: [['avg play turn', avg == null ? '—' : (Math.round(avg * 10) / 10).toFixed(1)],
        ['plays', b.plays], ['win % when played', win == null ? '—' : (win * 100).toFixed(1) + '%']]
    };
  });
  var sub = 'avg play turn by ' + cc.terrain + '-hex count' + (cc.card ? ' · ' + cc.card : ' · all cards') + (cc.version ? ' · ' + cc.version : '');
  return '<div class="cc-sub">' + uiEsc(sub) + '</div>' +
    ccBarChart(bars, { aria: 'card play-timing by ' + cc.terrain + '-hex count', gutter: 110, fill: function () { return CHART.seq[1]; } });
}

// The effective /api/aggregate query, shown so a human (or an agent) can lift it
// straight into dev/db-query.js or a fetch — orientation, per the cookbook.
function ccQueryUrl(cc) {
  var slice = (cc.version ? '&version=' + encodeURIComponent(cc.version) : '') + (cc.config ? '&config=' + encodeURIComponent(cc.config) : '');
  return cc.cut === 'card'
    ? '/api/aggregate?grain=card&terrain=' + cc.terrain + (cc.card ? '&card=' + encodeURIComponent(cc.card) : '') + slice
    : '/api/aggregate?x=' + cc.x + '&metrics=' + ccBalanceMetrics(cc).join(',') + slice;
}

function ccOption(value, label, sel) {
  return '<option value="' + uiEsc(value) + '"' + (String(value) === String(sel) ? ' selected' : '') + '>' + uiEsc(label) + '</option>';
}

// Fetch the current cross-cut from the server, then re-render. Best-effort: a
// missing server / db (file://, no runs) leaves an explanatory note, never an
// error dialog — same idiom as dashLoadRuns.
function ccReload() {
  var cc = ccState();
  if (typeof fetch !== 'function') { cc.err = 'no-server'; renderDash(); return; }
  cc.pending = true; cc.err = null;
  // Sequence the fetches: file the response against the cut it was ISSUED for,
  // and drop it if a newer request has since fired — an out-of-order resolve
  // must never leave cc.data mismatched with the current cut/metric.
  var myId = ++cc.reqSeq, myCut = cc.cut;
  fetch(ccQueryUrl(cc)).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (j) {
    if (myId !== cc.reqSeq) return;               // superseded — a later request owns the view
    if (myCut === 'card') cc.cardData = j; else cc.data = j;
    cc.pending = false; renderDash();
  }).catch(function () { if (myId !== cc.reqSeq) return; cc.pending = false; cc.err = 'fetch'; renderDash(); });
}

// One-time slice-picker load: GET /api/dimensions, then the first cross-cut.
function ccInit() {
  var cc = ccState();
  cc.pending = true;
  if (typeof fetch !== 'function') { cc.dims = { versions: [], metrics: [], groupBys: [], terrains: [], cards: [], maps: [] }; cc.pending = false; cc.err = 'no-server'; renderDash(); return; }
  fetch('/api/dimensions').then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (d) {
    cc.dims = d; cc.pending = false; ccReload();
  }).catch(function () { cc.dims = { versions: [], metrics: [], groupBys: [], terrains: [], cards: [], maps: [] }; cc.pending = false; cc.err = 'fetch'; renderDash(); });
}

function ccControls(cc) {
  var d = cc.dims;
  var h = '<div class="cc-controls">';
  h += '<label class="small">Cross-cut <select id="ccCut">' +
    ccOption('balance', 'Balance metric × dimension', cc.cut) +
    ccOption('card', 'Card timing × terrain', cc.cut) + '</select></label>';
  if (cc.cut === 'balance') {
    h += '<label class="small">Metric <select id="ccMetric">' +
      d.metrics.map(function (m) { return ccOption(m, ccMetricLabel(m), cc.metric); }).join('') + '</select></label>';
    h += '<label class="small">By <select id="ccX">' +
      d.groupBys.map(function (x) { return ccOption(x, ccDimLabel(x), cc.x); }).join('') + '</select></label>';
  } else {
    h += '<label class="small">Terrain <select id="ccTerrain">' +
      d.terrains.map(function (t) { return ccOption(t, t, cc.terrain); }).join('') + '</select></label>';
    h += '<label class="small">Card <select id="ccCard">' + ccOption('', 'all cards', cc.card) +
      d.cards.map(function (c) { return ccOption(c, c, cc.card); }).join('') + '</select></label>';
  }
  // slice picker: one entry per (version, config_digest) present, plus "all".
  // every option's value is the `version|config` encoding; "all slices" is the
  // empty pair '|', so it marks selected when no slice is active.
  h += '<label class="small">Slice <select id="ccSlice">' + ccOption('|', 'all slices', cc.version + '|' + cc.config);
  (d.versions || []).forEach(function (v) {
    var val = v.version + '|' + v.config_digest;
    var lbl = (v.version || '?') + (v.config_digest ? ' · ' + String(v.config_digest).slice(0, 8) : '');
    h += ccOption(val, lbl, cc.version + '|' + cc.config);
  });
  h += '</select></label>';
  h += '</div>';
  return h;
}

/* The pane entry point (mount = #dashPaneCrosscuts). Called by renderDashPane on
   every dash render while the Cross-cuts pill is selected. */
function renderCrosscuts(el) {
  var cc = ccState();
  if (cc.dims == null) {
    el.innerHTML = '<p class="small" style="font-variant:small-caps;">Cross-cuts</p><p class="small">Loading the query surface…</p>';
    if (!cc.pending) ccInit();
    return;
  }
  var body;
  if (cc.err === 'no-server' || cc.err === 'fetch') {
    body = '<p class="small">No data from <code>/api/aggregate</code> — start <code>node game/server.js</code> and record some skirmishes (Tables tab), then reopen this pane.</p>';
  } else if (cc.pending) {
    body = '<p class="small">Querying…</p>';
  } else {
    body = cc.cut === 'card' ? ccCardChart(el) : ccBalanceChart(el);
  }
  var h = '<p class="small" style="font-variant:small-caps; letter-spacing:.05em; font-size:15px;">Cross-cuts <span class="small" style="text-transform:none; font-variant:normal;">— slice the whole store, not just run A/B</span></p>';
  h += ccControls(cc);
  h += '<div class="cc-chart">' + body + '</div>';
  h += '<p class="small cc-query">query: <code>' + uiEsc(ccQueryUrl(cc)) + '</code> · lift it into <code>dev/db-query.js</code> or see <code>docs/reference/query-cookbook.md</code></p>';
  el.innerHTML = h;
  chBindHits(el);

  // wire the pickers — every change is a new server query.
  var cut = $('ccCut'); if (cut) cut.onchange = function () { cc.cut = cut.value; renderDash(); ccReload(); };
  var metric = $('ccMetric'); if (metric) metric.onchange = function () { cc.metric = metric.value; ccReload(); };
  var x = $('ccX'); if (x) x.onchange = function () { cc.x = x.value; ccReload(); };
  var terrain = $('ccTerrain'); if (terrain) terrain.onchange = function () { cc.terrain = terrain.value; ccReload(); };
  var card = $('ccCard'); if (card) card.onchange = function () { cc.card = card.value; ccReload(); };
  var slice = $('ccSlice'); if (slice) slice.onchange = function () {
    var parts = slice.value.split('|'); cc.version = parts[0] || ''; cc.config = parts[1] || ''; ccReload();
  };
}

// Cross-cuts slices the WHOLE store (GET /api/aggregate), so it needs no run A/B.
dashPane({ id:'crosscuts', label:'Cross-cuts', needsRuns:false, render: renderCrosscuts });
