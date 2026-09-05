/* The AI's turn, in the browser: plan a card, then walk its steps on a timer so
   a human can watch what happened.

   A planner error is a BUG, not gameplay — it surfaces loudly rather than
   masking itself as a concession, because a fake concede reads as the AI just
   playing badly. */
'use strict';

function maybeAI(){
  var st = APP.st, v = E.view(st);
  if (!seatAiSide(v.current) || v.phase !== 'choose-card') return;
  APP.ui.busy = true;
  renderPrompt();

  function aiError(err){
    if (typeof console !== 'undefined' && console.error) console.error('AI turn error (' + v.current + '):', err);
    APP.ui.busy = false;
    var el = $('promptbar');
    if (el) el.innerHTML = '<span style="color:var(--amber);">&#9888; The enemy AI hit an <b>error</b> and could not take its turn — this is a bug, not a concession. Open the console (F12) for the stack.</span>';
    toast('&#9888; AI error &mdash; this is a bug, not a concession. See the console (F12).', 6000);
  }

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
    catch(e){ aiError(e); return; }
    if (!plan){ aiError(new Error('aiPlanTurn returned no plan')); return; }
    try { E.playCard(st, plan.cardId, plan.mode || 'normal'); }
    catch(e){ aiError(e); return; }
    var modeTxt = plan.mode==='attack' ? ' as a direct attack' : plan.mode==='reposition' ? ' as a simple maneuver' : '';
    toast(capName(v.current)+' plays <b>'+cardDef(plan.cardId).name+'</b>'+modeTxt, 2200);
    renderAll();
    var i = 0;
    function nextStep(){
      if (v.phase !== 'step'){
        APP.ui.busy = false;
        turnSettle();
        return;
      }
      var c = plan.choices[i++] || {skip:true};
      var pre = capturePre(st, c);
      try { E.applyStep(st, c); } catch(e){ pre = null; try { E.applyStep(st, {skip:true}); } catch(e2){} }
      renderAll();
      playFX(pre);
      setTimeout(nextStep, 650);
    }
    setTimeout(nextStep, 650);
  }, 500);
}
