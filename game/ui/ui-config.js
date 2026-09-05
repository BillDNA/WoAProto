/* The UI tier's config home: guardrails the engine never checks. Rules-facing
   dials live in Engine.CONFIG; a household's drawn dials live with the household
   (ui/board/<house>/<house>-config.js).

   Classic script, no wrapper; loads after the engine, before its readers. */
'use strict';

var UI_CONFIG = window.Engine.defineConfigHome({
  // battalion size band: sum(count) must land in [min, max]; the player builder and
  // the dev battalion editor share it. UI-only — battalions are content.
  battalionBand: { min: 16, max: 19 }
});
