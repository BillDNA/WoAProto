/* Both rosters, mirrored from the left column for small screens. */
'use strict';

uiModal({ id:'rosters', title:'Rosters', width:420, bodyClass:'rosters-feed',
  render: function(){ syncRostersOverlay(); } });
