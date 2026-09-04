/* The game page, made loadable by jsdom.

   jsdom has no script loader, so the page's one <script src> is expanded here
   into the chain load-order.js declares, inlined from disk in that exact order
   — content/manifest.js expands to the content files, the same effect its
   document.write has in a browser. Any surviving <script src> throws rather
   than silently dropping a script.

   `prefix` is injected ahead of the whole chain, for seeding localStorage
   before applied-battalion.js reads it. `kinds` is the caller's content-kind
   list: the two harnesses load different sets today, so each states its own
   rather than inheriting a default that would silently move what it tests. */
'use strict';
var fs = require('fs');
var path = require('path');

var GAME = path.join(__dirname, '..', 'game');

function read(f) { return fs.readFileSync(path.join(GAME, f), 'utf8'); }

// content/ registers itself into WOA_CONTENT one file per item.
function readContent(kinds) {
  return kinds.map(function (kind) {
    var d = path.join(GAME, 'content', kind);
    try {
      return fs.readdirSync(d).filter(function (f) { return /\.js$/.test(f); }).sort()
        .map(function (f) { return fs.readFileSync(path.join(d, f), 'utf8'); }).join('\n');
    } catch (e) { return ''; }
  }).join('\n');
}

function pageHtml(kinds, prefix) {
  var html = read('index.html').replace(/<script src="load-order\.js"><\/script>/,
    require(path.join(GAME, 'load-order.js')).PAGE.map(function (src) {
      return '<script>' + (src === 'content/manifest.js' ? readContent(kinds) : read(src)) + '</script>';
    }).join('\n'));
  if (/<script [^>]*src=/.test(html)) {
    throw new Error('un-inlined <script src> survived — index.html must hand-list load-order.js and nothing else');
  }
  return (prefix || '') + html;
}

module.exports = { GAME: GAME, read: read, readContent: readContent, pageHtml: pageHtml };
