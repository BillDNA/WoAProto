/* UI contract backstop. The completeness guarantee for the whole
   UI: nothing in game/ui/ draws SVG by hand — every tile, glyph, chit,
   mark, and pattern is built by a primitives module (board-primitives.js /
   chart-primitives.js / ui-primitives.js), never string-concatenated or
   createElementNS'd in a screen. This is the CONTRACT, not a per-screen check:
   an element or screen nobody ticketed still reds here until it is migrated, so
   nothing enumerated-and-forgotten slips through.

   Two gates:
     1. No screen draws raw SVG. Grep every ui/*.js that is NOT a *primitives.js
        for a raw SVG element built as a string literal or via createElementNS.
     2. The component spine resolves. Every primitive named in
        docs/reference/context-ui-components.md resolves to a real file:line home with its
        anchor on that line (the companion of the address book's home gate, for UI).

   Both assert the MECHANISM, never a value: adding a screen, glyph, or mark reds
   nothing as long as it is drawn through a primitive and (if named) homed; only
   hand-rolling SVG in a screen, or a stale pointer, reds it, and the red
   localises to the file:line that did it.

   Frozen-API entry game/test.js delegates here; run alone with
   `node game/test.ui.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '..', 'ui');

// SVG element tags — every one is SVG-only (none is a valid HTML element), so a
// literal `<tag` in a string that survives comment/regex-stripping is hand-drawn
// SVG. Plain HTML by innerHTML (`<div>`, `<span>`, `<b>`) is NOT drawing and
// stays allowed. Matched only when the `<` is NOT preceded by an identifier /
// value char, so a JS comparison like `i<g` or `n<path.length` is not a hit.
const SVG_TAGS = ['svg', 'path', 'circle', 'ellipse', 'polygon', 'polyline', 'rect',
  'line', 'pattern', 'defs', 'linearGradient', 'radialGradient', 'clipPath',
  'marker', 'use', 'tspan', 'g', 'text', 'symbol', 'mask', 'foreignObject'];
const SVG_LITERAL = new RegExp('(^|[^A-Za-z0-9_$.)\\]])<(' + SVG_TAGS.join('|') + ')[\\s>/]');
const NS_DRAW = /createElementNS/;

// Blank out comments AND regex literals (→ spaces, newlines preserved so line
// numbers survive), leaving string / template literals intact — the drawing we
// hunt for lives INSIDE strings. A small JS lexer: without it a `//` inside a
// URL string, or a quote inside a regex literal (`/["']/`), would flip the
// scan's state and hide or misreport a real hit. Regex-vs-division is decided by
// the previous significant char (a `/` after an operator / open-bracket starts a
// regex; after a value it is division).
const REGEX_PREV = /[([{,;:=!&|?+\-*%<>~^]/;
function stripComments(src) {
  let out = '', i = 0, n = src.length, prev = '';
  const push = (s) => { out += s; if (s.trim()) prev = s[s.length - 1]; };
  const blank = (s) => { out += s.replace(/[^\n]/g, ' '); };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = i; while (j < n && src[j] !== '\n') j++; blank(src.slice(i, j)); i = j; continue; }
    if (c === '/' && d === '*') { let j = i + 2; while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++; j = Math.min(j + 2, n); blank(src.slice(i, j)); i = j; continue; }
    if (c === '/' && (prev === '' || REGEX_PREV.test(prev))) { // a regex literal
      let j = i + 1, cls = false;
      while (j < n && src[j] !== '\n') { const ch = src[j]; if (ch === '\\') { j += 2; continue; } if (ch === '[') cls = true; else if (ch === ']') cls = false; else if (ch === '/' && !cls) { j++; break; } j++; }
      while (j < n && /[gimsuy]/.test(src[j])) j++;
      blank(src.slice(i, j)); prev = '/'; i = j; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1; while (j < n) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === c) { j++; break; } j++; }
      push(src.slice(i, j)); i = j; continue;
    }
    push(c); i++;
  }
  return out;
}

function uiScreens() {
  return fs.readdirSync(UI_DIR)
    .filter(f => f.endsWith('.js') && !f.endsWith('primitives.js'))
    .sort();
}

test('UI contract: no screen draws raw SVG outside the primitives modules', () => {
  const screens = uiScreens();
  assert.ok(screens.length > 0, 'found screen modules to scan (guards a broken glob)');
  const hits = [];
  for (const f of screens) {
    const code = stripComments(fs.readFileSync(path.join(UI_DIR, f), 'utf8'));
    code.split('\n').forEach((ln, i) => {
      if (SVG_LITERAL.test(ln) || NS_DRAW.test(ln)) hits.push('ui/' + f + ':' + (i + 1) + '  ' + ln.trim());
    });
  }
  assert.strictEqual(hits.length, 0,
    'raw SVG drawing found outside a primitives module — migrate it into board-primitives.js / chart-primitives.js:\n' +
    hits.join('\n'));
});

// Guard the guard: the scanner must SEE drawing that is present and IGNORE what
// only looks like it, so a future refactor that neuters the lexer can't make the
// contract vacuously pass. Covers: a string-built tag (hit), a commented tag (no
// hit), a JS `<` comparison (no hit — finding: bare `<g`/`<path`), and a real
// `<svg` after a quote-bearing regex literal (still a hit — the regex must not
// swallow it).
test('UI contract: the scanner catches string-built SVG and ignores look-alikes', () => {
  const hit = (s) => s.split('\n').some(ln => SVG_LITERAL.test(ln));
  assert.ok(hit(stripComments('var s = "<circle cx=\\"1\\"/>";')), 'a string-built <circle> is detected');
  assert.ok(!hit(stripComments('// a real nested <polygon> stroke, described not drawn\n')), 'a <polygon> in a comment is not a hit');
  assert.ok(!hit(stripComments('if (i<g && n<path) { return; }')), 'JS < comparisons (<g, <path) are not hits');
  assert.ok(hit(stripComments('var re = /["\\047]/; var svg = "<svg>";')), 'a <svg> after a quote-bearing regex is still detected');
});

// The spine-doc home pointers (docs/context/ + context-ui-components.md) are validated
// in ONE place — dev/check-context.js (symbol-in-file, line-number-free), with its
// own tests. This file keeps only the raw-SVG backstop above, its distinct contract.
