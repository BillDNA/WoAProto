/* War of Attrition — ui part: the Balance Dashboard's MAP DRILL-DOWN pane.
   THE QUESTION: on THIS map,
   what changed run A -> run B, and when in the skirmish did it happen?
   Breadcrumb map switcher under the Maps pill; an A|B|A/B segmented toggle
   (default B) drives the tempo lanes, the |FS-diff| track, and the
   hex lenses; the band board (reusing ovBandRowHtml with the 'map' small-n
   scope) and the settle curve (chSettleSvg) always show BOTH runs.

   Render-only: all shaping is CHART_MODEL.buildMapDrillModel (ui/chart-model.js);
   the cross-skirmish folds it draws over live in report-model.js (WOA_REPORT).
   Reads the SAME skirmish rows the Overview does (dashLoadSkirmishRows /
   SKIRMISH_CACHE in ui/net.js), filtered to one map client-side. Draws over the
   shared toolkit (ui/chart-primitives.js): the band-board row renderer
   (ovBandRowHtml, shared with the Overview pane), chSettleSvg, chLine/chText/
   chTipAttrs, and the .chtip/ch-hit hover layer (chBindHits). The hex boards
   reuse the board house's marks + viewBoxFor (the game's OWN board
   renderer) so the two hex renderers stay one visual language. */
'use strict';
/* The cross-skirmish folds these render functions draw over — envelopesForMap,
   laneAvg, fsDiffAvg — live in report-model.js (WOA_REPORT), and the whole
   pane's display model is assembled by CHART_MODEL.buildMapDrillModel
   (ui/chart-model.js). MD_LANES is the lane draw-order for the tempo section. */
var MD_LANES = ['deploy', 'attack', 'swap', 'march'];

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

/* The |FS-diff| sparkline that sits above the lanes. Greys
   honestly with a note instead of drawing anything when vd is null (every
   skirmish for this map/run predates the fs capture) — never a
   fabricated flat line. solidLabel names which run is drawing solid (A or
   B) for the "predates" note. */
function mdFsDiffTrackHtml(vd, ghostVd, solidLabel) {
  var LABEL_W = 56, W = 400, H = 30;
  if (!vd) {
    return '<div style="display:flex;gap:8px;opacity:.55;"><div style="flex:none;width:' + LABEL_W + 'px;"></div>' +
      '<p class="small" style="margin:0;flex:1;">|FS-diff| track unavailable for run ' + solidLabel +
      ' on this map &mdash; this run predates the fs capture.</p></div>';
  }
  var maxV = Math.max.apply(null, vd.points.concat(ghostVd ? ghostVd.points : []).concat([0.0001]));
  function poly(pts) {
    return pts.map(function (v, i) { return (i / (pts.length - 1) * W).toFixed(1) + ',' + (H - Math.max(0, v) / maxV * H).toFixed(1); }).join(' ');
  }
  var svg = chSvgOpen({ vb: '0 0 ' + W + ' ' + H, style: 'display:block;width:100%;height:' + H + 'px;' }) + chLine(0, H, W, H, CHART.axis, 1);
  if (ghostVd) svg += chPolyline(poly(ghostVd.points), { stroke: CHART.ink, sw: 1.5, dash: '4 2' });
  svg += chPolyline(poly(vd.points), { stroke: CHART.ink, sw: 2 }) + '</svg>';
  var note = vd.n < vd.total ? ' (n=' + vd.n + '/' + vd.total + ' skirmishes carry fs data)' : '';
  return '<div style="display:flex;gap:8px;align-items:flex-end;">' +
    '<div style="flex:none;width:' + LABEL_W + 'px;text-align:right;font-size:9.5px;font-style:italic;color:' + CHART.muted + ';padding-bottom:2px;">avg<br>|FS diff|' + note + '</div>' +
    '<div style="flex:1;">' + svg + '</div></div>';
}

/* Tempo lanes + |FS-diff| track, together (design 3a — the track sits above
   the lanes it shares an x-axis with). abMode: 'A' shows run A solid; 'B'
   (default) shows run B solid; 'AB' shows run B solid with run A as a ghost
   overlay (both toggle branches read the SAME abMode the ticket specifies —
   there is no separate "which run is primary" state). */
