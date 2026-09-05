/* Resolving a step: the one path every player move on the board takes.

   The win card waits ~.9s so the closing strike arrow and death animation
   finish first — the only action that holds it, because it is the only one a
   player can watch land. */
'use strict';

var act = uiAction({ id: 'step', overDelay: 900,
  run: function(choice){ E.applyStep(APP.st, choice); },
  fx: function(choice){ return capturePre(APP.st, choice); } });
