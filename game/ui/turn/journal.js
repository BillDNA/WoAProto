/* The journal: the running player-facing record of turns already taken.

   Entries group into turns — a card play opens a turn and its resolution steps
   are its children. The last two turns render in full; older ones collapse to
   the play line with a "+N ›" affordance (UI-only, never saved). */
'use strict';

function renderLog(){
  var el = $('log'), v = E.view(APP.st);
  var groups = [];
  v.log.slice(-160).forEach(function(e){
    var hdr = e.msg.indexOf('Skirmish ') === 0;
    var play = e.msg.indexOf(' plays "') > 0;
    if (play) groups.push({ e: e, steps: [], id: 't' + e.turn + e.player });
    else if (hdr || !groups.length || groups[groups.length-1].single) groups.push({ e: e, single: true });
    else groups[groups.length-1].steps.push(e);
  });
  function entryDiv(e){
    var d = document.createElement('div');
    var hdr = e.msg.indexOf('Skirmish ') === 0;
    var finale = e.msg.indexOf('wins the skirmish') >= 0 || e.msg.indexOf('concedes the field') >= 0;
    var play = e.msg.indexOf(' plays "') > 0;
    var noop = e.msg.indexOf('no opening') > 0;
    d.className = 'entry ' + (hdr ? 'hdr' : e.player) + (finale ? ' finale' : '') +
      (play ? ' play' : '') + (noop ? ' noop' : '');
    if (!hdr){
      var tn = document.createElement('span');
      tn.className = 'tn';
      tn.textContent = 'T' + e.turn;
      tn.title = 'turn ' + e.turn;
      d.appendChild(tn);
    }
    d.appendChild(document.createTextNode(e.msg));
    return d;
  }
  el.innerHTML = '<div class="jhead">Campaign Journal</div>';
  var body = document.createElement('div');
  body.className = 'jbody';
  el.appendChild(body);
  var expanded = APP.ui.expanded || (APP.ui.expanded = {});
  var plays = groups.filter(function(g){ return !g.single; });
  var openFrom = plays.length - 2; // the last two turns always render in full
  groups.forEach(function(g){
    if (g.single){ body.appendChild(entryDiv(g.e)); return; }
    var recent = plays.indexOf(g) >= openFrom;
    var open = recent || expanded[g.id];
    var wrap = document.createElement('div');
    wrap.className = 'jturn' + (open ? ' open' : '') + (recent ? '' : ' toggler');
    var head = entryDiv(g.e);
    if (g.steps.length){
      var more = document.createElement('span');
      more.className = 'more';
      more.textContent = '+' + g.steps.length + ' ›';
      more.title = 'show this turn’s moves';
      head.appendChild(more);
    }
    if (!recent) head.onclick = function(){ expanded[g.id] = !expanded[g.id]; renderLog(); };
    wrap.appendChild(head);
    var stepsEl = document.createElement('div');
    stepsEl.className = 'steps';
    g.steps.forEach(function(e){ stepsEl.appendChild(entryDiv(e)); });
    wrap.appendChild(stepsEl);
    body.appendChild(wrap);
  });
  el.scrollTop = el.scrollHeight;
}

// The same record as plain text, for the clipboard.
function journalText(st){
  var v = E.view(st);
  var m = v.battle;
  var res = v.winType==='hq' ? capName(v.skirmishWinner)+' captured the enemy HQ'
    : v.winType==='concession' ? capName(v.skirmishWinner)+' won — enemy conceded'
    : capName(v.skirmishWinner)+' won by attrition ('+E.fieldScore(st,'red')+'–'+E.fieldScore(st,'blue')+' field score surviving)';
  var lines = [
    'War of Attrition — Skirmish '+(m.skirmishIndex+1)+' — "'+v.mapName+'"',
    'Result: '+res,
    'Campaign: Red '+m.wins.red+' — Blue '+m.wins.blue,
    ''
  ];
  (v.log||[]).forEach(function(e){ lines.push('T'+e.turn+' · '+e.msg); });
  return lines.join('\n');
}
