/* War of Attrition — ui part: KIND, the shared half of every registry+factory.

   A kind is a family of concepts that share a shell — the dashboard's panes,
   the app's modals. Each family declares itself once here and gets:

     registry    what exists, in declaration order (`ls` the directory to read it)
     validation  the field spec, checked at registration, so a malformed entry
                 throws while the page loads and never on a click
     address     the mount element id, derived from the entry id by a template
     mounts      the container's markup, written from the registry once

   What differs between families — how one is shown — the household writes over
   the returned registry. Two households use this; neither owns it.

   spec: { name, mount:'<id>Ovr'|'dashPane<Id>', fields:{name:type}, container, markup }
   field types: string, boolean, number, function, array, string[]; `|` unions
   them, a trailing `?` makes the field optional. */
'use strict';

function defineKind(spec){
  var all = [], byId = {}, built = false;

  function bad(id, msg){ throw new Error(spec.name + '(' + JSON.stringify(id) + '): ' + msg); }

  function typeOk(v, type){
    return type.split('|').some(function(t){
      if (t === 'string[]') return Array.isArray(v) && v.every(function(s){ return typeof s === 'string'; });
      if (t === 'array') return Array.isArray(v);
      return typeof v === t;
    });
  }

  function mountId(id){
    return spec.mount.replace('<id>', id)
                     .replace('<Id>', id.charAt(0).toUpperCase() + id.slice(1));
  }

  function register(entry){
    var id = entry && entry.id;
    if (typeof id !== 'string' || !/^[a-z][a-z0-9]*$/.test(id)) bad(id, 'id must be a lowercase word');
    if (byId[id]) bad(id, 'duplicate id');
    Object.keys(spec.fields).forEach(function(name){
      var t = spec.fields[name], optional = t.charAt(t.length - 1) === '?';
      if (optional) t = t.slice(0, -1);
      if (entry[name] == null){
        if (!optional) bad(id, 'missing ' + name + ' (' + t + ')');
        return;
      }
      if (!typeOk(entry[name], t)) bad(id, name + ' must be ' + t);
    });
    Object.keys(entry).forEach(function(name){
      if (name !== 'id' && !spec.fields[name]) bad(id, 'unknown field ' + JSON.stringify(name));
    });
    entry.mount = mountId(id);
    all.push(entry);
    byId[id] = entry;
    return entry;
  }

  // Idempotent, and a no-op until the container is in the document, so a kind
  // can be registered before the page has the element it mounts into.
  function build(){
    if (built) return true;
    var box = $(spec.container);
    if (!box) return false;
    box.innerHTML = all.map(spec.markup).join('');
    // The derived ids share a namespace with the rest of the page — a silent
    // collision would hand the household the wrong element.
    [].forEach.call(box.querySelectorAll('[id]'), function(el){
      if (document.querySelectorAll('#' + el.id).length > 1)
        throw new Error(spec.name + ': id ' + JSON.stringify(el.id) + ' collides with an element already on the page');
    });
    built = true;
    return true;
  }

  return {
    name: spec.name,
    register: register,
    all: function(){ return all; },
    get: function(id){ return byId[id]; },
    build: build
  };
}
