/* The yes/no dialog — concede, confirm-attack. Everything it shows comes from
   the open-time context, so one entry serves every caller. */
'use strict';

uiModal({ id:'confirm',
  title: function(o){ return o.title; },
  tone:  function(o){ return o.titleClass || ''; },
  render: function(el, o){ el.innerHTML = o.body || ''; },
  buttons: function(o){
    return [{ label: o.yesLabel || 'OK', onClick: function(){ if (o.onYes) o.onYes(); } },
            { label: o.noLabel || 'Cancel', ghost: true }];
  }
});

// The old call shape, kept so every caller stays a one-liner.
function confirmDialog(o){ modalOpen('confirm', o); }
