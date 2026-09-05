/* The campaign journal, mirrored from the inline log. */
'use strict';

uiModal({ id:'journal', title:'Campaign Journal', width:560, bodyClass:'journal-feed',
  render: function(){ syncJournalOverlay(); } });
