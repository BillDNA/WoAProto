/* The MODAL kind, over ui/kit/kind.js. The shell lives with its instances:
   every file beside this one is one modal, declaring only what is its own.

   uiModal({id, title, tone, width, bodyClass, adopt, render, buttons,
   buttonsClass}) — id and title are required. title, tone and buttons may be
   functions of the open-time context. modalOpen(id, ctx) closes the modal
   before running a button's onClick unless the button says keepOpen. */
'use strict';

var UI_MODAL = defineKind({
  name: 'uiModal',
  mount: '<id>Ovr',
  container: 'modals',
  fields: {
    title:        'string|function',  // h2 contents, or function(ctx) returning it
    tone:         'string|function?', // class on the h2 (red / blue)
    width:        'number?',          // max-width in px; the .panel default otherwise
    bodyClass:    'string?',
    adopt:        'string?',          // id of existing markup moved into the body at build
    render:       'function?',        // function(bodyEl, ctx) — fills the body on open
    buttons:      'array|function?',  // [{label, id, ghost, disabled, title, keepOpen, onClick}]
    buttonsClass: 'string?'           // 'ovr-btns' (a row) by default
  },
  markup: function(m){
    var w = m.width ? ' style="max-width:min(' + m.width + 'px,94vw);"' : '';
    return '<div class="overlay" id="' + m.mount + '"><div class="panel parchment"' + w + '>' +
      '<button class="ovr-x" id="' + m.mount + 'X" title="Close" type="button">&times;</button>' +
      '<h2 id="' + m.mount + 'Title"></h2>' +
      '<div id="' + m.mount + 'Body"' + (m.bodyClass ? ' class="' + m.bodyClass + '"' : '') + '></div>' +
      '<div id="' + m.mount + 'Btns" class="' + (m.buttonsClass || 'ovr-btns') + '"></div>' +
      '</div></div>';
  }
});

function uiModal(entry){ return UI_MODAL.register(entry); }

// Adopting moves markup that already exists in index.html into the modal's
// body, so long static prose stays markup instead of becoming a JS string.
function uiModalsBuild(){
  if (!UI_MODAL.build()) return;
  UI_MODAL.all().forEach(function(m){
    if (!m.adopt) return;
    var src = $(m.adopt), body = $(m.mount + 'Body');
    if (src && body) body.appendChild(src);
  });
}

function modalOpen(id, ctx){
  uiModalsBuild();
  var m = UI_MODAL.get(id);
  if (!m) throw new Error('modalOpen: no modal ' + JSON.stringify(id));
  var val = function(v){ return typeof v === 'function' ? v(ctx) : v; };

  var h2 = $(m.mount + 'Title');
  h2.innerHTML = val(m.title);
  h2.className = val(m.tone) || '';

  if (m.render) m.render($(m.mount + 'Body'), ctx);

  var btns = val(m.buttons) || [{ label: 'Close' }];
  var row = $(m.mount + 'Btns');
  row.innerHTML = btns.map(function(b, i){
    return '<button id="' + m.mount + 'Btn' + i + '"' +
      (b.ghost ? ' class="ghost btn-ghost-dark"' : '') +
      (b.disabled ? ' disabled' : '') +
      (b.title ? ' title="' + uiEsc(b.title) + '"' : '') + '>' + b.label + '</button>';
  }).join('');
  btns.forEach(function(b, i){
    var el = $(m.mount + 'Btn' + i);
    if (!el || b.disabled) return;
    el.onclick = function(){
      if (!b.keepOpen) modalClose(m.id);
      if (b.onClick) b.onClick(el, ctx);
    };
  });

  $(m.mount + 'X').onclick = function(){ modalClose(m.id); };
  openOverlay(m.mount);
  return m;
}

function modalClose(id){ closeOverlay(UI_MODAL.get(id).mount); }
function modalIsOpen(id){
  var el = $(UI_MODAL.get(id).mount);
  return !!el && el.classList.contains('active');
}
