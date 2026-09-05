/* Where a blow came from: a dashed line hex to hex, bending through a via-hex,
   with an arrowhead stopping short of the target's centre. */
'use strict';

defineBoardMark({
  mark: 'strike',
  lifetime: 'transient',
  draw: function(g, o){
    var d = o.d;
    var pts = [hexXY(o.from, o.s)];
    if (o.via) pts.push(hexXY(o.via, o.s));
    pts.push(hexXY(o.to, o.s));
    var grp = svgEl('g', { 'class':o.cls || 'fx-strike', 'pointer-events':'none' });
    var line = { points: pts.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '),
      fill:'none', stroke:o.color, 'stroke-width':d.sw, 'stroke-linecap':'round',
      'stroke-linejoin':'round', 'stroke-dasharray':d.dash };
    if (d.opacity != null) line.opacity = d.opacity;   // otherwise the class carries it
    grp.appendChild(svgEl('polyline', line));
    var a = pts[pts.length-2], b = pts[pts.length-1];
    var ang = Math.atan2(b[1]-a[1], b[0]-a[0]);
    var tip = [b[0]-Math.cos(ang)*o.s*d.tip, b[1]-Math.sin(ang)*o.s*d.tip];
    var p1 = [tip[0]-Math.cos(ang)*d.headL+Math.sin(ang)*d.headW, tip[1]-Math.sin(ang)*d.headL-Math.cos(ang)*d.headW];
    var p2 = [tip[0]-Math.cos(ang)*d.headL-Math.sin(ang)*d.headW, tip[1]-Math.sin(ang)*d.headL+Math.cos(ang)*d.headW];
    grp.appendChild(svgEl('polygon', { points: [tip, p1, p2].map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '),
      fill:o.color, stroke:o.ink.outline, 'stroke-width':1 }));
    g.appendChild(grp);
    return grp;
  }
});
