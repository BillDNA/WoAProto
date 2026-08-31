/* The auditable invariant registry + the two suite-guard predicates (ADR-0004,
   #189). A plain module, NOT a node:test file — the guard TESTS live in
   game/test.invariants.js and call these pure functions, so the same logic can
   be exercised against synthetic fixtures (a divergent registry, a deleted pin)
   without touching the real suite.

   Two things are guarded:
     1. The invariant registry — the ONE named, small, auditable list of the
        properties that must hold every rules era. `registryDivergence` reds if
        the tests actually labelled `invariant()` diverge from this list (an
        unlabelled invariant may not hide behind the pin default; a registry
        entry may not name a test nobody labelled).
     2. The pin manifest — every test present at the base commit. `removalViolations`
        reds when a base test is absent or `.skip`-ed, UNLESS the removal is a
        surfaced act: a paired pin-prune record, or a RULES_VERSION bump (a pin
        moves atomically with the version — see docs/context/test.md). */
'use strict';

// The frozen, named list of invariant CATEGORIES. This set cannot silently grow
// or shrink: `registryDivergence` reds if the registry's keys drift from it.
var CATEGORIES = Object.freeze(['determinism', 'parity', 'legality', 'terminal', 'conservation']);

// The registry itself: each category maps to the exact names of the tests
// labelled `invariant('<category>', '<name>', ...)` in game/test.invariants.js.
// Editing an entry here without moving the matching `invariant()` label (or vice
// versa) reds the registry guard — that is the audit.
var INVARIANT_REGISTRY = Object.freeze({
  determinism: ['invariant/determinism: same seed reproduces the skirmish'],
  parity: ['invariant/parity: interactive step path equals the batch sim'],
  legality: ['invariant/legality: every generated choice is a legal move'],
  terminal: ['invariant/terminal: AI-vs-AI always reaches a terminal state'],
  conservation: ['invariant/conservation: piece and terrain stocks stay finite'],
});

// Does the set of tests actually labelled `invariant()` match the named registry?
// `collected` is [{category, name}] gathered at require time by test.helpers.js.
// Returns three (ideally empty) buckets; the guard test reds if any is non-empty.
function registryDivergence(registry, collected) {
  var catSet = {};
  CATEGORIES.forEach(function (c) { catSet[c] = true; });

  var badCategory = [];
  Object.keys(registry).forEach(function (c) {
    if (!catSet[c]) badCategory.push('registry names category "' + c + '" outside the frozen set');
  });
  CATEGORIES.forEach(function (c) {
    if (!registry[c]) badCategory.push('frozen category "' + c + '" missing from registry');
  });

  var declared = {};
  Object.keys(registry).forEach(function (c) {
    (registry[c] || []).forEach(function (name) { declared[c + '::' + name] = true; });
  });
  var seen = {};
  var missingFromRegistry = [];   // labelled invariant() but not in the registry
  collected.forEach(function (t) {
    var key = t.category + '::' + t.name;
    seen[key] = true;
    if (!catSet[t.category]) badCategory.push('test "' + t.name + '" labelled with category "' + t.category + '" outside the frozen set');
    else if (!declared[key]) missingFromRegistry.push(key);
  });
  var missingFromSuite = [];      // registry names it but nothing labels it
  Object.keys(declared).forEach(function (key) {
    if (!seen[key]) missingFromSuite.push(key);
  });

  return { missingFromRegistry: missingFromRegistry, missingFromSuite: missingFromSuite, badCategory: badCategory };
}

// Which base-commit tests were removed (deleted or `.skip`-ed) WITHOUT a surfaced
// act? `manifest` = { rulesVersion, tests:[name], prunedPins:[{name,...}] };
// `activeNames` = the names actually registered-and-not-skipped this run;
// `currentRulesVersion` = E.VERSION now.
//   - A RULES_VERSION bump licenses pin moves wholesale (the manifest is expected
//     to be regenerated at the new version) → no violations while versions differ.
//   - Otherwise every base test must still be active, unless it carries a
//     pin-prune record. A bare deletion/skip with neither is a violation → red.
function removalViolations(manifest, activeNames, currentRulesVersion) {
  if (currentRulesVersion !== manifest.rulesVersion) return [];
  var active = {};
  activeNames.forEach(function (n) { active[n] = true; });
  var pruned = {};
  (manifest.prunedPins || []).forEach(function (p) { pruned[p.name] = true; });
  return (manifest.tests || []).filter(function (n) { return !active[n] && !pruned[n]; });
}

module.exports = { CATEGORIES: CATEGORIES, INVARIANT_REGISTRY: INVARIANT_REGISTRY, registryDivergence: registryDivergence, removalViolations: removalViolations };
