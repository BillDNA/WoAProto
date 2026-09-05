/* War of Attrition — ui part: the shared CHROME primitives toolkit. The
   HTML-string twin of chart-primitives.js (SVG marks) and board-primitives.js
   (board marks): the repeated bits of in-game HTML that were hand-typed in
   many places — the html-escape, the legend swatch, the sortable table header
   — each live here once, so restyling one is a one-function edit. Modals are
   a kind, not a primitive: ui/modals/modal.js. Behaviour verbs that touch the
   live DOM (show, toast) live in app.js next to $; this file builds strings.
   Card tiles, pips, the tug bar, unit slots, key-value rows are already
   single-sourced by CSS classes (style.css) — no primitive needed.

   Classic script, no wrapper — top-level names attach to window; loads right
   after app.js so every ui file can build over it. */
'use strict';

// the ONE html-escape (null-guarded superset of the old chEsc/dkEsc)
function uiEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// a legend swatch (inline-styled so it works OUTSIDE .chcard, where the scoped
// .sw class can't reach). `css` sets its own background/border; o = {size, valign}
// defaults to the 12×12 / -2px box (the Cards strip passes 11 / -1).
function uiSwatch(css, o){
  o = o || {};
  var sz = o.size != null ? o.size : 12, va = o.valign != null ? o.valign : -2;
  return '<span style="display:inline-block;width:'+sz+'px;height:'+sz+'px;border-radius:2px;vertical-align:'+va+'px;margin-right:4px;box-sizing:border-box;' + css + '"></span>';
}

// one sortable table header cell. col = [key, label]; keyAttr picks the sort
// attribute the table's click handler reads (data-key / data-ckey).
function uiSortableTh(col, activeKey, dir, tip, keyAttr){
  var active = activeKey === col[0];
  return '<th class="sortable'+(active?' sorted':'')+'" '+(keyAttr||'data-key')+'="'+col[0]+'" title="'+(tip||'')+' &middot; click to sort">'+
    col[1]+(active?(dir>0?' &#9650;':' &#9660;'):'')+'</th>';
}
