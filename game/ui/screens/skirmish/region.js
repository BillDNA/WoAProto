/* The SKIRMISH SCREEN's REGION base.

   The screen is a list of regions. A region says which element it owns, which
   household paints it, and — for the two rails a small screen cannot afford —
   which modal it mirrors into behind a floating button.

   The mirror is the reason this is a base rather than a list. It is the same
   act both times: copy the rail's markup across, drop the part the modal
   already provides, and put back the handlers innerHTML just dropped. Both were
   written out in full, each with its own sync function, its own re-sync call
   buried inside a render, and its own wiring.

   uiRegion({id, el, paint, mirror}); `mirror` is {modal, body, strip, wire}.
   regionsPaint() repaints the screen in declaration order; regionsSync()
   refreshes whichever mirrors are open. */
'use strict';

var UI_REGIONS = [], UI_REGION_BY_ID = {};

function uiRegion(spec){
  if (UI_REGION_BY_ID[spec.id]) throw new Error('uiRegion: duplicate id ' + JSON.stringify(spec.id));
  if (typeof spec.paint !== 'function') throw new Error('uiRegion(' + spec.id + '): missing paint');
  UI_REGIONS.push(spec);
  UI_REGION_BY_ID[spec.id] = spec;
  return spec;
}

function regionsPaint(){ UI_REGIONS.forEach(function(r){ r.paint(); }); }

// Copy a region into its modal body. innerHTML mirroring drops every handler,
// so the mirror re-wires itself on each sync.
function regionMirror(id){
  var r = UI_REGION_BY_ID[id], m = r && r.mirror;
  if (!m) return;
  var body = $(m.body), src = $(r.el);
  if (!body || !src) return;
  body.innerHTML = src.innerHTML;
  if (m.strip){ var s = body.querySelector(m.strip); if (s) s.remove(); }
  if (m.wire) m.wire(body);
}

function regionsSync(){
  UI_REGIONS.forEach(function(r){
    if (r.mirror && modalIsOpen(r.mirror.modal)) regionMirror(r.id);
  });
}
