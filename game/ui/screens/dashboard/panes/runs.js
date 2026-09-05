/* Dashboard pane: RUNS — the raw listing behind the A/B pickers. */
'use strict';

function renderRuns(el){
  if (!DASH.runs.length){ el.innerHTML = '<p class="small">No saved runs yet in <code>logs/woa.db</code>.</p>'; return; }
  el.innerHTML = '<h3>Saved runs <span class="small">(' + DASH.runs.length + ')</span></h3><table><tr>' +
    '<th>#</th><th>Version</th><th>Kind</th><th>n</th><th>Label</th></tr>' +
    DASH.runs.map(function(r){
      return '<tr><td>' + r.id + '</td><td>' + uiEsc(r.version||'?') + '</td><td>' + uiEsc(r.kind||'') +
        '</td><td>' + (r.n||'') + '</td><td style="text-align:left;">' + uiEsc(r.label||'') +
        (r.baseline ? ' &#9733;baseline' : '') + '</td></tr>';
    }).join('') + '</table>';
}

dashPane({ id:'runs', label:'Runs', needsRuns:false, render: renderRuns });
