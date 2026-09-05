/* The BOARD region: the field itself, in the centre column.

   Painted by the board house. It has no mirror — a battle you cannot see the
   board of is not a battle, so this region is what the small-screen layout
   keeps and the rails are what it gives up. */
'use strict';

uiRegion({ id:'board', el:'boardwrap', paint: function(){ renderBoard(); } });
