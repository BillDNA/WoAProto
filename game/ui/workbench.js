/* Iteration Workbench — the Plan / Run / Results / Trajectory shell (#139).
   Foundation surface #108 assumed already existed: this stands up the four-phase
   switcher and one labeled placeholder panel per phase. Each phase's real content
   is filled by its own follow-on ticket (Plan type/nudge, Temperature slot,
   questionnaire editor, Trajectory, Run, Results) — this file is just the frame.
   Ported from the throwaway dev/proto/calibration-dashboard.proto.html.
   Classic script + shared globals, wired like ui/maps-screen.js. */

// Ordered so the switcher reads Plan → Run → Results → Trajectory. The `fills`
// text names what the follow-on ticket replaces this placeholder body with.
var WORKBENCH_PHASES = [
  { id: 'plan',       n: 1, label: 'Plan',       fills: 'loop type, opening nudge, accept settings + debrief questionnaire' },
  { id: 'run',        n: 2, label: 'Run',        fills: 'over-the-shoulder live match feed + anomaly signals' },
  { id: 'results',    n: 3, label: 'Results',    fills: 'one-pager of built content with the reports nested beneath' },
  { id: 'trajectory', n: 4, label: 'Trajectory', fills: 'progress-over-time, rendered live from logs/woa.db' }
];
var WB_PHASE = 'plan';

function renderWorkbench() {
  var tabs = WORKBENCH_PHASES.map(function (p) {
    return '<button class="dpill wb-tab' + (p.id === WB_PHASE ? ' sel' : '') +
      '" data-phase="' + p.id + '" type="button"><b>' + p.n + '</b> ' + p.label + '</button>';
  }).join('<span class="wb-step">&rarr;</span>');

  var panes = WORKBENCH_PHASES.map(function (p) {
    return '<div class="wb-pane" id="wbPane-' + p.id + '"' + (p.id === WB_PHASE ? '' : ' style="display:none;"') + '>' +
      '<h3 class="wb-phase-h">' + p.n + ' &middot; ' + p.label + '</h3>' +
      '<p class="small wb-placeholder">Placeholder &mdash; a follow-on ticket fills this phase with ' + p.fills + '.</p>' +
      '</div>';
  }).join('');

  document.getElementById('wbNav').innerHTML = tabs;
  document.getElementById('wbPanes').innerHTML = panes;
  document.querySelectorAll('#wbNav .wb-tab').forEach(function (b) {
    b.onclick = function () { wbGoPhase(b.getAttribute('data-phase')); };
  });
}

function wbGoPhase(id) {
  if (!WORKBENCH_PHASES.some(function (p) { return p.id === id; })) return;
  WB_PHASE = id;
  renderWorkbench();
}
