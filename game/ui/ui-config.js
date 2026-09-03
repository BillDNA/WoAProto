/* War of Attrition — ui config home: UI-only guardrails (issue #250).

   The SAME repeatable config pattern as Engine.CONFIG, a DIFFERENT home
   (progressive disclosure): the rules kernel owns rules-facing dials; this UI
   tier owns UI-enforced presentation guardrails. Neither leaks constants into
   the other — the engine never enforces these (only the UI does), so they stay
   off the engine surface.

   One object owns each guardrail as named data; consumers read it instead of a
   bare literal (the battalion band was duplicated across two UI files). The digest
   reuses the ONE engine digest util (Engine.configDigest) so both homes carry
   identical digest treatment.

   Only genuinely UI-only guardrails live here. The map hex ceiling is NOT one of
   them — the engine's map validator enforces it too, so it lives in Engine.CONFIG
   (one owner both tiers read), and the map editor reads E.CONFIG.mapHexCeiling.

   Classic script, NO wrapper — top-level `UI_CONFIG` attaches to window the way
   the other ui/ files cross-reference each other by bare name. Loads after the
   engine (needs Engine.configDigest) and before its consumers (battalion-editor,
   build-battalion). */
'use strict';

var UI_CONFIG = {
  // battalion size band: sum(count) must land in [min, max] (the player builder
  // and the dev battalion editor share this one band). Truly UI-only — the engine
  // never checks battalion size (battalions are content).
  battalionBand: { min: 16, max: 19 }
};
// Deterministic digest, same treatment as the engine home: non-enumerable so it
// never feeds its own hash; computed by the ONE engine digest util.
Object.defineProperty(UI_CONFIG, 'digest', {
  enumerable: false,
  get: function () { return window.Engine.configDigest(UI_CONFIG); }
});
