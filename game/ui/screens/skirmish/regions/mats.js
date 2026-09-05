/* The MATS region: the two player mats down the left rail.

   Painted by the board house. On a small screen the rail is gone and the region
   mirrors into the mats overlay behind its floating button. */
'use strict';

uiRegion({ id:'mats', el:'leftcol',
  paint: function(){ renderMat('red'); renderMat('blue'); },
  mirror: { modal:'mats', fab:'fabRosters', body:'matsOvrBody', wire: function(body){
    // the mirrored spent-track is CSS-hidden on small screens; that's fine — the
    // Cards glossary carries the full read
    var sp = body.querySelector('.spent'); if (sp) sp.onclick = showCards;
  } } });
