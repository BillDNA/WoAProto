/* The card glossary — every card, its count, and (mid-skirmish) what each side
   has spent. Body built by cardsGlossaryHtml() in ui/skirmish.js. */
'use strict';

uiModal({ id:'cards', title:'Card Glossary', bodyClass:'manual',
  render: function(el){ el.innerHTML = cardsGlossaryHtml(); } });
