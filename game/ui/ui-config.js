/* War of Attrition — UI-tier config home: UI-only guardrails.

   Made by Engine.defineConfigHome, same as the engine home. Holds only guardrails the
   engine never checks (the battalion size band); rules-facing dials live in Engine.CONFIG.
   Classic script, no wrapper; loads after the engine, before the builders that read UI_CONFIG. */
'use strict';

var UI_CONFIG = window.Engine.defineConfigHome({
  // battalion size band: sum(count) must land in [min, max]; the player builder and
  // the dev battalion editor share it. UI-only — battalions are content.
  battalionBand: { min: 16, max: 19 }
});