function mdTempoSection(mapName, tempo) {
  var solidEnv = tempo.solidEnv, solidLabel = tempo.solidLabel, ghostEnv = tempo.ghostEnv;
  var laneSolid = tempo.laneSolid, laneGhost = tempo.laneGhost;
  var vdSolid = tempo.vdSolid, vdGhost = tempo.vdGhost;

  var h = '<div style="font-size:13px;font-weight:bold;margin-bottom:2px;">Tempo lanes ' +
    '<span class="small" style="font-style:italic;">(design 3a &mdash; each lane its OWN scale, never a 100%-stacked share)</span></div>';
  if (!laneSolid) {
    return h + '<p class="small">No skirmishes on ' + chEsc(mapName) + ' for run ' + solidLabel + ' yet.</p>';
  }
  var BAR_H = 46, LABEL_W = 56;
  h += mdFsDiffTrackHtml(vdSolid, vdGhost, solidLabel);
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
    '<span style="margin-left:' + LABEL_W + 'px;">turn 1</span><span>skirmish end</span></div>';
  var ghostNote = ghostEnv ? ' &middot; B solid, A ghost outline' : '';
  h += '<p class="small" style="margin-top:6px;">n = ' + solidEnv.length + ' skirmish(s) on run ' + solidLabel + ghostNote + '.</p>';
  return h;
}

/* This-map band board (the Overview board filtered to one map): the EXACT
   Overview row renderer (ovBandRowHtml), just fed this map's own {agg,done}
   and the 'map' small-n scope (n<40/map greys, not the fleet's n<240) —
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
    '<p class="small" style="margin:6px 0 0;">% of skirmish length after which the lead never flips again &mdash; A dashed n=' +
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

/* =================== hex lenses ===================
   THREE spatial reads on THIS map's board — occupancy, ownership flips, kills
   — the drill-down's only SPATIAL view (tempo/FS/bands are all temporal or
   aggregate). A real board: the tile and the HQ are the board house's marks at
   the mapPane scale, so a lens looks like the game.

   The lens OVERLAYS are chart marks, not board ones — the dead-hex hatch, the
   avenue ring and the A-run ghost say something about the numbers, not about
   the board, and they are read against the chart legend beside them.

   The fold (report-model.js foldHexLenses) is pure over the trace; THIS layer
   owns the map/board join (HQ hexes, outline, labels) the fold doesn't know. */
var MD_HEX_LENSES = [
  { key: 'occ',   title: 'occupancy',      sub: '% of turns held', fmt: function (v) { return Math.round(v * 100) + '%'; } },
  { key: 'flips', title: 'ownership flips', sub: 'flips / skirmish',  fmt: function (v) { return WOA_REPORT.f1(v); } },
  { key: 'kills', title: 'kills',           sub: 'kills / skirmish',  fmt: function (v) { return WOA_REPORT.f1(v); } }
];

/* map NAME (the DB/trace `map` field IS st.mapName = map.name) -> its map def
   on disk, or null if it's been deleted since the run. Searched over the whole
   map library (E.MAPS), not just the active mapset — a run may predate a pool edit. */
function mdMapDef(mapName) {
  var maps = E.MAPS || [];
  for (var i = 0; i < maps.length; i++) if (maps[i].name === mapName) return maps[i];
  return null;
}
/* the map's outline WITHOUT moving the live engine board — E.outline is pure,
   so opening the dashboard never switches the board out from under a paused
   live game. null on a malformed outline (caller notes it). */
