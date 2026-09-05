/* The attack-math pill under a hex — "5 vs 3", coloured by who wins it. On the
   live board it appears under the cursor and goes with it; in the Field Manual
   the same pill is frozen into a diagram frame. */
'use strict';

defineBoardMark({
  mark: 'pill',
  lifetime: 'standing',
  draw: function(g, o){
    var xy = hexXY(o.hex, o.s), d = o.d;
    var w = o.text.length * d.charW + d.pad, top = xy[1] + o.s * d.dy;
    var grp = svgEl('g', { 'class':'pill' });
    grp.appendChild(svgEl('rect', { x:xy[0] - w/2, y:top, width:w, height:d.h, rx:d.rx,
      fill: o.ink.hint[o.outcome] || o.ink.hint[d.noOutcome],
      stroke:o.ink.outline, 'stroke-width':d.sw }));
    var t = svgEl('text', { x:xy[0], y:top + d.textDY, 'text-anchor':'middle',
      'font-size':d.fs, 'font-weight':'bold', fill:o.ink.star, 'class':'pill-t' });
    t.textContent = o.text;
    grp.appendChild(t);
    g.appendChild(grp);
    return grp;
  }
});
