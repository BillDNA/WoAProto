/* The BATTALION-SLOTS record: the five named slots of the Battalion Editor.

   Was an unversioned {active, slots}; that spelling still reads. The editor
   (ui/battalion-editor.js) is the only thing that writes it. */
'use strict';

var STORE_BATTALIONS = uiStore({ id: 'battalions', key: 'woa-battalions', version: 1,
  migrate: function(v){ return v && v.slots ? v : null; } });