function mdOutlineOf(map) {
  try { return E.outline(map); } catch (e) { return null; }
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
function mdHexLensSection(mapName, hex) {
  var head = '<div style="font-size:13px;font-weight:bold;margin:18px 0 2px;">Hex lenses ' +
    '<span class="small" style="font-style:italic;">(where the skirmish actually happens on this map)</span></div>';
  var map = mdMapDef(mapName);
  if (!map) return head + '<p class="small">No board outline on disk for &ldquo;' + chEsc(mapName) + '&rdquo; &mdash; it may have been deleted since this run.</p>';
  var outline = mdOutlineOf(map);
  if (!outline) return head + '<p class="small">Could not build the board outline for &ldquo;' + chEsc(mapName) + '&rdquo;.</p>';
  var hexList = E.outlineHexes(outline);
  var hqRed = E.key(map.redHQ[0], map.redHQ[1]), hqBlue = E.key(map.blueHQ[0], map.blueHQ[1]);

  var foldA = hex.foldA, foldB = hex.foldB;
  var solid = hex.solid, ghost = hex.ghost, solidLabel = hex.solidLabel;
  if (!solid.n) return head + '<p class="small">No skirmishes on ' + chEsc(mapName) + ' for run ' + solidLabel + ' yet.</p>';

  var vb = viewBoxFor(hexList, null, 'mapPane');
  // dead-hex hatch: one <pattern>, defined once, referenced by url() doc-wide
  var defs = chHatchDefs('mdHatch');

  var boards = MD_HEX_LENSES.map(function (lens) {
    // display max over BOTH runs' hexes for this lens, so ghost + solid compare
    // on ONE scale (mirrors the tempo lanes' shared laneMax).
    var max = 0;
    [solid, ghost].forEach(function (f) { if (!f) return; Object.keys(f.hexes).forEach(function (k) { var v = f.hexes[k][lens.key]; if (v > max) max = v; }); });

    var cells = '', overlays = '', hits = '';
    hexList.forEach(function (k) {
      var on = 'mapPane';
      var d = solid.hexes[k], g = ghost ? ghost.hexes[k] : null, isHQ = (k === hqRed || k === hqBlue);
      // dead = <5% occupancy — a never-touched hex (absent from the fold, occ 0)
      // is the deadest of all, so hatch it too; HQ exempt (always held, but the
      // trace never logs an HQ hex unless it's attacked). Occupancy-based, so a
      // hex reads dead-or-not identically across all three lenses.
      var dead = !isHQ && (d ? d.dead : true);
      cells += bpMarkup(function (g) {
        bpMark('tile', g, { hex: k, on: on, fill: mdLensFill(d ? d[lens.key] : 0, max), stroke: CHART.axis });
      });
      if (dead) overlays += bpMarkup(function (g) {
        bpMark('tile', g, { hex: k, on: on, fill: 'url(#mdHatch)', stroke: 'none' });
      });
      // avenue of attack: a NESTED hex red ring (real polygon stroke, never a css outline on a clip — AC2)
      if (d && d.avenue) overlays += bpMarkup(function (g) {
        bpMark('hexRing', g, { hex: k, on: on, of: 0.62, stroke: CHART.breach, sw: 2.5 });
      });
      // A/B ghost: dashed inner hex sized by run A's value on the shared max
      if (g && g[lens.key] > 0 && max > 0) {
        var gr = 0.16 + 0.74 * Math.min(1, g[lens.key] / max);
        overlays += bpMarkup(function (gg) {
          bpMark('hexRing', gg, { hex: k, on: on, of: gr, stroke: CHART.ink, sw: 1.3, dash: '3 2' });
        });
      }
      // HQ marker: thick side-coloured border + star
      if (isHQ) {
        var hc = (k === hqRed) ? CHART.divRed[2] : CHART.divBlue[2];
        overlays += bpMarkup(function (g) {
          bpMark('hq', g, { hex: k, on: on, fill: 'none', stroke: hc, starFill: hc });
        });
      }
      // hover: per-hex values for BOTH runs (A -> B), plus the classification tags
      var lbl = E.outlineLabel(outline, k) + (isHQ ? (k === hqRed ? ' · red HQ' : ' · blue HQ') : '');
      var rows = MD_HEX_LENSES.map(function (L) {
        var av = foldA.hexes[k] ? foldA.hexes[k][L.key] : 0, bv = foldB.hexes[k] ? foldB.hexes[k][L.key] : 0;
        return [L.sub, L.fmt(av) + ' → ' + L.fmt(bv)];
      });
      if (dead) rows.push(['flag', 'dead hex (<5% held)']);
      if (d && d.avenue) rows.push(['flag', 'avenue of attack']);
      hits += bpMarkup(function (g) {
        bpMark('hexHit', g, { hex: k, on: on, cls: 'ch-hit', attrs: chTipData(lbl, rows) });
      });
    });
    var svg = chSvgOpen({ vb: vb, role: 'img', aria: lens.title + ' on ' + mapName,
      style: 'display:block;width:100%;height:auto;background:' + CHART.surface + ';border-radius:6px;' }) +
      cells + overlays + hits + '</svg>';
    return '<div style="flex:1 1 220px;min-width:200px;max-width:330px;">' +
      '<div style="font-size:11.5px;font-weight:bold;color:' + CHART.ink + ';margin-bottom:2px;">' + lens.title +
      ' <span class="small" style="font-weight:normal;font-style:italic;color:' + CHART.muted + ';">(' + lens.sub + ', max ' + lens.fmt(max) + ')</span></div>' + svg + '</div>';
  }).join('');

  // self-styled legend (the .chkey/.sw CSS is scoped under .chcard; the drill-down
  // lives in .mapd-wrap, so inline every swatch here — the drill-down convention)
  var hatchSw = 'repeating-linear-gradient(45deg,transparent,transparent 2px,' + CHART.muted + ' 2px,' + CHART.muted + ' 3px)';
  function mdSw(css) { return uiSwatch(css); } // one swatch lives in ui-primitives.js
  var key = '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:12px;color:' + CHART.inkSoft + ';margin-top:10px;">' +
    '<span>fill&nbsp;' + CHART.seq.map(function (c) { return mdSw('background:' + c + ';margin-right:0;'); }).join('') + '&nbsp;low&rarr;high</span>' +
    '<span>' + mdSw('background:' + CHART.surface + ';border:1px solid ' + CHART.axis + ';') + '0 (this lens)</span>' +
    '<span>' + mdSw('background:' + hatchSw + ';border:1px solid ' + CHART.muted + ';') + 'dead hex &lt;5% held</span>' +
    '<span>' + mdSw('border:2px solid ' + CHART.breach + ';background:transparent;') + 'avenue of attack</span>' +
    '<span><span style="font-size:15px;color:' + CHART.divRed[2] + ';vertical-align:-1px;">★</span> HQ</span></div>';

  var ghostNote = ghost ? ' &middot; B fill, A dashed-ghost (inner-hex size = A on the shared scale)' : '';
  return head +
    '<p class="small" style="margin:2px 0 8px;">Run ' + solidLabel + ' solid, n = ' + solid.n + ' skirmish(s) on ' + chEsc(mapName) + ghostNote +
    '. Occupancy = % of turns a hex was held; flips &amp; kills are per-skirmish rates. Hover a hex for A&rarr;B values.</p>' +
    defs + '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;">' + boards + '</div>' + key;
}

/* Assembles the full Map drill-down pane from two runs' already-fetched
   skirmish rows (the SAME rowsA/rowsB shape ovRenderBody consumes), filtered
   to DASH.mapFocus. DASH.mapFocus falls back to the first map (alpha) when
   unset or stale (e.g. it named a map only the PRIOR A/B pair had). */
function mdRenderBody(el, rowsA, rowsB) {
  // All the pane's data-shaping is one pure call; this function only draws.
  var model = CHART_MODEL.buildMapDrillModel(rowsA, rowsB, DASH.mapFocus, DASH.abMode);
  if (!model) { el.innerHTML = '<p class="small">No per-map skirmish rows for either run yet.</p>'; return; }
  DASH.mapFocus = model.mapName; // persist the builder's resolved focus (may have fallen back from a stale one)
  var mapList = model.mapList, idx = model.idx, mapName = model.mapName;

  var h = '<div class="mapd-wrap">' + mdHeaderHtml(mapList, idx, model.scoreA, model.scoreB, model.regressed) + '<div class="mapd-grid">';
  h += '<div class="mapd-col-l">' + mdTempoSection(mapName, model.tempo) + mdBandBoard(model.aggA, model.aggB, DASH.temperature) + '</div>';
  h += '<div class="mapd-col-r">' + mdSettleCurve(model.envA, model.envB) + '</div>';
  h += '</div>'; // close mapd-grid
  h += mdHexLensSection(mapName, model.hex); // full-width spatial view, follows the A|B|A/B toggle
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
  var loaded = dashLoadSkirmishRows(function (rowsA, rowsB) {
    if (rowsA == null) { el.innerHTML = '<p class="small">Could not load skirmish rows for the selected runs &mdash; is <code>node game/server.js</code> running?</p>'; return; }
    mdRenderBody(el, rowsA, rowsB);
  });
  if (!loaded) el.innerHTML = '<p class="small">Loading skirmish rows for run A &amp; B&hellip;</p>';
}

dashPane({ id:'maps', label:'Maps', needsRuns:true, render: renderMapDrill });
