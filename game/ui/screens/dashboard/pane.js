/* War of Attrition — the dashboard PANE kind: one of the two households built
   over ui/kit/kind.js.

   A pane file declares itself with dashPane({...}) and supplies only the part
   that is its own: the render. Its pill, its mount element, its show/hide and
   its no-runs fallback are the shell's. Registration order is pill order. */
'use strict';

var DASH_PANE = defineKind({
  name: 'dashPane',
  mount: 'dashPane<Id>',
  container: 'dashPanes',
  fields: {
    label:     'string',    // the pill's text
    needsRuns: 'boolean',   // true => the shell shows the pick-runs note until run A and B are set
    chrome:    'string[]?', // element ids revealed only while this pane is the one showing
    render:    'function'   // function(el) — the only part a pane writes
  },
  markup: function(p){
    return '<div id="' + p.mount + '" class="dash-pane" style="display:none;"></div>';
  }
});

function dashPane(entry){ return DASH_PANE.register(entry); }

// The pills are the pane shell's own nav — built from the registry beside the
// mounts, so index.html holds two empty containers and never the list.
function dashPanesBuild(){
  if (!DASH_PANE.build()) return;
  var pills = $('dashPills');
  if (!pills || pills.innerHTML) return;
  pills.innerHTML = DASH_PANE.all().map(function(p){
    return '<button class="dpill" data-view="' + p.id + '" type="button">' + uiEsc(p.label) + '</button>';
  }).join('');
}

// Show exactly one pane: its mount, its chrome, and either its render or the
// shell's fallback note. Everything the registry knows about is hidden first,
// so a pane never has to clean up after its neighbour.
function dashPanesShow(view){
  dashPanesBuild();
  DASH_PANE.all().forEach(function(p){
    var el = $(p.mount);
    if (el) el.style.display = (p.id === view) ? '' : 'none';
    (p.chrome || []).forEach(function(cid){
      var c = $(cid);
      if (c) c.style.display = (p.id === view) ? '' : 'none';
    });
  });
  var pane = DASH_PANE.get(view), mount = pane && $(pane.mount);
  if (!pane || !mount) return;
  if (pane.needsRuns && !(DASH.runs.length && DASH.runA != null && DASH.runB != null)){
    mount.innerHTML = dashPaneNote(pane);
    return;
  }
  pane.render(mount);
}

function dashPaneNote(pane){
  return '<p class="small" style="font-variant:small-caps; letter-spacing:.05em; font-size:15px;">' + uiEsc(pane.label) + '</p>' +
    (DASH.runs.length
      ? '<p class="small">Pick run A and run B above to compare.</p>'
      : '<p class="small">No saved runs yet in <code>logs/woa.db</code> — run a report on the Tables tab, or play a skirmish, then come back.</p>');
}
