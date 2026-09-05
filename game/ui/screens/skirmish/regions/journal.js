/* The JOURNAL region: the campaign record down the right rail.

   Painted by the turn house. On a small screen it mirrors into the Journal
   modal behind its floating button — which drops the header plate the modal
   already carries, scrolls to the newest entry, and puts back the turn-group
   toggle that innerHTML dropped. */
'use strict';

uiRegion({ id:'journal', el:'log',
  paint: function(){ renderLog(); },
  mirror: { modal:'journal', fab:'fabJournal', body:'journalOvrBody',
    strip: '.jhead',
    wire: function(body){
      body.scrollTop = body.scrollHeight;
      body.onclick = function(ev){
        var t = ev.target;
        while (t && t !== body && !(t.classList && t.classList.contains('jturn'))) t = t.parentNode;
        if (t && t.classList && t.classList.contains('jturn') && t.classList.contains('toggler')) t.classList.toggle('open');
      };
    } } });
