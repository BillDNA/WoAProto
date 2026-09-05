/* Hotseat hand-off: hold the screen until the next commander takes it. */
'use strict';

uiModal({ id:'handoff',
  title: function(p){ return capName(p) + '&rsquo;s turn'; },
  tone:  function(p){ return p; },
  render: function(el, p){ el.innerHTML = '<p>Pass the device to the ' + capName(p) + ' commander.</p>'; },
  buttons: function(){
    return [{ label:'Take Command', onClick: function(){
      APP.ui.handoffPending = false;
      renderHand(); renderPrompt();
    } }];
  }
});
