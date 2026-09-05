/* The DEV-MODE record: whether this browser shows the dev surfaces.

   Was a bare '1'; that spelling still reads as on. What the flag reveals is the
   screen registry's business (ui/screens.js), which reads it through here. */
'use strict';

var STORE_DEV = uiStore({ id: 'dev', key: 'woa-dev', version: 1,
  migrate: function(v){ return v === 1 || v === '1' ? true : null; } });
