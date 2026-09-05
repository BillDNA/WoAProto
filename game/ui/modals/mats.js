/* The Mats overlay: the physical pieces each side is holding, mirrored from the
   left rail for small screens. The player-facing label is unchanged. */
'use strict';

uiModal({ id:'mats', title:'Rosters', width:420, bodyClass:'mats-feed',
  render: function(){ regionMirror('mats'); } });
