/* War of Attrition — loop-config: the data-defined debrief questionnaire (#85, Track E
   of the #108 build order). Loop-config, NOT a content kind — it sits beside
   content/kinds.js and content/temperatures.js but is not in the manifest (no skirmish
   reads it). dev/claude-plays.js concatenates the active questions into the ONE
   journal-fed debrief it runs after every skirmish, in both single and match modes.

   A questionnaire is an ordered list of { id, text } rows. `id` is a stable key (the
   proto's Plan-phase editor and the transcript key off it); `text` is a self-contained
   question the debrief asks after showing the campaign journal. Add / reorder / reword
   rows here (or from the #91 Plan phase pre-run) — that is the one place the debrief's
   questions live, not prose scattered in claude-plays.js.

   The debrief is a TASTE layer: prose out, for the judge role to read beside the
   balance reports. No score, ratio, or pin — smoke-check is only that a note is
   produced. The per-MATCH arc note ("could you adapt between skirmishes?") is separate:
   it reads the whole set, not one journal, and stays in claude-plays.js.

   Loaded via require() by dev/claude-plays.js (module.exports.questions); the #91 proto
   hand-mirrors these rows since it is a classic-script mock with no require(). The IIFE
   shape mirrors temperatures.js — this file is not pulled into any browser script chain. */

var WOA_QUESTIONNAIRE = (function () {
  // Ordered id + text rows. `feel` is the existing felt-sense read; `reflex` is the
  // #85 interesting-decisions / autopilot read (draft wording from the resolution).
  var QUESTIONS = [
    { id: 'feel', text:
      'How did the game feel to play — what felt strong, what felt weak, what felt ' +
      'luck-driven, and one change you would make to the game? Keep it under 150 words.' },
    { id: 'reflex', text:
      'Look back over the campaign journal turn by turn. For each of your turns, was the ' +
      'best play basically forced — one obvious move — or a genuine choice between real ' +
      'options? Call out the stretches that played themselves and the moments a real ' +
      'decision mattered. Talk like a playtester describing where the game made you think ' +
      'versus where you were on autopilot — no scores or ratios, just your read.' },
    // Blind-spot flag (#87). One standing baseline question that lets the debrief name a
    // thing the tooling can't currently see: an eval input the AI reasons blind to, or a
    // balance number the reports never surface. Proposed only — a human decides whether to
    // wire it (dev/blind-spots.js parses the tagged line, review-reports accumulates them).
    // The tag routes the proposal: ai-input → game/engine/05-ai.js, balance-metric →
    // report-model.js. The line format below is machine-greppable; keep the tag literal.
    { id: 'blind-spot', text:
      'Was there anything you clearly wanted to weigh but the game never told you, or a ' +
      'number about balance you wish the report tracked and it does not? If so, flag ONE ' +
      'on its own line, exactly:\n' +
      '  BLIND-SPOT [ai-input]: <the missing thing an AI would want to weigh>\n' +
      'or\n' +
      '  BLIND-SPOT [balance-metric]: <the balance number the report should track>\n' +
      'Only flag a genuinely new signal — not a rename, wrapper, or blend of things the ' +
      'game already accounts for. If nothing is missing, write "BLIND-SPOT: none".' }
  ];

  /* Schema gate — throws on a malformed row so a bad edit fails loud at require()/load,
     not silently at debrief time. Ids must be present and unique (the transcript and the
     Plan-phase editor key off them). */
  function validate(qs) {
    if (!Array.isArray(qs) || !qs.length) throw new Error('questionnaire: must be a non-empty ordered list');
    var seen = {};
    qs.forEach(function (q, i) {
      if (!q || !q.id || typeof q.text !== 'string' || !q.text.trim())
        throw new Error('questionnaire: row ' + i + ' needs a non-empty id + text');
      if (seen[q.id]) throw new Error('questionnaire: duplicate id "' + q.id + '"');
      seen[q.id] = true;
    });
    return qs;
  }
  validate(QUESTIONS);

  return { questions: QUESTIONS, validate: validate };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WOA_QUESTIONNAIRE;
