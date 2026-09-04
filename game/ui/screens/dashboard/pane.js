/* War of Attrition — the dashboard PANE kind: the registry (what panes exist)
   and the factory (the shell every pane gets for free).

   A pane file declares itself with dashPane({...}) and supplies only the part
   that is its own: the render. Its pill, its mount element, its show/hide and
   its no-runs fallback are the factory's. Registration order is pill order.

   Shape is validated at registration, so a malformed pane throws while the
   page loads rather than when someone clicks its pill. */
'use strict';

var DASH_PANES = [];          // registration order == pill order
var DASH_PANE_BY_ID = {};

/* entry:
     id        lowercase word; also names the mount element (#dashPane<Id>)
     label     the pill's text
     needsRuns true => the factory shows the pick-runs note until run A and B are set
     chrome    element ids revealed only while this pane is the one showing
     render    function(el) — the only part a pane writes */
function dashPane(entry){
  var id = entry && entry.id;
  function bad(msg){ throw new Error('dashPane(' + JSON.stringify(id) + '): ' + msg); }
  if (typeof id !== 'string' || !/^[a-z][a-z0-9]*$/.test(id)) bad('id must be a lowercase word');
  if (DASH_PANE_BY_ID[id]) bad('duplicate id');
  if (typeof entry.label !== 'string' || !entry.label) bad('label must be a non-empty string');
  if (typeof entry.needsRuns !== 'boolean') bad('needsRuns must be true or false');
  if (typeof entry.render !== 'function') bad('render must be a function');
  if (entry.chrome != null && !Array.isArray(entry.chrome)) bad('chrome must be an array of element ids');

  var pane = {
    id: id, label: entry.label, needsRuns: entry.needsRuns,
    chrome: entry.chrome || [], render: entry.render,
    mount: 'dashPane' + id.charAt(0).toUpperCase() + id.slice(1)
  };
  DASH_PANES.push(pane);
  DASH_PANE_BY_ID[id] = pane;
  return pane;
}

// Pills and mount divs are built from the registry the first time the
// dashboard renders — index.html holds the two empty containers, not the list.
var dashPanesBuilt = false;
function dashPanesBuild(){
  if (dashPanesBuilt) return;
  var pills = $('dashPills'), body = $('dashPanes');
  if (!pills || !body) return;
  pills.innerHTML = DASH_PANES.map(function(p){
    return '<button class="dpill" data-view="' + p.id + '" type="button">' + uiEsc(p.label) + '</button>';
  }).join('');
  body.innerHTML = DASH_PANES.map(function(p){
    return '<div id="' + p.mount + '" class="dash-pane" style="display:none;"></div>';
  }).join('');
  dashPanesBuilt = true;
}

// Show exactly one pane: its mount, its chrome, and either its render or the
// factory's fallback note. Everything the registry knows about is hidden first,
// so a pane never has to clean up after its neighbour.
function dashPanesShow(view){
  dashPanesBuild();
  DASH_PANES.forEach(function(p){
    var el = $(p.mount);
    if (el) el.style.display = (p.id === view) ? '' : 'none';
    p.chrome.forEach(function(cid){
      var c = $(cid);
      if (c) c.style.display = (p.id === view) ? '' : 'none';
    });
  });
  var pane = DASH_PANE_BY_ID[view], mount = pane && $(pane.mount);
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
