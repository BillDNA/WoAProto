/* The PROMPT region: the bar that says what the current step wants. Painted by
   the turn house. */
'use strict';

uiRegion({ id:'prompt', el:'promptbar', paint: function(){ renderPrompt(); } });
