/* The AI's turn: plan a card, then walk its steps on a timer so a human can
   watch what happened.

   Two rooms and the loop that drives them. Both take the same engine calls the
   player's rooms take and differ only in the follow-through: neither settles the
   turn, because the turn ends when the plan runs out, not when a step lands.

   A planner error is a BUG, not gameplay — the card room surfaces it loudly
   rather than masking it as a concession, because a fake concede reads as the AI
   just playing badly. A refused step is different: the plan has gone stale
   against the board, and skipping is the honest move. */
'use strict';

var aiPlayCard = uiAction({ id: 'ai-card', quiet: true, settle: false,
  run: function(plan){ E.playCard(APP.st, plan.cardId, plan.mode || 'normal'); },
  onReject: function(plan, e){ aiTurnError(e, E.view(APP.st).current); } });

var aiStep = uiAction({ id: 'ai-step', quiet: true, settle: false,
  run: function(c){ E.applyStep(APP.st, c); },
  fx: function(c){ return capturePre(APP.st, c); },
  onReject: function(){
    try { E.applyStep(APP.st, {skip:true}); } catch(e){}
    renderAll();
  } });

function maybeAI(){
  var st = APP.st, v = E.view(st);
  if (!seatAiSide(v.current) || v.phase !== 'choose-card') return;
  APP.ui.busy = true;
  renderPrompt();

  setTimeout(function(){
    // a beaten general yields rather than playing out a foregone conclusion
    if (E.concedeAdvised(st, v.current)){
      APP.ui.busy = false;
      concedeTurn(v.current);
      toast(capName(v.current)+' <b>concedes the field</b> — the outcome was beyond doubt.', 3200);
      return;
    }
    var plan;
    try { plan = E.aiPlanTurn(st, APP.diff); }
    catch(e){ aiTurnError(e, v.current); return; }
    if (!plan){ aiTurnError(new Error('aiPlanTurn returned no plan'), v.current); return; }
    if (!aiPlayCard(plan)) return;
    var modeTxt = plan.mode==='attack' ? ' as a direct attack' : plan.mode==='reposition' ? ' as a simple maneuver' : '';
    toast(capName(v.current)+' plays <b>'+cardDef(plan.cardId).name+'</b>'+modeTxt, 2200);
    var i = 0;
    function nextStep(){
      if (E.view(st).phase !== 'step'){
        APP.ui.busy = false;
        turnSettle();
        return;
      }
      aiStep(plan.choices[i++] || {skip:true});
      setTimeout(nextStep, 650);
    }
    setTimeout(nextStep, 650);
  }, 500);
}

function aiTurnError(err, side){
  if (typeof console !== 'undefined' && console.error) console.error('AI turn error (' + side + '):', err);
  APP.ui.busy = false;
  var el = $('promptbar');
  if (el) el.innerHTML = '<span style="color:var(--amber);">&#9888; The enemy AI hit an <b>error</b> and could not take its turn — this is a bug, not a concession. Open the console (F12) for the stack.</span>';
  toast('&#9888; AI error &mdash; this is a bug, not a concession. See the console (F12).', 6000);
}
