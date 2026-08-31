/* War of Attrition — the UI-element glossary scanner (ADR-0004, #187).

   Node-only helper (never in the browser script chain — like game/test.helpers.js).
   It enumerates every UI *rendering primitive* the front-end defines and checks each
   against the role-keyed roster carved in docs/context/ui.md, so the roster stays a
   COMPLETE census: an unregistered primitive reds. #190 (route-through-base) and #194
   (register-or-extend) build their asserts on this same enumeration — one definition
   of "what a primitive is", reused, per the one-fact-one-file rule.

   A primitive is detected by its DEFINITIONAL FORM, not by a hand-maintained list, so
   the scan cannot be a hollow oracle that only finds what the happy path matches:

     fn        function-returning-markup  — a function whose body returns HTML/SVG
                                            markup (a string with a `<tag`) or builds a
                                            DOM node via createElementNS
     obj       design-token object        — a module-scope object literal carrying the
                                            shared style tokens (>= 2 colour hexes: CHART)
     class     class                       — an ES class (none today; the form is still
                                            detected so a future one cannot slip in)
     modifier  modifier class             — a compound `.base.mod` selector in style.css
                                            that varies a registered BASE primitive class
                                            (the card face's `.card` / `.art`); a new
                                            modifier on a base is the register-or-extend
                                            event #194 wants visible.

   The roster (docs/context/ui.md, fenced ```ui-roster block) keys each role by the
   role it fills and where it lives: `id | home | form | match`, where `match` is a
   regex over the definition's name (or the `base.mod` token for a modifier), plus a
   `bases:` line naming the base-primitive css classes whose modifiers are in scope. A
   role's regex claims a family (`^(ch|ov)` = every chart builder), so adding a sibling
   under an existing role EXTENDS it (stays green); a definition no role claims REDS. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');            // repo root (game/..)
const UI_DIR = path.join(__dirname, 'ui');
const CSS_FILE = path.join(__dirname, 'style.css');
const ROSTER_MD = path.join(ROOT, 'docs', 'context', 'ui.md');

// ---- source set the scan enumerates over -------------------------------------------
// Returns [{ rel, type:'js'|'css', src }]. `extra` lets a test inject fixture files
// (each { rel, type, src }) so the exhaustiveness red can add an unregistered factory.
function defaultSources(extra) {
  const out = [];
  for (const f of fs.readdirSync(UI_DIR).sort()) {
    if (!/\.js$/.test(f)) continue;
    out.push({ rel: 'game/ui/' + f, type: 'js', src: fs.readFileSync(path.join(UI_DIR, f), 'utf8') });
  }
  out.push({ rel: 'game/style.css', type: 'css', src: fs.readFileSync(CSS_FILE, 'utf8') });
  return out.concat(extra || []);
}

// ---- form detectors ----------------------------------------------------------------
// Balanced { ... } body starting at-or-after `from`.
function braceBody(s, from) {
  let depth = 0, start = -1;
  for (let j = from; j < s.length; j++) {
    const c = s[j];
    if (c === '{') { if (start < 0) start = j; depth++; }
    else if (c === '}') { if (--depth === 0) return s.slice(start, j + 1); }
  }
  return s.slice(from);
}
function bodyReturnsMarkup(body) {
  if (/createElementNS/.test(body)) return true;
  const rets = body.match(/return[^;]*;/gs) || [];
  // a returned string that opens an HTML/SVG tag: `<name` then whitespace, `/`, or `>`
  // (so single-letter tags like `<a href>` / `<b>` count, but `a < b` does not).
  return rets.some(r => /['"`][^'"`]*<[a-zA-Z][\w-]*[\s/>]/.test(r));
}

// Enumerate every fn / obj / class / modifier definition in one source.
function definitionsIn(entry) {
  const defs = [];
  if (entry.type === 'js') {
    const s = entry.src;
    let m;
    // function-returning-markup: `function NAME(`, `NAME = function(`, `NAME = (..) =>`
    const fnDecl = /(?:^|\n)\s*function\s+([A-Za-z_$][\w$]*)\s*\(/g;
    while ((m = fnDecl.exec(s))) {
      const body = braceBody(s, m.index + m[0].length);
      if (bodyReturnsMarkup(body)) defs.push({ name: m[1], form: 'fn', rel: entry.rel });
    }
    const fnExpr = /(?:^|\n)\s*(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>)/g;
    while ((m = fnExpr.exec(s))) {
      const body = braceBody(s, m.index + m[0].length);
      if (bodyReturnsMarkup(body)) defs.push({ name: m[1], form: 'fn', rel: entry.rel });
    }
    // class
    const cls = /(?:^|\n)\s*class\s+([A-Za-z_$][\w$]*)/g;
    while ((m = cls.exec(s))) defs.push({ name: m[1], form: 'class', rel: entry.rel });
    // design-token object: module-scope object literal with >= 2 colour hexes
    const obj = /(?:^|\n)\s*(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;
    while ((m = obj.exec(s))) {
      const body = braceBody(s, m.index + m[0].indexOf('{'));
      if ((body.match(/['"`]#[0-9a-fA-F]{3,8}['"`]/g) || []).length >= 2) {
        defs.push({ name: m[1], form: 'obj', rel: entry.rel });
      }
    }
  } else if (entry.type === 'css') {
    // modifier class: adjacent `.a.b(.c)` chain in a selector — a compound variant.
    // Emit the `a.b` token for every such chain; scope (base in `bases`) is applied
    // by the caller so the css scan itself stays purely structural.
    const selectors = entry.src.replace(/\/\*[\s\S]*?\*\//g, '').split('{').map(chunk => {
      const i = chunk.lastIndexOf('}');
      return (i >= 0 ? chunk.slice(i + 1) : chunk).trim();
    });
    for (const sel of selectors) {
      for (const one of sel.split(',')) {
        // maximal runs of `.class.class...` with no whitespace/combinator between
        const chains = one.match(/\.[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)+/g) || [];
        for (const ch of chains) {
          const classes = ch.slice(1).split('.');
          defs.push({ name: classes.join('.'), classes, form: 'modifier', rel: entry.rel });
        }
      }
    }
  }
  return defs;
}

// ---- roster parsing (docs/context/ui.md, fenced ```ui-roster block) ----------------
function parseRoster(md) {
  const block = (md.match(/```ui-roster\n([\s\S]*?)```/) || [])[1];
  if (!block) throw new Error('ui.md: no ```ui-roster``` block found (the roster the scan diffs against)');
  const roles = [];
  let bases = [];
  for (let line of block.split('\n')) {
    line = line.replace(/#.*$/, '').trim();          // strip trailing comments
    if (!line) continue;
    const mb = line.match(/^bases:\s*(.+)$/);
    if (mb) { bases = mb[1].split(/[\s,]+/).filter(Boolean); continue; }
    // `match` is the 4th column and may itself contain `|` (regex alternation),
    // so only the first three pipes delimit; everything after is the pattern.
    const cols = line.split('|');
    if (cols.length < 4) throw new Error('ui.md roster: malformed line "' + line + '"');
    roles.push({
      id: cols[0].trim(), home: cols[1].trim(), form: cols[2].trim(),
      match: new RegExp(cols.slice(3).join('|').trim()),
    });
  }
  return { bases, roles };
}

// ---- the scan ----------------------------------------------------------------------
// Returns { violations, defs }. A violation is a detected primitive no role claims.
function scan(opts) {
  opts = opts || {};
  const sources = opts.sources || defaultSources(opts.extra);
  const roster = parseRoster(opts.rosterText != null ? opts.rosterText : fs.readFileSync(ROSTER_MD, 'utf8'));
  const baseSet = new Set(roster.bases);
  const violations = [];
  const allDefs = [];
  for (const entry of sources) {
    for (const def of definitionsIn(entry)) {
      // modifiers are only in scope when they vary a registered base-primitive class
      if (def.form === 'modifier' && !baseSet.has(def.classes[0])) continue;
      allDefs.push(def);
      const claimed = roster.roles.some(r =>
        r.form === def.form && r.home === def.rel && r.match.test(def.name));
      if (!claimed) violations.push(def);
    }
  }
  return { violations, defs: allDefs, roster };
}

module.exports = { scan, parseRoster, definitionsIn, defaultSources, bodyReturnsMarkup };
