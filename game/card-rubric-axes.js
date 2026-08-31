/* War of Attrition — the card-rubric axes as ONE keyed list (#166, spec §8 A3, §12.2).
 *
 * `docs/rubrics/card-rubric.md` is the prose the fresh grader reads; its axes are prose
 * assertions with no ids. But the loop's grader emits findings the Workbench must LABEL and
 * pull apart — the set-fit finding (#163) shown as its own block, not pattern-matched out of a
 * prose blob (#177). That needs a stable machine-readable key per axis. This file is that key,
 * and it is the SINGLE source of truth for it (one-implementation-per-fact): `dev/grade-card.js`
 * validates a grader's findings against these ids and stamps each finding's title + set-fit
 * flag from here, so the feed renderer stays a pure function of the recorded data.
 *
 * A finding is still PROSE (position + velocity) — this list carries NO scores, bands, or
 * verdicts, and adding one here would re-introduce the gate the rubric forbids (review-with-
 * rubric "Do not"). The ids exist to route prose to a labelled block, nothing more.
 *
 * The five entries mirror card-rubric.md exactly (Per card 1–4, Across the set 5). If an axis is
 * added / renamed / regrouped there, update it here in the same change — the rubric prose and
 * this key are two views of one axis set.
 */
'use strict';

// group: 'per-card' (an axis judging the card in isolation, against its own Deck) vs
// 'across-the-set' (the #163 set-fit axis, judging the card against its Catalog peers).
// setFit marks the one axis the feed pulls out distinctly (#177) — derived, never a second
// source: it is exactly the 'across-the-set' entry, asserted below so a miswrite can't drift.
var CARD_RUBRIC_AXES = [
  { id: 'board-had-to-be-there', title: 'The board had to be there.', group: 'per-card' },
  { id: 'something-in-hand-loses', title: 'Something in hand loses to it.', group: 'per-card' },
  { id: 'mistake-can-be-pointed-to', title: 'The mistake can be pointed to.', group: 'per-card' },
  { id: 'the-winner-played-it', title: 'The winner played it.', group: 'per-card' },
  { id: 'set-fit', title: 'You would know it with the name filed off.', group: 'across-the-set' }
];
// Stamp setFit from group so 'the set-fit axis' has one definition, not a hand-set boolean that
// could disagree with the group.
CARD_RUBRIC_AXES.forEach(function (a) { a.setFit = a.group === 'across-the-set'; });

var CARD_RUBRIC_AXIS_BY_ID = {};
CARD_RUBRIC_AXES.forEach(function (a) { CARD_RUBRIC_AXIS_BY_ID[a.id] = a; });

// The set-fit axis id, resolved from the list (not a literal) so it can't drift from the data.
var SET_FIT_AXIS_ID = (CARD_RUBRIC_AXES.filter(function (a) { return a.setFit; })[0] || {}).id;

var API = {
  CARD_RUBRIC_AXES: CARD_RUBRIC_AXES,
  CARD_RUBRIC_AXIS_BY_ID: CARD_RUBRIC_AXIS_BY_ID,
  SET_FIT_AXIS_ID: SET_FIT_AXIS_ID,
  isAxisId: function (id) { return Object.prototype.hasOwnProperty.call(CARD_RUBRIC_AXIS_BY_ID, id); }
};

// Dual-target like the content files: node `require` (grade-card.js validation) + a browser
// global if ever script-tagged into the game. The Workbench render doesn't need it (the feed
// carries stamped title/setFit), so no HTML wiring is added — this is here for node and future.
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.CARD_RUBRIC_AXES_API = API;
