/* War of Attrition — ui part: the Commander picker — the pre-muster screen where
   a player chooses a Commander (or None) for their side before building a
   battalion. One card per shipped Commander plus a None baseline; the choice
   rides through to March Out as the per-side `commanders` selection, parallel to
   the battalion selection. Classic script, no wrapper — top-level names attach
   to window (see ui/app.js header). Button wiring lives in ui/boot.js.

   Trait copy reuses the panel's commanderTraitText/Label (ui/commander-panel.js),
   so the pick screen and the in-battle mat describe a trait the same way. */
'use strict';

// The player's Commander pick, and the enemy seat's auto-assigned one. Ids into
// E.COMMANDERS, or null = the None baseline.
var PICK = { commander: null, opponent: null };

// The choosable list: None first, then every shipped Commander.
function pickCommanderOptions(){
  return [{ id: null, name: 'None', story: '', traits: [], none: true }].concat(E.COMMANDERS || []);
}

// Auto-assign the enemy seat a Commander (placeholder until a smart opponent
// pick lands — mirrors the prioritized-random opponent BATTALION seat). Fields
// the first shipped Commander so the enemy always has one to play and display;
// null only when none ship.
function pickOpponentCommander(){
  return (E.COMMANDERS && E.COMMANDERS[0] && E.COMMANDERS[0].id) || null;
}

function openPickCommander(){
  PICK.opponent = pickOpponentCommander();
  renderPickCommander();
  show('pickCommanderScr');
}

function pickCommanderSet(id){
  PICK.commander = (id && id !== 'none') ? id : null; // '' / 'none' → the None baseline (stored as null)
  renderPickCommander();
}

function renderPickCommander(){
  var cur = PICK.commander || 'none';
  $('cmdChoices').innerHTML = pickCommanderOptions().map(function(c){
    var id = c.id || 'none';
    var sel = id === cur;
    var body = c.none
      ? '<div class="cmdpick-trait">The plain baseline &mdash; no rules bent, no weakness. Feel what a Commander adds.</div>'
      : (c.traits || []).map(function(t){
          return '<div class="cmdpick-trait' + (t.role === 'weakness' ? ' weak' : '') + '">' +
            uiEsc(commanderTraitText(t)) + '</div>';
        }).join('');
    return '<button class="cmdpick' + (sel ? ' sel' : '') + '" data-id="' + uiEsc(id) + '">' +
      '<div class="cmdpick-name">&#9873; ' + uiEsc(c.name) + '</div>' + body + '</button>';
  }).join('');
  $('cmdChoices').querySelectorAll('.cmdpick').forEach(function(b){
    b.onclick = function(){ pickCommanderSet(b.dataset.id); };
  });
  var opp = PICK.opponent && (E.resolveCommander(PICK.opponent) || {});
  var oppName = opp && opp.name ? opp.name : 'None';
  var note = $('cmdOpponentNote');
  if (!note){
    note = document.createElement('div');
    note.id = 'cmdOpponentNote';
    note.className = 'small';
    note.style.textAlign = 'center';
    $('cmdChoices').parentNode.insertBefore(note, $('cmdChoices').nextSibling);
  }
  note.innerHTML = 'Enemy Commander: <b>' + uiEsc(oppName) + '</b>';
}

// The per-side `commanders` selection March Out threads into the battle: the
// human's pick on their side, the auto-assigned enemy Commander on the other.
function pickedCommanders(mySide){
  var sel = {};
  sel[mySide] = PICK.commander;
  sel[E.other(mySide)] = PICK.opponent;
  return sel;
}
